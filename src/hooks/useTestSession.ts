import { useState, useCallback } from "react";
import { generateQuestions, evaluateSubmission, type EvaluationResult } from "@/lib/openrouter";
import { useSession } from "@/lib/store";

export interface UseTestSessionReturn {
  isGenerating: boolean;
  isEvaluating: boolean;
  generateError: string | null;
  evaluateError: string | null;
  generateTest: () => Promise<void>;
  submitTest: () => Promise<EvaluationResult | null>;
}

export function useTestSession(): UseTestSessionReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [evaluateError, setEvaluateError] = useState<string | null>(null);

  const { skill, testType, history, answers, setQuestions, setQuestionsLoading, setQuestionsError, finalize } =
    useSession();

  const generateTest = useCallback(async () => {
    if (!skill || !testType) return;
    setIsGenerating(true);
    setGenerateError(null);
    setQuestionsLoading(true);
    setQuestionsError(null);

    try {
      // Collect previous question prompts to avoid repetition
      const previousPrompts = history
        .filter((h) => h.skill === skill && h.testType === testType)
        .flatMap((h) => []) // We don't store question text in history, just for uniqueness signal
        .slice(0, 5);

      const qs = await generateQuestions(skill, testType, previousPrompts);
      setQuestions(qs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate questions";
      setGenerateError(msg);
      setQuestionsError(msg);
    } finally {
      setIsGenerating(false);
      setQuestionsLoading(false);
    }
  }, [skill, testType, history, setQuestions, setQuestionsLoading, setQuestionsError]);

  const submitTest = useCallback(async (): Promise<EvaluationResult | null> => {
    const { questions } = useSession.getState();
    if (!skill || !testType || questions.length === 0) return null;

    setIsEvaluating(true);
    setEvaluateError(null);

    try {
      const result = await evaluateSubmission(skill, testType, questions, answers);
      finalize(result.totalScore, result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to evaluate submission";
      setEvaluateError(msg);
      // Fallback: compute MCQ score locally
      const { questions: qs, answers: ans } = useSession.getState();
      const mcqQs = qs.filter((q) => q.type === "mcq");
      const correct = mcqQs.filter((q, i) => {
        const ansIndex = qs.indexOf(q);
        return ans[ansIndex] === q.correct;
      }).length;
      const fallbackScore = mcqQs.length > 0 ? Math.round((correct / mcqQs.length) * 40) : 40; // 40% from MCQ
      finalize(fallbackScore, null);
      return null;
    } finally {
      setIsEvaluating(false);
    }
  }, [skill, testType, answers, finalize]);

  return { isGenerating, isEvaluating, generateError, evaluateError, generateTest, submitTest };
}
