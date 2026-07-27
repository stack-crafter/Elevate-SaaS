import type { Skill } from "@/models/session";
import type { AIQuestion, ChatMessage } from "@/models/assessment";
import { OPENROUTER_MODEL } from "@/lib/config";
import { SKILL_LABELS } from "@/utilities/constants";
import { getApiKey, openRouterFetch } from "@/data/api/openrouterClient";

// ─── Hint Repository ──────────────────────────────────────────────────────────

export async function getHint(
  skill: Skill,
  currentQuestion: AIQuestion,
  userCode: string,
  history: ChatMessage[],
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No API key.");

  const lang = SKILL_LABELS[skill] ?? skill;

  const systemPrompt = `You are a helpful ${lang} coding mentor for the Elevate AI Assessment Platform.

Your ONLY role is to give hints, guidance, and conceptual direction. You must NEVER:
- Give the complete solution or final answer
- Write more than a small snippet (< 5 lines) of code
- Solve the problem for the candidate

You MUST only:
- Point the candidate in the right direction
- Explain relevant concepts or algorithms
- Suggest debugging strategies
- Ask Socratic questions to guide thinking
- Explain what the error message means

Current question context:
Type: ${currentQuestion.type}
Question: ${currentQuestion.prompt}
${userCode ? `\nCandidate's current code/answer:\n\`\`\`\n${userCode}\n\`\`\`` : ""}

Be concise, encouraging, and mentor-like. Do not exceed 150 words.`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  return openRouterFetch(
    {
      model: OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
      messages,
      temperature: 0.6,
      max_tokens: 300,
    },
    apiKey,
  );
}

export async function getCodingHint(
  skill: Skill,
  currentQuestion: AIQuestion,
  userCode: string,
  history: ChatMessage[],
): Promise<string> {
  const userMsgCount = history.filter((m) => m.role === "user").length;
  if (userMsgCount > 3) {
    throw new Error("You have reached the maximum limit of 3 AI hints for this question.");
  }

  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No API key.");

  const lang = SKILL_LABELS[skill] ?? skill;

  const systemPrompt = `You are a helpful ${lang} programming mentor for the Elevate AI Assessment Platform.

Your ONLY role is to act as a mentor. You provide conceptual hints, debugging guidance, edge-case reminders, data structure suggestions, complexity guidance, or algorithm ideas.

CRITICAL SECURITY RULES:
- You must NEVER provide complete solutions, full code, copy-paste implementations, complete functions, or exact answers.
- You must NEVER show hidden test cases or internal scoring systems.
- If the user explicitly asks for the full code, solution, or implementation, politely refuse and provide a conceptual pointer instead.
- Do NOT write more than a small snippet (< 5 lines of code) to illustrate a concept.

Current question context:
Type: vibe_coding (Conversational AI-paired coding)
Question: ${currentQuestion.prompt}
${userCode ? `\nCandidate's current code:\n\`\`\`\n${userCode}\n\`\`\`` : ""}

Be concise, encouraging, and professional. Do not exceed 150 words.`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  return openRouterFetch(
    {
      model: OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
      messages,
      temperature: 0.6,
      max_tokens: 300,
    },
    apiKey,
  );
}
