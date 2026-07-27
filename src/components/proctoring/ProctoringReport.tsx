import { ShieldAlert, ShieldCheck, ImageOff } from "lucide-react";
import type { Violation } from "@/lib/proctoring/types";

interface ProctoringReportProps {
  violations: Violation[];
  warnings: number;
  maxWarnings: number;
  terminated: boolean;
}

export function ProctoringReport({
  violations,
  warnings,
  maxWarnings,
  terminated,
}: ProctoringReportProps) {
  if (violations.length === 0) return null;

  return (
    <div className="mt-12 animate-fade-up">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Proctoring report</h2>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            terminated ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
          }`}
        >
          Warnings: {warnings} / {maxWarnings}
        </span>
      </div>

      {terminated && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/5 p-4">
          <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0 text-danger" />
          <div>
            <div className="text-sm font-semibold text-danger">
              Terminated due to AI-detected cheating
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              This session reached the maximum allowed proctoring warnings and was ended
              automatically.
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {violations.map((v) => (
          <div key={v.id} className="surface-card flex items-center gap-4 p-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2">
              {v.screenshot ? (
                <img src={v.screenshot} alt={v.label} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImageOff className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">{v.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {new Date(v.timestamp).toLocaleTimeString()} · Warning count at time:{" "}
                {v.warningCountAfter}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!terminated && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-success" /> Session completed without exceeding
          the warning threshold.
        </div>
      )}
    </div>
  );
}
