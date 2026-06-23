"use server";

import { db } from "@/db";
import {
  exercises,
  programExercises,
  programSets,
  programs,
  trainingCycleSlots,
  trainingCycles,
} from "@/db/schema";
import {
  buildTriathlonPlan,
  planExerciseNames,
  type PlanExercise,
} from "@/lib/utils/triathlon-plan";
import { requireSession } from "@/lib/utils/session";
import type { ActionResult } from "@/types/workout";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const generateTriathlonPlanSchema = z.object({
  weeks: z.number().int().min(1).max(52),
  restDay: z.number().int().min(1).max(7).optional(),
  goal: z.enum(["build", "maintain"]).default("build"),
  level: z.enum(["novice", "intermediate", "advanced"]).default("intermediate"),
});

// Canonical exercises the plan references. Endurance ones are new (discipline-tagged);
// the strength lifts match the seed names so existing rows are reused, and a fresh
// (unseeded) DB still gets them. Inserted with onConflictDoNothing on the unique name.
const ENSURED_EXERCISES = [
  { name: "Swim", category: "cardio", isTimed: false, bodyArea: "cardio", muscleGroup: "cardio", equipment: "bodyweight", movementPattern: "cardio", discipline: "swim" },
  { name: "Bike", category: "cardio", isTimed: false, bodyArea: "cardio", muscleGroup: "cardio", equipment: "machine", movementPattern: "cardio", discipline: "bike" },
  { name: "Run", category: "cardio", isTimed: false, bodyArea: "cardio", muscleGroup: "cardio", equipment: "bodyweight", movementPattern: "cardio", discipline: "run" },
  { name: "Squat", category: "strength", isTimed: false, bodyArea: "lower_body", muscleGroup: "quads", equipment: "barbell", movementPattern: "squat", discipline: null },
  { name: "Bench Press", category: "strength", isTimed: false, bodyArea: "upper_body", muscleGroup: "chest", equipment: "barbell", movementPattern: "push", discipline: null },
  { name: "Barbell Row", category: "strength", isTimed: false, bodyArea: "upper_body", muscleGroup: "back", equipment: "barbell", movementPattern: "pull", discipline: null },
  { name: "Deadlift", category: "strength", isTimed: false, bodyArea: "full_body", muscleGroup: "back", equipment: "barbell", movementPattern: "hinge", discipline: null },
  { name: "Overhead Press", category: "strength", isTimed: false, bodyArea: "upper_body", muscleGroup: "shoulders", equipment: "barbell", movementPattern: "push", discipline: null },
  { name: "Pull-up", category: "strength", isTimed: false, bodyArea: "upper_body", muscleGroup: "back", equipment: "bodyweight", movementPattern: "pull", discipline: null },
] as const;

const ENDURANCE_NAMES = ["Swim", "Bike", "Run"] as const;

export async function generateTriathlonPlan(
  data: unknown,
): Promise<ActionResult<{ cycleId: number; cycleName: string }>> {
  const auth = await requireSession();
  const parsed = generateTriathlonPlanSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const plan = buildTriathlonPlan(parsed.data);
    const neededNames = planExerciseNames(plan);

    // Ensure all referenced exercises exist (idempotent — keeps existing rows).
    await db
      .insert(exercises)
      .values(ENSURED_EXERCISES.map((e) => ({ ...e, isCustom: false })))
      .onConflictDoNothing({ target: exercises.name });

    // Backfill discipline on the canonical endurance rows if a pre-existing row lacked it.
    for (const name of ENDURANCE_NAMES) {
      const discipline = ENSURED_EXERCISES.find((e) => e.name === name)!.discipline!;
      await db
        .update(exercises)
        .set({ discipline })
        .where(and(eq(exercises.name, name), isNull(exercises.discipline)));
    }

    // Resolve names → ids.
    const rows = await db
      .select({ id: exercises.id, name: exercises.name })
      .from(exercises)
      .where(inArray(exercises.name, neededNames));
    const nameToId = new Map(rows.map((r) => [r.name, r.id]));
    const missing = neededNames.filter((n) => !nameToId.has(n));
    if (missing.length > 0) {
      console.error("[generateTriathlonPlan] unresolved exercises", { missing });
      return { success: false, error: "Could not resolve required exercises" };
    }

    const cycleId = await db.transaction(async (tx) => {
      const [cycle] = await tx
        .insert(trainingCycles)
        .values({
          userId: auth.user.id,
          name: plan.cycleName,
          durationWeeks: plan.durationWeeks,
          scheduleType: "day_of_week",
          goal: plan.goal,
          athleteLevel: plan.level,
          status: "draft",
        })
        .returning({ id: trainingCycles.id });

      for (const day of plan.days) {
        // Rest day: a slot with no program.
        if (day.exercises.length === 0) {
          await tx.insert(trainingCycleSlots).values({
            trainingCycleId: cycle.id,
            dayOfWeek: day.dayOfWeek,
            label: day.label,
            programId: null,
          });
          continue;
        }

        const [program] = await tx
          .insert(programs)
          .values({ userId: auth.user.id, name: day.label })
          .returning({ id: programs.id });

        let orderIndex = 0;
        for (const ex of day.exercises) {
          await insertPlanExercise(tx, program.id, nameToId.get(ex.name)!, orderIndex, ex);
          orderIndex++;
        }

        await tx.insert(trainingCycleSlots).values({
          trainingCycleId: cycle.id,
          dayOfWeek: day.dayOfWeek,
          label: day.label,
          programId: program.id,
        });
      }

      return cycle.id;
    });

    revalidatePath("/cycles");
    revalidatePath("/");
    return { success: true, data: { cycleId, cycleName: plan.cycleName } };
  } catch (err) {
    console.error("[generateTriathlonPlan] failed", err);
    return { success: false, error: "Failed to generate plan" };
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function insertPlanExercise(
  tx: Tx,
  programId: number,
  exerciseId: number,
  orderIndex: number,
  ex: PlanExercise,
): Promise<void> {
  const [pe] = await tx
    .insert(programExercises)
    .values({
      programId,
      exerciseId,
      orderIndex,
      progressionMode: ex.progressionMode,
      overloadIncrementReps: ex.overloadIncrementReps,
    })
    .returning({ id: programExercises.id });

  await tx.insert(programSets).values(
    ex.sets.map((s, i) => ({
      programExerciseId: pe.id,
      setNumber: i + 1,
      targetReps: s.targetReps ?? null,
      weightKg: s.weightKg != null ? String(s.weightKg) : null,
      durationSeconds: s.durationSeconds ?? null,
      distanceMeters: s.distanceMeters ?? null,
      peakDistanceMeters: s.peakDistanceMeters ?? null,
      restTimeSeconds: s.restTimeSeconds,
      setType: "working",
    })),
  );
}
