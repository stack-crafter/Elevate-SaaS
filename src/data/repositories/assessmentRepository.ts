import type { Skill, TestType } from "@/models/session";
import type { AIQuestion, EvaluationResult } from "@/models/assessment";
import { OPENROUTER_MODEL } from "@/lib/config";
import { SKILL_LABELS, TYPE_LABELS } from "@/utilities/constants";
import { safeParseJSON } from "@/utilities/parsing";
import { getApiKey, openRouterFetch } from "@/data/api/openrouterClient";
import {
  ENGINE_SKILL_MAP,
  mapModeToEngine,
  startEngineSession,
  getNextEngineQuestion,
  evaluateMCQWithEngine,
  evaluateTheoryWithEngine,
  evaluateCodingWithEngine,
  type EngineQuestion,
} from "@/data/api/elevateEngineClient";

// ─── Assessment Repository ────────────────────────────────────────────────────

/**
 * Convert a raw Elevate Engine question → web app AIQuestion format.
 * Options map: { A: "...", B: "...", C: "...", D: "..." } → array
 */
function engineQuestionToAIQuestion(eq: EngineQuestion, idx: number): AIQuestion {
  const id = `q${idx + 1}`;

  if (eq.question_type === "MCQ") {
    const optionsObj = eq.options ?? {};
    const optionsArr = ["A", "B", "C", "D"]
      .filter((k) => optionsObj[k] !== undefined)
      .map((k) => optionsObj[k]);

    // Correct answer index is not given by engine — we evaluate at submission time via evaluate-mcq
    // Store options and mark correct as 0 as placeholder; real scoring uses submitEngineAnswer
    return {
      id,
      type: "mcq",
      prompt: eq.question,
      options: optionsArr,
      correct: 0, // placeholder — scoring is handled by engine's submit-answer
      // Store extra metadata for engine-aware evaluation
      _engineSessionId: eq.session_id,
      _engineQuestionType: eq.question_type,
      _engineOptions: optionsObj,
    } as AIQuestion;
  }

  if (eq.question_type === "theory") {
    return {
      id,
      type: "theory",
      prompt: eq.question,
      _engineSessionId: eq.session_id,
      _engineQuestionType: eq.question_type,
      _modelAnswer: eq.model_answer ?? "",
    } as AIQuestion;
  }

  // coding or vibe_coding
  const lang = eq.language ?? "python";
  return {
    id,
    type: eq.question_type === "vibe_coding" ? "vibe_coding" : "coding",
    prompt: eq.question,
    language: lang,
    starterCode: eq.starter_code ?? `# Write your ${lang} code here\n`,
    _engineSessionId: eq.session_id,
    _engineQuestionType: eq.question_type,
  } as AIQuestion;
}

// ─── Question Generation ───────────────────────────────────────────────────────

