import { useRef, type ReactNode, type MouseEvent } from "react";

export function Spotlight({
  children,
  className = "",
  warm = false,
}: {
  children: ReactNode;
  className?: string;
  warm?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`group/spotlight relative overflow-hidden ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spotlight:opacity-100"
        style={{
          background: `radial-gradient(320px circle at var(--mx) var(--my), ${
            warm ? "rgba(217,119,87,0.10)" : "rgba(255,255,255,0.9)"
          }, transparent 55%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
