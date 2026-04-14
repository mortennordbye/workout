"use server";

/**
 * Programs Server Actions
 *
 * CRUD operations for workout programs, their exercise slots, and planned sets.
 */

import { db } from "@/db";
import { exercises, programExercises, programSets, programs } from "@/db/schema";
import { requireSession } from "@/lib/utils/session";
import {
  addExerciseToProgramSchema,
  addProgramSetSchema,
  createProgramSchema,
  deleteProgramSetSchema,
  importProgramSchema,
  removeExerciseFromProgramSchema,
  reorderProgramExercisesSchema,
  reorderProgramSetsSchema,
  updateProgramSchema,
  updateProgramSetSchema,
} from "@/lib/validators/workout";
import type {
  ActionResult,
  ExportedProgram,
  ExportedPrograms,
  Program,
  ProgramExercise,
  ProgramSet,
  ProgramWithExercises,
} from "@/types/workout";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// Programs
// ─────────────────────────────────────────────────────────────────────────────

export async function getPrograms(
  userId: string,
): Promise<ActionResult<Program[]>> {
  try {
    const rows = await db
      .select()
      .from(programs)
      .where(eq(programs.userId, userId))
      .orderBy(asc(programs.name));
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getProgramWithExercises(
  programId: number,
): Promise<ActionResult<ProgramWithExercises>> {
  try {
    const program = await db.query.programs.findFirst({
      where: eq(programs.id, programId),
      with: {
        programExercises: {
          orderBy: (pe, { asc }) => [asc(pe.orderIndex)],
          with: {
            exercise: true,
            programSets: {
              orderBy: (ps, { asc }) => [asc(ps.setNumber)],
            },
          },
        },
      },
    });

    if (!program) {
      return { success: false, error: "Program not found" };
    }

    return { success: true, data: program as ProgramWithExercises };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getProgramsWithExercises(
  ids: number[],
): Promise<Record<number, ProgramWithExercises>> {
  if (ids.length === 0) return {};
  try {
    const rows = await db.query.programs.findMany({
      where: inArray(programs.id, ids),
      with: {
        programExercises: {
          orderBy: (pe, { asc }) => [asc(pe.orderIndex)],
          with: {
            exercise: true,
            programSets: {
              orderBy: (ps, { asc }) => [asc(ps.setNumber)],
            },
          },
        },
      },
    });
    return Object.fromEntries(rows.map((p) => [p.id, p as ProgramWithExercises]));
  } catch {
    return {};
  }
}

export async function createProgram(
  data: unknown,
): Promise<ActionResult<Program>> {
  const auth = await requireSession();

  const validation = createProgramSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: "Invalid input" };
  }

  try {
    const [program] = await db
      .insert(programs)
      .values({ ...validation.data, userId: auth.user.id })
      .returning();

    revalidatePath("/programs");
    return { success: true, data: program };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateProgram(
  data: unknown,
): Promise<ActionResult<void>> {
  const auth = await requireSession();

  const validation = updateProgramSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: "Invalid input" };
  }

  try {
    await db
      .update(programs)
      .set({ name: validation.data.name })
      .where(
        and(
          eq(programs.id, validation.data.id),
          eq(programs.userId, auth.user.id),
        ),
      );

    revalidatePath("/programs");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deleteProgram(
  programId: number,
): Promise<ActionResult<void>> {
  const auth = await requireSession();
  try {
    await db.delete(programs).where(
      and(eq(programs.id, programId), eq(programs.userId, auth.user.id))
    );
    revalidatePath("/programs");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Program Exercises
// ─────────────────────────────────────────────────────────────────────────────

export async function addExerciseToProgram(
  data: unknown,
): Promise<ActionResult<ProgramExercise>> {
  const auth = await requireSession();
  try {
    const validation = addExerciseToProgramSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: "Invalid input" };
    }

    // Verify the program belongs to the authenticated user
    const [prog] = await db
      .select({ userId: programs.userId })
      .from(programs)
      .where(eq(programs.id, validation.data.programId))
      .limit(1);
    if (!prog || prog.userId !== auth.user.id) {
      return { success: false, error: "Program not found" };
    }

    // Place at end if no orderIndex given
    if (validation.data.orderIndex === undefined) {
      const existing = await db
        .select()
        .from(programExercises)
        .where(eq(programExercises.programId, validation.data.programId));
      validation.data.orderIndex = existing.length;
    }

    const [pe] = await db
      .insert(programExercises)
      .values(validation.data as typeof programExercises.$inferInsert)
      .returning();

    revalidatePath(`/programs/${validation.data.programId}`);
    revalidatePath(`/programs/${validation.data.programId}/workout`);
    return { success: true, data: pe };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function removeExerciseFromProgram(
  programExerciseId: number,
  programId: number,
): Promise<ActionResult<void>> {
  const auth = await requireSession();
  const validation = removeExerciseFromProgramSchema.safeParse({
    programExerciseId,
    programId,
  });
  if (!validation.success) return { success: false, error: "Invalid input" };
  try {
    const [prog] = await db
      .select({ userId: programs.userId })
      .from(programs)
      .where(eq(programs.id, validation.data.programId))
      .limit(1);
    if (!prog || prog.userId !== auth.user.id) {
      return { success: false, error: "Program not found" };
    }
    await db
      .delete(programExercises)
      .where(eq(programExercises.id, validation.data.programExerciseId));
    revalidatePath(`/programs/${validation.data.programId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateProgramExerciseIncrement(
  programExerciseId: number,
  incrementKg: number,
): Promise<ActionResult<void>> {
  const auth = await requireSession();
  if (incrementKg < 0 || incrementKg > 100) {
    return { success: false, error: "Increment must be between 0 and 100 kg" };
  }
  try {
    const [check] = await db
      .select({ userId: programs.userId })
      .from(programExercises)
      .innerJoin(programs, eq(programs.id, programExercises.programId))
      .where(eq(programExercises.id, programExerciseId))
      .limit(1);
    if (!check || check.userId !== auth.user.id) {
      return { success: false, error: "Not found" };
    }
    const [pe] = await db
      .update(programExercises)
      .set({ overloadIncrementKg: incrementKg.toString() })
      .where(eq(programExercises.id, programExerciseId))
      .returning({ programId: programExercises.programId });
    if (pe) {
      revalidatePath(`/programs/${pe.programId}/workout/exercises/${programExerciseId}`);
      revalidatePath(`/programs/${pe.programId}/exercises/${programExerciseId}`);
    }
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateProgramExerciseIncrementReps(
  programExerciseId: number,
  incrementReps: number,
): Promise<ActionResult<void>> {
  const auth = await requireSession();
  if (!Number.isInteger(incrementReps) || incrementReps < 0 || incrementReps > 100) {
    return { success: false, error: "Increment must be a whole number between 0 and 100" };
  }
  try {
    const [check] = await db
      .select({ userId: programs.userId })
      .from(programExercises)
      .innerJoin(programs, eq(programs.id, programExercises.programId))
      .where(eq(programExercises.id, programExerciseId))
      .limit(1);
    if (!check || check.userId !== auth.user.id) {
      return { success: false, error: "Not found" };
    }
    const [pe] = await db
      .update(programExercises)
      .set({ overloadIncrementReps: incrementReps })
      .where(eq(programExercises.id, programExerciseId))
      .returning({ programId: programExercises.programId });
    if (pe) {
      revalidatePath(`/programs/${pe.programId}/workout/exercises/${programExerciseId}`);
      revalidatePath(`/programs/${pe.programId}/exercises/${programExerciseId}`);
    }
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

const VALID_PROGRESSION_MODES = ["manual", "weight", "smart", "reps"] as const;
type ProgressionMode = (typeof VALID_PROGRESSION_MODES)[number];

export async function updateProgramExerciseProgressionMode(
  programExerciseId: number,
  mode: string,
): Promise<ActionResult<void>> {
  const auth = await requireSession();
  if (!VALID_PROGRESSION_MODES.includes(mode as ProgressionMode)) {
    return { success: false, error: "Invalid progression mode" };
  }
  try {
    const [check] = await db
      .select({ userId: programs.userId })
      .from(programExercises)
      .innerJoin(programs, eq(programs.id, programExercises.programId))
      .where(eq(programExercises.id, programExerciseId))
      .limit(1);
    if (!check || check.userId !== auth.user.id) {
      return { success: false, error: "Not found" };
    }
    const [pe] = await db
      .update(programExercises)
      .set({ progressionMode: mode })
      .where(eq(programExercises.id, programExerciseId))
      .returning({ programId: programExercises.programId });
    if (pe) {
      revalidatePath(`/programs/${pe.programId}/workout/exercises/${programExerciseId}`);
      revalidatePath(`/programs/${pe.programId}/exercises/${programExerciseId}`);
    }
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function reorderProgramExercises(
  programId: number,
  orderedIds: number[],
): Promise<ActionResult<void>> {
  const auth = await requireSession();
  const validation = reorderProgramExercisesSchema.safeParse({
    programId,
    orderedIds,
  });
  if (!validation.success) return { success: false, error: "Invalid input" };
  try {
    const [prog] = await db
      .select({ userId: programs.userId })
      .from(programs)
      .where(eq(programs.id, validation.data.programId))
      .limit(1);
    if (!prog || prog.userId !== auth.user.id) {
      return { success: false, error: "Program not found" };
    }
    await Promise.all(
      validation.data.orderedIds.map((id, index) =>
        db
          .update(programExercises)
          .set({ orderIndex: index })
          .where(eq(programExercises.id, id)),
      ),
    );
    revalidatePath(`/programs/${validation.data.programId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Program Sets
// ─────────────────────────────────────────────────────────────────────────────

export async function addProgramSet(
  data: unknown,
): Promise<ActionResult<ProgramSet>> {
  const auth = await requireSession();
  try {
    const validation = addProgramSetSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: "Invalid input" };
    }

    // Verify ownership via programExercise → program
    const [peCheck] = await db
      .select({ programId: programExercises.programId, userId: programs.userId })
      .from(programExercises)
      .innerJoin(programs, eq(programs.id, programExercises.programId))
      .where(eq(programExercises.id, validation.data.programExerciseId))
      .limit(1);
    if (!peCheck || peCheck.userId !== auth.user.id) {
      return { success: false, error: "Not found" };
    }

    const [ps] = await db
      .insert(programSets)
      .values(validation.data as typeof programSets.$inferInsert)
      .returning();

    // Look up programId to revalidate the correct paths
    const [pe] = await db
      .select({ programId: programExercises.programId })
      .from(programExercises)
      .where(eq(programExercises.id, validation.data.programExerciseId))
      .limit(1);

    if (pe) {
      revalidatePath(`/programs/${pe.programId}/workout/exercises/${validation.data.programExerciseId}`);
      revalidatePath(`/programs/${pe.programId}/exercises/${validation.data.programExerciseId}`);
      revalidatePath(`/programs/${pe.programId}/workout`);
    }

    return { success: true, data: ps };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateProgramSet(
  data: unknown,
): Promise<ActionResult<ProgramSet>> {
  const auth = await requireSession();
  try {
    const validation = updateProgramSetSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: "Invalid input" };
    }

    const { id, ...rest } = validation.data;

    // Verify ownership via programSet → programExercise → program
    const [check] = await db
      .select({ userId: programs.userId })
      .from(programSets)
      .innerJoin(programExercises, eq(programExercises.id, programSets.programExerciseId))
      .innerJoin(programs, eq(programs.id, programExercises.programId))
      .where(eq(programSets.id, id))
      .limit(1);
    if (!check || check.userId !== auth.user.id) {
      return { success: false, error: "Not found" };
    }
    // Strip undefined values so partial updates don't overwrite existing fields
    const updates = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined),
    ) as Partial<typeof programSets.$inferInsert>;
    const [ps] = await db
      .update(programSets)
      .set(updates)
      .where(eq(programSets.id, id))
      .returning();

    return { success: true, data: ps };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deleteProgramSet(
  programSetId: number,
  programId: number,
  programExerciseId: number,
): Promise<ActionResult<void>> {
  const auth = await requireSession();
  const validation = deleteProgramSetSchema.safeParse({ programSetId });
  if (!validation.success) return { success: false, error: "Invalid input" };
  try {
    const [prog] = await db
      .select({ userId: programs.userId })
      .from(programs)
      .where(eq(programs.id, programId))
      .limit(1);
    if (!prog || prog.userId !== auth.user.id) {
      return { success: false, error: "Program not found" };
    }
    await db
      .delete(programSets)
      .where(eq(programSets.id, validation.data.programSetId));
    revalidatePath(`/programs/${programId}/workout/exercises/${programExerciseId}`);
    revalidatePath(`/programs/${programId}/workout`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function reorderProgramSets(
  programExerciseId: number,
  orderedIds: number[],
): Promise<ActionResult<void>> {
  const auth = await requireSession();
  const validation = reorderProgramSetsSchema.safeParse({
    programExerciseId,
    orderedIds,
  });
  if (!validation.success) return { success: false, error: "Invalid input" };
  try {
    // Verify ownership via programExercise → program
    const [peCheck] = await db
      .select({ programId: programExercises.programId, userId: programs.userId })
      .from(programExercises)
      .innerJoin(programs, eq(programs.id, programExercises.programId))
      .where(eq(programExercises.id, validation.data.programExerciseId))
      .limit(1);
    if (!peCheck || peCheck.userId !== auth.user.id) {
      return { success: false, error: "Not found" };
    }
    await Promise.all(
      validation.data.orderedIds.map((id, index) =>
        db
          .update(programSets)
          .set({ setNumber: index + 1 })
          .where(eq(programSets.id, id)),
      ),
    );
    const [pe] = await db
      .select({ programId: programExercises.programId })
      .from(programExercises)
      .where(eq(programExercises.id, validation.data.programExerciseId))
      .limit(1);
    if (pe) {
      revalidatePath(
        `/programs/${pe.programId}/workout/exercises/${validation.data.programExerciseId}`,
      );
      revalidatePath(
        `/programs/${pe.programId}/exercises/${validation.data.programExerciseId}`,
      );
    }
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Program Import / Export
// ─────────────────────────────────────────────────────────────────────────────

export async function exportProgram(
  programId: number,
): Promise<ActionResult<ExportedProgram>> {
  const auth = await requireSession();

  const result = await getProgramWithExercises(programId);
  if (!result.success) return result;

  const program = result.data;
  if (program.userId !== auth.user.id) {
    return { success: false, error: "Program not found" };
  }

  const payload: ExportedProgram = {
    version: 1,
    exportedAt: new Date().toISOString(),
    program: {
      name: program.name,
      exercises: program.programExercises.map((pe, i) => ({
        orderIndex: pe.orderIndex ?? i,
        notes: pe.notes ?? null,
        overloadIncrementKg: Number(pe.overloadIncrementKg ?? 2.5),
        overloadIncrementReps: pe.overloadIncrementReps ?? 0,
        progressionMode: pe.progressionMode ?? "weight",
        exercise: {
          name: pe.exercise.name,
          category: pe.exercise.category,
          bodyArea: pe.exercise.bodyArea ?? null,
          muscleGroup: pe.exercise.muscleGroup ?? null,
          equipment: pe.exercise.equipment ?? null,
          movementPattern: pe.exercise.movementPattern ?? null,
        },
        sets: pe.programSets.map((s) => ({
          setNumber: s.setNumber,
          targetReps: s.targetReps ?? null,
          weightKg: s.weightKg != null ? Number(s.weightKg) : null,
          durationSeconds: s.durationSeconds ?? null,
          distanceMeters: s.distanceMeters ?? null,
          restTimeSeconds: s.restTimeSeconds ?? 0,
        })),
      })),
    },
  };

  return { success: true, data: payload };
}

export async function exportAllPrograms(): Promise<ActionResult<ExportedPrograms>> {
  const auth = await requireSession();
  const userId = auth.user.id;

  try {
    const userPrograms = await db.query.programs.findMany({
      where: eq(programs.userId, userId),
      with: {
        programExercises: {
          orderBy: [asc(programExercises.orderIndex)],
          with: {
            exercise: true,
            programSets: { orderBy: [asc(programSets.setNumber)] },
          },
        },
      },
    });

    return {
      success: true,
      data: {
        version: 1,
        exportedAt: new Date().toISOString(),
        programs: userPrograms.map((p) => ({
          name: p.name,
          exercises: p.programExercises.map((pe, i) => ({
            orderIndex: pe.orderIndex ?? i,
            notes: pe.notes ?? null,
            overloadIncrementKg: Number(pe.overloadIncrementKg ?? 2.5),
            overloadIncrementReps: pe.overloadIncrementReps ?? 0,
            progressionMode: pe.progressionMode ?? "weight",
            exercise: {
              name: pe.exercise.name,
              category: pe.exercise.category,
              bodyArea: pe.exercise.bodyArea ?? null,
              muscleGroup: pe.exercise.muscleGroup ?? null,
              equipment: pe.exercise.equipment ?? null,
              movementPattern: pe.exercise.movementPattern ?? null,
            },
            sets: pe.programSets.map((s) => ({
              setNumber: s.setNumber,
              targetReps: s.targetReps ?? null,
              weightKg: s.weightKg != null ? Number(s.weightKg) : null,
              durationSeconds: s.durationSeconds ?? null,
              distanceMeters: s.distanceMeters ?? null,
              restTimeSeconds: s.restTimeSeconds ?? 0,
            })),
          })),
        })),
      },
    };
  } catch (err) {
    console.error("exportAllPrograms failed:", err);
    return { success: false, error: "Failed to export programs" };
  }
}

export async function importProgram(
  data: unknown,
): Promise<ActionResult<{ count: number; programNames: string[] }>> {
  const auth = await requireSession();

  const parsed = importProgramSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Invalid program data. Make sure you copied the full response from the AI." };
  }

  // Normalise to array regardless of single vs multi format
  const programList = "programs" in parsed.data ? parsed.data.programs : [parsed.data.program];

  // Collect all unique exercise names across all programs
  const allSlots = programList.flatMap((p) => p.exercises);
  const names = [...new Set(allSlots.map((e) => e.exercise.name))];
  const exerciseMap = new Map<string, number>(); // name → id

  if (names.length > 0) {
    const matched = await db
      .select({ id: exercises.id, name: exercises.name })
      .from(exercises)
      .where(
        and(
          inArray(exercises.name, names),
          or(isNull(exercises.userId), eq(exercises.userId, auth.user.id)),
        ),
      );
    for (const ex of matched) {
      exerciseMap.set(ex.name, ex.id);
    }
  }

  // Create any unrecognised exercises as custom (only if not already in library)
  for (const slot of allSlots) {
    const exName = slot.exercise.name;
    if (exerciseMap.has(exName)) continue;

    const rows = await db
      .insert(exercises)
      .values({
        name: exName,
        category: slot.exercise.category,
        isCustom: true,
        userId: auth.user.id,
        bodyArea: slot.exercise.bodyArea ?? undefined,
        muscleGroup: slot.exercise.muscleGroup ?? undefined,
        equipment: slot.exercise.equipment ?? undefined,
        movementPattern: slot.exercise.movementPattern ?? undefined,
      })
      .onConflictDoNothing()
      .returning({ id: exercises.id });

    if (rows.length > 0) {
      exerciseMap.set(exName, rows[0].id);
    } else {
      // Race condition: another request inserted it first
      const [existing] = await db
        .select({ id: exercises.id })
        .from(exercises)
        .where(eq(exercises.name, exName))
        .limit(1);
      if (existing) exerciseMap.set(exName, existing.id);
    }
  }

  // Import each program in a transaction
  const programNames: string[] = [];
  try {
    for (const programData of programList) {
      await db.transaction(async (tx) => {
        const [program] = await tx
          .insert(programs)
          .values({ name: programData.name, userId: auth.user.id })
          .returning({ id: programs.id });

        for (const slot of programData.exercises) {
          const exerciseId = exerciseMap.get(slot.exercise.name);
          if (!exerciseId) continue;

          const [pe] = await tx
            .insert(programExercises)
            .values({
              programId: program.id,
              exerciseId,
              orderIndex: slot.orderIndex,
              notes: slot.notes ?? undefined,
              overloadIncrementKg: slot.overloadIncrementKg.toString(),
              overloadIncrementReps: slot.overloadIncrementReps,
              progressionMode: slot.progressionMode,
            })
            .returning({ id: programExercises.id });

          if (slot.sets.length > 0) {
            await tx.insert(programSets).values(
              slot.sets.map((s) => ({
                programExerciseId: pe.id,
                setNumber: s.setNumber,
                targetReps: s.targetReps ?? undefined,
                weightKg: s.weightKg != null ? s.weightKg.toString() : undefined,
                durationSeconds: s.durationSeconds ?? undefined,
                distanceMeters: s.distanceMeters ?? undefined,
                restTimeSeconds: s.restTimeSeconds,
              })),
            );
          }
        }
      });
      programNames.push(programData.name);
    }

    revalidatePath("/programs");
    return { success: true, data: { count: programNames.length, programNames } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
