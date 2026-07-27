import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { Mail, Lock, CheckCircle2, User, AlertCircle } from "lucide-react";
import { MagneticButton } from "@/components/MagneticButton";
import { Beams } from "@/components/effects/Beams";
import { useSession } from "@/lib/store";
import { useQrLogin } from "@/hooks/useQrLogin";
import { QRCodeSVG } from "qrcode.react";

import { signIn, pairUser } from "@/data/repositories/authRepository";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    qr_session: typeof search.qr_session === "string" ? search.qr_session : "",
  }),
  head: () => ({ meta: [{ title: "Sign in — Elevate" }, { name: "robots", content: "noindex" }] }),
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  const targetSession = search.qr_session;

  const [tab, setTab] = useState<"qr" | "manual">("qr");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [pairedSuccess, setPairedSuccess] = useState(false);

  const currentUser = useSession((s) => s.user);
  const login = useSession((s) => s.login);
  const nav = useNavigate();

  // ─── QR hook ──────────────────────────────────────────────────────────────
  const { qrValue, isConnected, scannedName, scannedEmail, secondsUntilRefresh } = useQrLogin();

  // Navigate after QR approval on desktop with a short delay to show candidate info
  useEffect(() => {
    if (isConnected && scannedName && scannedEmail) {
      const t = setTimeout(() => {
        login({ name: scannedName, email: scannedEmail });
        nav({ to: "/select" });
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [isConnected, scannedName, scannedEmail, login, nav]);

  // ─── Mobile QR Pairing Handler ────────────────────────────────────────────
  const handleApproveSession = async (userEmail: string, userName: string) => {
    if (!targetSession) return;
    setLoading(true);
    try {
      await pairUser(targetSession, userEmail, userName);
      setPairedSuccess(true);
    } catch (err) {
      console.error("Failed to pair session:", err);
      setError(true);
      setErrorMessage("Failed to approve QR session in Firestore.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Manual login ─────────────────────────────────────────────────────────
  const submit = async () => {
    if (!email || !password) {
      setError(true);
      setErrorMessage("Please enter both email and password.");
      setTimeout(() => setError(false), 2000);
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      // Authenticate strictly with Firebase Auth (User must exist in Firebase)
      const user = await signIn(email, password);
      if (user) {
        const candidateName = user.displayName || email.split("@")[0] || "Candidate";
        const candidateEmail = user.email || email;

        // If scanning on mobile via URL, pair the desktop session
        if (targetSession) {
          await handleApproveSession(candidateEmail, candidateName);
        } else {
          login({ name: candidateName, email: candidateEmail });
          nav({ to: "/select" });
        }
      } else {
        setError(true);
        setErrorMessage("Authentication failed. User must exist in Firebase.");
      }
    } catch (err: unknown) {
      console.error("Firebase Auth error:", err);
      const message = err instanceof Error ? err.message : "";
      setError(true);
      setErrorMessage(
        message.includes("auth/user-not-found") || message.includes("auth/invalid-credential")
          ? "Invalid credentials. Candidate account must exist in Firebase."
          : "Authentication error. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (targetSession) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <Beams />
        <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10">
          <div className="surface-card w-full p-7 text-center animate-fade-up">
            <h1 className="font-display text-2xl font-bold">Authorize Desktop Sign-In</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              A desktop device is requesting to sign in using your Elevate account.
            </p>

            {pairedSuccess ? (
              <div className="mt-6 flex flex-col items-center gap-3">
                <CheckCircle2 className="h-12 w-12 text-success" />
                <div className="text-base font-semibold text-foreground">Desktop Authorized!</div>
                <p className="text-xs text-muted-foreground">
                  You may close this tab on your phone. The desktop app is now signing in
                  automatically.
                </p>
              </div>
            ) : currentUser ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-border bg-surface-1 p-3 text-left text-sm">
                  <div className="font-semibold">{currentUser.name}</div>
                  <div className="text-xs text-muted-foreground">{currentUser.email}</div>
                </div>
                <MagneticButton
                  className="w-full"
                  disabled={loading}
                  onClick={() => handleApproveSession(currentUser.email, currentUser.name)}
                >
                  {loading ? "Approving..." : "Approve Sign-In"}
                </MagneticButton>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
                className="mt-6 space-y-4 text-left"
              >
                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs font-medium text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
                <FloatingInput
                  icon={Mail}
                  label="Email address"
                  value={email}
                  onChange={setEmail}
                  type="email"
                />
                <FloatingInput
                  icon={Lock}
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  type="password"
                />
                <MagneticButton className="w-full" disabled={loading}>
                  {loading ? "Authenticating..." : "Sign in & Authorize Desktop"}
                </MagneticButton>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Beams />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10">
        <div className="mb-8 flex items-center gap-2">
          <div className="h-9 w-9 overflow-hidden rounded-lg">
            <img src="/elogo.png" alt="Elevate Logo" className="h-full w-full object-contain" />
          </div>

          <span className="font-display text-lg font-bold tracking-tight">Elevate</span>
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
              style={{
                left: tab === "qr" ? 4 : "calc(50% + 0px)",
                transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)",
              }}
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
                    <span
                      key={c}
                      className={`absolute h-5 w-5 ${c}`}
                      style={{ borderColor: "#4b5563" }}
                    />
                  ))}

                  {/* Real QR code */}
                  <div className="flex h-full items-center justify-center rounded-md overflow-hidden">
                    <QRCodeSVG
                      value={qrValue}
                      size={160}
                      bgColor="transparent"
                      fgColor="#1a1a1a"
                      level="M"
                    />
                  </div>

                  {!isConnected && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-4 right-4 h-[2px] rounded animate-scan-line"
                      style={{
                        top: 8,
                        background:
                          "linear-gradient(90deg, transparent, rgba(217,119,87,0.6), transparent)",
                      }}
                    />
                  )}

                  {isConnected && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white/85 backdrop-blur-sm animate-fade-up">
                      <CheckCircle2 className="h-10 w-10 text-success" />
                      <div className="mt-2 text-sm font-semibold">Device connected</div>
                      {scannedName && (
                        <div className="mt-3 flex flex-col items-center gap-1">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="text-sm font-semibold text-foreground">{scannedName}</div>
                          <div className="text-xs text-muted-foreground">{scannedEmail}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Refresh countdown */}
                {!isConnected && (
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    QR refreshes in{" "}
                    <span className="font-semibold tabular-nums text-primary">
                      {secondsUntilRefresh}s
                    </span>
                  </p>
                )}

                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Scan with the Elevate mobile app to sign in.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
                className={`animate-fade-up space-y-4 ${error ? "animate-[shake_0.3s]" : ""}`}
              >
                <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }`}</style>

                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs font-medium text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <FloatingInput
                  icon={Mail}
                  label="Email address"
                  value={email}
                  onChange={setEmail}
                  type="email"
                />
                <FloatingInput
                  icon={Lock}
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  type="password"
                />
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <input type="checkbox" className="h-3.5 w-3.5" /> Remember me
                  </label>
                  <a href="#" className="font-medium text-primary hover:text-primary-hover">
                    Forgot password?
                  </a>
                </div>
                <MagneticButton className="w-full" disabled={loading}>
                  {loading ? "Authenticating..." : "Sign in"}
                </MagneticButton>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingInput({
  icon: Icon,
  label,
  value,
  onChange,
  type = "text",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
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
