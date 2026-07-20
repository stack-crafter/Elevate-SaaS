import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, ShieldCheck, Zap, Building2, GraduationCap, Users } from "lucide-react";
import { Beams } from "@/components/effects/Beams";
import { BorderBeam } from "@/components/effects/BorderBeam";
import { Spotlight } from "@/components/effects/Spotlight";
import { MagneticButton } from "@/components/MagneticButton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Elevate" },
      { name: "description", content: "The calm, precise assessment platform used by Fortune 500s, universities, and recruiters." },
      { property: "og:title", content: "Elevate Assess" },
      { property: "og:description", content: "Stripe for technical assessments, reimagined in daylight." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 overflow-hidden rounded-md">
            <img
              src="/elogo.png"
              alt="Elevate Logo"
              className="h-full w-full object-contain"
            />
          </div>

          <span className="font-display text-[15px] font-bold tracking-tight">
            Elevate
          </span>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Product</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#customers" className="hover:text-foreground">Customers</a>
          <a href="#faq" className="hover:text-foreground">Docs</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground md:inline">Sign in</Link>
          <Link to="/login">
            <MagneticButton>Get started <ArrowRight className="h-4 w-4" /></MagneticButton>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <Beams />
        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-16 text-center md:pt-24">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Trusted by 400+ engineering teams
          </div>
          <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
            Technical assessments,{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-[#6b7280] via-[#4b5563] to-[#1f2937] bg-clip-text text-transparent">reimagined in daylight.</span>
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            The calm, AI-native platform Fortune 500s, universities, and recruiters use to evaluate real engineering skill — with precision and warmth.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login"><MagneticButton>Start free assessment <ArrowRight className="h-4 w-4" /></MagneticButton></Link>
            <MagneticButton variant="secondary">Book a demo</MagneticButton>
          </div>

          {/* Hero product card */}
          <div className="relative mx-auto mt-16 max-w-5xl">
            <Spotlight warm className="surface-card relative rounded-2xl p-2">
              <BorderBeam duration={7} />
              <div className="relative overflow-hidden rounded-xl border border-border bg-surface-1">
                <div className="flex items-center justify-between border-b border-border bg-white/60 px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="rounded-md border border-border bg-white px-2.5 py-1 font-mono text-[11px] text-muted-foreground">elevate.app / test / python — pure code</div>
                  <div className="w-14" />
                </div>
                <div className="grid gap-0 md:grid-cols-2">
                  <div className="p-6 text-left">
                    <div className="micro-label">Question 03 · Pure Code</div>
                    <h3 className="mt-2 font-display text-xl font-bold">Optimize O(n²) to O(n log n)</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Refactor <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[12px]">find_duplicates()</code> so it scales to 1M rows without external memory.</p>
                    <div className="mt-4 space-y-2">
                      {["Passes: 12/12 hidden tests", "Complexity: O(n log n)", "Memory: within limits"].map((t) => (
                        <div key={t} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-[13px]">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success/15 text-success">✓</span>
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border-l border-border bg-[#fbfaf7] p-4 text-left font-mono text-[12.5px] leading-6">
                    <pre className="whitespace-pre text-foreground/90"><span className="text-muted-foreground">1</span>  <span className="text-[#7c3aed]">def</span> <span className="text-[#4285f4]">find_duplicates</span>(rows):
                      <span className="text-muted-foreground">2</span>      seen = <span className="text-[#0f9d58]">set</span>()
                      <span className="text-muted-foreground">3</span>      dupes = []
                      <span className="text-muted-foreground">4</span>      <span className="text-[#7c3aed]">for</span> r <span className="text-[#7c3aed]">in</span> rows:
                      <span className="text-muted-foreground">5</span>          key = r.id
                      <span className="text-muted-foreground">6</span>          <span className="text-[#7c3aed]">if</span> key <span className="text-[#7c3aed]">in</span> seen:
                      <span className="text-muted-foreground">7</span>              dupes.append(r)
                      <span className="text-muted-foreground">8</span>          seen.add(key)
                      <span className="text-muted-foreground">9</span>      <span className="text-[#7c3aed]">return</span> dupes</pre>
                  </div>
                </div>
              </div>
            </Spotlight>
          </div>
        </div>
      </section>

      {/* Logos */}
      <section id="customers" className="border-y border-border bg-surface-1">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Powering hiring & upskilling at</p>
          <div className="relative mt-6 overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-surface-1 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-surface-1 to-transparent" />
            <div className="flex animate-[marquee_28s_linear_infinite] gap-16 opacity-60 [--gap:4rem]">
              {["Meridian", "Aperture", "Northwind", "Helix Labs", "Vectra", "Kestrel", "Palladium", "Nimbus", "Meridian", "Aperture", "Northwind", "Helix Labs"].map((n, i) => (
                <div key={i} className="font-display whitespace-nowrap text-xl font-bold tracking-tight text-foreground/70">{n}</div>
              ))}
            </div>
            <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
          </div>
        </div>
      </section>

      {/* Bento features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 max-w-2xl">
          <div className="micro-label">The platform</div>
          <h2 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">Precision without pressure.</h2>
          <p className="mt-4 text-lg text-muted-foreground">Every surface tuned for calm focus. Every signal tuned for real engineering skill.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2">
          <BentoCard className="md:col-span-2 md:row-span-1" ai>
            <div className="micro-label">AI Interviewer</div>
            <h3 className="mt-2 font-display text-2xl font-bold">Adaptive questions, humane pacing.</h3>
            <p className="mt-2 text-sm text-muted-foreground">Our model shapes each session to the candidate's signal — never wastes their time, never over-tests.</p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {["Reasoning", "Depth", "Communication"].map((t, i) => (
                <div key={t} className="rounded-lg border border-border bg-white p-3">
                  <div className="text-[11px] text-muted-foreground">{t}</div>
                  <div className="mt-1 font-display text-lg font-bold">{[92, 87, 95][i]}</div>
                  <div className="mt-1 h-1 rounded-full bg-surface-2"><div className="h-1 rounded-full bg-primary" style={{ width: `${[92, 87, 95][i]}%` }} /></div>
                </div>
              ))}
            </div>
          </BentoCard>

          <BentoCard>
            <div className="micro-label">Live Code Editor</div>
            <h3 className="mt-2 font-display text-xl font-bold">Monaco, tuned for daylight.</h3>
            <div className="mt-4 rounded-md border border-border bg-[#fbfaf7] p-3 font-mono text-[11.5px] leading-5">
              <div><span className="text-[#7c3aed]">const</span> score = <span className="text-[#4285f4]">evaluate</span>(sub);</div>
              <div><span className="text-[#7c3aed]">if</span> (score &gt; <span className="text-[#0f9d58]">85</span>) grant(<span className="text-[#4b5563]">"gold"</span>);</div>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="micro-label">Signal</div>
            <h3 className="mt-2 font-display text-xl font-bold">Radar you can trust.</h3>
            <MiniRadar />
          </BentoCard>

          <BentoCard ai className="md:col-span-2">
            <div className="micro-label">Enterprise</div>
            <h3 className="mt-2 font-display text-2xl font-bold">SSO, SOC 2, audit trails.</h3>
            <p className="mt-2 text-sm text-muted-foreground">Ship it to compliance without a fight. RBAC, SCIM, and full data residency.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[{ i: ShieldCheck, t: "SOC 2 Type II" }, { i: Building2, t: "SSO / SAML" }, { i: Users, t: "SCIM" }, { i: Zap, t: "99.99% SLA" }, { i: GraduationCap, t: "EDU tier" }].map(({ i: Icon, t }) => (
                <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium">
                  <Icon className="h-3.5 w-3.5 text-primary" /> {t}
                </span>
              ))}
            </div>
          </BentoCard>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border bg-surface-1">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-12 text-center">
            <div className="micro-label">Pricing</div>
            <h2 className="mt-2 font-display text-4xl font-bold tracking-tight">Priced for teams that ship.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { name: "Starter", price: "$0", tag: "For individuals", features: ["3 assessments / month", "Community support", "Public badges"] },
              { name: "Team", price: "$49", tag: "Per seat / month", features: ["Unlimited assessments", "Custom skills", "Analytics", "Slack integration"], recommended: true },
              { name: "Enterprise", price: "Custom", tag: "For 500+ engineers", features: ["SSO / SCIM", "SOC 2 report", "Dedicated CSM", "Custom SLAs"] },
            ].map((p) => (
              <div key={p.name} className={`surface-card card-hover relative p-7 ${p.recommended ? "border-primary/30" : ""}`}>
                {p.recommended && <BorderBeam duration={6} />}
                <div className="relative">
                  {p.recommended && <div className="absolute -top-3 right-0 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">Recommended</div>}
                  <div className="micro-label">{p.tag}</div>
                  <div className="mt-1 font-display text-xl font-bold">{p.name}</div>
                  <div className="mt-4 font-display text-4xl font-extrabold">{p.price}<span className="text-base font-medium text-muted-foreground"> {p.name === "Team" ? "/ seat" : ""}</span></div>
                  <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" /> {f}</li>
                    ))}
                  </ul>
                  <Link to="/login" className="mt-8 block">
                    <MagneticButton variant={p.recommended ? "primary" : "secondary"} className="w-full">
                      {p.name === "Enterprise" ? "Talk to sales" : "Start free"}
                    </MagneticButton>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 overflow-hidden rounded">
              <img
                src="/elogo.png"
                alt="Elevate Logo"
                className="h-full w-full object-contain"
              />
            </div>

            <span className="font-display font-bold text-foreground">
              Elevate
            </span>
          </div>
          <div>© 2026 Elevate Labs. Built with care.</div>
        </div>
      </footer>
    </div>
  );
}

function BentoCard({ children, className = "", ai = false }: { children: React.ReactNode; className?: string; ai?: boolean }) {
  return (
    <Spotlight warm={ai} className={`surface-card card-hover relative p-6 ${className}`}>
      {ai && <BorderBeam duration={7} />}
      <div className="relative">{children}</div>
    </Spotlight>
  );
}

function MiniRadar() {
  const points = [90, 72, 84, 66, 78, 92];
  const cx = 60, cy = 60, r = 44;
  const coords = points.map((v, i) => {
    const angle = (Math.PI * 2 * i) / points.length - Math.PI / 2;
    const rr = (r * v) / 100;
    return [cx + Math.cos(angle) * rr, cy + Math.sin(angle) * rr];
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + " Z";
  return (
    <svg viewBox="0 0 120 120" className="mx-auto mt-4 h-32 w-32">
      {[0.33, 0.66, 1].map((s) => (
        <polygon
          key={s}
          points={Array.from({ length: 6 }, (_, i) => {
            const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
            return `${cx + Math.cos(a) * r * s},${cy + Math.sin(a) * r * s}`;
          }).join(" ")}
          fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth="1"
        />
      ))}
      <path d={path} fill="rgba(75,85,99,0.18)" stroke="#4b5563" strokeWidth="1.5" />
      {coords.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill="#4b5563" />)}
    </svg>
  );
}
