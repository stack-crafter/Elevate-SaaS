// ─── AI Proctoring — Face Detector (MediaPipe Tasks Vision) ──────────────────
//
// Wraps MediaPipe's FaceLandmarker running fully in-browser (WASM + TF Lite
// model, no network calls per-frame — only the one-time model download).
// Used for:
//   • face count            → "no_face" / "multiple_people"
//   • facial transformation → head yaw/pitch → "suspicious_movement"
//
// Eye-gaze is intentionally never read from the landmarks/blendshapes here.
// ─────────────────────────────────────────────────────────────────────────────

import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export interface HeadPose {
  yawDeg: number; // left/right
  pitchDeg: number; // up/down
}

export interface FaceDetectionResult {
  faceCount: number;
  headPose: HeadPose | null; // pose of the primary (first) face, if any
}

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

/** Lazily creates (once) and caches the FaceLandmarker instance. */
function getLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      // Try GPU first; fall back to CPU if the GPU delegate is unavailable
      try {
        return await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "IMAGE",
          numFaces: 3,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: true,
        });
      } catch (gpuErr) {
        console.warn("FaceLandmarker GPU delegate failed, retrying with CPU:", gpuErr);
        return FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          runningMode: "IMAGE",
          numFaces: 3,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: true,
        });
      }
    })();
  }
  return landmarkerPromise;
}

/** Preloads the model so the first detection cycle isn't the one paying for the download. */
export function preloadFaceDetector(): Promise<void> {
  return getLandmarker().then(() => undefined);
}

/** Decomposes a 4x4 row-major facial transformation matrix into yaw/pitch (degrees). */
function matrixToHeadPose(matrix: number[]): HeadPose {
  const m = matrix;
  const r13 = m[2];
  const r21 = m[4],
    r22 = m[5],
    r23 = m[6];
  const r33 = m[10];

  const yawRad = Math.atan2(r13, r33);
  const pitchRad = Math.atan2(-r23, Math.sqrt(r21 * r21 + r22 * r22));

  return {
    yawDeg: (yawRad * 180) / Math.PI,
    pitchDeg: (pitchRad * 180) / Math.PI,
  };
}

/** Runs face detection on a single captured frame (canvas). */
export async function detectFaces(canvas: HTMLCanvasElement): Promise<FaceDetectionResult> {
  const landmarker = await getLandmarker();
  const result: FaceLandmarkerResult = landmarker.detect(canvas);

  const faceCount = result.faceLandmarks?.length ?? 0;
  let headPose: HeadPose | null = null;

  const matrixData = result.facialTransformationMatrixes?.[0]?.data;
  if (matrixData && matrixData.length === 16) {
    headPose = matrixToHeadPose(Array.from(matrixData));
  }

  return { faceCount, headPose };
}

/** Releases the underlying MediaPipe task graph. Call on final proctoring teardown. */
export async function disposeFaceDetector(): Promise<void> {
  if (!landmarkerPromise) return;
  const landmarker = await landmarkerPromise;
  landmarker.close();
  landmarkerPromise = null;
}
