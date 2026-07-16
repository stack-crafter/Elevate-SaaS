import { useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

export function MagneticButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: { children: ReactNode; variant?: Variant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    setPos({ x: x * 0.2, y: y * 0.2 });
  };
  const onLeave = () => setPos({ x: 0, y: 0 });
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const id = Date.now();
      setRipples((rs) => [...rs, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
      setTimeout(() => setRipples((rs) => rs.filter((x) => x.id !== id)), 600);
    }
    props.onClick?.(e);
  };

  const base =
    "relative inline-flex items-center justify-center overflow-hidden rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none";
  const styles: Record<Variant, string> = {
    primary:
      "bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(217,119,87,0.25)] hover:bg-primary-hover hover:shadow-[0_12px_32px_rgba(217,119,87,0.35)]",
    secondary:
      "bg-white text-foreground border border-border hover:border-border-strong hover:bg-surface-hover",
    ghost: "text-foreground hover:bg-surface-hover",
  };

  return (
    <button
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      {...props}
      onClick={onClick}
      className={`${base} ${styles[variant]} ${className}`}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        transition: "transform 250ms cubic-bezier(0.22,1,0.36,1), background-color 150ms, box-shadow 200ms",
      }}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: r.x, top: r.y, width: 8, height: 8,
            background: variant === "primary" ? "rgba(255,255,255,0.5)" : "rgba(217,119,87,0.25)",
            transform: "translate(-50%, -50%) scale(1)",
            animation: "ripple 600ms ease-out forwards",
          }}
        />
      ))}
      <style>{`@keyframes ripple { to { transform: translate(-50%, -50%) scale(40); opacity: 0; } }`}</style>
    </button>
  );
}
