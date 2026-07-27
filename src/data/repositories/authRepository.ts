import {
  signInUser as fbSignIn,
  signUpUser as fbSignUp,
  signOutUser as fbSignOut,
  getCurrentUser as fbGetCurrentUser,
  onAuthStateChangedListener as fbOnAuthListener,
  createQRLoginSession as fbCreateQR,
  listenToQRLoginSession as fbListenQR,
  updateQRLoginSession as fbUpdateQR,
  pairUserToQRLoginSession as fbPairQR,
  expireQRLoginSession as fbExpireQR,
  validateQRLoginSession as fbValidateQR,
  QRSession,
} from "@/firebase";

export interface UserAuthData {
  uid: string;
  email: string | null;
  displayName: string | null;
}

import type { User as FirebaseUser } from "firebase/auth";

/** Convert Firebase User to local clean user interface */
function toUserAuthData(user: FirebaseUser | null): UserAuthData | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  };
}

export async function signIn(email: string, password: string): Promise<UserAuthData | null> {
  const user = await fbSignIn(email, password);
  return toUserAuthData(user);
}

export async function signUp(
  email: string,
  password: string,
  displayName?: string,
): Promise<UserAuthData | null> {
  const user = await fbSignUp(email, password, displayName);
  return toUserAuthData(user);
}

export async function signOut(): Promise<void> {
  await fbSignOut();
}

export function getCurrentUser(): UserAuthData | null {
  const user = fbGetCurrentUser();
  return toUserAuthData(user);
}

export function onAuthStateChanged(callback: (user: UserAuthData | null) => void): () => void {
  return fbOnAuthListener((user) => {
    callback(toUserAuthData(user));
  });
}

// ─── QR Sessions ─────────────────────────────────────────────────────────────

export async function createQRSession(sessionId: string): Promise<void> {
  await fbCreateQR(sessionId);
}

export function listenToQRSession(
  sessionId: string,
  onUpdate: (data: QRSession | null) => void,
): () => void {
  return fbListenQR(sessionId, onUpdate);
}

export async function updateQRSession(sessionId: string, data: Partial<QRSession>): Promise<void> {
  await fbUpdateQR(sessionId, data);
}

export async function pairUser(
  sessionId: string,
  email: string,
  displayName: string,
): Promise<void> {
  await fbPairQR(sessionId, email, displayName);
}

export async function expireSession(sessionId: string): Promise<void> {
  await fbExpireQR(sessionId);
}

export async function validateSession(sessionId: string): Promise<boolean> {
  return fbValidateQR(sessionId);
}
