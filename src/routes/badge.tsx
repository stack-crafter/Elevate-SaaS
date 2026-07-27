import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Download, Share2, ArrowRight, Sparkles as SparklesIcon, Briefcase } from "lucide-react";
import { useSession, tierFor, jobFor, type BadgeTier } from "@/lib/store";
import { Sparkles } from "@/components/effects/Sparkles";
import { BorderBeam } from "@/components/effects/BorderBeam";
import { MagneticButton } from "@/components/MagneticButton";

export const Route = createFileRoute("/badge")({
  head: () => ({
    meta: [{ title: "Your badge — Elevate" }, { name: "robots", content: "noindex" }],
  }),
  component: BadgePage,
});

// Badge images from public/badges/
const BADGE_IMG: Record<BadgeTier, string | null> = {
  Gold: "/badges/gold.png",
  Silver: "/badges/silver.png",
  Bronze: "/badges/bronze.png",
  None: null,
};

const tierGlow: Record<BadgeTier, string> = {
  Gold: "#f7d774",
  Silver: "#9aa0a6",
  Bronze: "#e8b48c",
  None: "#6b7280",
};

const tierLabels: Record<BadgeTier, string> = {
  Gold: "Gold",
  Silver: "Silver",
  Bronze: "Bronze",
  None: "No Badge",
};

function BadgePage() {
  const { skill, testType, score, authed } = useSession();
  const nav = useNavigate();
  useEffect(() => {
    if (!authed) nav({ to: "/login" });
    else if (score === null) nav({ to: "/dashboard" });
  }, [authed, score, nav]);

  if (score === null) return null;

  const tier = tierFor(score);
  const job = jobFor(tier);
  const glow = tierGlow[tier];
  const badgeImg = BADGE_IMG[tier];

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
        {tier === "None"
          ? "Assessment complete — keep improving!"
          : "Level up — you earned a new badge"}
        <style>{`@keyframes banner-drop { from { transform: translateY(-100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-40px)] max-w-3xl flex-col items-center justify-center px-6 py-12">
        <div
          className="relative"
          style={{ animation: "badge-in 700ms cubic-bezier(0.22,1,0.36,1)" }}
        >
          <style>{`@keyframes badge-in { from { transform: scale(0.6); opacity: 0 } 60% { transform: scale(1.05) } to { transform: scale(1); opacity: 1 } }`}</style>
          {/* Glow halo */}
          <div
            aria-hidden
            className="absolute -inset-16 rounded-full opacity-70 blur-3xl"
            style={{ background: `radial-gradient(closest-side, ${glow}80, transparent 70%)` }}
          />
          {/* Badge image or fallback */}
          {badgeImg ? (
            <div className="relative flex flex-col items-center gap-3">
              <img
                src={badgeImg}
                alt={`${tier} badge`}
                className="h-52 w-52 object-contain drop-shadow-2xl"
              />
              <div className="flex items-center gap-2 rounded-full border border-border bg-white/80 px-4 py-1.5 font-mono text-lg font-extrabold backdrop-blur-sm">
                {score} <span className="text-xs font-medium text-muted-foreground">/ 100</span>
              </div>
            </div>
          ) : (
            <div className="relative flex h-56 w-56 flex-col items-center justify-center rounded-full bg-surface-2 shadow-[0_24px_60px_rgba(15,23,42,0.10)]">
              <div className="micro-label text-muted-foreground">{tierLabels[tier]}</div>
              <div className="mt-1 font-display text-4xl font-extrabold">{score}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                / 100
              </div>
            </div>
          )}
        </div>

        {/* Job recommendation under badge */}
        <div className="mt-6 flex items-center gap-2 rounded-full border border-border bg-white/80 px-4 py-2 text-sm font-medium backdrop-blur-sm animate-fade-up">
          <Briefcase className="h-4 w-4 text-primary" />
          <span>
            Recommended for <strong>{job}</strong> positions
          </span>
        </div>

        <div className="mt-8 w-full max-w-md">
          <div className="surface-card relative overflow-hidden p-6 text-center">
            <BorderBeam duration={7} />
            <div className="relative">
              <div className="micro-label">Certificate of achievement</div>
              <h1 className="mt-2 font-display text-2xl font-bold capitalize">
                {skill} · {testType} code
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Awarded on{" "}
                {new Date().toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>

              {/* Badge tier explanation */}
              <div className="mt-4 rounded-lg border border-border bg-surface-1 px-4 py-3 text-left text-sm text-muted-foreground">
                {tier === "Gold" &&
                  "🥇 Gold Badge · Score 90–100 · Recommended for Senior Employee positions"}
                {tier === "Silver" &&
                  "🥈 Silver Badge · Score 75–89 · Recommended for Junior Employee positions"}
                {tier === "Bronze" &&
                  "🥉 Bronze Badge · Score 50–74 · Recommended for Internship opportunities"}
                {tier === "None" &&
                  "📈 Score below 50 · Keep practicing — every attempt makes you stronger!"}
              </div>

              <div className="mt-5 flex items-center justify-center gap-2">
                <MagneticButton variant="secondary">
                  <Download className="h-4 w-4" /> Download
                </MagneticButton>
                <MagneticButton variant="secondary">
                  <Share2 className="h-4 w-4" /> Share
                </MagneticButton>
              </div>
            </div>
          </div>
        </div>

        <Link to="/dashboard" className="mt-10">
          <MagneticButton>
            Continue to dashboard <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </Link>
      </div>
    </div>
  );
}
