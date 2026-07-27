import { ShieldAlert } from "lucide-react";

interface WarningBadgeProps {
  warnings: number;
  maxWarnings: number;
}

export function WarningBadge({ warnings, maxWarnings }: WarningBadgeProps) {
  const urgent = warnings >= maxWarnings - 1;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-sm ${
        urgent
          ? "border-danger/30 bg-danger/5 text-danger"
          : "border-border bg-white text-foreground"
      }`}
      title="AI proctoring warnings"
    >
      <ShieldAlert className="h-3.5 w-3.5" />
      Warnings: {warnings} / {maxWarnings}
    </div>
  );
}
