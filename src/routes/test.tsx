import { createFileRoute, useNavigate, useBlocker } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { Clock, Save, ArrowRight, CheckCircle2, Loader2, Bot, AlertCircle } from "lucide-react";
import { useSession } from "@/lib/store";
import { useTestSession } from "@/hooks/useTestSession";
import { VibeAssistantPanel } from "@/components/VibeAssistantPanel";
import { useProctoring } from "@/hooks/useProctoring";
import { useProctoringStore } from "@/lib/proctoringStore";
import { CameraPermissionGate } from "@/components/proctoring/CameraPermissionGate";
import { CameraPreview } from "@/components/proctoring/CameraPreview";
import { WarningBadge } from "@/components/proctoring/WarningBadge";
import { ViolationOverlay } from "@/components/proctoring/ViolationOverlay";
import { MagneticButton } from "@/components/MagneticButton";
import Editor from "@monaco-editor/react";

export const Route = createFileRoute("/test")({
  head: () => ({
    meta: [{ title: "Assessment in progress — Elevate" }, { name: "robots", content: "noindex" }],
  }),
  component: TestPage,
});

// ─── Language map for Monaco ──────────────────────────────────────────────────
const MONACO_LANG: Record<string, string> = {
  java: "java",
  python: "python",
  cpp: "cpp",
  flutter: "dart",
  react: "javascript",
  nodejs: "javascript",
  ai: "python",
  ml: "python",
  datascience: "python",
};

// ─── Module-level camera persistence ─────────────────────────────────────────
// Stored OUTSIDE React state so React error-boundary resets (which wipe all
// component state) do NOT send the user back through the camera gate again.
let _cameraWasPreviouslyGranted = false;

