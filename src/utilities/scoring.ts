import type { BadgeTier } from "@/models/session";

// ─── Badge Scoring Helpers ────────────────────────────────────────────────────

export function tierFor(score: number): BadgeTier {
  if (score >= 90) return "Gold";
  if (score >= 75) return "Silver";
  if (score >= 50) return "Bronze";
  return "None";
}

export function jobFor(tier: BadgeTier): string {
  switch (tier) {
    case "Gold":
      return "Senior Employee";
    case "Silver":
      return "Junior Employee";
    case "Bronze":
      return "Internship";
    default:
      return "Needs Improvement";
  }
}
