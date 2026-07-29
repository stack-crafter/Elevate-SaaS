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

  const checkFallbackStagePromotion = useCallback(
    async (stageIndex: number): Promise<boolean> => {
      const { questions, answers: currentAnswers } = useSession.getState();
      if (testType === "experience") {
        return true; // No stages/promotion gate in experience mode
      }

      if (stageIndex === 9) {
        // End of Beginner stage (questions 0 to 9)
        setIsEvaluating(true);
        try {
          const result = await evaluateSubmission(
            skill!,
            testType!,
            questions.slice(0, 10),
            currentAnswers.slice(0, 10),
          );
          if (result.totalScore < 70) {
            // Fail Beginner — terminate test early
            finalize(result.totalScore, {
              ...result,
              overallFeedback: `Failed to promote from Beginner stage (Score: ${result.totalScore}/100, threshold: 70%). Assessment terminated early.`,
            });
            setIsEvaluating(false);
            return false;
          }
          setIsEvaluating(false);
          return true;
        } catch (err) {
          console.warn("Beginner stage evaluation failed, allowing proceed:", err);
          setIsEvaluating(false);
          return true;
        }
      }

      if (stageIndex === 19) {
        // End of Intermediate stage (questions 10 to 19)
        setIsEvaluating(true);
        try {
          const combinedResult = await evaluateSubmission(
            skill!,
            testType!,
            questions.slice(0, 20),
            currentAnswers.slice(0, 20),
          );
          const intermediateResult = await evaluateSubmission(
            skill!,
            testType!,
            questions.slice(10, 20),
            currentAnswers.slice(10, 20),
          );

          if (intermediateResult.totalScore < 70) {
            // Fail Intermediate — terminate test early. Combined score is the final result.
            finalize(combinedResult.totalScore, {
              ...combinedResult,
              overallFeedback: `Failed to promote from Intermediate stage (Score: ${intermediateResult.totalScore}/100, threshold: 70%). Assessment terminated early.`,
            });
            setIsEvaluating(false);
            return false;
          }
          setIsEvaluating(false);
          return true;
        } catch (err) {
          console.warn("Intermediate stage evaluation failed, allowing proceed:", err);
          setIsEvaluating(false);
          return true;
        }
      }

      return true;
    },
    [skill, testType, finalize],
  );

  const submitQuestionAndNext = useCallback(
    async (currentI: number, answer: string | number | null): Promise<boolean> => {
      // 1. Save answer in store
      if (answer !== null && answer !== undefined) {
        useSession.getState().setAnswer(currentI, answer);
      }

      const { questions, answers: currentAnswers } = useSession.getState();
      const currentQuestion = questions[currentI];
      const sessionId = currentQuestion?._engineSessionId;

      if (!sessionId) {
        // Fallback / OpenRouter flow — check stage promotion at question 10 (idx 9) and 20 (idx 19)
        if (currentI === 9 || currentI === 19) {
          return await checkFallbackStagePromotion(currentI);
        }
        return true;
      }

      setIsEvaluating(true);
      try {
        const { nextQuestion, wasCorrect } = await submitAndFetchNextQuestion(
          sessionId,
          currentQuestion,
          answer,
          currentI + 1,
        );

        if (currentQuestion) {
          currentQuestion._isCorrect = wasCorrect;
        }

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
    [setQuestions, finalize, checkFallbackStagePromotion],
  );

  const submitTest = useCallback(async (): Promise<EvaluationResult | null> => {
    const { questions } = useSession.getState();
    if (!skill || !testType || questions.length === 0) return null;

    setIsEvaluating(true);
    setEvaluateError(null);

    try {
      const result = await evaluateSubmission(
        skill,
        testType,
        questions,
        answers.slice(0, questions.length),
      );
      finalize(result.totalScore, result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to evaluate submission";
      setEvaluateError(msg);
      // Fallback: compute MCQ score locally
      const { questions: qs, answers: ans } = useSession.getState();
      const mcqQs = qs.filter((q) => q.type === "mcq");
      const correct = mcqQs.filter((q) => {
        if (q._engineSessionId && q._isCorrect !== undefined) {
          return q._isCorrect;
        }
        const ansIndex = qs.indexOf(q);
        return ans[ansIndex] === q.correct;
      }).length;
      const fallbackScore = mcqQs.length > 0 ? Math.round((correct / mcqQs.length) * 100) : 40;
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
