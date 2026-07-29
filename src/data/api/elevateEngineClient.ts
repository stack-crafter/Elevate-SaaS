// ─── Elevate Engine API Client (Render Backend) ────────────────────────────────

export const ELEVATE_ENGINE_BASE_URL =
  import.meta.env.VITE_ELEVATE_ENGINE_URL || "https://elevate-backend-rtdg.onrender.com";

/**
 * Maps web app skill keys → Elevate Engine skill names (topic_pool values).
 * Skills not in this map are unsupported by the engine → fall back to OpenRouter.
 */
export const ENGINE_SKILL_MAP: Record<string, string> = {
  java: "Java",
  python: "Python",
  cpp: "C++",
  flutter: "Flutter",
  csharp: "C#",
};

/**
 * Maps test type → engine mode.
 * "pure" | "vibe" | "experience" — exact match with engine.
 */
export function mapModeToEngine(testType: string): string {
  if (testType === "pure" || testType === "vibe" || testType === "experience") return testType;
  return "pure";
}

/** Raw question shape returned by the Elevate Engine */
export interface EngineQuestion {
  session_id: string;
  question_type: "MCQ" | "theory" | "coding" | "vibe_coding";
  question: string;
  topic: string;
  section: string;
  section_question_number: number;
  section_total_questions: number;
  overall_question_number: number;
  overall_total_questions: number;
  options?: Record<string, string>; // A, B, C, D for MCQ
  starter_code?: string;
  language?: string;
  model_answer?: string; // present on theory questions for evaluation
}

/** Engine session start response */
export interface EngineSession {
  session_id: string;
  mode: string;
  current_level: string;
  sections: Record<string, { asked: number; marks: number; marks_possible: number; status: string }>;
  total_questions: number;
  max_score: number;
}

/** Check health of Elevate Engine backend */
export async function checkElevateEngineHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${ELEVATE_ENGINE_BASE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.status === "ok";
  } catch {
    return false;
  }
}

/** Start a new test session with the Elevate Engine */
export async function startEngineSession(
  userId: string,
  skill: string,
  mode: string,
): Promise<EngineSession | null> {
  try {
    const res = await fetch(`${ELEVATE_ENGINE_BASE_URL}/test/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, skill, mode }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Elevate Engine startSession failed:", err);
    return null;
  }
}

/** Get the next question from the Elevate Engine session */
export async function getNextEngineQuestion(
  sessionId: string,
  questionType?: string,
): Promise<EngineQuestion | null> {
  try {
    const res = await fetch(`${ELEVATE_ENGINE_BASE_URL}/test/next-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        ...(questionType ? { question_type: questionType } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // If the test is done (no more questions), the engine returns done/completed
    if (data.status === "completed" || data.status === "done" || !data.question) return null;
    return data as EngineQuestion;
  } catch (err) {
    console.warn("Elevate Engine getNextQuestion failed:", err);
    return null;
  }
}

/** Submit an answer to the Elevate Engine and get feedback */
export async function submitEngineAnswer(
  sessionId: string,
  opts: {
    selectedOption?: string | null;
    candidateAnswer?: string | null;
    sourceCode?: string | null;
    language?: string | null;
  },
): Promise<{ was_correct: boolean; score: number; feedback?: string } | null> {
  try {
    const res = await fetch(`${ELEVATE_ENGINE_BASE_URL}/test/submit-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        selected_option: opts.selectedOption ?? null,
        candidate_answer: opts.candidateAnswer ?? null,
        source_code: opts.sourceCode ?? null,
        language: opts.language ?? null,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Elevate Engine submitAnswer failed:", err);
    return null;
  }
}

/** Get test results for a completed engine session */
export async function getEngineSessionResult(
  sessionId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${ELEVATE_ENGINE_BASE_URL}/test/result/${sessionId}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Elevate Engine getResult failed:", err);
    return null;
  }
}

/** Get personalized recommendation roadmap for a completed engine session */
export async function getTestRecommendationWithEngine(
  sessionId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${ELEVATE_ENGINE_BASE_URL}/test/recommendation/${sessionId}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Elevate Engine test recommendation failed:", err);
    return null;
  }
}

/** Evaluate MCQ answer via Elevate Engine */
export async function evaluateMCQWithEngine(
  selectedOption: string,
  correctOption: string,
): Promise<{ was_correct: boolean; score: number } | null> {
  try {
    const res = await fetch(`${ELEVATE_ENGINE_BASE_URL}/evaluate-mcq`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selected_option: selectedOption,
        correct_option: correctOption,
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Elevate Engine evaluate-mcq failed:", err);
    return null;
  }
}

/** Evaluate Theory answer via Elevate Engine */
export async function evaluateTheoryWithEngine(
  candidateAnswer: string,
  modelAnswer: string,
): Promise<{ was_correct: boolean; score: number; feedback?: string } | null> {
  try {
    const res = await fetch(`${ELEVATE_ENGINE_BASE_URL}/evaluate-theory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate_answer: candidateAnswer,
        model_answer: modelAnswer,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Elevate Engine evaluate-theory failed:", err);
    return null;
  }
}

/** Evaluate Coding answer via Elevate Engine */
export async function evaluateCodingWithEngine(
  sourceCode: string,
  language: string,
  testCases: Array<{ input?: string; expected_output?: string }>,
): Promise<{
  was_correct: boolean;
  score: number;
  passed_count?: number;
  total_count?: number;
  test_results?: Array<{ passed: boolean; actual_output?: string; stderr?: string }>;
} | null> {
  try {
    const res = await fetch(`${ELEVATE_ENGINE_BASE_URL}/evaluate-coding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: sourceCode,
        language: language.toLowerCase(),
        test_cases: testCases.map((tc) => ({
          input: tc.input || "",
          expected_output: tc.expected_output || "",
        })),
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Elevate Engine evaluate-coding failed:", err);
    return null;
  }
}
