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
  submitEngineAnswer,
  getEngineSessionResult,
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
  const typeLower = (eq.question_type || "").toLowerCase();

  if (typeLower === "mcq") {
    const optionsObj = eq.options ?? {};
    const optionsArr = ["A", "B", "C", "D"]
      .filter((k) => optionsObj[k] !== undefined)
      .map((k) => optionsObj[k]);

    return {
      id,
      type: "mcq",
      prompt: eq.question,
      options: optionsArr,
      correct: 0, // placeholder — scoring is handled by engine's submit-answer
      _engineSessionId: eq.session_id,
      _engineQuestionType: eq.question_type,
      _engineOptions: optionsObj,
      _engineOverallNumber: eq.overall_question_number,
      _engineOverallTotal: eq.overall_total_questions,
    } as AIQuestion;
  }

  if (typeLower === "theory") {
    return {
      id,
      type: "theory",
      prompt: eq.question,
      _engineSessionId: eq.session_id,
      _engineQuestionType: eq.question_type,
      _modelAnswer: eq.model_answer ?? "",
      _engineOverallNumber: eq.overall_question_number,
      _engineOverallTotal: eq.overall_total_questions,
    } as AIQuestion;
  }

  // coding or vibe_coding
  const lang = eq.language ?? "python";
  return {
    id,
    type: typeLower === "vibe_coding" ? "vibe_coding" : "coding",
    prompt: eq.question,
    language: lang,
    starterCode: eq.starter_code ?? `# Write your ${lang} code here\n`,
    _engineSessionId: eq.session_id,
    _engineQuestionType: eq.question_type,
    _engineOverallNumber: eq.overall_question_number,
    _engineOverallTotal: eq.overall_total_questions,
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

      // Start engine session
      const session = await startEngineSession(userId, engineSkill, engineMode);
      if (session?.session_id) {
        const sessionId = session.session_id;

        // Fetch ONLY the first question to begin the progressive flow
        const eq = await getNextEngineQuestion(sessionId);
        if (eq) {
          const firstQuestion = engineQuestionToAIQuestion(eq, 0);
          console.info(`[Elevate Engine] Started progressive session ${sessionId} for ${engineSkill}`);
          return [firstQuestion];
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

  const systemPrompt = `You are an expert technical interviewer generating a unique ${lang} assessment.
Generate exactly 32 questions as a single JSON array of objects.

Structure rules:
- If "${testType}" is "pure" or "vibe":
  - Beginner (questions 1-10): MCQ at indices 0, 3, 6, 9; Theory at 1, 4, 7; Coding at 2, 5, 8.
  - Intermediate (questions 11-20): MCQ at indices 10, 13, 16, 19; Theory at 11, 14, 17; Coding at 12, 15, 18.
  - Advanced (questions 21-32): MCQ at indices 20, 23, 26, 29; Theory at 21, 24, 27, 30; Coding at 22, 25, 28, 31.
- If "${testType}" is "experience":
  - 32 questions total, no stages: 11 MCQ (indices 0,3,6,9,12,15,18,21,24,27,30), 11 Theory (indices 1,4,7,10,13,16,19,22,25,28,31), 10 Coding (indices 2,5,8,11,14,17,20,23,26,29).

Return ONLY valid JSON (no markdown fences) matching this structure:
[
  { "id": "q1", "type": "mcq", "prompt": "Question text", "options": ["A","B","C","D"], "correct": 0 },
  ...
]

Rules:
${isVibe ? `- Set the "type" field of all coding questions to "vibe_coding" instead of "coding".` : ""}
- MCQ must have exactly 4 options.
- Ensure high-quality, practical coding questions and clear theory/MCQs.
- All questions must match test style: ${type}
- Questions must be uniquely varied — no repeated topics.${avoidBlock}`;

  const raw = await openRouterFetch(
    {
      model: OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate a ${lang} ${testType} assessment. Return only the JSON array of exactly 32 questions.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 8000,
    },
    apiKey,
  );

  const parsed = safeParseJSON<AIQuestion[]>(raw);
  if (!parsed || !Array.isArray(parsed) || parsed.length < 32) {
    throw new Error(`AI returned only ${parsed?.length || 0} questions. Expected at least 32.`);
  }
  return parsed.slice(0, 32);
}

// ─── Progressive Submission and Next Question Fetching ───────────────────────

export async function submitAndFetchNextQuestion(
  sessionId: string,
  currentQuestion: AIQuestion,
  answer: string | number | null,
  nextIndex: number,
): Promise<{ nextQuestion: AIQuestion | null; wasCorrect: boolean }> {
  let selectedOption: string | null = null;
  let candidateAnswer: string | null = null;
  let sourceCode: string | null = null;
  let language: string | null = null;

  if (currentQuestion.type === "mcq") {
    const engineOpts = (currentQuestion as any)._engineOptions || {};
    const optionKeys = ["A", "B", "C", "D"];
    if (typeof answer === "number") {
      selectedOption = optionKeys[answer] ?? null;
    } else {
      selectedOption = String(answer || "");
    }
  } else if (currentQuestion.type === "theory") {
    candidateAnswer = String(answer || "");
  } else {
    sourceCode = String(answer || "");
    language = currentQuestion.language || "python";
  }

  // 1. Submit current answer to the engine
  const submitRes = await submitEngineAnswer(sessionId, {
    selectedOption,
    candidateAnswer,
    sourceCode,
    language,
  });
  const wasCorrect = submitRes?.was_correct ?? false;

  // 2. Fetch the next question
  const nextEq = await getNextEngineQuestion(sessionId);
  if (!nextEq) return { nextQuestion: null, wasCorrect };

  // 3. Map to AIQuestion format
  return { nextQuestion: engineQuestionToAIQuestion(nextEq, nextIndex), wasCorrect };
}

// ─── Final Result Formulation ────────────────────────────────────────────────

export async function getFinalEngineResult(
  sessionId: string,
  questions: AIQuestion[],
  answers: (string | number | null)[],
): Promise<EvaluationResult> {
  const resultData = await getEngineSessionResult(sessionId);
  if (!resultData) {
    throw new Error("Failed to retrieve final engine evaluation results.");
  }

  const score = typeof resultData.total_marks_earned === "number" ? resultData.total_marks_earned : 0;
  const sections = (resultData.sections as Record<string, any>) || {};

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  for (const [secName, secData] of Object.entries(sections)) {
    const earned = secData.marks || 0;
    const possible = secData.marks_possible || 1;
    const percent = Math.round((earned / possible) * 100);

    if (percent >= 70) {
      strengths.push(`Excellent performance in ${secName} section: scored ${percent}% (${earned}/${possible} marks).`);
    } else {
      weaknesses.push(`Requires improvement in ${secName} section: scored ${percent}% (${earned}/${possible} marks).`);
    }
  }

  if (strengths.length === 0) {
    strengths.push("Attempted progressive skill assessment topics.");
  }
  if (weaknesses.length === 0) {
    weaknesses.push("All attempted conceptual test sections passed the criteria.");
  }

  return {
    totalScore: score,
    questionScores: questions.map((q, idx) => ({
      questionId: q.id,
      score: answers[idx] ? 10 : 0,
      feedback: answers[idx] ? "Answered and evaluated by engine." : "No answer provided.",
    })),
    strengths,
    weaknesses,
    overallFeedback: `Adaptive evaluation completed successfully. Highest section completed: ${resultData.current_level}. Final combined score: ${score}/100.`,
  };
}

// ─── Submission Evaluation (Fallback / OpenRouter only) ──────────────────────

export async function evaluateSubmission(
  skill: Skill,
  testType: TestType,
  questions: AIQuestion[],
  answers: (string | number | null)[],
): Promise<EvaluationResult> {
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
