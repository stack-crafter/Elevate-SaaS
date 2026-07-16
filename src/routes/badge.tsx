import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Download, Share2, ArrowRight, Sparkles as SparklesIcon } from "lucide-react";
import { useSession } from "@/lib/store";
import { Sparkles } from "@/components/effects/Sparkles";
import { BorderBeam } from "@/components/effects/BorderBeam";
import { MagneticButton } from "@/components/MagneticButton";

export const Route = createFileRoute("/badge")({
  head: () => ({ meta: [{ title: "Your badge — Elevate" }, { name: "robots", content: "noindex" }] }),
  component: BadgePage,
});

const tierColors: Record<string, { from: string; to: string; ring: string }> = {
  Platinum: { from: "#e5e4e2", to: "#a7a9ac", ring: "#4285f4" },
  Gold:     { from: "#f7d774", to: "#c99b2c", ring: "#d97757" },
  Silver:   { from: "#e6e8ea", to: "#9aa0a6", ring: "#4285f4" },
  Bronze:   { from: "#e8b48c", to: "#a76a3c", ring: "#d97757" },
};

function tierFor(score: number) {
  if (score >= 90) return "Platinum";
  if (score >= 75) return "Gold";
  if (score >= 55) return "Silver";
  return "Bronze";
}

function BadgePage() {
  const { skill, testType, score, authed } = useSession();
  const nav = useNavigate();
  useEffect(() => {
    if (!authed) nav({ to: "/login" });
    else if (score === null) nav({ to: "/dashboard" });
  }, [authed, score, nav]);

  if (score === null) return null;
  const tier = tierFor(score);
  const c = tierColors[tier];

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-1">
      <div className="pointer-events-none absolute inset-0 mesh-bg opacity-70" />
      <Sparkles count={32} />

      {/* Banner */}
      <div
        className="relative z-10 flex items-center justify-center gap-2 border-b border-border bg-white/70 py-2 text-sm font-semibold text-foreground backdrop-blur-xl animate-fade-up"
        style={{ animation: "banner-drop 500ms cubic-bezier(0.22,1,0.36,1)" }}
      >
        <SparklesIcon className="h-4 w-4 text-primary" />
        Level up — you earned a new badge
        <style>{`@keyframes banner-drop { from { transform: translateY(-100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-40px)] max-w-3xl flex-col items-center justify-center px-6 py-12">
        <div
          className="relative"
          style={{ animation: "badge-in 700ms cubic-bezier(0.22,1,0.36,1)" }}
        >
          <style>{`@keyframes badge-in { from { transform: scale(0.6); opacity: 0 } 60% { transform: scale(1.05) } to { transform: scale(1); opacity: 1 } }`}</style>
          {/* Halo */}
          <div
            aria-hidden
            className="absolute -inset-16 rounded-full opacity-70 blur-3xl"
            style={{ background: `radial-gradient(closest-side, ${c.from}80, transparent 70%)` }}
          />
          <div
            className="relative flex h-56 w-56 items-center justify-center rounded-full text-primary-foreground shadow-[0_24px_60px_rgba(15,23,42,0.15)]"
            style={{ background: `radial-gradient(circle at 30% 30%, ${c.from}, ${c.to})` }}
          >
            <div className="absolute inset-2 rounded-full" style={{ boxShadow: `inset 0 2px 12px rgba(255,255,255,0.7), inset 0 -6px 18px rgba(0,0,0,0.15)` }} />
            <div className="relative text-center">
              <div className="micro-label text-white/80">{tier}</div>
              <div className="mt-1 font-display text-4xl font-extrabold text-white drop-shadow-sm">{score}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/85">/ 100</div>
            </div>
          </div>
        </div>

        <div className="mt-10 w-full max-w-md">
          <div className="surface-card relative overflow-hidden p-6 text-center">
            <BorderBeam duration={7} />
            <div className="relative">
              <div className="micro-label">Certificate of achievement</div>
              <h1 className="mt-2 font-display text-2xl font-bold capitalize">{skill} · {testType} code</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Awarded on {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
              </p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <MagneticButton variant="secondary"><Download className="h-4 w-4" /> Download</MagneticButton>
                <MagneticButton variant="secondary"><Share2 className="h-4 w-4" /> Share</MagneticButton>
              </div>
            </div>
          </div>
        </div>

        <Link to="/dashboard" className="mt-10">
          <MagneticButton>Continue to dashboard <ArrowRight className="h-4 w-4" /></MagneticButton>
        </Link>
      </div>
    </div>
  );
}
