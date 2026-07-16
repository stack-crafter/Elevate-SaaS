import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Trophy, ArrowRight } from "lucide-react";
import { useSession } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { Spotlight } from "@/components/effects/Spotlight";
import { MagneticButton } from "@/components/MagneticButton";

export const Route = createFileRoute("/badges")({
  head: () => ({ meta: [{ title: "Achievements — Elevate" }, { name: "robots", content: "noindex" }] }),
  component: Badges,
});

const tierColor: Record<string, string> = {
  Platinum: "linear-gradient(135deg, #e5e4e2, #a7a9ac)",
  Gold:     "linear-gradient(135deg, #f7d774, #c99b2c)",
  Silver:   "linear-gradient(135deg, #e6e8ea, #9aa0a6)",
  Bronze:   "linear-gradient(135deg, #e8b48c, #a76a3c)",
};

function Badges() {
  const { authed, history, reset } = useSession();
  const nav = useNavigate();
  useEffect(() => { if (!authed) nav({ to: "/login" }); }, [authed, nav]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-end justify-between">
          <div>
            <div className="micro-label">Achievements</div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">Your badges</h1>
            <p className="mt-2 text-muted-foreground">Every session lives here. Share them anywhere.</p>
          </div>
          <Link to="/select" onClick={reset}>
            <MagneticButton><Trophy className="h-4 w-4" /> Earn another <ArrowRight className="h-4 w-4" /></MagneticButton>
          </Link>
        </div>

        {history.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-16 text-center">
            <Trophy className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No badges yet. Complete your first assessment to earn one.</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((h, i) => (
              <Spotlight key={i} warm className="surface-card card-hover relative p-6">
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_10px_24px_rgba(15,23,42,0.15)]"
                    style={{ background: tierColor[h.tier] ?? tierColor.Bronze }}
                  >
                    <Trophy className="h-6 w-6 drop-shadow" />
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{h.tier}</span>
                </div>
                <div className="mt-5 font-display text-lg font-bold capitalize">{h.skill} · {h.testType} code</div>
                <div className="mt-1 text-xs text-muted-foreground">{new Date(h.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
                <div className="mt-4 flex items-end justify-between">
                  <span className="font-display text-3xl font-extrabold">{h.score}<span className="ml-1 text-sm font-medium text-muted-foreground">/100</span></span>
                  <button className="text-xs font-medium text-primary hover:text-primary-hover">Share →</button>
                </div>
              </Spotlight>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
