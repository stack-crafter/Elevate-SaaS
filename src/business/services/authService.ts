// ─── Auth Service ─────────────────────────────────────────────────────────────

/** Generates a pseudo-random token string for QR code content */
export function generateQRPayload(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `elevate_login_${ts}_${rand}`;
}
