import { create } from "zustand";
import type { ProctoringConfig, ProctoringTerminationReason, Violation } from "./proctoring/types";
import { DEFAULT_PROCTORING_CONFIG } from "./proctoring/config";

export interface ProctoringState {
  config: ProctoringConfig;
  warnings: number;
  violations: Violation[];
  terminated: boolean;
  terminationReason: ProctoringTerminationReason | null;

  setConfig: (partial: Partial<ProctoringConfig>) => void;
  addViolation: (v: Omit<Violation, "id" | "warningCountAfter">) => {
    warnings: number;
    terminated: boolean;
  };
  reset: () => void;
}

let violationSeq = 0;

export const useProctoringStore = create<ProctoringState>()((set, get) => ({
  config: DEFAULT_PROCTORING_CONFIG,
  warnings: 0,
  violations: [],
  terminated: false,
  terminationReason: null,

  setConfig: (partial) => set((s) => ({ config: { ...s.config, ...partial } })),

  addViolation: (v) => {
    const { config, warnings, violations, terminated } = get();
    if (terminated) return { warnings, terminated };

    const weight = config.weights[v.type] ?? 1;
    const newWarnings = warnings + weight;
    const willTerminate = newWarnings >= config.maxWarnings;

    const entry: Violation = {
      ...v,
      id: `violation_${Date.now()}_${violationSeq++}`,
      warningCountAfter: newWarnings,
    };

    set({
      warnings: newWarnings,
      violations: [...violations, entry],
      terminated: willTerminate,
      terminationReason: willTerminate ? "warnings_exceeded" : null,
    });

    return { warnings: newWarnings, terminated: willTerminate };
  },

  reset: () =>
    set({
      warnings: 0,
      violations: [],
      terminated: false,
      terminationReason: null,
    }),
}));
