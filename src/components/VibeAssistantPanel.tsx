import { useEffect, useRef, useState } from "react";
import { Bot, ChevronLeft, ChevronRight, Send, AlertTriangle } from "lucide-react";
import { useVibeAssistant } from "@/hooks/useVibeAssistant";
import type { Skill } from "@/lib/store";
import type { AIQuestion } from "@/lib/openrouter";

interface VibeAssistantPanelProps {
  question: AIQuestion;
  skill: Skill;
  currentAnswer: string | number | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function VibeAssistantPanel({
  question,
  skill,
  currentAnswer,
  isOpen,
  setIsOpen,
}: VibeAssistantPanelProps) {
  const { messages, isLoading, error, sendMessage, hintCount, remainingHints } = useVibeAssistant(
    skill,
    question,
    currentAnswer,
  );

  const [input, setInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || remainingHints <= 0) return;
    setInput("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-12 shrink-0 flex-col items-center justify-center gap-4 rounded-xl border border-border bg-white py-6 hover:bg-surface-hover hover:border-border-strong transition-all duration-300"
        title="Open AI Mentor"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bot className="h-4.5 w-4.5" />
        </div>
        <span className="font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground [writing-mode:vertical-lr] rotate-180">
          AI Mentor
        </span>
        <ChevronLeft className="h-4 w-4 text-muted-foreground mt-2" />
      </button>
    );
  }

  return (
    <div
      className="flex w-full md:w-80 shrink-0 flex-col rounded-xl border border-border bg-white overflow-hidden shadow-sm transition-all duration-300"
      style={{ height: "374px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface-1 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[13px] font-semibold font-display">AI Programming Mentor</div>
            <div className="text-[10px] text-muted-foreground font-mono">
              Hints: {hintCount} / 3 ({remainingHints} left)
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground transition"
          title="Collapse Panel"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-1/40">
        {messages.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground bg-white">
            <Bot className="mx-auto h-6 w-6 mb-2 opacity-40 text-primary" />
            Ask for a hint on this question. I can guide you conceptually without giving away the
            solution.
            <div className="mt-2 text-[10px] font-semibold text-primary/80">3 hints remaining</div>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed shadow-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-white text-foreground border border-border"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-xl bg-white border border-border px-3 py-2 shadow-sm">
              <div
                className="h-1.5 w-1.5 rounded-full bg-primary/80 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="h-1.5 w-1.5 rounded-full bg-primary/80 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="h-1.5 w-1.5 rounded-full bg-primary/80 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 bg-white">
        {remainingHints <= 0 ? (
          <div className="flex items-start gap-1.5 rounded-lg border border-warning/20 bg-warning/5 p-2.5 text-left text-[11px] text-warning-hover font-medium">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-warning" />
            <span>You have reached the maximum limit of 3 AI hints for this question.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 py-2 focus-within:border-border-strong transition">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for a hint…"
              className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary-hover transition"
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
