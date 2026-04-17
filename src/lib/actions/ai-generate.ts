"use server";

import { db } from "@/db";
import { aiGenerations } from "@/db/schema/ai-generations";
import { aiModelConfigs } from "@/db/schema/ai-model-configs";
import { exercisePrs } from "@/db/schema/exercise-prs";
import { exercises } from "@/db/schema/exercises";
import { programs } from "@/db/schema/programs";
import { users } from "@/db/schema/users";
import { getAllExercises } from "@/lib/actions/exercises";
import { buildAiSystemPrompt, type PrData, type PromptOptions } from "@/lib/utils/ai-prompt";
import { parseUserGoals } from "@/lib/utils/goals";
import { requireSession } from "@/lib/utils/session";
import { and, asc, count, eq, gte, isNull } from "drizzle-orm";

const DAILY_LIMIT = 5;

const DEFAULT_MODELS = [
  { modelId: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (free)" },
  { modelId: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek V3 (free)" },
  { modelId: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (free)" },
];

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export type RateLimitInfo = {
  generationsToday: number;
  dailyLimit: number;
};

export type AiGenerateResult = {
  json: unknown;
  generationsToday: number;
  dailyLimit: number;
  modelUsed: string;
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getEnabledModels(): Promise<{ modelId: string; label: string }[]> {
  try {
    const rows = await db
      .select({ modelId: aiModelConfigs.modelId, label: aiModelConfigs.label })
      .from(aiModelConfigs)
      .where(eq(aiModelConfigs.enabled, true))
      .orderBy(asc(aiModelConfigs.priority));
    return rows.length > 0 ? rows : DEFAULT_MODELS;
  } catch {
    return DEFAULT_MODELS;
  }
}

export async function getAiRateLimitStatus(): Promise<ActionResult<RateLimitInfo>> {
  const auth = await requireSession();
  try {
    const [{ value }] = await db
      .select({ value: count() })
      .from(aiGenerations)
      .where(
        and(
          eq(aiGenerations.userId, auth.user.id),
          gte(aiGenerations.createdAt, startOfToday()),
        ),
      );
    return {
      success: true,
      data: { generationsToday: Number(value), dailyLimit: DAILY_LIMIT },
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function generateWorkoutPlan(
  userDescription: string,
  options: PromptOptions = {},
): Promise<ActionResult<AiGenerateResult>> {
  const auth = await requireSession();
  const userId = auth.user.id;

  const trimmed = userDescription.trim();
  if (!trimmed) return { success: false, error: "Please describe your training goals." };
  if (trimmed.length > 2000)
    return { success: false, error: "Description is too long (max 2000 characters)." };

  // Rate limit check
  const [{ value: usedToday }] = await db
    .select({ value: count() })
    .from(aiGenerations)
    .where(and(eq(aiGenerations.userId, userId), gte(aiGenerations.createdAt, startOfToday())));

  const generationsToday = Number(usedToday);
  if (generationsToday >= DAILY_LIMIT) {
    return {
      success: false,
      error: `You've used all ${DAILY_LIMIT} automatic generations for today. Try again tomorrow, or use the manual flow below.`,
    };
  }

  // Fetch user profile, exercises, PRs, enabled models in parallel
  const [exerciseResult, user, rawPrs, userPrograms, models] = await Promise.all([
    getAllExercises(),
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db
      .select({ exerciseName: exercises.name, prType: exercisePrs.prType, value: exercisePrs.value })
      .from(exercisePrs)
      .innerJoin(exercises, eq(exercisePrs.exerciseId, exercises.id))
      .where(and(eq(exercisePrs.userId, userId), isNull(exercisePrs.supersededAt))),
    db.select({ name: programs.name }).from(programs).where(eq(programs.userId, userId)),
    getEnabledModels(),
  ]);

  if (models.length === 0) {
    return { success: false, error: "No AI models are enabled. Ask an admin to enable at least one model." };
  }

  // Deduplicate: one entry per exercise, preferring estimated_1rm over weight
  const prMap = new Map<string, PrData>();
  for (const pr of rawPrs) {
    const entry = prMap.get(pr.exerciseName) ?? { exerciseName: pr.exerciseName };
    if (pr.prType === "estimated_1rm") entry.estimated1rm = Math.round(Number(pr.value));
    else if (pr.prType === "weight" && !entry.estimated1rm) entry.maxWeight = Math.round(Number(pr.value));
    prMap.set(pr.exerciseName, entry);
  }
  const prs = Array.from(prMap.values());

  const exerciseList = exerciseResult.success ? exerciseResult.data : [];
  const userProfile = {
    gender: user?.gender ?? null,
    birthYear: user?.birthYear ?? null,
    heightCm: user?.heightCm ?? null,
    weightKg: user?.weightKg ?? null,
    goals: parseUserGoals(user?.goals, user?.goal),
    experienceLevel: user?.experienceLevel ?? null,
  };

  const existingProgramNames = userPrograms.map((p) => p.name);

  const systemPrompt = `${buildAiSystemPrompt(userProfile, exerciseList, prs, existingProgramNames, options)}

Generate the full plan based on the training goals the user describes. Output only the raw JSON — no explanation, no markdown, no code block.`;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { success: false, error: "AI generation is not configured on this server." };
  }

  // Try each model in priority order, falling through on failure
  let rawText: string | null = null;
  let modelUsed = "";

  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.BETTER_AUTH_URL ?? "https://logevery.lift",
          "X-Title": "LogEveryLift AI Setup",
        },
        body: JSON.stringify({
          model: model.modelId,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: trimmed },
          ],
          temperature: 0.4,
          max_tokens: 16384,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.warn(`[AI] ${model.label} failed (HTTP ${response.status}):`, body.slice(0, 200));
        continue;
      }

      const data = await response.json();
      const text: string = (data?.choices?.[0]?.message?.content as string) ?? "";
      if (!text) {
        console.warn(`[AI] ${model.label} returned empty response`);
        continue;
      }

      rawText = text;
      modelUsed = model.modelId;
      break;
    } catch (err) {
      console.warn(`[AI] ${model.label} threw:`, err);
      continue;
    }
  }

  if (!rawText) {
    return {
      success: false,
      error: "All AI models are currently unavailable. Please try again in a moment.",
    };
  }

  // Extract JSON: try markdown code block first, then fall back to first { ... last }
  let text = rawText.trim();
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  } else {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { success: false, error: "The AI response wasn't valid JSON. Please try again." };
  }

  // Record usage only after a successful parse
  try {
    await db.insert(aiGenerations).values({ userId });
  } catch (err) {
    console.error("Failed to record AI generation:", err);
  }

  console.log(`[AI] Generation successful via ${modelUsed}`);

  return {
    success: true,
    data: { json: parsed, generationsToday: generationsToday + 1, dailyLimit: DAILY_LIMIT, modelUsed },
  };
}
