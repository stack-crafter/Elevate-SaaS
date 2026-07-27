// ─── JSON Parsing Helper ─────────────────────────────────────────────────────

/** Safely parse JSON, supporting markdown code fence extraction */
export function safeParseJSON<T>(text: string): T | null {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = match ? match[1] : text;
  try {
    return JSON.parse(raw.trim()) as T;
  } catch {
    return null;
  }
}
