import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./config";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  createdAt: unknown;
  updatedAt?: unknown;
}

/** Save user profile info in users collection */
export async function saveUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } else {
    await setDoc(userRef, {
      uid: userId,
      name: data.name || "",
      email: data.email || "",
      createdAt: new Date().toISOString(),
    });
  }
}

/** Retrieve user profile information */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  return null;
}
