// ─── Assessment Models ────────────────────────────────────────────────────────

export interface AIQuestion {
  id: string;
  type: "mcq" | "theory" | "coding" | "vibe_coding";
  prompt: string;
  /** MCQ only */
  options?: string[];
  /** MCQ only – 0-indexed */
  correct?: number;
  /** Coding only */
  language?: string;
  /** Coding only */
  starterCode?: string;
}

export interface QuestionScore {
  questionId: string;
  score: number; // 0-10
  feedback: string;
  isCorrect?: boolean; // MCQ only
}

export interface EvaluationResult {
  totalScore: number; // 0-100
  questionScores: QuestionScore[];
  strengths: string[];
  weaknesses: string[];
  overallFeedback: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
