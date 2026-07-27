// ─── Backward-Compatibility Shim ─────────────────────────────────────────────
// src/lib/questions.ts → re-exports from Data layer
export { getQuestions } from "@/data/repositories/questionFallbackRepository";
export type { Question, AIQuestion } from "@/data/repositories/questionFallbackRepository";
