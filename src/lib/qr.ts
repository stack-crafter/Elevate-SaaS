// QR simulation utilities

/** Generates a pseudo-random token string for QR code content */
export function generateQRPayload(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `elevate:login:${ts}:${rand}`;
}

/** Simulated candidate database – in a real app this would come from a backend */
export const SIMULATED_CANDIDATES = [
  { name: "Alex Johnson", email: "alex.johnson@elevate.app" },
  { name: "Priya Sharma", email: "priya.sharma@elevate.app" },
  { name: "Carlos Rivera", email: "carlos.rivera@elevate.app" },
  { name: "Mei Lin", email: "mei.lin@elevate.app" },
  { name: "James Okafor", email: "james.okafor@elevate.app" },
];

/** Pick a random simulated candidate */
export function pickSimulatedCandidate() {
  return SIMULATED_CANDIDATES[Math.floor(Math.random() * SIMULATED_CANDIDATES.length)];
}
