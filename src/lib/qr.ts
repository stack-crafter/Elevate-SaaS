// ─── Backward-Compatibility Shim ─────────────────────────────────────────────
// src/lib/qr.ts → re-exports from Business services layer
export { generateQRPayload } from "@/business/services/authService";
