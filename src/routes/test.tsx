import { createFileRoute, useNavigate, useBlocker } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { Clock, Save, ArrowRight, CheckCircle2, Loader2, Bot, X, Send, ChevronRight, AlertCircle } from "lucide-react";
import { useSession } from "@/lib/store";
import { useTestSession } from "@/hooks/useTestSession";
import { useAIAssistant } from "@/hooks/useAIAssistant";
import { MagneticButton } from "@/components/MagneticButton";
import Editor from "@monaco-editor/react";
import type { AIQuestion } from "@/lib/openrouter";

export const Route = createFileRoute("/test")({
  head: () => ({ meta: [{ title: "Assessment in progress — Elevate" }, { name: "robots", content: "noindex" }] }),
  component: TestPage,
});

// ─── Language map for Monaco ──────────────────────────────────────────────────
const MONACO_LANG: Record<string, string> = {
  java: "java", python: "python", cpp: "cpp",
  flutter: "dart", react: "javascript", nodejs: "javascript",
  ai: "python", ml: "python", datascience: "python",
};

function TestPage() {
  const { skill, testType, authed, answers, setAnswer, questions, questionsLoading, questionsError, finalize } = useSession();
  const nav = useNavigate();

  useEffect(() => {
    if (!authed) nav({ to: "/login" });
    else if (!skill || !testType) nav({ to: "/select" });
  }, [authed, skill, testType, nav]);

  const { isGenerating, isEvaluating, generateError, generateTest, submitTest } = useTestSession();

  // Generate questions on mount (if not already loaded)
  const generated = useRef(false);
  useEffect(() => {
    if (questions.length === 0 && !questionsLoading && !generated.current && skill && testType) {
      generated.current = true;
      generateTest();
    }
  }, [questions.length, questionsLoading, skill, testType, generateTest]);

  const [i, setI] = useState(0);
  const [saved, setSaved] = useState(false);
  const [seconds, setSeconds] = useState(12 * 60);
  const [transitioning, setTransitioning] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [timeExpired, setTimeExpired] = useState(false);
  const [cheatingDetected, setCheatingDetected] = useState<"tab" | "window" | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const submitTestRef = useRef(submitTest);
  useEffect(() => { submitTestRef.current = submitTest; }, [submitTest]);

  // Shared "test ended" guard — prevents double-firing across timer + cheat events
  const testEndedRef = useRef(false);
  const triggerTestEnd = useCallback(
    async (reason: "tab" | "window" | "time" | "back") => {
      if (testEndedRef.current) return; // already ending
      testEndedRef.current = true;

      if (reason === "tab") {
        setCheatingDetected("tab");
        finalize(0, null);
        setTimeout(() => nav({ to: "/results" }), 1500);
      } else if (reason === "window") {
        setCheatingDetected("window");
        finalize(0, null);
        setTimeout(() => nav({ to: "/results" }), 1500);
      } else if (reason === "back") {
        finalize(0, null);
        nav({ to: "/results" });
      } else {
        setTimeExpired(true);
        await submitTestRef.current();
        nav({ to: "/results" });
      }
    },
    [nav, finalize],
  );

  // Block route/back button navigation during test and mark as 0 score
  useBlocker({
    shouldBlockFn: () => {
      if (questions.length === 0) return false;
      if (testEndedRef.current) return false;

      triggerTestEnd("back");
      return true;
    },
    enableBeforeUnload: () => {
      return questions.length > 0 && !testEndedRef.current;
    },
  });

  // Timer countdown
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-submit when time runs out
  useEffect(() => {
    if (seconds === 0 && questions.length > 0) triggerTestEnd("time");
  }, [seconds, questions.length, triggerTestEnd]);

  // Anti-cheat: tab switch + window/app switch
  useEffect(() => {
    if (questions.length === 0) return; // only active during the test

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") triggerTestEnd("tab");
    };
    const onBlur = () => triggerTestEnd("window");

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
    };
  }, [questions.length, triggerTestEnd]);

  const currentAnswer = answers[i] ?? null;

  // AI assistant for current question
  const currentQuestion: AIQuestion | null = questions[i] ?? null;
  const { messages, isLoading: chatLoading, sendMessage } = useAIAssistant(
    skill,
    currentQuestion,
    currentAnswer,
  );

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!skill || !testType) return null;

  // ─── Loading state ──────────────────────────────────────────────────────────
  const err = generateError || questionsError;
  const loading = isGenerating || questionsLoading || (questions.length === 0 && !err);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <h2 className="mt-4 font-display text-xl font-bold">Generating your assessment…</h2>
          <p className="mt-2 text-sm text-muted-foreground">AI is crafting unique questions for {skill} · {testType} code.</p>
        </div>
      </div>
    );
  }

  if (err || questions.length === 0) {
    return (
      <div className="min-h-screen bg-surface-1 flex items-center justify-center">
        <div className="surface-card max-w-md p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-danger" />
          <h2 className="mt-4 font-display text-xl font-bold">Couldn't load questions</h2>
          <p className="mt-2 text-sm text-muted-foreground">{err ?? "No questions returned. Please check your API key and try again."}</p>
          <div className="mt-6 flex justify-center gap-2">
            <MagneticButton onClick={() => { generated.current = false; generateTest(); }}>
              Try again
            </MagneticButton>
            <MagneticButton variant="secondary" onClick={() => nav({ to: "/select" })}>
              Back
            </MagneticButton>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[i];
  const progress = ((i + 1) / questions.length) * 100;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const urgent = seconds < 60;

  // ─── Answer handlers ────────────────────────────────────────────────────────
  const pickMCQ = (idx: number) => {
    setAnswer(i, idx);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const setTextAnswer = (val: string) => {
    setAnswer(i, val);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const next = () => {
    setTransitioning(true);
    setTimeout(async () => {
      if (i < questions.length - 1) {
        setI(i + 1);
        setTransitioning(false);
      } else {
        // Submit to AI evaluator
        await submitTest();
        nav({ to: "/results" });
      }
    }, 260);
  };

  // ─── Chat handler ───────────────────────────────────────────────────────────
  const handleSendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput("");
    await sendMessage(text);
  }, [chatInput, chatLoading, sendMessage]);

  // Can we proceed?
  const canNext =
    q.type === "mcq"
      ? typeof currentAnswer === "number"
      : typeof currentAnswer === "string" && (currentAnswer as string).trim().length > 0;

  const monacoLang = MONACO_LANG[skill] ?? "plaintext";

  return (
    <div className="min-h-screen bg-surface-1">
      {/* Anti-cheat overlay — tab switch */}
      {cheatingDetected === "tab" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
          <div className="text-5xl mb-3">🚫</div>
          <h2 className="font-display text-2xl font-bold text-danger">Tab switch detected</h2>
          <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground">
            Switching tabs during the assessment is not allowed. Your test has been submitted automatically.
          </p>
          {isEvaluating && (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Evaluating your submission…
            </div>
          )}
        </div>
      )}

      {/* Anti-cheat overlay — window / app switch */}
      {cheatingDetected === "window" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
          <div className="text-5xl mb-3">🚫</div>
          <h2 className="font-display text-2xl font-bold text-danger">Window switch detected</h2>
          <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground">
            Switching windows or applications during the assessment is not allowed. Your test has been submitted automatically.
          </p>
          {isEvaluating && (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Evaluating your submission…
            </div>
          )}
        </div>
      )}

      {/* Time expired overlay */}
      {timeExpired && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="text-5xl mb-3">⏰</div>
          <h2 className="font-display text-2xl font-bold text-danger">Time's up!</h2>
          <p className="mt-2 text-sm text-muted-foreground">Unanswered questions are scored as zero.</p>
          {isEvaluating && (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Evaluating your submission…
            </div>
          )}
        </div>
      )}

      {/* Evaluating overlay (manual submit) */}
      {isEvaluating && !timeExpired && !cheatingDetected && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h2 className="mt-4 font-display text-xl font-bold">Evaluating your answers…</h2>
          <p className="mt-2 text-sm text-muted-foreground">AI is scoring your submission. This takes a few seconds.</p>
        </div>
      )}

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-border bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-border bg-surface-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider">{skill}</span>
            <span className="rounded-md border border-border bg-surface-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider">{testType} code</span>
          </div>
          <div className="hidden flex-1 items-center gap-3 md:flex">
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Question {i + 1} of {questions.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%`, transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* AI Assistant toggle */}
            <button
              onClick={() => setChatOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition"
            >
              <Bot className="h-4 w-4" />
              <span className="hidden md:inline">Hint</span>
            </button>
            <div className={`flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 font-mono text-sm ${urgent ? "text-danger animate-[soft-pulse_1s_ease-in-out_infinite]" : "text-foreground"}`}>
              <Clock className="h-3.5 w-3.5" /> {mm}:{ss}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Body ────────────────────────────────────────────────────────────── */}
      <div className="mx-auto flex max-w-5xl gap-6 px-6 py-10">
        {/* Main question area */}
        <div className="flex-1 min-w-0">
          <div key={i} className={`transition-all duration-300 ${transitioning ? "opacity-0 -translate-x-2" : "opacity-100 translate-x-0 animate-fade-up"}`}>
            <div className="micro-label">
              Question {i + 1} · <span className="capitalize">{q.type === "mcq" ? "Multiple Choice" : q.type === "theory" ? "Short Answer" : "Coding"}</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight md:text-3xl">
              {q.prompt}
            </h2>

            {/* ── MCQ ──────────────────────────────────────────────────────── */}
            {q.type === "mcq" && q.options && (
              <div className="mt-8 grid gap-3">
                {q.options.map((opt, idx) => {
                  const active = currentAnswer === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => pickMCQ(idx)}
                      className={`group flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 ${active ? "border-primary/40 bg-primary/[0.04] shadow-[0_8px_24px_rgba(217,119,87,0.10)]" : "border-border bg-white hover:border-border-strong hover:bg-surface-hover"}`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-semibold transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-1 text-muted-foreground group-hover:border-border-strong"}`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-[15px] text-foreground">{opt}</span>
                      {active && <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Theory ───────────────────────────────────────────────────── */}
            {q.type === "theory" && (
              <div className="mt-8">
                <div className="rounded-xl border border-border bg-white overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border bg-surface-1 px-4 py-2">
                    <span className="text-[11px] font-medium text-muted-foreground">Your answer</span>
                    <span className="text-[10px] text-muted-foreground">{String(currentAnswer ?? "").length} chars</span>
                  </div>
                  <textarea
                    value={String(currentAnswer ?? "")}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="Type your answer here… Explain concepts clearly and concisely."
                    rows={8}
                    className="w-full resize-none px-4 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* ── Coding ───────────────────────────────────────────────────── */}
            {q.type === "coding" && (
              <div className="mt-8 overflow-hidden rounded-xl border border-border">
                <div className="flex items-center justify-between border-b border-border bg-white/60 px-3 py-1.5">
                  <span className="font-mono text-[11px] text-muted-foreground">solution.{monacoLang === "javascript" ? "js" : monacoLang === "python" ? "py" : monacoLang === "java" ? "java" : monacoLang}</span>
                  <span className="text-[10px] text-muted-foreground">Monaco · Light</span>
                </div>
                <Editor
                  height="320px"
                  language={monacoLang}
                  value={typeof currentAnswer === "string" ? currentAnswer : (q.starterCode ?? `// Write your ${skill} solution here\n`)}
                  onChange={(val) => setTextAnswer(val ?? "")}
                  theme="vs"
                  options={{
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    lineNumbers: "on",
                    minimap: { enabled: false },
                    wordWrap: "on",
                    padding: { top: 16, bottom: 16 },
                    scrollBeyondLastLine: false,
                    renderLineHighlight: "line",
                    contextmenu: true,
                    copyWithSyntaxHighlighting: true,
                  }}
                />
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Save className="h-3.5 w-3.5" />
              <span className={`transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-60"}`}>
                {saved ? "Saved" : "Auto-saving as you go"}
              </span>
            </div>
            <MagneticButton disabled={!canNext} onClick={next}>
              {i === questions.length - 1 ? (isEvaluating ? "Evaluating…" : "Finish") : "Next question"} <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </div>
        </div>

        {/* ─── AI Assistant Sidebar ─────────────────────────────────────────── */}
        {chatOpen && (
          <div className="hidden md:flex w-80 shrink-0 flex-col rounded-xl border border-border bg-white overflow-hidden" style={{ maxHeight: "calc(100vh - 120px)", position: "sticky", top: "80px" }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold">AI Mentor</div>
                  <div className="text-[10px] text-muted-foreground">Hints only · No solutions</div>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-surface-hover">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  <Bot className="mx-auto h-6 w-6 mb-2 opacity-40" />
                  Ask for a hint on this question. I can guide you in the right direction without giving away the answer.
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-1 text-foreground border border-border"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-xl bg-surface-1 border border-border px-3 py-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 py-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                  placeholder="Ask for a hint…"
                  className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                  disabled={chatLoading}
                />
                <button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || chatLoading}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40 transition"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile chat button if closed */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="md:hidden fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
          >
            <Bot className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
