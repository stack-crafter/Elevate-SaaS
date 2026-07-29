// ─── Elevate Engine API Client (Render Backend) ────────────────────────────────

export const ELEVATE_ENGINE_BASE_URL =
  import.meta.env.VITE_ELEVATE_ENGINE_URL || "https://elevate-backend-rtdg.onrender.com";

/** Check health of Elevate Engine backend */
export async function checkElevateEngineHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${ELEVATE_ENGINE_BASE_URL}/health`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.status === "ok";
  } catch {
    return false;
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
    console.warn("Elevate Engine evaluate-mcq fallback triggered:", err);
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
    console.warn("Elevate Engine evaluate-theory fallback triggered:", err);
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
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Elevate Engine evaluate-coding fallback triggered:", err);
    return null;
  }
}

/** Fetch test recommendation roadmap for completed test session */
export async function getTestRecommendationWithEngine(
  sessionId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${ELEVATE_ENGINE_BASE_URL}/test/recommendation/${sessionId}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Elevate Engine test recommendation fallback triggered:", err);
    return null;
  }
}
