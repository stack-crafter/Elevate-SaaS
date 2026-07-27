// ─── Backward-Compatibility Shim ─────────────────────────────────────────────
// src/lib/store.ts → re-exports from the Business and Models layers
// All existing @/lib/store imports in routes/components keep working unchanged.

export { useSession } from "@/business/store/sessionStore";
export type { SessionState } from "@/business/store/sessionStore";

export { tierFor, jobFor } from "@/utilities/scoring";

export type { Skill, TestType, BadgeTier, Statistics, HistoryEntry } from "@/models/session";
