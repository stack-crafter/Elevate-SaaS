import { useState, useEffect, useRef, useCallback } from "react";
import { generateQRPayload } from "@/business/services/authService";
import {
  createQRSession,
  listenToQRSession,
  pairUser,
  expireSession,
} from "@/data/repositories/authRepository";

export interface UseQrLoginReturn {
  sessionId: string;
  qrValue: string;
  isConnected: boolean;
  scannedName: string;
  scannedEmail: string;
  secondsUntilRefresh: number;
}

const QR_INTERVAL_MS = 5000;

export function useQrLogin(): UseQrLoginReturn {
  const [sessionId, setSessionId] = useState(() => generateQRPayload());
  const [qrValue, setQrValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [scannedName, setScannedName] = useState("");
  const [scannedEmail, setScannedEmail] = useState("");
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(5);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedRef = useRef(false);
  const sessionUnsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize/Rotate QR session
  const initSession = useCallback((newSessionId: string) => {
    // Unsubscribe from previous session
    if (sessionUnsubscribeRef.current) {
      sessionUnsubscribeRef.current();
      sessionUnsubscribeRef.current = null;
    }

    setSessionId(newSessionId);

    // Build scannable full URL for phone cameras
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
    const fullUrl = `${origin}/login?qr_session=${newSessionId}`;
    setQrValue(fullUrl);

    // Register session in Firebase Cloud Firestore
    createQRSession(newSessionId).catch((err) => {
      console.warn("Firestore session registration:", err);
    });

    // Real-time Firestore sync on current session ID
    try {
      sessionUnsubscribeRef.current = listenToQRSession(newSessionId, (sessionData) => {
        if (sessionData && sessionData.status === "paired" && sessionData.email) {
          connectedRef.current = true;
          setScannedName(sessionData.displayName || sessionData.email.split("@")[0] || "Candidate");
          setScannedEmail(sessionData.email);
          setIsConnected(true);

          // Stop rotation & countdown
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (countdownRef.current) clearInterval(countdownRef.current);
          if (sessionUnsubscribeRef.current) sessionUnsubscribeRef.current();
        }
      });
    } catch (err) {
      console.warn("Failed to subscribe to QR Session in Firebase:", err);
    }
  }, []);

  const startRotation = useCallback(() => {
    // Initial setup
    initSession(generateQRPayload());

    // QR rotates every 5s
    intervalRef.current = setInterval(() => {
      if (!connectedRef.current) {
        const nextPayload = generateQRPayload();
        initSession(nextPayload);
        setSecondsUntilRefresh(5);
      }
    }, QR_INTERVAL_MS);

    // Countdown timer
    countdownRef.current = setInterval(() => {
      if (!connectedRef.current) {
        setSecondsUntilRefresh((s) => (s <= 1 ? 5 : s - 1));
      }
    }, 1000);
  }, [initSession]);

  useEffect(() => {
    startRotation();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (sessionUnsubscribeRef.current) {
        sessionUnsubscribeRef.current();
      }
    };
  }, [startRotation]);

  return { sessionId, qrValue, isConnected, scannedName, scannedEmail, secondsUntilRefresh };
}
