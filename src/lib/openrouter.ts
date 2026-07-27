// ─── Backward-Compatibility Shim ─────────────────────────────────────────────
// src/lib/openrouter.ts → re-exports from Models and Data layers
// All existing @/lib/openrouter imports keep working unchanged.

// Models
export type { AIQuestion, QuestionScore, EvaluationResult, ChatMessage } from "@/models/assessment";
export type { CareerGuidance } from "@/models/career";

// Data repositories
export { generateQuestions, evaluateSubmission } from "@/data/repositories/assessmentRepository";
export { getHint, getCodingHint } from "@/data/repositories/hintRepository";
export { generateCareerGuidance } from "@/data/repositories/careerRepository";
