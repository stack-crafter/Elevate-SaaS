import type { ProctoringConfig } from "./types";

// ─── AI Proctoring — Default Configuration ───────────────────────────────────
//
// All values here are safe to tune without touching detection/orchestration
// logic. Weights follow the spec: minor violations = +1, "Multiple People" = +2.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_PROCTORING_CONFIG: ProctoringConfig = {
  frameIntervalMs: 5000, // capture + analyze one frame every 5s
  maxWarnings: 3,
  confirmationThreshold: 2, // require 2 consecutive detections before logging a violation
  perTypeCooldownMs: 8000, // don't re-log the same violation type within 8s
  weights: {
    mobile_phone: 1,
    second_laptop: 1,
    tablet: 1,
    no_face: 1,
    camera_blocked: 1,
    suspicious_movement: 1,
    multiple_people: 2,
  },
};
