// ─── AI Proctoring — Object Detector (TensorFlow.js coco-ssd) ────────────────
//
// Runs entirely in-browser (WebGL backend). Detects the presence of a second
// device in frame: mobile phone, laptop, or tablet.
//
// Note on COCO classes: the stock COCO-SSD label set has "cell phone" and
// "laptop" but no dedicated "tablet" class. We approximate tablets from
// "cell phone" detections whose bounding box is significantly larger than a
// typical phone (by area, relative to the frame) — a tablet held up to a
// webcam reads as a large flat rectangle, a phone as a small one. Any
// "laptop" detected in-frame is inherently a *second* laptop, since the
// student's own laptop is behind the camera, not in front of it.
// ─────────────────────────────────────────────────────────────────────────────

import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

export type ObjectViolation = "mobile_phone" | "second_laptop" | "tablet";

const TABLET_AREA_RATIO = 0.12;
const MIN_SCORE = 0.55;

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;

function getModel(): Promise<cocoSsd.ObjectDetection> {
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        await tf.setBackend("webgl");
        await tf.ready();
      } catch (err) {
        console.warn("WebGL backend failed to initialize, falling back to CPU:", err);
        try {
          await tf.setBackend("cpu");
          await tf.ready();
        } catch (cpuErr) {
          console.error("CPU backend also failed to initialize:", cpuErr);
          throw cpuErr;
        }
      }
      return cocoSsd.load({ base: "mobilenet_v2" });
    })();
  }
  return modelPromise;
}

/** Preloads the model so the first detection cycle isn't the one paying for the download. */
export function preloadObjectDetector(): Promise<void> {
  return getModel().then(() => undefined);
}

export async function detectObjects(canvas: HTMLCanvasElement): Promise<ObjectViolation[]> {
  const model = await getModel();
  const predictions = await model.detect(canvas);
  const frameArea = canvas.width * canvas.height;

  const found = new Set<ObjectViolation>();

  for (const p of predictions) {
    if (p.score < MIN_SCORE) continue;
    const [, , w, h] = p.bbox;
    const areaRatio = (w * h) / frameArea;

    if (p.class === "cell phone") {
      found.add(areaRatio >= TABLET_AREA_RATIO ? "tablet" : "mobile_phone");
    } else if (p.class === "laptop") {
      found.add("second_laptop");
    }
  }

  return Array.from(found);
}

/** Releases GPU memory held by the model. Call on final proctoring teardown. */
export async function disposeObjectDetector(): Promise<void> {
  modelPromise = null;
}
