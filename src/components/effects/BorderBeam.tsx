export function BorderBeam({
  duration = 6,
  className = "",
}: {
  duration?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 rounded-[inherit] ${className}`}
      style={{
        padding: "1px",
        background: `conic-gradient(from 0deg, transparent 0deg, rgba(217,119,87,0.55) 60deg, rgba(66,133,244,0.55) 120deg, transparent 180deg, transparent 360deg)`,
        WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        animation: `beam-travel ${duration}s linear infinite`,
        opacity: 0.5,
      }}
    />
  );
}
