import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  DocumentData,
} from "firebase/firestore";
import { db } from "./config";

export { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs };
export type { DocumentData };
