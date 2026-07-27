import type { CareerGuidance } from "@/models/career";
import { OPENROUTER_MODEL } from "@/lib/config";
import { SKILL_LABELS } from "@/utilities/constants";
import { safeParseJSON } from "@/utilities/parsing";
import { getApiKey, openRouterFetch } from "@/data/api/openrouterClient";

// ─── Career Repository ────────────────────────────────────────────────────────

export async function generateCareerGuidance(
  userName: string,
  history: {
    skill: string;
    testType: string;
    score: number;
    date: string;
    tier: string;
    feedback?: { strengths?: string[]; weaknesses?: string[]; overallFeedback?: string } | null;
  }[],
): Promise<CareerGuidance> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No API key.");

  const historySummary = history
    .map(
      (h, i) =>
        `Test ${i + 1}: ${SKILL_LABELS[h.skill] ?? h.skill} (${h.testType}) — Score: ${h.score}/100 — Badge: ${h.tier}` +
        (h.feedback?.overallFeedback ? `\n  Feedback: ${h.feedback.overallFeedback}` : "") +
        (h.feedback?.strengths?.length ? `\n  Strengths: ${h.feedback.strengths.join(", ")}` : "") +
        (h.feedback?.weaknesses?.length
          ? `\n  Weaknesses: ${h.feedback.weaknesses.join(", ")}`
          : ""),
    )
    .join("\n\n");

  const skillCoverage = [...new Set(history.map((h) => SKILL_LABELS[h.skill] ?? h.skill))].join(
    ", ",
  );
  const avgScore =
    history.length > 0 ? Math.round(history.reduce((a, b) => a + b.score, 0) / history.length) : 0;

  const systemPrompt = `You are an expert career counselor and technical recruiter specializing in software engineering.
Analyze this candidate assessment history and generate a comprehensive, personalized career guidance report.

Candidate: ${userName}
Total Assessments: ${history.length}
Average Score: ${avgScore}/100
Skills Tested: ${skillCoverage}

Assessment History:
${historySummary}

Return ONLY valid JSON (no markdown fences) matching this EXACT structure:
{
  "headline": "One powerful headline sentence about the candidate trajectory",
  "summary": "2-3 sentence personalized summary of their overall technical profile",
  "strengths": [{ "title": "Strength area", "detail": "Evidence-based explanation" }],
  "improvements": [{ "title": "Area to improve", "detail": "Specific, actionable advice" }],
  "careerPaths": [{ "role": "Job title", "fit": "Strong|Good|Possible", "reason": "Why this role fits" }],
  "nextSteps": ["Concrete action step 1"],
  "learningResources": [{ "topic": "Topic to study", "suggestion": "Specific resource" }],
  "overallReadiness": <0-100 industry readiness score>
}

Rules: strengths 3-4, improvements 3-4, careerPaths 4-5, nextSteps 4-5, learningResources 3-4. Be specific and evidence-based.`;

  const raw = await openRouterFetch(
    {
      model: OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate career guidance for ${userName} based on their ${history.length} assessment${history.length !== 1 ? "s" : ""}.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 2500,
    },
    apiKey,
  );

  const parsed = safeParseJSON<CareerGuidance>(raw);
  if (!parsed || typeof parsed.headline !== "string") {
    throw new Error("AI returned malformed career guidance. Please try again.");
  }
  return parsed;
}
