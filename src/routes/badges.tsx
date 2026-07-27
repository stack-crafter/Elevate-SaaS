import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import React, { useEffect } from "react";
import { Trophy, ArrowRight, TrendingUp, BarChart3, CheckCircle2, Target } from "lucide-react";
import { useSession, type BadgeTier } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { Spotlight } from "@/components/effects/Spotlight";
import { MagneticButton } from "@/components/MagneticButton";

export const Route = createFileRoute("/badges")({
  head: () => ({
    meta: [{ title: "Achievements — Elevate" }, { name: "robots", content: "noindex" }],
  }),
  component: Badges,
});

// Badge images from public/badges/
const BADGE_IMG: Record<BadgeTier, string | null> = {
  Gold: "/badges/gold.png",
  Silver: "/badges/silver.png",
  Bronze: "/badges/bronze.png",
  None: null,
};

const tierJobLabel: Record<BadgeTier, string> = {
  Gold: "Senior Employee",
  Silver: "Junior Employee",
  Bronze: "Internship",
  None: "Needs Improvement",
};

function Badges() {
  const { authed, history, reset, stats } = useSession();
  const nav = useNavigate();
  useEffect(() => {
    if (!authed) nav({ to: "/login" });
  }, [authed, nav]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <div className="micro-label">Achievements</div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Your badges
            </h1>
            <p className="mt-2 text-muted-foreground">
              Every session lives here. Share them anywhere.
            </p>
          </div>
          <Link to="/select" onClick={reset}>
            <MagneticButton>
              <Trophy className="h-4 w-4" /> Earn another <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </Link>
        </div>

        {/* Statistics Grid */}
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={BarChart3} label="Total Tests" value={String(stats.totalTests)} />
          <StatCard icon={TrendingUp} label="Highest Score" value={String(stats.highestScore)} />
          <StatCard icon={CheckCircle2} label="Tests Passed" value={String(stats.totalPassed)} />
          <StatCard icon={Target} label="Avg Score" value={String(stats.averageScore)} />
        </div>

        {/* Current Status */}
        {stats.totalTests > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm">
              <span className="font-semibold">Current Badge:</span>
              <span className="font-bold text-primary">
                {stats.currentBadge === "None" ? "No Badge" : `${stats.currentBadge} Badge`}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm">
              <span className="font-semibold">Recommended for:</span>
              <span className="font-bold">{stats.recommendedJobType}</span>
            </div>
          </div>
        )}

        {/* Achievements legend */}
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {(["Gold", "Silver", "Bronze"] as BadgeTier[]).map((t) => (
            <div
              key={t}
              className="flex items-center gap-3 rounded-xl border border-border bg-white p-4"
            >
              {BADGE_IMG[t] ? (
                <img
                  src={BADGE_IMG[t]!}
                  alt={`${t} badge`}
                  className="h-10 w-10 shrink-0 object-contain"
                />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded-full bg-surface-2" />
              )}
              <div>
                <div className="text-sm font-bold">{t} Badge</div>
                <div className="text-xs text-muted-foreground">
                  {t === "Gold"
                    ? "Score 90–100 · Senior Employee"
                    : t === "Silver"
                      ? "Score 75–89 · Junior Employee"
                      : "Score 50–74 · Internship"}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Badge cards */}
        {history.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-16 text-center">
            <Trophy className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No badges yet. Complete your first assessment to earn one.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((h, i) => (
              <Spotlight key={i} warm className="surface-card card-hover relative p-6">
                <div className="flex items-start justify-between">
                  {BADGE_IMG[h.tier] ? (
                    <img
                      src={BADGE_IMG[h.tier]!}
                      alt={`${h.tier} badge`}
                      className="h-16 w-16 object-contain drop-shadow-md"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
                      <Trophy className="h-6 w-6" />
                    </div>
                  )}
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {h.tier === "None" ? "No Badge" : h.tier}
                  </span>
                </div>
                <div className="mt-5 font-display text-lg font-bold capitalize">
                  {h.skill} · {h.testType} code
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(h.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>

                {/* Job recommendation */}
                <div className="mt-2 text-xs text-muted-foreground">
                  → <span className="font-medium text-foreground">{h.recommendedJobType}</span>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <span className="font-display text-3xl font-extrabold">
                    {h.score}
                    <span className="ml-1 text-sm font-medium text-muted-foreground">/100</span>
                  </span>
                  <button className="text-xs font-medium text-primary hover:text-primary-hover">
                    Share →
                  </button>
                </div>
              </Spotlight>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Spotlight className="surface-card card-hover relative p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <span className="micro-label">{label}</span>
      </div>
      <div className="mt-3 font-display text-3xl font-extrabold">{value || "0"}</div>
    </Spotlight>
  );
}
