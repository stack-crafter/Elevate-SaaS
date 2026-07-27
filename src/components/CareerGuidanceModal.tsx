import { useState, useCallback } from "react";
import {
  X,
  Loader2,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  BookOpen,
  ArrowRight,
  Zap,
  Target,
  ChevronRight,
} from "lucide-react";
import { generateCareerGuidance, type CareerGuidance } from "@/lib/openrouter";
import type { HistoryEntry } from "@/lib/store";

interface Props {
  open: boolean;
  onClose: () => void;
  userName: string;
  history: HistoryEntry[];
}

const FIT_STYLE: Record<string, string> = {
  Strong: "bg-green-50 text-green-700 border border-green-200",
  Good: "bg-blue-50  text-blue-700  border border-blue-200",
  Possible: "bg-amber-50 text-amber-700 border border-amber-200",
};

function ReadinessRing({ value }: { value: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const progress = (value / 100) * circ;
  const color = value >= 75 ? "#0f9d58" : value >= 50 ? "#4285f4" : "#f9ab00";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 136, height: 136 }}>
      <svg width="136" height="136" viewBox="0 0 136 136" className="rotate-[-90deg]">
        <circle cx="68" cy="68" r={r} fill="none" stroke="var(--color-border)" strokeWidth="10" />
        <circle
          cx="68"
          cy="68"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circ}`}
          strokeDashoffset={circ - progress}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-3xl font-extrabold text-foreground">{value}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          readiness
        </span>
      </div>
    </div>
  );
}

export function CareerGuidanceModal({ open, onClose, userName, history }: Props) {
  const [guidance, setGuidance] = useState<CareerGuidance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateCareerGuidance(userName, history);
      setGuidance(result);
      setGenerated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate guidance.");
    } finally {
      setLoading(false);
    }
  }, [userName, history]);

  const handleClose = () => {
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.4)", backdropFilter: "blur(6px)" }}
    >
      {/* Modal panel — uses app surface styles */}
      <div
        className="surface-card relative flex w-full max-w-3xl flex-col overflow-hidden"
        style={{ maxHeight: "88vh", boxShadow: "var(--shadow-modal)" }}
      >
        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="micro-label">AI Career Advisor</div>
              <div className="mt-0.5 font-display text-lg font-bold">
                Your Personalised Career Report
              </div>
            </div>
          </div>
          <button
            id="career-modal-close"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ─── Scrollable body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── Pre-generate state ── */}
          {!generated && !loading && !error && (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Target className="h-8 w-8" />
              </div>
              <h2 className="font-display text-2xl font-bold">AI Career Guidance</h2>
              <p className="mt-3 max-w-md text-sm text-muted-foreground">
                Based on your{" "}
                <strong className="text-foreground">
                  {history.length} assessment{history.length !== 1 ? "s" : ""}
                </strong>
                , our AI will analyse your strengths, weaknesses, and recommend personalised career
                paths.
              </p>
              {history.length === 0 ? (
                <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-700">
                  ⚠ Complete at least one assessment to receive career guidance.
                </p>
              ) : (
                <button
                  id="career-generate-btn"
                  onClick={generate}
                  className="mt-8 flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate My Career Report
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* ── Loading state ── */}
          {loading && (
            <div className="flex flex-col items-center py-14">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 font-display text-lg font-bold">Analysing your profile…</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Reviewing your {history.length} assessment{history.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {/* ── Error state ── */}
          {error && !loading && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
              <button
                onClick={generate}
                className="ml-auto rounded-lg border border-red-300 px-3 py-1 text-xs hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          )}

          {/* ── Results ── */}
          {guidance && !loading && (
            <div className="space-y-5">
              {/* ── Hero: Readiness ring + headline ── */}
              <div className="flex flex-col items-center gap-5 rounded-xl border border-border bg-surface-1 p-5 text-center md:flex-row md:text-left">
                <div className="flex-shrink-0">
                  <ReadinessRing value={guidance.overallReadiness} />
                </div>
                <div>
                  <div className="micro-label">Your career snapshot</div>
                  <h2 className="mt-1 font-display text-xl font-extrabold leading-snug">
                    {guidance.headline}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">{guidance.summary}</p>
                </div>
              </div>

              {/* ── Strengths + Improvements ── */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Strengths */}
                <div className="rounded-xl border border-border bg-surface-1 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm font-semibold">Your Strengths</span>
                  </div>
                  <div className="space-y-2">
                    {guidance.strengths.map((s, i) => (
                      <div key={i} className="rounded-lg border border-green-100 bg-green-50 p-3">
                        <div className="text-sm font-semibold text-green-800">{s.title}</div>
                        <div className="mt-0.5 text-xs text-green-700/70">{s.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Improvements */}
                <div className="rounded-xl border border-border bg-surface-1 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-warning" />
                    <span className="text-sm font-semibold">Areas to Improve</span>
                  </div>
                  <div className="space-y-2">
                    {guidance.improvements.map((imp, i) => (
                      <div key={i} className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                        <div className="text-sm font-semibold text-amber-800">{imp.title}</div>
                        <div className="mt-0.5 text-xs text-amber-700/70">{imp.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Career Paths ── */}
              <div className="rounded-xl border border-border bg-surface-1 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Recommended Career Paths</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {guidance.careerPaths.map((cp, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-border bg-background p-3"
                    >
                      <span
                        className={`mt-0.5 flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${FIT_STYLE[cp.fit] ?? ""}`}
                      >
                        {cp.fit}
                      </span>
                      <div>
                        <div className="text-sm font-semibold">{cp.role}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{cp.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Next Steps + Learning Resources ── */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Next Steps */}
                <div className="rounded-xl border border-border bg-surface-1 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Next Steps</span>
                  </div>
                  <ul className="space-y-2">
                    {guidance.nextSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Learning Resources */}
                <div className="rounded-xl border border-border bg-surface-1 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Learning Resources</span>
                  </div>
                  <div className="space-y-2">
                    {guidance.learningResources.map((lr, i) => (
                      <div key={i} className="rounded-lg border border-border bg-background p-3">
                        <div className="text-sm font-semibold">{lr.topic}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{lr.suggestion}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Refresh ── */}
              <div className="flex justify-center pt-1">
                <button
                  id="career-regenerate-btn"
                  onClick={() => {
                    setGenerated(false);
                    setGuidance(null);
                    generate();
                  }}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Refresh analysis
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
