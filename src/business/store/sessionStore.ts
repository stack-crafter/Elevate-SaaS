import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AIQuestion, EvaluationResult, ChatMessage } from "@/models/assessment";
import type { Skill, TestType, BadgeTier, Statistics, HistoryEntry } from "@/models/session";
import { tierFor, jobFor } from "@/utilities/scoring";
import { signOut, onAuthStateChanged, getCurrentUser } from "@/data/repositories/authRepository";
import { saveTestResult } from "@/data/repositories/testsRepository";

// ─── Session State Interface ──────────────────────────────────────────────────

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
  questions: AIQuestion[];
  questionsLoading: boolean;
  questionsError: string | null;

  // Answers: indexed by question position, value depends on type
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

  // ─── Actions ────────────────────────────────────────────────────────────────
  login: (user: { name: string; email: string }) => void;
  logout: () => void;
  setApiKey: (key: string) => void;

  setSkill: (s: Skill) => void;
  setTestType: (t: TestType) => void;

  setQuestions: (qs: AIQuestion[]) => void;
  setQuestionsLoading: (v: boolean) => void;
  setQuestionsError: (e: string | null) => void;

  setAnswer: (i: number, v: number | string) => void;

  addVibeMessage: (questionId: string, message: ChatMessage) => void;
  incrementVibeHint: (questionId: string) => void;

  /** Called after AI evaluation completes. Returns the badge tier. */
  finalize: (score: number, feedback?: EvaluationResult | null) => BadgeTier;

  /** Reset current test state (keep history + stats) */
  reset: () => void;
}

// ─── Default Statistics ───────────────────────────────────────────────────────

const DEFAULT_STATS: Statistics = {
  totalTests: 0,
  totalPassed: 0,
  totalFailed: 0,
  highestScore: 0,
  averageScore: 0,
  currentBadge: "None",
  recommendedJobType: "Needs Improvement",
};

// ─── Zustand Store ────────────────────────────────────────────────────────────

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      authed: false,
      authLoading: true,
      user: null,
      apiKey: null,

      skill: null,
      testType: null,

      questions: [],
      questionsLoading: false,
      questionsError: null,

      answers: Array(10).fill(null),

      score: null,
      aiFeedback: null,

      history: [],
      stats: { ...DEFAULT_STATS },
      vibeChats: {},

      // ─── Auth ──────────────────────────────────────────────────────────────
      login: (user) => {
        set({ authed: true, authLoading: false, user });
      },
      logout: () => {
        signOut().catch(() => {});
        set({ authed: false, authLoading: false, user: null });
      },
      setApiKey: (key) => {
        localStorage.setItem("elevate_openrouter_key", key);
        set({ apiKey: key });
      },

      // ─── Test Setup ────────────────────────────────────────────────────────
      setSkill: (s) =>
        set({
          skill: s,
          questions: [],
          questionsLoading: false,
          questionsError: null,
          answers: Array(10).fill(null),
          score: null,
          aiFeedback: null,
          vibeChats: {},
        }),
      setTestType: (t) =>
        set({
          testType: t,
          questions: [],
          questionsLoading: false,
          questionsError: null,
          answers: Array(10).fill(null),
          score: null,
          aiFeedback: null,
          vibeChats: {},
        }),

      // ─── Questions ─────────────────────────────────────────────────────────
      setQuestions: (qs) => set({ questions: qs }),
      setQuestionsLoading: (v) => set({ questionsLoading: v }),
      setQuestionsError: (e) => set({ questionsError: e }),

      // ─── Answers ───────────────────────────────────────────────────────────
      setAnswer: (i, v) => {
        const a = [...get().answers];
        a[i] = v;
        set({ answers: a });
      },

      // ─── Vibe Chats ────────────────────────────────────────────────────────
      addVibeMessage: (qId, msg) => {
        const chats = { ...get().vibeChats };
        const chat = chats[qId] ?? { history: [], hintCount: 0 };
        chats[qId] = { ...chat, history: [...chat.history, msg] };
        set({ vibeChats: chats });
      },

      incrementVibeHint: (qId) => {
        const chats = { ...get().vibeChats };
        const chat = chats[qId] ?? { history: [], hintCount: 0 };
        chats[qId] = { ...chat, hintCount: chat.hintCount + 1 };
        set({ vibeChats: chats });
      },

      // ─── Finalize ──────────────────────────────────────────────────────────
      finalize: (score, feedback = null) => {
        const { skill, testType, history, stats } = get();
        const tier = tierFor(score);
        const job = jobFor(tier);

        const entry: HistoryEntry = {
          skill: skill!,
          testType: testType!,
          score,
          date: new Date().toISOString(),
          tier,
          recommendedJobType: job,
          feedback,
        };

        const allScores = [score, ...history.map((h) => h.score)];
        const avg = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);

        const newStats: Statistics = {
          totalTests: stats.totalTests + 1,
          totalPassed: stats.totalPassed + (score >= 50 ? 1 : 0),
          totalFailed: stats.totalFailed + (score < 50 ? 1 : 0),
          highestScore: Math.max(stats.highestScore, score),
          averageScore: avg,
          currentBadge: tier,
          recommendedJobType: job,
        };

        // Persist to Firebase in background if logged in
        const currentUser = getCurrentUser();
        if (currentUser) {
          saveTestResult(currentUser.uid, entry).catch((err) => {
            console.error("Failed to save test result to Firebase:", err);
          });
        }

        set({
          score,
          aiFeedback: feedback,
          history: [entry, ...history].slice(0, 20),
          stats: newStats,
        });
        return tier;
      },

      // ─── Reset (keep history + stats) ─────────────────────────────────────
      reset: () =>
        set({
          skill: null,
          testType: null,
          questions: [],
          questionsLoading: false,
          questionsError: null,
          answers: Array(10).fill(null),
          score: null,
          aiFeedback: null,
          vibeChats: {},
        }),
    }),
    { name: "elevate-assess-session-v2" },
  ),
);

// Subscribe to Firebase Auth state updates
onAuthStateChanged((user) => {
  if (user) {
    useSession.setState({
      authed: true,
      authLoading: false,
      user: {
        name: user.displayName || user.email?.split("@")[0] || "Candidate",
        email: user.email || "",
      },
    });
  } else {
    useSession.setState({
      authed: false,
      authLoading: false,
      user: null,
    });
  }
});
