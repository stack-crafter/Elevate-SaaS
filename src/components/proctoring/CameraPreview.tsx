import { useEffect, useRef } from "react";
import { Video } from "lucide-react";

interface CameraPreviewProps {
  stream: MediaStream | null;
  active: boolean;
}

export function CameraPreview({ stream, active }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) el.play().catch(() => undefined);
  }, [stream]);

  return (
    <div className="fixed bottom-6 left-6 z-30 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
      <div className="relative h-28 w-36 bg-surface-2">
        <video
          ref={videoRef}
          muted
          playsInline
          className="h-full w-full object-cover [transform:scaleX(-1)]"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-black/55 px-2 py-1 backdrop-blur-sm">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-success animate-pulse" : "bg-warning"}`}
          />
          <span className="flex items-center gap-1 text-[10px] font-medium text-white">
            <Video className="h-2.5 w-2.5" />
            {active ? "Monitoring active" : "Starting monitoring…"}
          </span>
        </div>
      </div>
    </div>
  );
}
