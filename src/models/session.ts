// ─── Session Models ───────────────────────────────────────────────────────────
import type { EvaluationResult, ChatMessage } from "./assessment";

export type Skill =
  "java" | "python" | "cpp" | "flutter" | "react" | "nodejs" | "ai" | "ml" | "datascience";

export type TestType = "pure" | "vibe" | "experience";

export type BadgeTier = "Gold" | "Silver" | "Bronze" | "None";

export interface Statistics {
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  highestScore: number;
  averageScore: number;
  currentBadge: BadgeTier;
  recommendedJobType: string;
}

export interface HistoryEntry {
  skill: Skill;
  testType: TestType;
  score: number;
  date: string;
  tier: BadgeTier;
  recommendedJobType: string;
  feedback?: EvaluationResult | null;
}

export interface SessionState {
  // Auth
  authed: boolean;
  authLoading: boolean;
  user: { name: string; email: string } | null;
  apiKey: string | null;

  // Current test selection
  skill: Skill | null;
  testType: TestType | null;

  // AI-generated questions for current test
  questions: import("./assessment").AIQuestion[];
  questionsLoading: boolean;
  questionsError: string | null;

  // Answers: indexed by question position
  answers: (number | string | null)[];

  // Current test score & AI evaluation result
  score: number | null;
  aiFeedback: EvaluationResult | null;

  // History (persisted)
  history: HistoryEntry[];

  // Aggregate statistics (persisted)
  stats: Statistics;

  // Vibe Coding chat history and hint counts per question
  vibeChats: Record<string, { history: ChatMessage[]; hintCount: number }>;
}
