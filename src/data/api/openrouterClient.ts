import { OPENROUTER_API_KEY } from "@/lib/config";

// ─── OpenRouter API Client ────────────────────────────────────────────────────

/** Returns the active API key (config file first, then localStorage fallback) */
export function getApiKey(): string | null {
  if (OPENROUTER_API_KEY && OPENROUTER_API_KEY.trim() !== "") {
    return OPENROUTER_API_KEY;
  }
  return localStorage.getItem("hehe_openrouter_key");
}

/** Raw HTTP fetch to the OpenRouter completions endpoint */
export async function openRouterFetch(body: object, apiKey: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "Elevate AI Assessment",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
