import { useState, useCallback } from "react";
import { X, Loader2, Sparkles, TrendingUp, AlertCircle, CheckCircle2, Briefcase, BookOpen, ArrowRight, Zap, Target, ChevronRight } from "lucide-react";
import { generateCareerGuidance, type CareerGuidance } from "@/lib/openrouter";
import type { HistoryEntry } from "@/lib/store";

interface Props {
  open: boolean;
  onClose: () => void;
  userName: string;
  history: HistoryEntry[];
}

const FIT_COLOR: Record<string, string> = {
  Strong: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Good:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Possible: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

function ReadinessRing({ value }: { value: number }) {
  const r = 56;
  const circ = 2 * Math.PI * r;
  const progress = (value / 100) * circ;
  const color = value >= 75 ? "#34d399" : value >= 50 ? "#60a5fa" : "#f59e0b";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 144, height: 144 }}>
      <svg width="144" height="144" viewBox="0 0 144 144" className="rotate-[-90deg]">
        <circle cx="72" cy="72" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx="72" cy="72" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circ}`}
          strokeDashoffset={circ - progress}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-3xl font-extrabold text-white">{value}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">readiness</span>
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
    if (generated && guidance) return;
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
  }, [userName, history, generated, guidance]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(145deg, #0f1117 0%, #16181f 60%, #12141c 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          maxHeight: "90vh",
        }}
      >
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 text-violet-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-white/40">AI Career Advisor</div>
              <div className="mt-0.5 font-display text-lg font-bold text-white">Your Personalised Career Report</div>
            </div>
          </div>
          <button
            id="career-modal-close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/08 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ─── Body ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Not yet generated ── */}
          {!generated && !loading && (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-blue-500/15">
                <Target className="h-9 w-9 text-violet-400" />
              </div>
              <h2 className="font-display text-2xl font-bold text-white">
                AI Career Guidance
              </h2>
              <p className="mt-3 max-w-md text-sm text-white/50">
                Based on your <strong className="text-white/70">{history.length} assessment{history.length !== 1 ? "s" : ""}</strong>, 
                our AI will analyze your strengths, weaknesses, and suggest personalized career paths tailored to your performance.
              </p>
              {history.length === 0 ? (
                <p className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-3 text-sm text-amber-400">
                  ⚠ Complete at least one assessment to receive career guidance.
                </p>
              ) : (
                <button
                  id="career-generate-btn"
                  onClick={generate}
                  className="mt-8 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:from-violet-500 hover:to-blue-500"
                >
                  <Sparkles className="h-4 w-4" /> Generate My Career Report <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* ── Loading ── */}
          {loading && (
            <div className="flex flex-col items-center py-16">
              <div className="relative mb-6">
                <div className="h-16 w-16 rounded-full border-2 border-violet-500/20" />
                <div
                  className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-2 border-transparent border-t-violet-500"
                  style={{ animationDuration: "1s" }}
                />
                <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-violet-400" />
              </div>
              <p className="font-display text-lg font-bold text-white">Analysing your profile…</p>
              <p className="mt-2 text-sm text-white/40">Our AI is reviewing your {history.length} assessments</p>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
              <button onClick={generate} className="ml-auto rounded-lg border border-red-500/30 px-3 py-1 text-xs hover:bg-red-500/10">
                Retry
              </button>
            </div>
          )}

          {/* ── Results ── */}
          {guidance && !loading && (
            <div className="space-y-6">

              {/* ── Hero: Readiness + Headline ── */}
              <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center md:flex-row md:text-left">
                <ReadinessRing value={guidance.overallReadiness} />
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-violet-400">Your career snapshot</div>
                  <h2 className="mt-2 font-display text-xl font-extrabold leading-snug text-white">{guidance.headline}</h2>
                  <p className="mt-2 text-sm text-white/50">{guidance.summary}</p>
                </div>
              </div>

              {/* ── Strengths + Improvements ── */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Strengths */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-white">Your Strengths</span>
                  </div>
                  <div className="space-y-3">
                    {guidance.strengths.map((s, i) => (
                      <div key={i} className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-3">
                        <div className="text-sm font-semibold text-emerald-300">{s.title}</div>
                        <div className="mt-1 text-xs text-white/40">{s.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Improvements */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-semibold text-white">Areas to Improve</span>
                  </div>
                  <div className="space-y-3">
                    {guidance.improvements.map((imp, i) => (
                      <div key={i} className="rounded-xl border border-amber-500/10 bg-amber-500/[0.04] p-3">
                        <div className="text-sm font-semibold text-amber-300">{imp.title}</div>
                        <div className="mt-1 text-xs text-white/40">{imp.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Career Paths ── */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-semibold text-white">Recommended Career Paths</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {guidance.careerPaths.map((cp, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                      <div className={`mt-0.5 flex-shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${FIT_COLOR[cp.fit] ?? ""}`}>
                        {cp.fit}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{cp.role}</div>
                        <div className="mt-1 text-xs text-white/40">{cp.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Next Steps + Resources ── */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Next Steps */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-violet-400" />
                    <span className="text-sm font-semibold text-white">Next Steps</span>
                  </div>
                  <ul className="space-y-2">
                    {guidance.nextSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-violet-400" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Learning Resources */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-semibold text-white">Learning Resources</span>
                  </div>
                  <div className="space-y-3">
                    {guidance.learningResources.map((lr, i) => (
                      <div key={i} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                        <div className="text-sm font-semibold text-blue-300">{lr.topic}</div>
                        <div className="mt-1 text-xs text-white/40">{lr.suggestion}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Regenerate ── */}
              <div className="flex justify-center">
                <button
                  id="career-regenerate-btn"
                  onClick={() => { setGenerated(false); setGuidance(null); generate(); }}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-white/50 transition hover:border-white/[0.15] hover:bg-white/[0.07] hover:text-white"
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
