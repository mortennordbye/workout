"use server";

import { db } from "@/db";
import { users } from "@/db/schema/users";
import { requireSession } from "@/lib/utils/session";
import type { ActionResult } from "@/types/workout";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateProfileSchema = z.object({
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).nullable().optional(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).nullable().optional(),
  heightCm: z.number().int().positive().max(300).nullable().optional(),
  weightKg: z.number().positive().max(500).nullable().optional(),
  goal: z.enum(["strength", "muscle_gain", "weight_loss", "endurance", "general_fitness"]).nullable().optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).nullable().optional(),
});

export async function updateUserProfile(data: unknown): Promise<ActionResult<void>> {
  const session = await requireSession();
  const parsed = updateProfileSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  try {
    await db.update(users).set(parsed.data).where(eq(users.id, session.user.id));
    revalidatePath("/more/account");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to update profile" };
  }
}
