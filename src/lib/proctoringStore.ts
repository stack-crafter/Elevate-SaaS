// ─── Backward-Compatibility Shim ─────────────────────────────────────────────
// src/lib/proctoringStore.ts → re-exports from Business store layer
export { useProctoringStore } from "@/business/store/proctoringStore";
export type { ProctoringState } from "@/business/store/proctoringStore";
