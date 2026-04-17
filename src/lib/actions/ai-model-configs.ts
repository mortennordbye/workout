"use server";

import { db } from "@/db";
import { aiModelConfigs } from "@/db/schema/ai-model-configs";
import { requireSession } from "@/lib/utils/session";
import { asc, eq } from "drizzle-orm";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function listAiModelConfigs(): Promise<ActionResult<typeof aiModelConfigs.$inferSelect[]>> {
  await requireSession();
  try {
    const rows = await db.select().from(aiModelConfigs).orderBy(asc(aiModelConfigs.priority));
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function setAiModelEnabled(id: number, enabled: boolean): Promise<ActionResult> {
  await requireSession();
  try {
    await db.update(aiModelConfigs).set({ enabled }).where(eq(aiModelConfigs.id, id));
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function moveAiModel(id: number, direction: "up" | "down"): Promise<ActionResult> {
  await requireSession();
  try {
    const rows = await db.select().from(aiModelConfigs).orderBy(asc(aiModelConfigs.priority));
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return { success: false, error: "Model not found." };
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= rows.length) return { success: true, data: undefined };

    const a = rows[idx];
    const b = rows[swapIdx];
    await db.update(aiModelConfigs).set({ priority: b.priority }).where(eq(aiModelConfigs.id, a.id));
    await db.update(aiModelConfigs).set({ priority: a.priority }).where(eq(aiModelConfigs.id, b.id));
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function testAiModel(modelId: string): Promise<ActionResult<{ latencyMs: number }>> {
  await requireSession();

  const row = await db
    .select({ provider: aiModelConfigs.provider })
    .from(aiModelConfigs)
    .where(eq(aiModelConfigs.modelId, modelId))
    .then((rows) => rows[0]);
  const provider = row?.provider ?? "openrouter";

  const isGoogle = provider === "google";
  const apiKey = isGoogle ? process.env.GOOGLE_API_KEY : process.env.OPENROUTER_API_KEY;
  if (!apiKey)
    return {
      success: false,
      error: isGoogle ? "GOOGLE_API_KEY is not configured." : "OPENROUTER_API_KEY is not configured.",
    };

  const start = Date.now();
  try {
    let response: Response;
    if (isGoogle) {
      // Native Gemini API — AQ. key format requires ?key= param
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: 'Reply with only this exact JSON and nothing else: {"ok":true}' }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 32 },
          }),
        },
      );
    } else {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.BETTER_AUTH_URL ?? "https://logevery.lift",
          "X-Title": "LogEveryLift AI Setup",
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: "user", content: 'Reply with only this exact JSON and nothing else: {"ok":true}' }],
          temperature: 0,
          max_tokens: 32,
        }),
      });
    }

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const body = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${body.slice(0, 120)}` };
    }

    const data = await response.json();
    const text: string = isGoogle
      ? (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "")
      : (data?.choices?.[0]?.message?.content ?? "");
    if (!text) return { success: false, error: "Empty response from model." };

    return { success: true, data: { latencyMs } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function addAiModel(modelId: string, label: string, provider = "openrouter"): Promise<ActionResult> {
  await requireSession();
  if (!modelId.trim() || !label.trim()) return { success: false, error: "Model ID and label are required." };
  try {
    const rows = await db.select({ priority: aiModelConfigs.priority }).from(aiModelConfigs).orderBy(asc(aiModelConfigs.priority));
    const maxPriority = rows.length > 0 ? Math.max(...rows.map((r) => r.priority)) : 0;
    await db.insert(aiModelConfigs).values({ modelId: modelId.trim(), label: label.trim(), provider, priority: maxPriority + 1 });
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deleteAiModel(id: number): Promise<ActionResult> {
  await requireSession();
  try {
    await db.delete(aiModelConfigs).where(eq(aiModelConfigs.id, id));
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
