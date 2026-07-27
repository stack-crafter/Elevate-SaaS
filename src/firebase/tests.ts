import { collection, doc, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "./config";

export interface TestSubmission {
  skill: string;
  testType: string;
  score: number;
  date: string;
  tier: string;
  recommendedJobType: string;
  feedback?: unknown;
}

/** Save a candidate's completed test submission */
export async function saveTestSubmission(
  userId: string,
  submission: TestSubmission,
): Promise<string> {
  const submissionsRef = collection(db, "users", userId, "submissions");
  const docRef = await addDoc(submissionsRef, {
    ...submission,
    submittedAt: new Date().toISOString(),
  });
  return docRef.id;
}

/** Fetch all test submissions for a specific candidate */
export async function getUserTestSubmissions(userId: string): Promise<TestSubmission[]> {
  const submissionsRef = collection(db, "users", userId, "submissions");
  const q = query(submissionsRef, orderBy("submittedAt", "desc"));
  const snapshot = await getDocs(q);

  const results: TestSubmission[] = [];
  snapshot.forEach((d) => {
    results.push(d.data() as TestSubmission);
  });
  return results;
}
