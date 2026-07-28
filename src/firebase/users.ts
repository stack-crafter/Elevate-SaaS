import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./config";

export interface UserProfile {
  jobSeekerID: string;
  name: string;
  email: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  userType?: string;
}

/** Save user profile info in jobSeekers collection */
export async function saveUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, "jobSeekers", userId);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } else {
    await setDoc(userRef, {
      jobSeekerID: userId,
      name: data.name || "",
      email: data.email || "",
      userType: "JobSeeker",
      createdAt: new Date().toISOString(),
    });
  }
}

/** Retrieve user profile information from jobSeekers collection */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const userRef = doc(db, "jobSeekers", userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  return null;
}
