import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
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

/** Create a new QR session with a 30-second TTL */
export async function createQRLoginSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, "qr_sessions", sessionId);
  await setDoc(sessionRef, {
    status: "pending",
    expiresAt: Date.now() + 30_000, // 30 seconds so scanner has time
    createdAt: serverTimestamp(),
  });
}

/** Listen to QR session changes in real-time */
export function listenToQRLoginSession(
  sessionId: string,
  onUpdate: (data: QRSession | null) => void,
): () => void {
  const sessionRef = doc(db, "qr_sessions", sessionId);
  return onSnapshot(sessionRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data() as QRSession);
    } else {
      onUpdate(null);
    }
  });
}

/** Update raw QR Session details */
export async function updateQRLoginSession(
  sessionId: string,
  data: Partial<QRSession>,
): Promise<void> {
  const sessionRef = doc(db, "qr_sessions", sessionId);
  await updateDoc(sessionRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Pair candidate user details with the active QR Login Session.
 * This is called by the mobile side immediately after scan — no approval needed.
 */
export async function pairUserToQRLoginSession(
  sessionId: string,
  email: string,
  name: string,
  jobSeekerID?: string,
): Promise<void> {
  const sessionRef = doc(db, "qr_sessions", sessionId);
  await updateDoc(sessionRef, {
    status: "paired",
    email,
    name,
    displayName: name, // backwards compat
    ...(jobSeekerID ? { jobSeekerID } : {}),
    pairedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Mark QR login session as expired */
export async function expireQRLoginSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, "qr_sessions", sessionId);
  // Use getDoc first to check it exists before updating
  const snap = await getDoc(sessionRef);
  if (snap.exists()) {
    await updateDoc(sessionRef, {
      status: "expired",
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Validate if a QR session exists, is pending, and has NOT expired.
 * Returns the full session data if valid, null if expired/missing.
 */
export async function validateQRLoginSession(sessionId: string): Promise<QRSession | null> {
  const sessionRef = doc(db, "qr_sessions", sessionId);
  const snapshot = await getDoc(sessionRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as QRSession;
  if (data.status !== "pending") return null;
  if (data.expiresAt && data.expiresAt < Date.now()) return null;
  return data;
}

/** Get full QR session data (any status) */
export async function getQRLoginSession(sessionId: string): Promise<QRSession | null> {
  const sessionRef = doc(db, "qr_sessions", sessionId);
  const snapshot = await getDoc(sessionRef);
  if (!snapshot.exists()) return null;
  return snapshot.data() as QRSession;
}