function TestPage() {
  const {
    skill,
    testType,
    authed,
    authLoading,
    answers,
    setAnswer,
    questions,
    questionsLoading,
    questionsError,
    finalize,
  } = useSession();
  const nav = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!authed) nav({ to: "/login" });
      else if (!skill || !testType) nav({ to: "/select" });
    }
  }, [authLoading, authed, skill, testType, nav]);

  const { isGenerating, isEvaluating, generateError, generateTest, submitTest, submitQuestionAndNext } = useTestSession();

  // ─── AI Proctoring: camera permission + monitoring ─────────────────────────
  // Declared before question generation because the exam is only allowed to
  // start (i.e. generate questions) once camera permission is granted.
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const [camGranted, setCamGranted] = useState(false);
  // True while silently re-acquiring the camera after an error-boundary reset.
  const [camReconnecting, setCamReconnecting] = useState(false);
  const proctoringWarnings = useProctoringStore((s) => s.warnings);
  const proctoringMaxWarnings = useProctoringStore((s) => s.config.maxWarnings);
  const proctoringReset = useProctoringStore((s) => s.reset);

  // ── Mount effects ────────────────────────────────────────────────────────────

  // 1. Reset any stale transient loading state that could have been persisted
  //    to localStorage during a previous session that crashed mid-generation.
  //    ALSO clear stale questions from a previous test: if they are present
  //    before camera is granted, the anti-cheat blur listener (which guards
  //    with `questions.length === 0`) would fire the moment the camera
  //    permission browser dialog steals window focus, causing an instant
  //    triggerTestEnd("window") → finalize(0) → router error → loop.
  useEffect(() => {
    const s = useSession.getState();
    if (s.questionsLoading) s.setQuestionsLoading(false);
    if (s.questionsError) s.setQuestionsError(null);
    if (!_cameraWasPreviouslyGranted && s.questions.length > 0) {
      // Stale questions from a previous completed test. Clear them so the
      // anti-cheat does NOT activate before the new test actually starts.
      s.setQuestions([]);
    }
  }, []);

  // 2. If camera was already granted before an error-boundary reset, silently
  //    re-acquire the stream instead of showing the permission gate again.
  //    The browser will not prompt the user a second time — it just reconnects.
  useEffect(() => {
    if (!_cameraWasPreviouslyGranted) return;
    setCamReconnecting(true);
    navigator.mediaDevices
      ?.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      })
      .then((stream) => {
        proctoringReset();
        setCamStream(stream);
        setCamGranted(true);
      })
      .catch(() => {
        // Permission was revoked — fall back to the gate so the user can re-grant.
        _cameraWasPreviouslyGranted = false;
      })
      .finally(() => {
        setCamReconnecting(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerTestEndRef = useRef<
    (reason: "tab" | "window" | "time" | "back" | "cheating") => void
  >(() => {});
  const handleCheatingTerminated = useCallback(() => {
    triggerTestEndRef.current("cheating");
  }, []);
  const proctoring = useProctoring(handleCheatingTerminated);
  const proctoringStartedRef = useRef(false);

  const handleCameraGranted = useCallback(
    (stream: MediaStream) => {
      _cameraWasPreviouslyGranted = true; // persist across error-boundary resets
      proctoringReset();
      setCamStream(stream);
      setCamGranted(true);
    },
    [proctoringReset],
  );

  useEffect(() => {
    if (camGranted && camStream && !proctoringStartedRef.current) {
      proctoringStartedRef.current = true;
      proctoring.start(camStream);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camGranted, camStream]);

  const stopProctoringAndCamera = useCallback(() => {
    proctoring.stop();
    camStream?.getTracks().forEach((t) => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camStream]);

  // Stop webcam + monitoring on unmount, no matter how the page is left
  useEffect(() => {
    return () => {
      proctoring.stop();
      camStream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tracks whether questions were actually generated in this browser session
  // (as opposed to hydrated from localStorage). Anti-cheat must ONLY be active
  // after a real generateTest() call completes — never from stale stored data.
  const testLiveRef = useRef(false);

  // Generate questions once camera permission is granted (webcam + AI
  // monitoring must be live before the exam itself starts)
  const generated = useRef(false);
  useEffect(() => {
    if (
      camGranted &&
      questions.length === 0 &&
      !questionsLoading &&
      !generated.current &&
      skill &&
      testType
    ) {
      generated.current = true;
      generateTest();
    }
    // Mark test as live once questions arrive from this session's generateTest()
    if (camGranted && questions.length > 0 && generated.current) {
      testLiveRef.current = true;
    }
  }, [camGranted, questions.length, questionsLoading, skill, testType, generateTest]);

  const [i, setI] = useState(0);
  const [saved, setSaved] = useState(false);
  const [seconds, setSeconds] = useState(12 * 60);
  const [transitioning, setTransitioning] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [timeExpired, setTimeExpired] = useState(false);
  const [cheatingDetected, setCheatingDetected] = useState<"tab" | "window" | "ai" | null>(null);
  const submitTestRef = useRef(submitTest);
  useEffect(() => {
    submitTestRef.current = submitTest;
  }, [submitTest]);

  // Shared "test ended" guard — prevents double-firing across timer + cheat events
  const testEndedRef = useRef(false);
  const triggerTestEnd = useCallback(
    async (reason: "tab" | "window" | "time" | "back" | "cheating") => {
      if (testEndedRef.current) return; // already ending
      testEndedRef.current = true;
      stopProctoringAndCamera();

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
      } else if (reason === "cheating") {
        // AI proctoring threshold reached: stop everything and auto-submit
        // through the existing evaluation flow (not a forced zero score).
        setCheatingDetected("ai");
        await submitTestRef.current();
        nav({ to: "/results" });
      } else {
        setTimeExpired(true);
        await submitTestRef.current();
        nav({ to: "/results" });
      }
    },
    [nav, finalize, stopProctoringAndCamera],
  );

  // handleCheatingTerminated (declared earlier, passed into useProctoring)
  // calls through this ref so it always invokes the latest triggerTestEnd
  // closure without needing to be redeclared each render.
  useEffect(() => {
    triggerTestEndRef.current = triggerTestEnd;
  }, [triggerTestEnd]);

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

  // Timer countdown — only runs once the camera gate has passed and
  // questions are loaded, so waiting on permission doesn't burn exam time
  useEffect(() => {
    if (!camGranted || questions.length === 0) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [camGranted, questions.length]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (seconds === 0 && questions.length > 0) triggerTestEnd("time");
  }, [seconds, questions.length, triggerTestEnd]);

  // Anti-cheat: tab switch + window/app switch
  // IMPORTANT: only active when testLiveRef.current is true (questions generated
  // in this session). This prevents the camera-permission browser dialog from
  // triggering a false-positive window-blur end when old questions from a
  // previous test are momentarily in the store.
  useEffect(() => {
    if (questions.length === 0 || !testLiveRef.current) return; // only active during a live test

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

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-1">
        <div className="animate-pulse text-sm text-muted-foreground">Verifying session...</div>
      </div>
    );
  }

  if (!skill || !testType) return null;

  // ─── AI Proctoring gate ──────────────────────────────────────────────────────
  // Nothing below this point (question generation, timer, exam UI) runs until
  // webcam permission has been explicitly granted.

  // Silently reconnecting camera after an error-boundary reset — show a neutral
  // loading screen so the user doesn't see the permission gate flicker.
  if (camReconnecting) {
    return (
      <div className="min-h-screen bg-surface-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <h2 className="mt-4 font-display text-xl font-bold">Reconnecting camera…</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Restoring your webcam session, please wait…
          </p>
        </div>
      </div>
    );
  }

  if (!camGranted) {
    return <CameraPermissionGate onGranted={handleCameraGranted} />;
  }

  // ─── Loading state ──────────────────────────────────────────────────────────
  // Note: proctoring model failures degrade gracefully (exam continues without AI detection)
  // so we never block on proctoring.phase === "error" anymore.
  const err = generateError || questionsError;
  const loading = isGenerating || questionsLoading || (questions.length === 0 && !err);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-1 flex items-center justify-center">
        <CameraPreview stream={camStream} active={proctoring.phase === "active"} />
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <h2 className="mt-4 font-display text-xl font-bold">Generating your assessment…</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            AI is crafting unique questions for {skill} · {testType} code.
          </p>
        </div>
      </div>
    );
  }

  if (err || questions.length === 0) {
    return (
      <div className="min-h-screen bg-surface-1 flex items-center justify-center">
        <CameraPreview stream={camStream} active={proctoring.phase === "active"} />
        <div className="surface-card max-w-md p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-danger" />
          <h2 className="mt-4 font-display text-xl font-bold">Couldn't load assessment</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {err ?? "No questions returned. Please check your API key and try again."}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <MagneticButton
              onClick={() => {
                // Explicit user retry — clear module state and go through the full
                // camera gate again so the user re-reads the proctoring policy.
                _cameraWasPreviouslyGranted = false;
                generated.current = false;
                proctoringStartedRef.current = false;
                proctoringReset();
                setCamGranted(false);
                setCamStream(null);
              }}
            >
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
  const totalQuestionsDisplay = q?._engineOverallTotal ?? questions.length;
  const currentQuestionNumber = q?._engineOverallNumber ?? (i + 1);
  const progress = (currentQuestionNumber / totalQuestionsDisplay) * 100;
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

  const next = async () => {
    setTransitioning(true);
    const currentQuestion = questions[i];
    const isEngine = !!currentQuestion?._engineSessionId;

    if (isEngine) {
      try {
        const hasNext = await submitQuestionAndNext(i, currentAnswer);
        if (hasNext) {
          setI(i + 1);
          setTransitioning(false);
        } else {
          // Engine test completed or ended early due to failure
          testEndedRef.current = true;
          stopProctoringAndCamera();
          nav({ to: "/results" });
        }
      } catch (err) {
        console.warn("Failed to retrieve next question from engine, falling back to local navigation:", err);
        if (i < questions.length - 1) {
          setI(i + 1);
          setTransitioning(false);
        }
      }
    } else {
      setTimeout(async () => {
        if (i < questions.length - 1) {
          setI(i + 1);
          setTransitioning(false);
        } else {
          // Stop anti-cheat + AI proctoring detection before submitting
          testEndedRef.current = true;
          stopProctoringAndCamera();
          // Submit to AI evaluator
          await submitTest();
          nav({ to: "/results" });
        }
      }, 260);
    }
  };

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
            Switching tabs during the assessment is not allowed. Your test has been submitted
            automatically.
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
            Switching windows or applications during the assessment is not allowed. Your test has
            been submitted automatically.
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
          <p className="mt-2 text-sm text-muted-foreground">
            Unanswered questions are scored as zero.
          </p>
          {isEvaluating && (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Evaluating your submission…
            </div>
          )}
        </div>
      )}

      {/* AI Proctoring overlay — warning threshold reached */}
      {cheatingDetected === "ai" && (
        <ViolationOverlay
          warnings={proctoringWarnings}
          maxWarnings={proctoringMaxWarnings}
          isEvaluating={isEvaluating}
        />
      )}

      {/* Evaluating overlay (manual submit) */}
      {isEvaluating && !timeExpired && !cheatingDetected && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h2 className="mt-4 font-display text-xl font-bold">Evaluating your answers…</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            AI is scoring your submission. This takes a few seconds.
          </p>
        </div>
      )}

      {/* Live webcam preview while AI proctoring is active */}
      {!cheatingDetected && !timeExpired && (
        <CameraPreview stream={camStream} active={proctoring.phase === "active"} />
      )}

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-border bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-border bg-surface-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider">
              {skill}
            </span>
            <span className="rounded-md border border-border bg-surface-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider">
              {testType} code
            </span>
          </div>
          <div className="hidden flex-1 items-center gap-3 md:flex">
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Question {currentQuestionNumber} of {totalQuestionsDisplay}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)",
                  }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* AI Hint toggle — vibe_coding only */}
            {questions[i]?.type === "vibe_coding" && (
              <button
                onClick={() => setAiPanelOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition"
              >
                <Bot className="h-4 w-4" />
                <span className="hidden md:inline">Hint</span>
              </button>
            )}
            <WarningBadge warnings={proctoringWarnings} maxWarnings={proctoringMaxWarnings} />
            <div
              className={`flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 font-mono text-sm ${urgent ? "text-danger animate-[soft-pulse_1s_ease-in-out_infinite]" : "text-foreground"}`}
            >
              <Clock className="h-3.5 w-3.5" /> {mm}:{ss}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Body ────────────────────────────────────────────────────────────── */}
      <div className="mx-auto flex max-w-5xl gap-6 px-6 py-10">
        {/* Main question area */}
        <div className="flex-1 min-w-0">
          <div
            key={i}
            className={`transition-all duration-300 ${transitioning ? "opacity-0 -translate-x-2" : "opacity-100 translate-x-0 animate-fade-up"}`}
          >
            <div className="micro-label">
              Question {currentQuestionNumber} ·{" "}
              <span className="capitalize">
                {q.type === "mcq"
                  ? "Multiple Choice"
                  : q.type === "theory"
                    ? "Short Answer"
                    : "Coding"}
              </span>
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
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-semibold transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-1 text-muted-foreground group-hover:border-border-strong"}`}
                      >
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
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Your answer
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {String(currentAnswer ?? "").length} chars
                    </span>
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

            {/* ── Coding / Vibe Coding ─────────────────────────────────── */}
            {(q.type === "coding" || q.type === "vibe_coding") && (
              <div className="mt-8 flex flex-col md:flex-row gap-4 items-stretch">
                {/* Monaco Editor */}
                <div className="flex-1 overflow-hidden rounded-xl border border-border">
                  <div className="flex items-center justify-between border-b border-border bg-white/60 px-3 py-1.5">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      solution.
                      {monacoLang === "javascript"
                        ? "js"
                        : monacoLang === "python"
                          ? "py"
                          : monacoLang === "java"
                            ? "java"
                            : monacoLang}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Monaco · Light</span>
                  </div>
                  <Editor
                    height="320px"
                    language={monacoLang}
                    value={
                      typeof currentAnswer === "string"
                        ? currentAnswer
                        : (q.starterCode ?? `// Write your ${skill} solution here\n`)
                    }
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

                {/* AI Mentor Panel — vibe_coding only */}
                {q.type === "vibe_coding" && (
                  <VibeAssistantPanel
                    question={q}
                    skill={skill}
                    currentAnswer={currentAnswer}
                    isOpen={aiPanelOpen}
                    setIsOpen={setAiPanelOpen}
                  />
                )}
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Save className="h-3.5 w-3.5" />
              <span
                className={`transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-60"}`}
              >
                {saved ? "Saved" : "Auto-saving as you go"}
              </span>
            </div>
            <MagneticButton disabled={!canNext || isEvaluating} onClick={next}>
              {isEvaluating
                ? "Evaluating…"
                : (i === questions.length - 1 && !q?._engineSessionId)
                  ? "Finish"
                  : "Next question"}{" "}
              <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </div>
        </div>

        {/* Old AI sidebar removed — Vibe AI panel is now inline next to the editor */}
      </div>
    </div>
  );
}
