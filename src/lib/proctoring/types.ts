// ─── AI Proctoring — Shared Types ────────────────────────────────────────────

export type ViolationType =
  | "multiple_people"
  | "no_face"
  | "mobile_phone"
  | "second_laptop"
  | "tablet"
  | "camera_blocked"
  | "suspicious_movement";

export const VIOLATION_LABEL: Record<ViolationType, string> = {
  multiple_people: "Multiple People Detected",
  no_face: "No Face Detected",
  mobile_phone: "Mobile Phone Detected",
  second_laptop: "Second Laptop Detected",
  tablet: "Tablet Detected",
  camera_blocked: "Camera Blocked",
  suspicious_movement: "Suspicious Head Movement",
};

/** A single confirmed (debounced) violation, ready to log. */
export interface Violation {
  id: string;
  type: ViolationType;
  label: string;
  timestamp: string; // ISO string
  warningCountAfter: number;
  /** JPEG data URL of the frame at the moment of violation. Kept in-memory only. */
  screenshot: string | null;
}

/** Per-violation-type point weight added to the running warning count. */
export type WarningWeights = Record<ViolationType, number>;

export interface ProctoringConfig {
  /** How often to sample a frame for AI detection, in ms. */
  frameIntervalMs: number;
  /** Total warnings at/above which the exam is auto-terminated. */
  maxWarnings: number;
  /** Points added per confirmed violation type. */
  weights: WarningWeights;
  /** Consecutive confirmations required before a detection is logged as a violation. */
  confirmationThreshold: number;
  /** Cooldown after logging a violation of a given type before it can fire again, in ms. */
  perTypeCooldownMs: number;
}

export type PermissionStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported";

export type MonitoringStatus = "idle" | "loading_models" | "active" | "stopped" | "error";

/** Reason the exam session ended, mirrors test.tsx's existing anti-cheat reasons. */
export type ProctoringTerminationReason = "warnings_exceeded";
