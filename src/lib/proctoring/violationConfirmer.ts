import type { ProctoringConfig, ViolationType } from "./types";

// ─── AI Proctoring — Violation Confirmer ─────────────────────────────────────
//
// Raw per-cycle detections are noisy (a hand briefly crossing the face, a
// momentary tracking glitch, etc). This module requires a violation type to
// be detected on `confirmationThreshold` consecutive cycles before it's
// "confirmed" and eligible to be logged — and then enforces a per-type
// cooldown so one ongoing issue doesn't spam multiple violations back to back.
// ─────────────────────────────────────────────────────────────────────────────

interface TypeState {
  consecutiveHits: number;
  lastConfirmedAt: number; // epoch ms, 0 = never
}

export class ViolationConfirmer {
  private state = new Map<ViolationType, TypeState>();

  constructor(
    private config: Pick<ProctoringConfig, "confirmationThreshold" | "perTypeCooldownMs">,
  ) {}

  updateConfig(config: Pick<ProctoringConfig, "confirmationThreshold" | "perTypeCooldownMs">) {
    this.config = config;
  }

  /**
   * Feed the set of violation types detected in the current cycle.
   * Returns the subset that should be logged as confirmed violations now.
   */
  processCycle(detectedTypes: Set<ViolationType>, now: number = Date.now()): ViolationType[] {
    const confirmed: ViolationType[] = [];

    for (const type of this.allKnownTypes(detectedTypes)) {
      const s = this.state.get(type) ?? { consecutiveHits: 0, lastConfirmedAt: 0 };

      if (detectedTypes.has(type)) {
        s.consecutiveHits += 1;

        const cooledDown = now - s.lastConfirmedAt >= this.config.perTypeCooldownMs;
        if (s.consecutiveHits >= this.config.confirmationThreshold && cooledDown) {
          confirmed.push(type);
          s.lastConfirmedAt = now;
          s.consecutiveHits = 0; // reset streak after confirming
        }
      } else {
        s.consecutiveHits = 0; // any clean cycle resets the streak
      }

      this.state.set(type, s);
    }

    return confirmed;
  }

  reset() {
    this.state.clear();
  }

  private allKnownTypes(detectedTypes: Set<ViolationType>): ViolationType[] {
    const tracked = new Set<ViolationType>(this.state.keys());
    for (const t of detectedTypes) tracked.add(t);
    return Array.from(tracked);
  }
}
