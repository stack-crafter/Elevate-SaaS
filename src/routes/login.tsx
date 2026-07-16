import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { QrCode, Mail, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { MagneticButton } from "@/components/MagneticButton";
import { Beams } from "@/components/effects/Beams";
import { useSession } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Elevate Assess" }, { name: "robots", content: "noindex" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [tab, setTab] = useState<"qr" | "manual">("qr");
  const [qrConnected, setQrConnected] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const login = useSession((s) => s.login);
  const nav = useNavigate();

  const submit = () => {
    if (!email || !password) {
      setError(true);
      setTimeout(() => setError(false), 400);
      return;
    }
    login({ name: email.split("@")[0] || "Candidate", email });
    nav({ to: "/select" });
  };

  const simulateQr = () => {
    setQrConnected(true);
    setTimeout(() => {
      login({ name: "Candidate", email: "candidate@elevate.app" });
      nav({ to: "/select" });
    }, 900);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Beams />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_6px_18px_rgba(217,119,87,0.35)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">Elevate Assess</span>
        </div>

        <div className="surface-card w-full p-7">
          <h1 className="font-display text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to continue your assessment.</p>

          <div className="relative mt-6 flex rounded-lg border border-border bg-surface-1 p-1 text-sm">
            {(["qr", "manual"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative z-10 flex-1 rounded-md px-3 py-2 font-medium transition ${tab === t ? "text-foreground" : "text-muted-foreground"}`}
              >
                {t === "qr" ? "QR Login" : "Email"}
              </button>
            ))}
            <span
              aria-hidden
              className="absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-md bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all duration-200"
              style={{ left: tab === "qr" ? 4 : "calc(50% + 0px)", transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }}
            />
          </div>

          <div className="mt-6 min-h-[280px]">
            {tab === "qr" ? (
              <div className="animate-fade-up flex flex-col items-center">
                <div className="relative h-52 w-52 rounded-xl border border-border bg-surface-1 p-4">
                  {/* corner tracing */}
                  {[
                    "top-0 left-0 border-l-2 border-t-2 rounded-tl-lg",
                    "top-0 right-0 border-r-2 border-t-2 rounded-tr-lg",
                    "bottom-0 left-0 border-l-2 border-b-2 rounded-bl-lg",
                    "bottom-0 right-0 border-r-2 border-b-2 rounded-br-lg",
                  ].map((c) => (
                    <span key={c} className={`absolute h-5 w-5 ${c}`} style={{ borderColor: "#d97757" }} />
                  ))}

                  {/* QR mock */}
                  <div className="grid h-full grid-cols-8 grid-rows-8 gap-[2px] overflow-hidden rounded-md p-1">
                    {Array.from({ length: 64 }).map((_, i) => (
                      <span
                        key={i}
                        className="rounded-[2px]"
                        style={{ background: (i * 37) % 3 === 0 ? "#1a1a1a" : "transparent" }}
                      />
                    ))}
                  </div>

                  {!qrConnected && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-4 right-4 h-[2px] rounded animate-scan-line"
                      style={{ top: 8, background: "linear-gradient(90deg, transparent, rgba(217,119,87,0.6), transparent)" }}
                    />
                  )}

                  {qrConnected && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white/85 backdrop-blur-sm animate-fade-up">
                      <CheckCircle2 className="h-10 w-10 text-success" />
                      <div className="mt-2 text-sm font-semibold">Device connected</div>
                    </div>
                  )}
                </div>
                <p className="mt-4 text-center text-xs text-muted-foreground">Scan with the Elevate mobile app to sign in.</p>
                <button onClick={simulateQr} className="mt-3 text-xs font-medium text-primary hover:text-primary-hover">Simulate scan →</button>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); submit(); }}
                className={`animate-fade-up space-y-4 ${error ? "animate-[shake_0.3s]" : ""}`}
              >
                <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }`}</style>
                <FloatingInput icon={Mail} label="Email address" value={email} onChange={setEmail} type="email" />
                <FloatingInput icon={Lock} label="Password" value={password} onChange={setPassword} type="password" />
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-muted-foreground"><input type="checkbox" className="h-3.5 w-3.5" /> Remember me</label>
                  <a href="#" className="font-medium text-primary hover:text-primary-hover">Forgot password?</a>
                </div>
                <MagneticButton className="w-full">Sign in</MagneticButton>
              </form>
            )}
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          New here? <button onClick={simulateQr} className="font-medium text-primary hover:text-primary-hover">Try the demo</button>
        </p>
      </div>
    </div>
  );
}

function FloatingInput({
  icon: Icon, label, value, onChange, type = "text",
}: { icon: any; label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="group relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition group-focus-within:text-primary" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className="w-full rounded-lg border border-border bg-white px-3 py-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
      />
    </div>
  );
}
