import { useCallback, useRef, useState } from "react";
import type { PermissionStatus } from "@/lib/proctoring/types";

export interface UseWebcamPermissionReturn {
  status: PermissionStatus;
  stream: MediaStream | null;
  error: string | null;
  requestAccess: () => Promise<MediaStream | null>;
  stopStream: () => void;
}

/**
 * Owns webcam permission + the raw MediaStream. Does NOT start the camera on
 * mount — the camera is only ever requested in response to an explicit call
 * to `requestAccess()`, per the "never start webcam before permission is
 * granted" requirement.
 */
export function useWebcamPermission(): UseWebcamPermissionReturn {
  const [status, setStatus] = useState<PermissionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [, forceRender] = useState(0);

  const requestAccess = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setError("This browser doesn't support webcam access.");
      return null;
    }

    setStatus("requesting");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setStatus("granted");
      forceRender((n) => n + 1);
      return stream;
    } catch (err) {
      streamRef.current = null;
      setStatus("denied");
      setError(
        err instanceof Error
          ? err.message
          : "Webcam permission was denied. Please allow camera access to start the exam.",
      );
      return null;
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    forceRender((n) => n + 1);
  }, []);

  return { status, stream: streamRef.current, error, requestAccess, stopStream };
}
