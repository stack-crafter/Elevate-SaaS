import { useState, useCallback } from "react";
import { getCodingHint, type ChatMessage } from "@/lib/openrouter";
import { useSession } from "@/lib/store";
import type { Skill } from "@/lib/store";
import type { AIQuestion } from "@/lib/openrouter";

export interface UseVibeAssistantReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  hintCount: number;
  remainingHints: number;
}

export function useVibeAssistant(
  skill: Skill | null,
  currentQuestion: AIQuestion | null,
  currentAnswer: string | number | null,
): UseVibeAssistantReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { vibeChats, addVibeMessage, incrementVibeHint } = useSession();

  const qId = currentQuestion?.id ?? "";
  const chatState = vibeChats[qId] ?? { history: [], hintCount: 0 };
  const messages = chatState.history;
  const hintCount = chatState.hintCount;
  const remainingHints = Math.max(0, 3 - hintCount);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!skill || !currentQuestion || !qId) return;
      if (hintCount >= 3) {
        setError("You have reached the maximum limit of 3 AI hints for this question.");
        return;
      }

      const userMsg: ChatMessage = { role: "user", content: text };
      // Build the history that the API will see (current history + new user message)
      const historyForApi = [...messages, userMsg];

      // Optimistically add user message to UI
      addVibeMessage(qId, userMsg);
      setIsLoading(true);
      setError(null);

      try {
        const userCode = String(currentAnswer ?? "");
        const reply = await getCodingHint(skill, currentQuestion, userCode, historyForApi);
        // Only count a hint after a successful AI response
        incrementVibeHint(qId);
        addVibeMessage(qId, { role: "assistant", content: reply });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to get hint";
        setError(msg);
        addVibeMessage(qId, { role: "assistant", content: `⚠️ ${msg}` });
      } finally {
        setIsLoading(false);
      }
    },
    [
      skill,
      currentQuestion,
      qId,
      currentAnswer,
      messages,
      hintCount,
      addVibeMessage,
      incrementVibeHint,
    ],
  );

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    hintCount,
    remainingHints,
  };
}
