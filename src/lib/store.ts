import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Skill = "java" | "python" | "cpp";
export type TestType = "pure" | "vibe" | "experience";

export interface SessionState {
  authed: boolean;
  user: { name: string; email: string } | null;
  skill: Skill | null;
  testType: TestType | null;
  answers: (number | string | null)[];
  score: number | null;
  history: { skill: Skill; testType: TestType; score: number; date: string; tier: string }[];
  login: (user: { name: string; email: string }) => void;
  logout: () => void;
  setSkill: (s: Skill) => void;
  setTestType: (t: TestType) => void;
  setAnswer: (i: number, v: number | string) => void;
  reset: () => void;
  finalize: (score: number) => string;
}

function tierFor(score: number) {
  if (score >= 90) return "Platinum";
  if (score >= 75) return "Gold";
  if (score >= 55) return "Silver";
  return "Bronze";
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      authed: false,
      user: null,
      skill: null,
      testType: null,
      answers: Array(10).fill(null),
      score: null,
      history: [],
      login: (user) => set({ authed: true, user }),
      logout: () => set({ authed: false, user: null }),
      setSkill: (s) => set({ skill: s }),
      setTestType: (t) => set({ testType: t }),
      setAnswer: (i, v) => {
        const a = [...get().answers];
        a[i] = v;
        set({ answers: a });
      },
      reset: () => set({ skill: null, testType: null, answers: Array(10).fill(null), score: null }),
      finalize: (score) => {
        const t = tierFor(score);
        const s = get();
        if (s.skill && s.testType) {
          set({
            score,
            history: [
              { skill: s.skill, testType: s.testType, score, date: new Date().toISOString(), tier: t },
              ...s.history,
            ].slice(0, 20),
          });
        }
        return t;
      },
    }),
    { name: "elevate-assess-session" },
  ),
);
