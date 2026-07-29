import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Loader2, Lock, Mail, QrCode, Smartphone, ChevronLeft } from "lucide-react";
import { Beams } from "@/components/effects/Beams";
import { MagneticButton } from "@/components/MagneticButton";
import { useSession } from "@/lib/store";
import { signIn, pairUser, validateSession } from "@/data/repositories/authRepository";
import { getUserProfile } from "@/firebase/users";

export const Route = createFileRoute("/qr-pair")({
  validateSearch: (search: Record<string, unknown>): { s?: string } => ({
    s: typeof search.s === "string" ? search.s : undefined,
  }),
  head: () => ({
    meta: [{ title: "Link Device — Elevate" }, { name: "robots", content: "noindex" }],
  }),
  component: QrPairPage,
});

type PageState =
  | "validating"    // checking Firestore session
  | "expired"       // session doesn't exist or TTL passed
  | "auto_pairing"  // already logged in → pairing silently
  | "paired"        // success
  | "login_needed"  // not logged in → show minimal form
  | "error";        // pairing failed

function QrPairPage() {
  const search = Route.useSearch();
  const sessionId = search.s;

  const currentUser = useSession((s) => s.user);
  const authLoading = useSession((s) => s.authLoading);
  const login = useSession((s) => s.login);
  const nav = useNavigate();

  const [pageState, setPageState] = useState<PageState>("validating");
  const [errorMessage, setErrorMessage] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);

  // Email/password form state (only shown if not already logged in)
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // ─── Core pairing function — called with confirmed uid/email/name ──────────
  const doPair = async (uid: string, email: string, name: string) => {
    if (!sessionId) {
      setPageState("error");
      setErrorMessage("No session ID found in the URL.");
      return;
    }
    try {
      await pairUser(sessionId, email, name, uid);
      // Also authenticate this mobile browser session
      login({ uid, name, email });
      setPageState("paired");
      // After 2s redirect mobile browser to /select too
      setTimeout(() => nav({ to: "/select" }), 2000);
    } catch (err) {
      console.error("QR pair failed:", err);
      setPageState("error");
      setErrorMessage("Failed to complete authentication. Please try again.");
    }
  };

  // ─── On mount: validate session, then auto-pair if user is already logged in ─
  useEffect(() => {
    if (authLoading) return;

    if (!sessionId) {
      setPageState("expired");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Validate session in Firestore
        const session = await validateSession(sessionId);
        if (cancelled) return;

        if (!session) {
          setPageState("expired");
          return;
        }

        // If we already have a logged-in user in the web session → auto-pair instantly
        if (currentUser) {
          setPageState("auto_pairing");
          // Fetch real name from jobSeekers
          let realName = currentUser.name;
          try {
            const profile = await getUserProfile(currentUser.uid);
            if (profile?.name) realName = profile.name;
          } catch { /* fallback */ }
          if (cancelled) return;
          await doPair(currentUser.uid, currentUser.email, realName);
          return;
        }

        // Not logged in → show instructions / app requirement screen
        setPageState("login_needed");
      } catch (err) {
        if (cancelled) return;
        console.error("QR validation error:", err);
        setPageState("error");
        setErrorMessage("Failed to verify QR code. Please scan the QR code from inside the Elevate mobile app.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, currentUser, authLoading]);

  // ─── Manual login + immediate pair (no approve button) ────────────────────
  const handleLoginAndPair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail || !formPassword) {
      setFormError("Please enter your email and password.");
      return;
    }
    setFormLoading(true);
    setFormError("");
    try {
      const user = await signIn(formEmail, formPassword);
      if (!user) {
        setFormError("Invalid credentials. Make sure you have an Elevate account.");
        setFormLoading(false);
        return;
      }

      // Verify user exists in jobSeekers
      const profile = await getUserProfile(user.uid);
      if (!profile) {
        setFormError("No jobSeeker profile found. Please contact support.");
        setFormLoading(false);
        return;
      }

      // Re-validate session (might have expired while user was typing)
      const session = await validateSession(sessionId!);
      if (!session) {
        setPageState("expired");
        return;
      }

      const realName = profile.name || user.displayName || formEmail.split("@")[0] || "Candidate";
      await doPair(user.uid, user.email || formEmail, realName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setFormError(
        msg.includes("auth/invalid-credential") || msg.includes("auth/user-not-found")
          ? "Invalid credentials."
          : "Authentication error. Please try again.",
      );
      setFormLoading(false);
    }
  };

  // ─── Render states ────────────────────────────────────────────────────────

  if (pageState === "validating" || pageState === "auto_pairing") {
    return (
      <Screen>
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium text-foreground">
          {pageState === "validating" ? "Verifying QR code…" : "Linking your account…"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Please wait</p>
      </Screen>
    );
  }

  if (pageState === "expired") {
    return (
      <Screen>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="mt-4 font-display text-xl font-bold">QR Code Expired</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          This QR code is no longer valid.
          <br />
          Go back to the desktop and scan the fresh QR code.
        </p>
      </Screen>
    );
  }

  if (pageState === "paired") {
    return (
      <Screen>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-7 w-7 text-success" />
        </div>
        <h1 className="mt-4 font-display text-xl font-bold">Authenticated!</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          The desktop app is now signed in.
          <br />
          Redirecting you to your assessment…
        </p>
      </Screen>
    );
  }

  if (pageState === "error") {
    return (
      <Screen>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="mt-4 font-display text-xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">{errorMessage}</p>
      </Screen>
    );
  }

  // login_needed state
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Beams />
      <div className="relative mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6 py-10">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-8 w-8 overflow-hidden rounded-lg">
            <img src="/elogo.png" alt="Elevate" className="h-full w-full object-contain" />
          </div>
          <span className="font-display text-base font-bold tracking-tight">Elevate</span>
        </div>

        {!showManualForm ? (
          <div className="surface-card w-full p-6 text-center flex flex-col items-center animate-fade-up">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4 text-primary">
              <Smartphone className="h-7 w-7 animate-pulse" />
            </div>
            
            <h1 className="font-display text-xl font-bold">Elevate App Required</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              To log in instantly, scan this QR code using the scanner inside the Elevate mobile app.
            </p>

            <div className="mt-5 w-full rounded-lg border border-border bg-surface-1 p-4 text-left text-xs text-muted-foreground space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">1</span>
                <span>Open the Elevate app on your mobile phone</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">2</span>
                <span>Tap the "Scan QR Code" button</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">3</span>
                <span>Align this code to sign in instantly</span>
              </div>
            </div>

            <button
              onClick={() => setShowManualForm(true)}
              className="mt-6 text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition"
            >
              Or, sign in via web browser instead
            </button>
          </div>
        ) : (
          <div className="surface-card w-full p-6 animate-fade-up">
            <button
              onClick={() => setShowManualForm(false)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-4 transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </button>

            <h1 className="font-display text-xl font-bold">Sign in to link device</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter your credentials to authenticate the desktop session.
            </p>

            <form onSubmit={handleLoginAndPair} className="mt-5 space-y-3">
              {formError && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-xs font-medium text-destructive">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="group relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2.5 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                />
              </div>

              <div className="group relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2.5 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                />
              </div>

              <MagneticButton className="w-full" disabled={formLoading}>
                {formLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Linking…
                  </>
                ) : (
                  "Sign in & Link Device"
                )}
              </MagneticButton>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Beams />
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        {children}
      </div>
    </div>
  );
}
