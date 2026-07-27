export function Beams() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 mesh-bg animate-mesh-drift" />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.5]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="beam-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(15,23,42,0)" />
            <stop offset="50%" stopColor="rgba(15,23,42,0.06)" />
            <stop offset="100%" stopColor="rgba(217,119,87,0.10)" />
          </linearGradient>
        </defs>
        {Array.from({ length: 18 }).map((_, i) => (
          <line
            key={i}
            x1={`${(i / 18) * 100}%`}
            y1="0%"
            x2={`${((i + 6) / 18) * 100}%`}
            y2="100%"
            stroke="url(#beam-g)"
            strokeWidth="1"
          />
        ))}
      </svg>
      <div className="absolute inset-0 dot-grid opacity-[0.35]" />
    </div>
  );
}
