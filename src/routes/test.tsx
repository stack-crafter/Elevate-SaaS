import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Clock, Save, ArrowRight, CheckCircle2 } from "lucide-react";
import { useSession } from "@/lib/store";
import { getQuestions } from "@/lib/questions";
import { MagneticButton } from "@/components/MagneticButton";

export const Route = createFileRoute("/test")({
  head: () => ({ meta: [{ title: "Assessment in progress — Elevate" }, { name: "robots", content: "noindex" }] }),
  component: TestPage,
});

function TestPage() {
  const { skill, testType, authed, setAnswer, finalize } = useSession();
  const nav = useNavigate();
  useEffect(() => {
    if (!authed) nav({ to: "/login" });
    else if (!skill || !testType) nav({ to: "/select" });
  }, [authed, skill, testType, nav]);

  const qs = useMemo(() => (skill && testType ? getQuestions(skill, testType) : []), [skill, testType]);
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [seconds, setSeconds] = useState(12 * 60);
  const [transitioning, setTransitioning] = useState(false);
  const answersRef = useSession((s) => s.answers);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setSelected(answersRef[i] as number | null);
  }, [i, answersRef]);

  if (!qs.length) return null;
  const q = qs[i];
  const progress = ((i + 1) / qs.length) * 100;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const urgent = seconds < 60;

  const pick = (idx: number) => {
    setSelected(idx);
    setAnswer(i, idx);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const next = () => {
    setTransitioning(true);
    setTimeout(() => {
      if (i < qs.length - 1) {
        setI(i + 1);
        setTransitioning(false);
      } else {
        const answers = useSession.getState().answers;
        let correct = 0;
        qs.forEach((qq, idx) => { if (answers[idx] === qq.correct) correct++; });
        const score = Math.round((correct / qs.length) * 100);
        finalize(score);
        nav({ to: "/results" });
      }
    }, 260);
  };

  return (
    <div className="min-h-screen bg-surface-1">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-border bg-surface-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider">{skill}</span>
            <span className="rounded-md border border-border bg-surface-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider">{testType} code</span>
          </div>
          <div className="hidden flex-1 items-center gap-3 md:flex">
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Question {i + 1} of {qs.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%`, transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }} />
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 font-mono text-sm ${urgent ? "text-danger animate-[soft-pulse_1s_ease-in-out_infinite]" : "text-foreground"}`}>
            <Clock className="h-3.5 w-3.5" /> {mm}:{ss}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div key={i} className={`transition-all duration-300 ${transitioning ? "opacity-0 -translate-x-2" : "opacity-100 translate-x-0 animate-fade-up"}`}>
          <div className="micro-label">Question {i + 1}</div>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight md:text-3xl">
            {q.scenario ?? q.prompt}
          </h2>

          {q.code && (
            <div className="mt-6 overflow-hidden rounded-xl border border-border bg-[#fbfaf7]">
              <div className="flex items-center justify-between border-b border-border bg-white/60 px-3 py-1.5">
                <span className="font-mono text-[11px] text-muted-foreground">snippet.{skill === "cpp" ? "cpp" : skill === "python" ? "py" : "java"}</span>
                <span className="text-[10px] text-muted-foreground">Monaco · Light</span>
              </div>
              <pre className="whitespace-pre px-4 py-4 font-mono text-[13px] leading-6 text-foreground/90">{q.code}</pre>
            </div>
          )}

          <div className="mt-8 grid gap-3">
            {q.options.map((opt, idx) => {
              const active = selected === idx;
              return (
                <button
                  key={idx}
                  onClick={() => pick(idx)}
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
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Save className="h-3.5 w-3.5" />
            <span className={`transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-60"}`}>
              {saved ? "Saved" : "Auto-saving as you go"}
            </span>
          </div>
          <MagneticButton disabled={selected === null} onClick={next}>
            {i === qs.length - 1 ? "Finish" : "Next question"} <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </div>
      </main>
    </div>
  );
}
