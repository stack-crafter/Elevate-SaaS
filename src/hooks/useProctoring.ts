import { useCallback, useEffect, useRef, useState } from "react";
import { captureFrame } from "@/lib/proctoring/frameCapture";
import {
  detectFaces,
  preloadFaceDetector,
  disposeFaceDetector,
} from "@/lib/proctoring/detectors/faceDetector";
import {
  detectObjects,
  preloadObjectDetector,
  disposeObjectDetector,
} from "@/lib/proctoring/detectors/objectDetector";
import { isCameraBlocked } from "@/lib/proctoring/detectors/cameraBlockedDetector";
import { ViolationConfirmer } from "@/lib/proctoring/violationConfirmer";
import { VIOLATION_LABEL, type ViolationType } from "@/lib/proctoring/types";
import { useProctoringStore } from "@/lib/proctoringStore";

// Head-pose thresholds beyond which we consider the student "looking away".
// Eye gaze is intentionally never consulted — only coarse head orientation.
const YAW_THRESHOLD_DEG = 28;
const PITCH_THRESHOLD_DEG = 22;

export type MonitoringPhase = "idle" | "loading_models" | "active" | "stopped" | "error";

export interface UseProctoringReturn {
  phase: MonitoringPhase;
  warnings: number;
  maxWarnings: number;
  terminated: boolean;
  start: (stream: MediaStream) => void;
  stop: () => void;
}

/**
 * Orchestrates the full AI proctoring cycle: samples one frame from the given
 * stream every `frameIntervalMs`, runs face + object + blocked-camera
 * detection on it, confirms violations (to cut false positives), and
 * escalates warnings — calling `onTerminated` once the configured threshold
 * is reached.
 */
export function useProctoring(onTerminated: () => void): UseProctoringReturn {
  const config = useProctoringStore((s) => s.config);
  const warnings = useProctoringStore((s) => s.warnings);
  const terminated = useProctoringStore((s) => s.terminated);
  const addViolation = useProctoringStore((s) => s.addViolation);

  const [phase, setPhase] = useState<MonitoringPhase>("idle");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confirmerRef = useRef<ViolationConfirmer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cycleInFlightRef = useRef(false);
  const onTerminatedRef = useRef(onTerminated);
  useEffect(() => {
    onTerminatedRef.current = onTerminated;
  }, [onTerminated]);

  if (!confirmerRef.current) {
    confirmerRef.current = new ViolationConfirmer(config);
  }
  useEffect(() => {
    confirmerRef.current?.updateConfig(config);
  }, [config]);

  const runCycle = useCallback(async () => {
    if (cycleInFlightRef.current) return; // never overlap cycles
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    cycleInFlightRef.current = true;
    try {
      const frame = captureFrame(video, canvasRef.current ?? undefined);
      if (!frame) return;
      canvasRef.current = frame.canvas;

      const detected = new Set<ViolationType>();

      const blocked = isCameraBlocked(frame.canvas);
      if (blocked) {
        detected.add("camera_blocked");
      } else {
        const [faceResult, objectTypes] = await Promise.all([
          detectFaces(frame.canvas),
          detectObjects(frame.canvas),
        ]);

        if (faceResult.faceCount === 0) {
          detected.add("no_face");
        } else if (faceResult.faceCount > 1) {
          detected.add("multiple_people");
        } else if (faceResult.headPose) {
          const { yawDeg, pitchDeg } = faceResult.headPose;
          if (Math.abs(yawDeg) > YAW_THRESHOLD_DEG || Math.abs(pitchDeg) > PITCH_THRESHOLD_DEG) {
            detected.add("suspicious_movement");
          }
        }

        for (const t of objectTypes) detected.add(t);
      }

      const confirmed = confirmerRef.current!.processCycle(detected);
      for (const type of confirmed) {
        const { terminated: nowTerminated } = addViolation({
          type,
          label: VIOLATION_LABEL[type],
          timestamp: new Date().toISOString(),
          screenshot: frame.dataUrl,
        });
        if (nowTerminated) {
          stopInternal();
          onTerminatedRef.current();
          break;
        }
      }
    } catch {
      // Swallow per-cycle detection errors — a single bad frame shouldn't
      // crash monitoring or the exam. Next cycle just tries again.
    } finally {
      cycleInFlightRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addViolation]);

  const stopInternal = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPhase("stopped");
  }, []);

  const start = useCallback(
    (stream: MediaStream) => {
      setPhase("loading_models");

      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      videoRef.current = video;

      Promise.all([
        video.play().catch(() => undefined),
        preloadFaceDetector().catch((e) => {
          console.warn("Face detector failed to preload (proctoring degraded):", e);
        }),
        preloadObjectDetector().catch((e) => {
          console.warn("Object detector failed to preload (proctoring degraded):", e);
        }),
      ])
        .then(() => {
          setPhase("active");
          intervalRef.current = setInterval(runCycle, config.frameIntervalMs);
        })
        .catch((err) => {
          // Only video.play() can throw here now (detectors are individually caught above)
          console.error("Proctoring start failed:", err);
          // Degrade gracefully — exam continues but without proctoring
          setPhase("active");
          intervalRef.current = setInterval(runCycle, config.frameIntervalMs);
        });
    },
    [config.frameIntervalMs, runCycle],
  );

  const stop = useCallback(() => {
    stopInternal();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
  }, [stopInternal]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      void disposeFaceDetector();
      void disposeObjectDetector();
    };
  }, []);

  return { phase, warnings, maxWarnings: config.maxWarnings, terminated, start, stop };
}
