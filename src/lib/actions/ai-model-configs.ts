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
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { success: false, error: "OPENROUTER_API_KEY is not configured." };

  const start = Date.now();
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
        model: modelId,
        messages: [
          {
            role: "user",
            content: 'Reply with only this exact JSON and nothing else: {"ok":true}',
          },
        ],
        temperature: 0,
        max_tokens: 32,
      }),
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const body = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${body.slice(0, 120)}` };
    }

    const data = await response.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    if (!text) return { success: false, error: "Empty response from model." };

    return { success: true, data: { latencyMs } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function addAiModel(modelId: string, label: string): Promise<ActionResult> {
  await requireSession();
  if (!modelId.trim() || !label.trim()) return { success: false, error: "Model ID and label are required." };
  try {
    const rows = await db.select({ priority: aiModelConfigs.priority }).from(aiModelConfigs).orderBy(asc(aiModelConfigs.priority));
    const maxPriority = rows.length > 0 ? Math.max(...rows.map((r) => r.priority)) : 0;
    await db.insert(aiModelConfigs).values({ modelId: modelId.trim(), label: label.trim(), priority: maxPriority + 1 });
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
