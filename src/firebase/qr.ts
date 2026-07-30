import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";

export interface QRSession {
  status: "pending" | "scanned" | "paired" | "expired" | "completed";
  /** Unix ms timestamp — session expires at this point */
  expiresAt: number;
  email?: string;
  /** Real display name from jobSeekers collection */
  name?: string;
  /** kept for backwards compat */
  displayName?: string;
  jobSeekerID?: string;
  createdAt: unknown;
  pairedAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Helper to extract raw sessionId from a URL or query string if necessary.
 * e.g. "https://elevate-saa-s.vercel.app/qr-pair?s=elevate_login_123" -> "elevate_login_123"
 * e.g. "elevate_login_123" -> "elevate_login_123"
 */
export function extractSessionId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (trimmed.includes("?s=") || trimmed.includes("&s=")) {
    try {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://dummy.com/${trimmed}`);
      const sParam = url.searchParams.get("s");
      if (sParam) return sParam;
    } catch {
      const match = trimmed.match(/[?&]s=([^&]+)/);
      if (match && match[1]) return match[1];
    }
  }
  return trimmed;
}

/** Create a new QR session with a 90-second TTL using merge: true */
export async function createQRLoginSession(sessionId: string): Promise<void> {
  const cleanId = extractSessionId(sessionId);
  const data = {
    status: "pending",
    expiresAt: Date.now() + 90_000, // 90 seconds TTL
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const sessionRef = doc(db, "qr_sessions", cleanId);
  await setDoc(sessionRef, data, { merge: true });

  // If sessionId was a full URL, also save mirror document under full URL ID for direct scanners
  if (cleanId !== sessionId) {
    const rawRef = doc(db, "qr_sessions", sessionId);
    await setDoc(rawRef, data, { merge: true }).catch(() => {});
  }
}

/** Listen to QR session changes in real-time */
export function listenToQRLoginSession(
  sessionId: string,
  onUpdate: (data: QRSession | null) => void,
): () => void {
  const cleanId = extractSessionId(sessionId);
  const sessionRef = doc(db, "qr_sessions", cleanId);
  let rawUnsub: (() => void) | null = null;

  const unsubClean = onSnapshot(
    sessionRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as QRSession);
      } else if (cleanId !== sessionId) {
        if (!rawUnsub) {
          const rawRef = doc(db, "qr_sessions", sessionId);
          rawUnsub = onSnapshot(
            rawRef,
            (rawSnap) => {
              if (rawSnap.exists()) {
                onUpdate(rawSnap.data() as QRSession);
              } else {
                onUpdate(null);
              }
            },
            (err) => console.warn("Raw QR session listen error:", err),
          );
        }
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn("QR session listen error:", err);
      onUpdate(null);
    },
  );

  return () => {
    unsubClean();
    if (rawUnsub) rawUnsub();
  };
}

/** Update raw QR Session details using setDoc with merge: true to avoid [cloud_firestore/not-found] */
export async function updateQRLoginSession(
  sessionId: string,
  data: Partial<QRSession>,
): Promise<void> {
  const cleanId = extractSessionId(sessionId);
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  const sessionRef = doc(db, "qr_sessions", cleanId);
  await setDoc(sessionRef, payload, { merge: true });

  if (cleanId !== sessionId) {
    const rawRef = doc(db, "qr_sessions", sessionId);
    await setDoc(rawRef, payload, { merge: true }).catch(() => {});
  }
}

/**
 * Pair candidate user details with the active QR Login Session.
 * Uses setDoc with merge so the mobile app can pair even if the
 * web app's session doc was not yet created (race condition guard).
 */
