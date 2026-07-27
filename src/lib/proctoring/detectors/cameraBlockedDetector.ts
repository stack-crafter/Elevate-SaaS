// ─── AI Proctoring — Camera Blocked Detector ─────────────────────────────────
//
// Cheap heuristic (no ML model needed): a covered/blocked lens produces a
// frame that is almost uniformly dark AND has very low pixel variance
// (no edges/texture — just a flat black/near-black image). We downsample
// aggressively before scanning so this stays essentially free per cycle.
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_SIZE = 32; // downsample to 32x32 for a cheap luminance/variance scan
const DARKNESS_THRESHOLD = 18; // mean luma below this = "very dark"
const VARIANCE_THRESHOLD = 6; // stddev below this = "flat / no texture"

export function isCameraBlocked(canvas: HTMLCanvasElement): boolean {
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = SAMPLE_SIZE;
  sampleCanvas.height = SAMPLE_SIZE;
  const ctx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;

  ctx.drawImage(canvas, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  const luma: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    luma.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  const mean = luma.reduce((a, b) => a + b, 0) / luma.length;
  const variance = luma.reduce((a, b) => a + (b - mean) ** 2, 0) / luma.length;
  const stddev = Math.sqrt(variance);

  return mean < DARKNESS_THRESHOLD && stddev < VARIANCE_THRESHOLD;
}
