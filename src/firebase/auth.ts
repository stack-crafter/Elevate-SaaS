import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "./config";

export type AuthStateCallback = (user: FirebaseUser | null) => void;

/** Sign in with email and password */
export async function signInUser(email: string, password: string): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/** Sign up a new user with email, password, and optional display name */
export async function signUpUser(
  email: string,
  password: string,
  displayName?: string,
): Promise<FirebaseUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && credential.user) {
    await updateProfile(credential.user, { displayName });
  }
  return credential.user;
}

/** Sign out the current user */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/** Get the currently logged-in user or null */
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

/** Set up a listener for changes to the user's sign-in state */
export function onAuthStateChangedListener(callback: AuthStateCallback): () => void {
  return onAuthStateChanged(auth, callback);
}
