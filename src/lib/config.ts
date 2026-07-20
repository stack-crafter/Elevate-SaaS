// ─── Elevate AI — Central Configuration ──────────────────────────────────────
//
// API key and model are loaded from environment variables (.env file).
// To change them, edit your .env file:
//
//   VITE_OPENROUTER_API_KEY="sk-or-v1-..."
//   VITE_OPENROUTER_MODEL="openai/gpt-4o-mini"
//
// Available models: https://openrouter.ai/models
// ─────────────────────────────────────────────────────────────────────────────

export const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY ?? "";
export const OPENROUTER_MODEL  = import.meta.env.VITE_OPENROUTER_MODEL  ?? "openai/gpt-4o-mini";
