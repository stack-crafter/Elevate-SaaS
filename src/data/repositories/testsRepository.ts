import {
  saveTestSubmission as fbSaveSubmission,
  getUserTestSubmissions as fbGetSubmissions,
  TestSubmission,
} from "@/firebase";

/** Save a user's test assessment result */
export async function saveTestResult(userId: string, result: TestSubmission): Promise<string> {
  return fbSaveSubmission(userId, result);
}

/** Retrieve all past test results of a user */
export async function getTestResults(userId: string): Promise<TestSubmission[]> {
  return fbGetSubmissions(userId);
}
