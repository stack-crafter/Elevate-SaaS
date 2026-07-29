import { useState, useCallback } from "react";
import type { EvaluationResult } from "@/models/assessment";
import {
  generateQuestions,
  evaluateSubmission,
  submitAndFetchNextQuestion,
  getFinalEngineResult,
} from "@/data/repositories/assessmentRepository";
import { useSession } from "@/business/store/sessionStore";

export interface UseTestSessionReturn {
  isGenerating: boolean;
  isEvaluating: boolean;
  generateError: string | null;
  evaluateError: string | null;
  generateTest: () => Promise<void>;
  submitTest: () => Promise<EvaluationResult | null>;
  submitQuestionAndNext: (currentI: number, answer: string | number | null) => Promise<boolean>;
}

export function useTestSession(): UseTestSessionReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [evaluateError, setEvaluateError] = useState<string | null>(null);

  const {
    skill,
    testType,
    history,
    answers,
    setQuestions,
    setQuestionsLoading,
    setQuestionsError,
    finalize,
  } = useSession();

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
        .flatMap(() => []) // We don't store question text in history, just for uniqueness signal
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

  const submitQuestionAndNext = useCallback(
    async (currentI: number, answer: string | number | null): Promise<boolean> => {
      const { questions, answers: currentAnswers } = useSession.getState();
      const currentQuestion = questions[currentI];
      const sessionId = currentQuestion?._engineSessionId;

      if (!sessionId) {
        // Fallback / OpenRouter flow does not fetch next question from engine
        return true;
      }

      setIsEvaluating(true);
      try {
        const nextQuestion = await submitAndFetchNextQuestion(
          sessionId,
          currentQuestion,
          answer,
          currentI + 1,
        );

        if (nextQuestion) {
          // Append next question to questions list in store
          setQuestions([...questions, nextQuestion]);
          setIsEvaluating(false);
          return true;
        } else {
          // No more questions from engine: retrieve final session score & feedback
          const result = await getFinalEngineResult(sessionId, questions, currentAnswers);
          finalize(result.totalScore, result);
          setIsEvaluating(false);
          return false;
        }
      } catch (err) {
        console.warn("Elevate Engine submitQuestionAndNext failed:", err);
        setIsEvaluating(false);
        throw err;
      }
    },
    [setQuestions, finalize],
  );

  const submitTest = useCallback(async (): Promise<EvaluationResult | null> => {
    const { questions } = useSession.getState();
    if (!skill || !testType || questions.length === 0) return null;

    setIsEvaluating(true);
    setEvaluateError(null);

    try {
      const result = await evaluateSubmission(skill, testType, questions, answers.slice(0, questions.length));
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

  return {
    isGenerating,
    isEvaluating,
    generateError,
    evaluateError,
    generateTest,
    submitTest,
    submitQuestionAndNext,
  };
}
