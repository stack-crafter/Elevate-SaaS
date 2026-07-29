import type { CareerGuidance } from "@/models/career";
import { OPENROUTER_MODEL } from "@/lib/config";
import { SKILL_LABELS } from "@/utilities/constants";
import { safeParseJSON } from "@/utilities/parsing";
import { getApiKey, openRouterFetch } from "@/data/api/openrouterClient";
import { getTestRecommendationWithEngine } from "@/data/api/elevateEngineClient";

// ─── Career Repository ────────────────────────────────────────────────────────

/**
 * Map Elevate Engine recommendation response to the CareerGuidance shape.
 * Returns null if the engine response doesn't have enough usable data.
 */
function mapEngineRecommendation(raw: Record<string, unknown>): CareerGuidance | null {
  try {
    // Engine response shape varies — extract whatever it returns
    const topics = (raw.topics as Array<{ topic?: string; reason?: string; exercise?: string }>) ?? [];
    if (!topics.length) return null;

    const nextSteps: string[] = topics
      .slice(0, 5)
      .map((t) => t.exercise || `Study: ${t.topic}`)
      .filter(Boolean);

    const learningResources = topics.slice(0, 4).map((t) => ({
      topic: t.topic || "General",
      suggestion: t.reason || "Refer to official documentation and practice exercises.",
    }));

    const improvements = topics.slice(0, 3).map((t) => ({
      title: t.topic || "Improvement area",
      detail: t.reason || "Focus on this topic to strengthen your skills.",
    }));

    return {
      headline: (raw.headline as string) || "Your personalised learning roadmap is ready.",
      summary:
        (raw.summary as string) ||
        "Based on your assessment results, the following topics were identified as areas where focused practice will accelerate your growth.",
      strengths: [
        {
          title: "Assessment Completed",
          detail: "You have completed a skill assessment that helps identify areas for growth.",
        },
      ],
      improvements,
      careerPaths: [
        {
          role: "Software Developer",
          fit: "Good",
          reason:
            "Continued assessment performance will strengthen your profile for developer roles.",
        },
      ],
      nextSteps,
      learningResources,
      overallReadiness: typeof raw.overall_readiness === "number" ? raw.overall_readiness : 60,
    };
  } catch {
    return null;
  }
}

export async function generateCareerGuidance(
  userName: string,
  history: {
    skill: string;
    testType: string;
    score: number;
    date: string;
    tier: string;
    engineSessionId?: string;
    feedback?: { strengths?: string[]; weaknesses?: string[]; overallFeedback?: string } | null;
  }[],
): Promise<CareerGuidance> {
  // ─── Primary: Elevate Engine Recommendation (uses most recent session with engine ID) ─
  const lastEngineSession = [...history]
    .reverse()
    .find((h) => h.engineSessionId);

  if (lastEngineSession?.engineSessionId) {
    try {
      const engineRec = await getTestRecommendationWithEngine(lastEngineSession.engineSessionId);
      if (engineRec) {
        const mapped = mapEngineRecommendation(engineRec as Record<string, unknown>);
        if (mapped) {
          return mapped;
        }
      }
    } catch (err) {
      console.warn("Elevate Engine recommendation fallback to OpenRouter:", err);
    }
  }

  // ─── Fallback: OpenRouter / OpenAI Career Guidance ────────────────────────────
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
