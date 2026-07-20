import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LayoutDashboard, Sparkles, Trophy, LogOut, Command } from "lucide-react";
import { useSession } from "@/lib/store";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/select", label: "New Assessment", icon: Sparkles },
  { to: "/badges", label: "Achievements", icon: Trophy },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const logout = useSession((s) => s.logout);
  const user = useSession((s) => s.user);

  return (
    <div className="min-h-screen bg-surface-1">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface-nav/80 backdrop-blur-xl md:flex">
        <div className="flex items-center gap-2 px-5 py-6">
          <div className="h-8 w-8 overflow-hidden rounded-md">
            <img
              src="/elogo.png"
              alt="Elevate Logo"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="font-display text-[15px] font-bold tracking-tight">
            Elevate
          </div>
        </div>
        <nav className="flex-1 px-3 py-2">
          {nav.map((n) => {
            const active = path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className="group relative mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition hover:text-foreground"
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-0 rounded-lg"
                    style={{ background: "rgba(217,119,87,0.10)" }}
                  />
                )}
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-primary"
                  />
                )}
                <n.icon className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-[2px]" />
                <span className="relative z-10">{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/60 p-2 text-xs text-muted-foreground hairline">
            <Command className="h-3.5 w-3.5" /> <span>Press ⌘K anywhere</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg p-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{user?.name ?? "Guest"}</div>
              <div className="truncate text-[11px] text-muted-foreground">{user?.email ?? "signed in"}</div>
            </div>
            <Link to="/login" onClick={logout} className="rounded p-1.5 text-muted-foreground hover:bg-surface-hover">
              <LogOut className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </aside>
      <main className="md:pl-60">{children}</main>
    </div>
  );
}