export async function generateQuestions(
  skill: Skill,
  testType: TestType,
  previousQuestions: string[] = [],
): Promise<AIQuestion[]> {
  // ─── Primary: Elevate Engine (for supported skills) ──────────────────────────
  const engineSkill = ENGINE_SKILL_MAP[skill];

  if (engineSkill) {
    try {
      const engineMode = mapModeToEngine(testType);
      const userId = `web_user_${Date.now()}`;

      const session = await startEngineSession(userId, engineSkill, engineMode);
      if (session?.session_id) {
        const sessionId = session.session_id;
        const questions: AIQuestion[] = [];

        // Fetch 10 questions sequentially from the engine session
        for (let i = 0; i < 10; i++) {
          const eq = await getNextEngineQuestion(sessionId);
          if (!eq) break;
          questions.push(engineQuestionToAIQuestion(eq, i));
        }

        if (questions.length >= 8) {
          // Store sessionId on first question so evaluation can reference it
          console.info(`[Elevate Engine] Generated ${questions.length} questions for ${engineSkill} / ${engineMode}`);
          return questions.slice(0, 10);
        }
      }
    } catch (err) {
      console.warn("Elevate Engine question generation failed, falling back to OpenRouter:", err);
    }
  }

  // ─── Fallback: OpenRouter / OpenAI Question Generation ───────────────────────
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No API key. Please provide your OpenRouter key.");

  const lang = SKILL_LABELS[skill] ?? skill;
  const type = TYPE_LABELS[testType] ?? testType;
  const avoidBlock =
    previousQuestions.length > 0
      ? `\n\nIMPORTANT: Do NOT repeat any of these question prompts the user has already seen:\n${previousQuestions.slice(0, 10).join("\n")}`
      : "";
  const isVibe = testType === "vibe";

  const systemPrompt = `You are an expert technical interviewer generating a unique ${lang} assessment in the style of "${type}". Generate exactly 10 questions: 2 MCQ, 4 short theory, 4 coding. Every question must be fresh and different from any previous attempt.
${isVibe ? `\nNOTE: Since the test format is "Vibe Code", you MUST set the "type" field of the 4 coding questions to "vibe_coding" instead of "coding".` : ""}

Return ONLY valid JSON (no markdown fences) matching this exact structure:
[
  { "id": "q1", "type": "mcq", "prompt": "Question text", "options": ["A","B","C","D"], "correct": 0 },
  { "id": "q2", "type": "mcq", "prompt": "Question text", "options": ["A","B","C","D"], "correct": 2 },
  { "id": "q3", "type": "theory", "prompt": "Short theory question" },
  { "id": "q7", "type": "coding", "prompt": "Write a function that...", "language": "${lang.toLowerCase()}", "starterCode": "// starter code here" }
]

Guidelines:
- MCQ: 4 options, one clearly correct. Test real conceptual depth.
- Theory: open-ended, 2-4 sentences expected. Test communication of concepts.
- Coding: realistic tasks relevant to ${lang}. Include starter code scaffolding. ${isVibe ? 'For this vibe assessment, set their type to "vibe_coding".' : ""}
- All questions must match test style: ${type}
- Questions must be uniquely varied — no repeated topics.${avoidBlock}`;

  const raw = await openRouterFetch(
    {
      model: OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate a ${lang} ${testType} assessment. Return only the JSON array.`,
        },
      ],
      temperature: 0.9,
      max_tokens: 3000,
    },
    apiKey,
  );

  const parsed = safeParseJSON<AIQuestion[]>(raw);
  if (!parsed || !Array.isArray(parsed) || parsed.length < 10) {
    throw new Error("AI returned malformed questions. Please try again.");
  }
  return parsed.slice(0, 10);
}

// ─── Submission Evaluation ─────────────────────────────────────────────────────

export async function evaluateSubmission(
  skill: Skill,
  testType: TestType,
  questions: AIQuestion[],
  answers: (string | number | null)[],
): Promise<EvaluationResult> {
  // ─── Primary: Elevate Engine per-question evaluation ─────────────────────────
  try {
    const questionScores: Array<{
      questionId: string;
      score: number;
      feedback: string;
      isCorrect: boolean;
    }> = [];
    let engineSuccess = true;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i] as AIQuestion & {
        _engineSessionId?: string;
        _engineOptions?: Record<string, string>;
        _modelAnswer?: string;
      };
      const ans = answers[i];
      const qId = q.id || `q${i + 1}`;

      if (q.type === "mcq") {
        // Map user's numeric answer index → option letter using stored engine options
        const engineOpts = q._engineOptions;
        const optionKeys = ["A", "B", "C", "D"];

        let selectedLetter = "";
        let correctLetter = "";

        if (engineOpts && typeof ans === "number") {
          // Engine-originated question: use stored options map
          const optArr = optionKeys.filter((k) => engineOpts[k] !== undefined);
          selectedLetter = optArr[ans] ?? "";
          // The engine tracks correct internally via submit-answer; for evaluate-mcq we need correct option
          // Since engine doesn't tell us the correct answer upfront, submit via session if available
          const sessionId = q._engineSessionId;
          if (sessionId) {
            const submitRes = await fetch(
              `${import.meta.env.VITE_ELEVATE_ENGINE_URL || "https://elevate-backend-rtdg.onrender.com"}/test/submit-answer`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  session_id: sessionId,
                  selected_option: selectedLetter,
                }),
                signal: AbortSignal.timeout(8000),
              },
            );
            if (submitRes.ok) {
              const result = await submitRes.json();
              questionScores.push({
                questionId: qId,
                score: result.was_correct ? 10 : 0,
                feedback: result.feedback || (result.was_correct ? "Correct!" : "Incorrect answer."),
                isCorrect: !!result.was_correct,
              });
              continue;
            }
          }
        }

        // Fallback within engine block: use evaluate-mcq with options from question
        const chosen = typeof ans === "number" ? (q.options?.[ans] ?? "") : String(ans ?? "");
        const correct = q.options?.[q.correct ?? 0] ?? "";
        const evalRes = await evaluateMCQWithEngine(chosen, correct);
        if (evalRes) {
          questionScores.push({
            questionId: qId,
            score: evalRes.was_correct ? 10 : 0,
            feedback: evalRes.was_correct ? "Correct answer." : `Incorrect. Correct: ${correct}`,
            isCorrect: evalRes.was_correct,
          });
        } else {
          engineSuccess = false;
          break;
        }
      } else if (q.type === "theory") {
        const candidateAns = String(ans ?? "");
        const modelAnswer = (q as AIQuestion & { _modelAnswer?: string })._modelAnswer || q.prompt;
        const evalRes = await evaluateTheoryWithEngine(candidateAns, modelAnswer);
        if (evalRes) {
          questionScores.push({
            questionId: qId,
            score: Math.round(evalRes.score * 10),
            feedback: evalRes.feedback || (evalRes.was_correct ? "Good answer." : "Needs improvement."),
            isCorrect: evalRes.was_correct,
          });
        } else {
          engineSuccess = false;
          break;
        }
      } else {
        // coding / vibe_coding
        const code = String(ans ?? "");
        const lang = q.language ?? String(skill);
        const evalRes = await evaluateCodingWithEngine(code, lang, [
          { input: "", expected_output: "" },
        ]);
        if (evalRes) {
          questionScores.push({
            questionId: qId,
            score: Math.round(evalRes.score * 10),
            feedback: evalRes.was_correct
              ? "Code logic meets test criteria."
              : "Code did not pass all checks.",
            isCorrect: evalRes.was_correct,
          });
        } else {
          engineSuccess = false;
          break;
        }
      }
    }

    if (engineSuccess && questionScores.length === questions.length) {
      const totalSum = questionScores.reduce((acc, curr) => acc + curr.score, 0);
      const totalScore = Math.round((totalSum / (questions.length * 10)) * 100);
      const correctCount = questionScores.filter((qs) => qs.isCorrect).length;
      const wrongQuestions = questions.filter((_, idx) => !questionScores[idx]?.isCorrect);

      return {
        totalScore,
        questionScores,
        strengths: [
          `Answered ${correctCount} of ${questions.length} questions correctly.`,
          correctCount >= 8
            ? "Excellent command of the subject."
            : correctCount >= 5
              ? "Good understanding of core concepts."
              : "Showed effort across all question types.",
        ].filter(Boolean),
        weaknesses:
          wrongQuestions.length > 0
            ? [`Topics to review: ${wrongQuestions.map((q) => q.prompt.slice(0, 40) + "…").join("; ")}`]
            : ["No major weaknesses identified."],
        overallFeedback: `Assessment evaluated by Elevate Engine. Score: ${totalScore}/100. Keep practising to improve your rating.`,
      };
    }
  } catch (err) {
    console.warn("Elevate Engine evaluation fallback to OpenRouter:", err);
  }

  // ─── Fallback: OpenRouter / OpenAI Evaluation ─────────────────────────────────
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No API key.");

  const lang = SKILL_LABELS[skill] ?? skill;

  const answerSummary = questions
    .map((q, i) => {
      const ans = answers[i];
      if (q.type === "mcq") {
        const chosen = typeof ans === "number" ? (q.options?.[ans] ?? "No answer") : "No answer";
        const correct = q.options?.[q.correct ?? 0] ?? "";
        return `Q${i + 1} [MCQ]: "${q.prompt}"\n  -> Candidate chose: "${chosen}"\n  -> Correct: "${correct}"`;
      }
      return `Q${i + 1} [${q.type}]: "${q.prompt}"\n  -> Candidate answer: "${ans ?? "No answer"}"`;
    })
    .join("\n\n");

  const systemPrompt = `You are an expert ${lang} technical evaluator. Evaluate this assessment submission fairly and return ONLY valid JSON (no markdown fences):

{
  "totalScore": <0-100>,
  "questionScores": [
    { "questionId": "q1", "score": <0-10>, "feedback": "brief feedback", "isCorrect": true/false }
  ],
  "strengths": ["strength 1"],
  "weaknesses": ["weakness 1"],
  "overallFeedback": "2-3 sentence holistic feedback"
}

Scoring:
- MCQ: 10 if correct, 0 if wrong
- Theory: 0-10 based on accuracy, clarity, depth
- Coding: 0-10 based on correctness, readability, approach
- totalScore = weighted average scaled to 100

Be encouraging but honest. Provide actionable feedback.`;

  const raw = await openRouterFetch(
    {
      model: OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Evaluate these ${lang} ${testType} answers:\n\n${answerSummary}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    },
    apiKey,
  );

  const parsed = safeParseJSON<EvaluationResult>(raw);
  if (!parsed || typeof parsed.totalScore !== "number") {
    throw new Error("AI returned malformed evaluation. Please try again.");
  }
  return parsed;
}