export async function pairUserToQRLoginSession(
  sessionId: string,
  email: string,
  name: string,
  jobSeekerID?: string,
): Promise<void> {
  const cleanId = extractSessionId(sessionId);
  const payload = {
    status: "paired",
    email,
    name,
    displayName: name, // backwards compat
    ...(jobSeekerID ? { jobSeekerID } : {}),
    pairedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const sessionRef = doc(db, "qr_sessions", cleanId);
  await setDoc(sessionRef, payload, { merge: true });

  if (cleanId !== sessionId) {
    const rawRef = doc(db, "qr_sessions", sessionId);
    await setDoc(rawRef, payload, { merge: true }).catch(() => {});
  }
}

/** Mark QR login session as expired */
export async function expireQRLoginSession(sessionId: string): Promise<void> {
  const cleanId = extractSessionId(sessionId);
  const payload = {
    status: "expired",
    updatedAt: serverTimestamp(),
  };

  const sessionRef = doc(db, "qr_sessions", cleanId);
  await setDoc(sessionRef, payload, { merge: true }).catch(() => {});

  if (cleanId !== sessionId) {
    const rawRef = doc(db, "qr_sessions", sessionId);
    await setDoc(rawRef, payload, { merge: true }).catch(() => {});
  }
}

/**
 * Validate if a QR session exists, is pending, and has NOT expired.
 * Returns the full session data if valid, null if expired/missing.
 */
export async function validateQRLoginSession(sessionId: string): Promise<QRSession | null> {
  const cleanId = extractSessionId(sessionId);
  let sessionRef = doc(db, "qr_sessions", cleanId);
  let snapshot = await getDoc(sessionRef);

  if (!snapshot.exists() && cleanId !== sessionId) {
    sessionRef = doc(db, "qr_sessions", sessionId);
    snapshot = await getDoc(sessionRef);
  }

  if (!snapshot.exists()) return null;
  const data = snapshot.data() as QRSession;
  if (data.status !== "pending") return null;
  if (data.expiresAt && data.expiresAt < Date.now()) return null;
  return data;
}

/** Get full QR session data (any status) */
export async function getQRLoginSession(sessionId: string): Promise<QRSession | null> {
  const cleanId = extractSessionId(sessionId);
  let sessionRef = doc(db, "qr_sessions", cleanId);
  let snapshot = await getDoc(sessionRef);

  if (!snapshot.exists() && cleanId !== sessionId) {
    sessionRef = doc(db, "qr_sessions", sessionId);
    snapshot = await getDoc(sessionRef);
  }

  if (!snapshot.exists()) return null;
  return snapshot.data() as QRSession;
}

// ─── Expired QR Session Cleanup ──────────────────────────────────────────────

/**
 * Deletes all QR session documents that are stale:
 *  1. status === "expired"
 *  2. status === "pending" / "completed" but expiresAt has passed
 * Uses a Firestore batch write for efficiency (max 500 per batch).
 */
export async function cleanupExpiredQRSessions(): Promise<number> {
  try {
    const sessionsRef = collection(db, "qr_sessions");
    const now = Date.now();

    // Query 1: explicitly expired
    const expiredQuery = query(sessionsRef, where("status", "==", "expired"));
    // Query 2: pending but past TTL
    const stalePendingQuery = query(
      sessionsRef,
      where("status", "==", "pending"),
      where("expiresAt", "<", now),
    );
    // Query 3: completed sessions (already finished, safe to clean)
    const completedQuery = query(sessionsRef, where("status", "==", "completed"));

    const [expiredSnap, staleSnap, completedSnap] = await Promise.all([
      getDocs(expiredQuery),
      getDocs(stalePendingQuery),
      getDocs(completedQuery),
    ]);

    // Deduplicate by doc ID
    const toDelete = new Map<string, typeof expiredSnap.docs[0]>();
    for (const d of [...expiredSnap.docs, ...staleSnap.docs, ...completedSnap.docs]) {
      toDelete.set(d.id, d);
    }

    if (toDelete.size === 0) return 0;

    // Firestore batches max out at 500 operations
    const allDocs = Array.from(toDelete.values());
    let deleted = 0;

    for (let start = 0; start < allDocs.length; start += 500) {
      const batch = writeBatch(db);
      const chunk = allDocs.slice(start, start + 500);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deleted += chunk.length;
    }

    if (deleted > 0) {
      console.info(`[QR Cleanup] Deleted ${deleted} stale QR session(s).`);
    }
    return deleted;
  } catch (err) {
    console.warn("[QR Cleanup] Failed to clean expired sessions:", err);
    return 0;
  }
}

let _cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Starts a background interval that deletes expired QR sessions every 30 seconds.
 * Safe to call multiple times — only one interval will run.
 */
export function startQRSessionCleanup(): void {
  if (_cleanupInterval) return; // already running
  // Run once immediately on start
  cleanupExpiredQRSessions();
  _cleanupInterval = setInterval(cleanupExpiredQRSessions, 30_000);
  console.info("[QR Cleanup] Background cleanup started (every 30s).");
}

/** Stops the background cleanup interval. */
export function stopQRSessionCleanup(): void {
  if (_cleanupInterval) {
    clearInterval(_cleanupInterval);
    _cleanupInterval = null;
    console.info("[QR Cleanup] Background cleanup stopped.");
  }
}
