import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Trophy, ArrowRight } from "lucide-react";
import { useSession } from "@/lib/store";
import { getQuestions } from "@/lib/questions";
import { MagneticButton } from "@/components/MagneticButton";

export const Route = createFileRoute("/results")({
  head: () => ({ meta: [{ title: "Your results — Elevate" }, { name: "robots", content: "noindex" }] }),
  component: ResultsPage,
});

function ResultsPage() {
  const { skill, testType, answers, score, authed } = useSession();
  const nav = useNavigate();
  useEffect(() => {
    if (!authed) nav({ to: "/login" });
    else if (score === null) nav({ to: "/dashboard" });
  }, [authed, score, nav]);

  const qs = skill && testType ? getQuestions(skill, testType) : [];
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (score === null) return;
    let raf: number;
    const start = performance.now();
    const dur = 1400;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(score * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  if (score === null || !qs.length) return null;

  const correctCount = qs.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
  const R = 78;
  const C = 2 * Math.PI * R;
  const dash = (display / 100) * C;

  return (
    <div className="min-h-screen bg-surface-1">
      <div className="mx-auto max-w-4xl px-6 py-14">
        <div className="text-center animate-fade-up">
          <div className="micro-label">Assessment complete</div>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">Nicely done.</h1>
          <p className="mt-3 text-lg text-muted-foreground">Here's how this session broke down.</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-[auto_1fr]">
          <div className="surface-card mx-auto flex h-64 w-64 items-center justify-center p-6">
            <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
              <circle cx="100" cy="100" r={R} stroke="rgba(15,23,42,0.06)" strokeWidth="14" fill="none" />
              <circle
                cx="100" cy="100" r={R}
                stroke="url(#g1)" strokeWidth="14" fill="none"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${C}`}
                style={{ transition: "stroke-dasharray 60ms linear" }}
              />
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#d97757" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              <g transform="rotate(90 100 100)">
                <text x="100" y="96" textAnchor="middle" className="font-display" fontSize="48" fontWeight="800" fill="#1a1a1a">{display}</text>
                <text x="100" y="122" textAnchor="middle" fontSize="12" fill="#5f6368" letterSpacing="1.5">OUT OF 100</text>
              </g>
            </svg>
          </div>

          <div className="grid gap-3 self-center">
            <Stat label="Correct" value={`${correctCount} / ${qs.length}`} accent="#0f9d58" />
            <Stat label="Skill" value={skill!} />
            <Stat label="Format" value={`${testType} code`} />
            <Stat label="Time" value="8m 42s" />
          </div>
        </div>

        <div className="mt-12">
          <h2 className="font-display text-xl font-bold">Question breakdown</h2>
          <div className="mt-4 space-y-2">
            {qs.map((q, i) => {
              const correct = answers[i] === q.correct;
              return (
                <div
                  key={q.id}
                  className="surface-card flex items-center gap-3 p-4 animate-fade-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                >
                  {correct ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 text-danger" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Q{i + 1}</div>
                    <div className="mt-0.5 truncate text-sm text-foreground">{q.prompt}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${correct ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                    {correct ? "Correct" : "Missed"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link to="/dashboard"><MagneticButton variant="secondary">Back to dashboard</MagneticButton></Link>
          <Link to="/badge"><MagneticButton><Trophy className="h-4 w-4" /> View badge <ArrowRight className="h-4 w-4" /></MagneticButton></Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="surface-card flex items-center justify-between p-4">
      <span className="micro-label">{label}</span>
      <span className="font-display text-lg font-bold capitalize" style={{ color: accent }}>{value}</span>
    </div>
  );
}
