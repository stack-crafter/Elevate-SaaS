import { useState, useCallback } from "react";
import { getHint, type ChatMessage } from "@/lib/openrouter";
import type { Skill } from "@/lib/store";
import type { AIQuestion } from "@/lib/openrouter";

export interface UseAIAssistantReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

export function useAIAssistant(
  skill: Skill | null,
  currentQuestion: AIQuestion | null,
  currentAnswer: string | number | null,
): UseAIAssistantReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!skill || !currentQuestion) return;

      const userMsg: ChatMessage = { role: "user", content: text };
      const updatedHistory = [...messages, userMsg];
      setMessages(updatedHistory);
      setIsLoading(true);
      setError(null);

      try {
        const userCode =
          currentQuestion.type === "coding"
            ? String(currentAnswer ?? "")
            : currentQuestion.type === "theory"
            ? String(currentAnswer ?? "")
            : "";

        const reply = await getHint(skill, currentQuestion, userCode, updatedHistory);
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to get hint";
        setError(msg);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${msg}` },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [skill, currentQuestion, currentAnswer, messages],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}
