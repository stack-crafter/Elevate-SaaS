// ─── Career Models ────────────────────────────────────────────────────────────

export interface CareerGuidance {
  headline: string;
  summary: string;
  strengths: { title: string; detail: string }[];
  improvements: { title: string; detail: string }[];
  careerPaths: { role: string; fit: "Strong" | "Good" | "Possible"; reason: string }[];
  nextSteps: string[];
  learningResources: { topic: string; suggestion: string }[];
  overallReadiness: number; // 0-100
}
