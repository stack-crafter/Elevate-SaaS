import { useState, useEffect, useRef, useCallback } from "react";
import { generateQRPayload, pickSimulatedCandidate } from "@/lib/qr";

export interface UseQrLoginReturn {
  qrValue: string;
  isConnected: boolean;
  scannedName: string;
  scannedEmail: string;
  simulateScan: () => void;
  secondsUntilRefresh: number;
}

const QR_INTERVAL_MS = 5000;

export function useQrLogin(): UseQrLoginReturn {
  const [qrValue, setQrValue] = useState(() => generateQRPayload());
  const [isConnected, setIsConnected] = useState(false);
  const [scannedName, setScannedName] = useState("");
  const [scannedEmail, setScannedEmail] = useState("");
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(5);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedRef = useRef(false);

  const startRotation = useCallback(() => {
    // QR rotates every 5s
    intervalRef.current = setInterval(() => {
      if (!connectedRef.current) {
        setQrValue(generateQRPayload());
        setSecondsUntilRefresh(5);
      }
    }, QR_INTERVAL_MS);

    // Countdown timer
    countdownRef.current = setInterval(() => {
      if (!connectedRef.current) {
        setSecondsUntilRefresh((s) => (s <= 1 ? 5 : s - 1));
      }
    }, 1000);
  }, []);

  useEffect(() => {
    startRotation();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [startRotation]);

  const simulateScan = useCallback(() => {
    const candidate = pickSimulatedCandidate();
    connectedRef.current = true;
    setScannedName(candidate.name);
    setScannedEmail(candidate.email);
    setIsConnected(true);
    // Stop rotation
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  return { qrValue, isConnected, scannedName, scannedEmail, simulateScan, secondsUntilRefresh };
}
