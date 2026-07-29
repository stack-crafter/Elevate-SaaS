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
  /** Elevate Engine metadata — used for engine-aware evaluation, not shown in UI */
  _engineSessionId?: string;
  _engineQuestionType?: string;
  _engineOptions?: Record<string, string>;
  _modelAnswer?: string;
  _engineOverallNumber?: number;
  _engineOverallTotal?: number;
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
