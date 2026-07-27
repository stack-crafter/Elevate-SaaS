import { Loader2, ShieldAlert } from "lucide-react";

interface ViolationOverlayProps {
  warnings: number;
  maxWarnings: number;
  isEvaluating: boolean;
}

export function ViolationOverlay({ warnings, maxWarnings, isEvaluating }: ViolationOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold text-danger">Exam terminated</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Our AI proctoring system detected repeated violations during this session ({warnings} /{" "}
        {maxWarnings} warnings). Your exam was submitted automatically and this session has been
        flagged for review.
      </p>
      {isEvaluating && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Evaluating your submission…
        </div>
      )}
    </div>
  );
}
