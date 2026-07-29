import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Trophy,
  ArrowRight,
  TrendingUp,
  Target,
  Lightbulb,
  AlertCircle,
} from "lucide-react";
import { useSession, tierFor, jobFor } from "@/lib/store";
import { useProctoringStore } from "@/lib/proctoringStore";
import { ProctoringReport } from "@/components/proctoring/ProctoringReport";
import { MagneticButton } from "@/components/MagneticButton";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [{ title: "Your results — Elevate" }, { name: "robots", content: "noindex" }],
  }),
  component: ResultsPage,
});

// Badge images from public/badges/
const BADGE_IMG: Record<string, string | null> = {
  Gold: "/badges/gold.png",
  Silver: "/badges/silver.png",
  Bronze: "/badges/bronze.png",
  None: null,
};

function ResultsPage() {
  const {
    skill,
    testType,
    answers,
    score,
    aiFeedback,
    authed,
    authLoading,
    stats,
    history,
    questions,
  } = useSession();
  const nav = useNavigate();

  const proctoringWarnings = useProctoringStore((s) => s.warnings);
  const proctoringMaxWarnings = useProctoringStore((s) => s.config.maxWarnings);
  const proctoringViolations = useProctoringStore((s) => s.violations);
  const proctoringTerminated = useProctoringStore((s) => s.terminated);

  useEffect(() => {
    if (!authLoading) {
      if (!authed) nav({ to: "/login" });
      else if (score === null) nav({ to: "/dashboard" });
    }
  }, [authLoading, authed, score, nav]);

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

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-1">
        <div className="animate-pulse text-sm text-muted-foreground">Verifying session...</div>
      </div>
    );
  }

  if (score === null) return null;

  const tier = tierFor(score);
  const job = jobFor(tier);
  const badgeImg = BADGE_IMG[tier] ?? null;

  const R = 78;
  const C = 2 * Math.PI * R;
  const dash = (display / 100) * C;

  // MCQ breakdown from AI questions
  const mcqQuestions = questions.filter((q) => q.type === "mcq");
  const mcqCorrect = mcqQuestions.filter((q) => {
    if (q._engineSessionId && q._isCorrect !== undefined) {
      return q._isCorrect;
    }
    const globalIdx = questions.indexOf(q);
    return answers[globalIdx] === q.correct;
  }).length;

  const questionScores = aiFeedback?.questionScores ?? [];

  const titleText = proctoringTerminated ? "Exam Terminated." : "Nicely done.";
  const subtitleText = proctoringTerminated
    ? "This session was ended automatically and flagged due to repeated AI-detected violations."
    : "Here's how this session broke down.";

  return (
    <div className="min-h-screen bg-surface-1">
      <div className="mx-auto max-w-4xl px-6 py-14">
        {/* ─── Hero ─────────────────────────────────────────────────────────── */}
        <div className="text-center animate-fade-up">
          <div className="micro-label">
            {proctoringTerminated ? "Assessment Terminated" : "Assessment complete"}
          </div>
          <h1
            className={`mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl ${proctoringTerminated ? "text-danger" : ""}`}
          >
            {titleText}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">{subtitleText}</p>
        </div>

        {/* ─── Score + Stats ────────────────────────────────────────────────── */}
        <div className="mt-12 grid gap-6 md:grid-cols-[auto_1fr]">
          <div className="surface-card mx-auto flex h-64 w-64 items-center justify-center p-6">
            <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
              <circle
                cx="100"
                cy="100"
                r={R}
                stroke="rgba(15,23,42,0.06)"
                strokeWidth="14"
                fill="none"
              />
              <circle
                cx="100"
                cy="100"
                r={R}
                stroke="url(#g1)"
                strokeWidth="14"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${C}`}
                style={{ transition: "stroke-dasharray 60ms linear" }}
              />
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6b7280" />
                  <stop offset="100%" stopColor="#1f2937" />
                </linearGradient>
              </defs>
              <g transform="rotate(90 100 100)">
                <text
                  x="100"
                  y="96"
                  textAnchor="middle"
                  className="font-display"
                  fontSize="48"
                  fontWeight="800"
                  fill="#1a1a1a"
                >
                  {display}
                </text>
                <text
                  x="100"
                  y="122"
                  textAnchor="middle"
                  fontSize="12"
                  fill="#5f6368"
                  letterSpacing="1.5"
                >
                  OUT OF 100
                </text>
              </g>
            </svg>
          </div>

          <div className="grid gap-3 self-center">
            <Stat label="Skill" value={skill!} />
            <Stat label="Format" value={`${testType} code`} />
            {mcqQuestions.length > 0 && (
              <Stat
                label="MCQ Correct"
                value={`${mcqCorrect} / ${mcqQuestions.length}`}
                accent="#0f9d58"
              />
            )}
            {/* Badge */}
            <div className="surface-card flex items-center justify-between p-4">
              <span className="micro-label">Badge Earned</span>
              <div className="flex items-center gap-2">
                {badgeImg ? (
                  <img
                    src={badgeImg}
                    alt={`${tier} badge`}
                    className="h-8 w-8 object-contain drop-shadow"
                  />
                ) : (
                  <Trophy className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-display text-sm font-bold">
                  {tier === "None" ? "No Badge" : `${tier} Badge`}
                </span>
              </div>
            </div>
            {/* Job */}
            <div className="surface-card flex items-center justify-between p-4">
              <span className="micro-label">Recommended For</span>
              <span className="font-display text-base font-bold text-foreground">{job}</span>
            </div>
          </div>
        </div>

        {/* ─── Proctoring Report ─────────────────────────────────────────────── */}
        <ProctoringReport
          violations={proctoringViolations}
          warnings={proctoringWarnings}
          maxWarnings={proctoringMaxWarnings}
          terminated={proctoringTerminated}
        />

        {/* ─── AI Feedback ──────────────────────────────────────────────────── */}
        {aiFeedback && (
          <div className="mt-12 space-y-4 animate-fade-up">
            <h2 className="font-display text-xl font-bold">AI Feedback</h2>

            {/* Overall */}
            <div className="surface-card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Overall Assessment
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {aiFeedback.overallFeedback}
                  </p>
                </div>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid gap-4 md:grid-cols-2">
              {aiFeedback.strengths.length > 0 && (
                <div className="surface-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <div className="text-xs font-semibold uppercase tracking-wider text-success">
                      Strengths
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {aiFeedback.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {aiFeedback.weaknesses.length > 0 && (
                <div className="surface-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Areas to Improve
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {aiFeedback.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Question Breakdown ───────────────────────────────────────────── */}
        <div className="mt-12">
          <h2 className="font-display text-xl font-bold">Question breakdown</h2>
          <div className="mt-4 space-y-2">
            {questions.map((q, qi) => {
              const qs = questionScores.find((s) => s.questionId === q.id);
              const ans = answers[qi];

              let isCorrect: boolean | null = null;
              if (q.type === "mcq") {
                isCorrect = ans === q.correct;
              } else if (qs) {
                isCorrect = qs.score >= 6;
              }

              return (
                <div
                  key={q.id}
                  className="surface-card p-4 animate-fade-up"
                  style={{ animationDelay: `${Math.min(qi, 8) * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    {isCorrect === true ? (
                      <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-success" />
                    ) : isCorrect === false ? (
                      <XCircle className="h-5 w-5 mt-0.5 shrink-0 text-danger" />
                    ) : (
                      <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Q{qi + 1} · <span className="capitalize">{q.type}</span>
                          {qs && <span className="ml-1 text-foreground">· {qs.score}/10</span>}
                        </div>
                        {isCorrect !== null && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isCorrect ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}
                          >
                            {isCorrect ? "Correct" : "Needs work"}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-sm text-foreground line-clamp-2">{q.prompt}</div>
                      {qs?.feedback && (
                        <div className="mt-1.5 text-xs text-muted-foreground italic">
                          {qs.feedback}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Achievements Summary ─────────────────────────────────────────── */}
        <div className="mt-12 surface-card p-6 animate-fade-up">
          <h2 className="font-display text-xl font-bold mb-4">Achievements</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <AchievStat label="Total Tests" value={String(stats.totalTests)} />
            <AchievStat label="Highest Score" value={String(stats.highestScore)} />
            <AchievStat label="Avg Score" value={String(stats.averageScore)} />
            <AchievStat label="Tests Passed" value={String(stats.totalPassed)} />
          </div>
        </div>

        {/* ─── Actions ──────────────────────────────────────────────────────── */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link to="/dashboard">
            <MagneticButton variant="secondary">Back to dashboard</MagneticButton>
          </Link>
          <Link to="/badge">
            <MagneticButton>
              <Trophy className="h-4 w-4" /> View badge <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="surface-card flex items-center justify-between p-4">
      <span className="micro-label">{label}</span>
      <span className="font-display text-lg font-bold capitalize" style={{ color: accent }}>
        {value}
      </span>
    </div>
  );
}

function AchievStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4 text-center">
      <div className="font-display text-2xl font-extrabold text-foreground">{value}</div>
      <div className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
