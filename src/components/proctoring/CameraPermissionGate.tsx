import { Camera, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { MagneticButton } from "@/components/MagneticButton";
import { useWebcamPermission } from "@/hooks/useWebcamPermission";

interface CameraPermissionGateProps {
  onGranted: (stream: MediaStream) => void;
}

export function CameraPermissionGate({ onGranted }: CameraPermissionGateProps) {
  const { status, error, requestAccess } = useWebcamPermission();

  const handleEnable = async () => {
    const stream = await requestAccess();
    if (stream) onGranted(stream);
  };

  return (
    <div className="min-h-screen bg-surface-1 flex items-center justify-center px-6">
      <div className="surface-card max-w-md p-8 text-center animate-fade-up">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Camera className="h-6 w-6" />
        </div>

        <h2 className="mt-5 font-display text-2xl font-bold tracking-tight">
          Camera check required
        </h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          This assessment uses AI proctoring to keep it fair. We need webcam access to monitor for
          cheating — the live feed never leaves your browser.
        </p>

        <ul className="mt-5 space-y-2 text-left text-[13px] text-muted-foreground">
          <li className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-success" />
            All AI detection runs locally in your browser — nothing is uploaded.
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-success" />
            The exam won't start until camera access is granted.
          </li>
        </ul>

        {status === "denied" && (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 p-3 text-left text-[13px] text-danger">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Webcam permission is required to take this exam.{" "}
              {error ?? "Please allow camera access and try again."}
            </span>
          </div>
        )}

        {status === "unsupported" && (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 p-3 text-left text-[13px] text-danger">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Your browser doesn't support webcam access. Please switch to an up-to-date Chrome,
              Edge, or Firefox.
            </span>
          </div>
        )}

        <div className="mt-6">
          <MagneticButton
            className="w-full justify-center"
            disabled={status === "requesting" || status === "unsupported"}
            onClick={handleEnable}
          >
            {status === "requesting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Requesting camera access…
              </>
            ) : status === "denied" ? (
              "Try again"
            ) : (
              <>
                <Camera className="h-4 w-4" /> Enable camera & start exam
              </>
            )}
          </MagneticButton>
        </div>
      </div>
    </div>
  );
}
