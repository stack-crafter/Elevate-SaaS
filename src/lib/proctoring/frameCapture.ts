// ─── AI Proctoring — Frame Capture ───────────────────────────────────────────
//
// Grabs a single still frame from a <video> element via an offscreen <canvas>.
// This is the ONLY place we touch the video stream per detection cycle — we
// never process every frame, only the one snapshot every N seconds.
// ─────────────────────────────────────────────────────────────────────────────

export interface CapturedFrame {
  canvas: HTMLCanvasElement;
  /** Compressed JPEG data URL, used as the violation screenshot. */
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Captures the current frame of a playing <video> element onto a reusable
 * offscreen canvas. Pass the same canvas back in on subsequent calls to
 * avoid re-allocating memory every cycle (prevents leaks / GC churn).
 */
export function captureFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement = document.createElement("canvas"),
  jpegQuality = 0.6,
): CapturedFrame | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, width, height);

  return {
    canvas,
    dataUrl: canvas.toDataURL("image/jpeg", jpegQuality),
    width,
    height,
  };
}
