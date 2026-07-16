import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Sparkles, Trophy, Flame, TrendingUp, Clock } from "lucide-react";
import { useSession } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { Spotlight } from "@/components/effects/Spotlight";
import { BorderBeam } from "@/components/effects/BorderBeam";
import { MagneticButton } from "@/components/MagneticButton";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Elevate" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { authed, user, history, reset } = useSession();
  const nav = useNavigate();
  useEffect(() => { if (!authed) nav({ to: "/login" }); }, [authed, nav]);

  const avg = history.length ? Math.round(history.reduce((a, h) => a + h.score, 0) / history.length) : 0;
  const bestTier = history[0]?.tier ?? "—";

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="micro-label">Welcome back</div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">{user?.name ?? "Candidate"}, ready for another round?</h1>
            <p className="mt-2 text-muted-foreground">Ten questions. About twelve minutes. Real signal.</p>
          </div>
          <Link to="/select" onClick={reset}>
            <MagneticButton><Sparkles className="h-4 w-4" /> New assessment <ArrowRight className="h-4 w-4" /></MagneticButton>
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Metric icon={TrendingUp} label="Average score" value={`${avg}`} suffix="/ 100" />
          <Metric icon={Trophy} label="Best tier" value={bestTier} />
          <Metric icon={Flame} label="Assessments" value={String(history.length)} />
          <Metric icon={Clock} label="Time invested" value={`${history.length * 12}m`} />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Spotlight warm className="surface-card card-hover relative overflow-hidden p-6 md:col-span-2">
            <BorderBeam duration={7} />
            <div className="relative">
              <div className="micro-label">AI recommendation</div>
              <h2 className="mt-2 font-display text-2xl font-bold">Try Python · Vibe Code next.</h2>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Based on your last three sessions, conversational coding is where you're growing fastest. We've queued 10 fresh questions.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {["Reasoning", "Depth", "Communication"].map((t, i) => (
                  <div key={t} className="rounded-lg border border-border bg-white p-3">
                    <div className="text-[11px] text-muted-foreground">{t}</div>
                    <div className="mt-1 font-display text-lg font-bold">{[avg + 4, avg - 2, avg + 8][i]}</div>
                    <div className="mt-1 h-1 rounded-full bg-surface-2">
                      <div className="h-1 rounded-full bg-primary" style={{ width: `${Math.min(100, [avg + 4, avg - 2, avg + 8][i] || 40)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/select" onClick={reset} className="mt-6 inline-block">
                <MagneticButton>Start recommended <ArrowRight className="h-4 w-4" /></MagneticButton>
              </Link>
            </div>
          </Spotlight>

          <Spotlight className="surface-card card-hover relative p-6">
            <div className="micro-label">Recent activity</div>
            <div className="mt-4 space-y-2">
              {history.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No sessions yet. Take your first assessment.
                </div>
              )}
              {history.slice(0, 5).map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-white p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold capitalize">{h.skill} · {h.testType}</div>
                    <div className="text-[11px] text-muted-foreground">{new Date(h.date).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{h.tier}</span>
                    <span className="font-display text-base font-bold">{h.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </Spotlight>
        </div>

        <div className="mt-8">
          <h2 className="font-display text-xl font-bold">Skill trajectory</h2>
          <div className="surface-card mt-4 p-6">
            <SparkChart data={history.map((h) => h.score).reverse()} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ icon: Icon, label, value, suffix }: { icon: any; label: string; value: string; suffix?: string }) {
  return (
    <Spotlight className="surface-card card-hover relative p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
        <span className="micro-label">{label}</span>
      </div>
      <div className="mt-3 font-display text-3xl font-extrabold">{value}<span className="ml-1 text-sm font-medium text-muted-foreground">{suffix}</span></div>
    </Spotlight>
  );
}

function SparkChart({ data }: { data: number[] }) {
  if (data.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Complete an assessment to see your trajectory.</div>;
  }
  const w = 640, h = 140, pad = 12;
  const min = Math.min(...data, 40), max = Math.max(...data, 100);
  const step = (w - pad * 2) / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => [pad + i * step, h - pad - ((v - min) / Math.max(1, max - min)) * (h - pad * 2)]);
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const area = `${path} L${pts[pts.length - 1][0]},${h - pad} L${pts[0][0]},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full">
      <defs>
        <linearGradient id="area-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(217,119,87,0.25)" />
          <stop offset="100%" stopColor="rgba(217,119,87,0)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#area-g)" />
      <path d={path} fill="none" stroke="#d97757" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="1000" strokeDashoffset="0"
        style={{ animation: "draw 800ms cubic-bezier(0.22,1,0.36,1) both" }} />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#d97757" />)}
      <style>{`@keyframes draw { from { stroke-dashoffset: 1000 } to { stroke-dashoffset: 0 } }`}</style>
    </svg>
  );
}
