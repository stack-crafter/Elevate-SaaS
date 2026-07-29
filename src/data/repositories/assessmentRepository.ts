import type { Skill, TestType } from "@/models/session";
import type { AIQuestion, EvaluationResult } from "@/models/assessment";
import { OPENROUTER_MODEL } from "@/lib/config";
import { SKILL_LABELS, TYPE_LABELS } from "@/utilities/constants";
import { safeParseJSON } from "@/utilities/parsing";
import { getApiKey, openRouterFetch } from "@/data/api/openrouterClient";
import {
  evaluateMCQWithEngine,
  evaluateTheoryWithEngine,
  evaluateCodingWithEngine,
} from "@/data/api/elevateEngineClient";

// ─── Assessment Repository ────────────────────────────────────────────────────

export async function generateQuestions(
  skill: Skill,
  testType: TestType,
  previousQuestions: string[] = [],
): Promise<AIQuestion[]> {
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

export async function evaluateSubmission(
  skill: Skill,
  testType: TestType,
  questions: AIQuestion[],
  answers: (string | number | null)[],
): Promise<EvaluationResult> {
  // ─── Primary: Attempt evaluation via Elevate Engine (Render Backend) ──────────
  try {
    const questionScores: Array<{
      questionId: string;
      score: number;
      feedback: string;
      isCorrect: boolean;
    }> = [];
    let engineSuccess = true;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const ans = answers[i];

      if (q.type === "mcq") {
        const chosen = typeof ans === "number" ? (q.options?.[ans] ?? "") : "";
        const correct = q.options?.[q.correct ?? 0] ?? "";
        const evalRes = await evaluateMCQWithEngine(chosen, correct);
        if (evalRes) {
          questionScores.push({
            questionId: q.id || `q${i + 1}`,
            score: evalRes.was_correct ? 10 : 0,
            feedback: evalRes.was_correct ? "Correct answer." : `Incorrect. Correct option was: ${correct}`,
            isCorrect: evalRes.was_correct,
          });
        } else {
          engineSuccess = false;
          break;
        }
      } else if (q.type === "theory") {
        const evalRes = await evaluateTheoryWithEngine(String(ans || ""), q.prompt);
        if (evalRes) {
          questionScores.push({
            questionId: q.id || `q${i + 1}`,
            score: Math.round(evalRes.score * 10),
            feedback: evalRes.feedback || (evalRes.was_correct ? "Good answer." : "Needs improvement."),
            isCorrect: evalRes.was_correct,
          });
        } else {
          engineSuccess = false;
          break;
        }
      } else {
        // coding or vibe_coding
        const evalRes = await evaluateCodingWithEngine(
          String(ans || ""),
          q.language || skill,
          [{ input: "", expected_output: "" }],
        );
        if (evalRes) {
          questionScores.push({
            questionId: q.id || `q${i + 1}`,
            score: Math.round(evalRes.score * 10),
            feedback: evalRes.was_correct ? "Code logic meets test criteria." : "Code did not pass all checks.",
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

      return {
        totalScore,
        questionScores,
        strengths: [
          `Demonstrated accurate understanding on ${correctCount} of ${questions.length} questions.`,
        ],
        weaknesses: [
          `Topics requiring review: ${questions
            .filter((_, idx) => !questionScores[idx]?.isCorrect)
            .map((q) => q.prompt.slice(0, 30) + "...")
            .join(", ") || "None"}`,
        ],
        overallFeedback: `Assessment completed via Elevate Engine. Candidate scored ${totalScore}%.`,
      };
    }
  } catch (err) {
    console.warn("Elevate Engine evaluation fallback to OpenRouter:", err);
  }

  // ─── Fallback: OpenRouter / OpenAI Evaluation ──────────────────────────────────
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
