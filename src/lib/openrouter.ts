import type { Skill, TestType } from "./store";
import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from "./config";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIQuestion {
  id: string;
  type: "mcq" | "theory" | "coding";
  prompt: string;
  /** MCQ only */
  options?: string[];
  /** MCQ only – 0-indexed */
  correct?: number;
  /** Coding only */
  language?: string;
  /** Coding only */
  starterCode?: string;
}

export interface QuestionScore {
  questionId: string;
  score: number; // 0–10
  feedback: string;
  isCorrect?: boolean; // MCQ only
}

export interface EvaluationResult {
  totalScore: number; // 0–100
  questionScores: QuestionScore[];
  strengths: string[];
  weaknesses: string[];
  overallFeedback: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getApiKey(): string | null {
  // Priority 1: key set in config.ts (edit that file to change it)
  if (OPENROUTER_API_KEY && OPENROUTER_API_KEY.trim() !== "") {
    return OPENROUTER_API_KEY;
  }
  // Priority 2: key stored in browser localStorage (runtime override)
  return localStorage.getItem("hehe_openrouter_key");
}

async function openRouterFetch(
  body: object,
  apiKey: string,
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "Elevate AI Assessment",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function safeParseJSON<T>(text: string): T | null {
  // Extract JSON from markdown code fences if present
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = match ? match[1] : text;
  try {
    return JSON.parse(raw.trim()) as T;
  } catch {
    return null;
  }
}

// ─── Question Generation ──────────────────────────────────────────────────────

const SKILL_LABELS: Record<string, string> = {
  java: "Java",
  python: "Python",
  cpp: "C++",
  flutter: "Flutter / Dart",
  react: "React",
  nodejs: "Node.js",
  ai: "Artificial Intelligence",
  ml: "Machine Learning",
  datascience: "Data Science",
};

const TYPE_LABELS: Record<string, string> = {
  pure: "Pure Code (algorithmic, implementation-focused)",
  vibe: "Vibe Code (conversational, AI-paired coding scenarios)",
  experience: "Experience Code (behavioral + real-world code review)",
};

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

  const systemPrompt = `You are an expert technical interviewer generating a unique ${lang} assessment in the style of "${type}". Generate exactly 10 questions: 2 MCQ, 4 short theory, 4 coding. Every question must be fresh and different from any previous attempt.

Return ONLY valid JSON (no markdown fences) matching this exact structure:
[
  {
    "id": "q1",
    "type": "mcq",
    "prompt": "Question text",
    "options": ["A", "B", "C", "D"],
    "correct": 0
  },
  {
    "id": "q2",
    "type": "mcq",
    "prompt": "Question text",
    "options": ["A", "B", "C", "D"],
    "correct": 2
  },
  {
    "id": "q3",
    "type": "theory",
    "prompt": "Short theory question"
  },
  ...4 theory questions...
  {
    "id": "q7",
    "type": "coding",
    "prompt": "Write a function that...",
    "language": "${lang.toLowerCase()}",
    "starterCode": "// starter code here"
  },
  ...3 more coding questions...
]

Guidelines:
- MCQ: 4 options, one clearly correct. Test real conceptual depth.
- Theory: open-ended, 2-4 sentences expected. Test communication of concepts.
- Coding: realistic tasks relevant to ${lang}. Include starter code scaffolding.
- All questions must match test style: ${type}
- Questions must be uniquely varied — no repeated topics.${avoidBlock}`;

  const raw = await openRouterFetch(
    {
      model: OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a ${lang} ${testType} assessment. Return only the JSON array.` },
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

// ─── Submission Evaluation ────────────────────────────────────────────────────

export async function evaluateSubmission(
  skill: Skill,
  testType: TestType,
  questions: AIQuestion[],
  answers: (string | number | null)[],
): Promise<EvaluationResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No API key.");

  const lang = SKILL_LABELS[skill] ?? skill;

  const answerSummary = questions.map((q, i) => {
    const ans = answers[i];
    if (q.type === "mcq") {
      const chosen = typeof ans === "number" ? q.options?.[ans] ?? "No answer" : "No answer";
      const correct = q.options?.[q.correct ?? 0] ?? "";
      return `Q${i + 1} [MCQ]: "${q.prompt}"\n  → Candidate chose: "${chosen}"\n  → Correct: "${correct}"`;
    }
    return `Q${i + 1} [${q.type}]: "${q.prompt}"\n  → Candidate answer: "${ans ?? "No answer"}"`;
  }).join("\n\n");

  const systemPrompt = `You are an expert ${lang} technical evaluator. Evaluate this assessment submission fairly and return ONLY valid JSON (no markdown fences):

{
  "totalScore": <0-100>,
  "questionScores": [
    { "questionId": "q1", "score": <0-10>, "feedback": "brief feedback", "isCorrect": true/false },
    ...one per question...
  ],
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
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

// ─── AI Assistant (Hint Only) ─────────────────────────────────────────────────

export async function getHint(
  skill: Skill,
  currentQuestion: AIQuestion,
  userCode: string,
  history: ChatMessage[],
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No API key.");

  const lang = SKILL_LABELS[skill] ?? skill;

  const systemPrompt = `You are a helpful ${lang} coding mentor for the Elevate AI Assessment Platform. 
  
Your ONLY role is to give hints, guidance, and conceptual direction. You must NEVER:
- Give the complete solution or final answer
- Write more than a small snippet (< 5 lines) of code
- Solve the problem for the candidate

You MUST only:
- Point the candidate in the right direction
- Explain relevant concepts or algorithms
- Suggest debugging strategies
- Ask Socratic questions to guide thinking
- Explain what the error message means

Current question context:
Type: ${currentQuestion.type}
Question: ${currentQuestion.prompt}
${userCode ? `\nCandidate's current code/answer:\n\`\`\`\n${userCode}\n\`\`\`` : ""}

Be concise, encouraging, and mentor-like. Do not exceed 150 words.`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  return openRouterFetch(
    {
      model: OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
      messages,
      temperature: 0.6,
      max_tokens: 300,
    },
    apiKey,
  );
}
