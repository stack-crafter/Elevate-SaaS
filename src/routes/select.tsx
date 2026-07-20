import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Coffee, Terminal, Code2, Braces, MessageSquareCode, Lightbulb, Smartphone, Atom, Server, Bot, Brain, BarChart3 } from "lucide-react";
import { useSession, type Skill, type TestType } from "@/lib/store";
import { Spotlight } from "@/components/effects/Spotlight";
import { BorderBeam } from "@/components/effects/BorderBeam";
import { MagneticButton } from "@/components/MagneticButton";

export const Route = createFileRoute("/select")({
  head: () => ({ meta: [{ title: "Choose your assessment — Elevate" }, { name: "robots", content: "noindex" }] }),
  component: SelectPage,
});

const skills: { id: Skill; name: string; blurb: string; icon: any; tint: string }[] = [
  { id: "flutter",     name: "Flutter",          blurb: "Dart, widgets, mobile UI",          icon: Smartphone,   tint: "#54c5f8" },
  { id: "react",       name: "React",             blurb: "Hooks, state, component patterns",  icon: Atom,         tint: "#61dafb" },
  { id: "nodejs",      name: "Node.js",           blurb: "Async, APIs, event loop",           icon: Server,       tint: "#68a063" },
  { id: "python",      name: "Python",            blurb: "Data, scripting, ML",               icon: Terminal,     tint: "#4285f4" },
  { id: "ai",          name: "AI",                blurb: "Prompting, agents, LLMs",           icon: Bot,          tint: "#7c3aed" },
  { id: "ml",          name: "Machine Learning",  blurb: "Models, training, evaluation",      icon: Brain,        tint: "#0f9d58" },
  { id: "datascience", name: "Data Science",      blurb: "Analysis, viz, pipelines",          icon: BarChart3,    tint: "#f4b400" },
  { id: "java",        name: "Java",              blurb: "JVM, concurrency, Spring",          icon: Coffee,       tint: "#8b5a2b" },
  { id: "cpp",         name: "C++",               blurb: "Systems, memory, STL",              icon: Code2,        tint: "#9333ea" },
];

const types: { id: TestType; name: string; blurb: string; icon: any }[] = [
  { id: "pure",       name: "Pure Code",        blurb: "Timed algorithm challenges with hidden tests.",         icon: Braces },
  { id: "vibe",       name: "Vibe Code",        blurb: "Conversational, AI-paired coding scenarios.",           icon: MessageSquareCode },
  { id: "experience", name: "Experience Code",  blurb: "Behavioral + real-world code review.",                  icon: Lightbulb },
];

function SelectPage() {
  const { skill, testType, setSkill, setTestType, authed } = useSession();
  const nav = useNavigate();
  useEffect(() => { if (!authed) nav({ to: "/login" }); }, [authed, nav]);

  const handleStart = () => {
    nav({ to: "/test" });
  };

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-border bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
          <div className="micro-label">Step 1 of 2</div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-14">
        <div className="max-w-2xl">
          <div className="micro-label">New assessment</div>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">Choose a skill.</h1>
          <p className="mt-3 text-lg text-muted-foreground">Pick a language, then a test format. Ten questions. About twelve minutes.</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {skills.map((s) => {
            const active = skill === s.id;
            return (
              <Spotlight
                key={s.id}
                warm
                className={`surface-card card-hover relative cursor-pointer p-6 text-left ${active ? "border-primary/40" : ""}`}
              >
                {active && <BorderBeam duration={6} />}
                <button onClick={() => setSkill(s.id)} className="relative block w-full text-left">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: `${s.tint}15`, color: s.tint }}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4 font-display text-xl font-bold">{s.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{s.blurb}</div>
                  {active && <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">Selected</div>}
                </button>
              </Spotlight>
            );
          })}
        </div>

        {skill && (
          <>
            <div className="mt-16 max-w-2xl animate-fade-up">
              <div className="micro-label">Step 2 of 2</div>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">Choose a test format.</h2>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {types.map((t, i) => {
                const active = testType === t.id;
                return (
                  <Spotlight
                    key={t.id}
                    warm
                    className={`surface-card card-hover relative cursor-pointer p-6 text-left animate-fade-up ${active ? "border-primary/40" : ""}`}
                  >
                    {active && <BorderBeam duration={6} />}
                    <button
                      onClick={() => setTestType(t.id)}
                      className="relative block w-full text-left"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-foreground">
                        <t.icon className="h-5 w-5" />
                      </div>
                      <div className="mt-4 font-display text-lg font-bold">{t.name}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{t.blurb}</div>
                      {active && <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">Selected</div>}
                    </button>
                  </Spotlight>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-14 flex items-center justify-between border-t border-border pt-8">
          <div className="text-sm text-muted-foreground">
            {skill && testType
              ? <><span className="font-semibold text-foreground capitalize">{skill}</span> · <span className="font-semibold text-foreground capitalize">{testType} code</span></>
              : "Select a skill and format to continue"}
          </div>
          <MagneticButton disabled={!skill || !testType} onClick={handleStart}>
            Start test <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </div>
      </main>
    </div>
  );
}
