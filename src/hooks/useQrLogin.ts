import { useState, useEffect, useRef, useCallback } from "react";
import { generateQRPayload } from "@/business/services/authService";
import {
  createQRSession,
  listenToQRSession,
  expireSession,
} from "@/data/repositories/authRepository";

export interface UseQrLoginReturn {
  sessionId: string;
  qrValue: string;
  isConnected: boolean;
  scannedName: string;
  scannedEmail: string;
  scannedUid: string;
  secondsUntilRefresh: number;
  isExpired: boolean;
}

const QR_INTERVAL_MS = 30_000; // 30 seconds TTL
const COUNTDOWN_START = 30;

export function useQrLogin(): UseQrLoginReturn {
  const [sessionId, setSessionId] = useState(() => generateQRPayload());
  const [qrValue, setQrValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [scannedName, setScannedName] = useState("");
  const [scannedEmail, setScannedEmail] = useState("");
  const [scannedUid, setScannedUid] = useState("");
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(COUNTDOWN_START);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedRef = useRef(false);
  const sessionUnsubscribeRef = useRef<(() => void) | null>(null);
  const previousSessionIdRef = useRef<string>("");

  // Initialize/Rotate QR session
  const initSession = useCallback((newSessionId: string) => {
    // Expire the previous session in Firestore (fire-and-forget)
    if (previousSessionIdRef.current && previousSessionIdRef.current !== newSessionId) {
      expireSession(previousSessionIdRef.current).catch(() => {});
    }
    previousSessionIdRef.current = newSessionId;

    // Unsubscribe from previous Firestore listener
    if (sessionUnsubscribeRef.current) {
      sessionUnsubscribeRef.current();
      sessionUnsubscribeRef.current = null;
    }

    setSessionId(newSessionId);
    setIsExpired(false);
    setSecondsUntilRefresh(COUNTDOWN_START);

    // Build scannable URL for phone cameras.
    // The /qr-pair page auto-pairs instantly if user is already logged in.
    const origin = typeof window !== "undefined" ? window.location.origin : "https://elevate-saa-s.vercel.app";
    const pairingUrl = `${origin}/qr-pair?s=${newSessionId}`;
    setQrValue(pairingUrl);

    // Register session in Firestore
    createQRSession(newSessionId).catch((err) => {
      console.warn("Firestore QR session registration failed:", err);
    });

    // Real-time listener: detect when mobile pairs
    try {
      sessionUnsubscribeRef.current = listenToQRSession(newSessionId, (sessionData) => {
        if (sessionData && sessionData.status === "paired" && sessionData.email) {
          connectedRef.current = true;
          setScannedName(sessionData.name || sessionData.displayName || sessionData.email.split("@")[0] || "Candidate");
          setScannedEmail(sessionData.email);
          setScannedUid(sessionData.jobSeekerID || "");
          setIsConnected(true);

          // Stop rotation & countdown — session is now authenticated
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (countdownRef.current) clearInterval(countdownRef.current);
          if (sessionUnsubscribeRef.current) sessionUnsubscribeRef.current();
        }
      });
    } catch (err) {
      console.warn("Failed to subscribe to QR session:", err);
    }
  }, []);

  const startRotation = useCallback(() => {
    // Initial session
    initSession(generateQRPayload());

    // Rotate QR every 30 seconds (match Firestore TTL)
    intervalRef.current = setInterval(() => {
      if (!connectedRef.current) {
        setIsExpired(true); // brief flash before new QR renders
        setTimeout(() => {
          if (!connectedRef.current) {
            initSession(generateQRPayload());
          }
        }, 400);
      }
    }, QR_INTERVAL_MS);

    // 1-second countdown timer
    countdownRef.current = setInterval(() => {
      if (!connectedRef.current) {
        setSecondsUntilRefresh((s) => (s <= 1 ? COUNTDOWN_START : s - 1));
      }
    }, 1000);
  }, [initSession]);

  useEffect(() => {
    startRotation();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (sessionUnsubscribeRef.current) sessionUnsubscribeRef.current();
    };
  }, [startRotation]);

  return {
    sessionId,
    qrValue,
    isConnected,
    isExpired,
    scannedName,
    scannedEmail,
    scannedUid,
    secondsUntilRefresh,
  };
}
