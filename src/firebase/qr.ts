import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "./config";

export interface QRSession {
  status: "pending" | "scanned" | "paired" | "expired" | "completed";
  email?: string;
  displayName?: string;
  createdAt: unknown;
  updatedAt?: unknown;
}

/** Create a new QR session */
export async function createQRLoginSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, "qr_sessions", sessionId);
  await setDoc(sessionRef, {
    status: "pending",
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

/** Pair candidate user details with the active QR Login Session */
export async function pairUserToQRLoginSession(
  sessionId: string,
  email: string,
  displayName: string,
): Promise<void> {
  const sessionRef = doc(db, "qr_sessions", sessionId);
  await updateDoc(sessionRef, {
    status: "paired",
    email,
    displayName,
    updatedAt: serverTimestamp(),
  });
}

/** Mark QR login session as expired */
export async function expireQRLoginSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, "qr_sessions", sessionId);
  await updateDoc(sessionRef, {
    status: "expired",
    updatedAt: serverTimestamp(),
  });
}

/** Validate if a QR session exists and is pending / not expired */
export async function validateQRLoginSession(sessionId: string): Promise<boolean> {
  const sessionRef = doc(db, "qr_sessions", sessionId);
  const snapshot = await getDoc(sessionRef);
  if (!snapshot.exists()) return false;
  const data = snapshot.data() as QRSession;
  return data.status === "pending";
}
