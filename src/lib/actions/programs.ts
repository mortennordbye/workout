"use server";

/**
 * Programs Server Actions
 *
 * CRUD operations for workout programs, their exercise slots, and planned sets.
 */

import { db } from "@/db";
import { programExercises, programSets, programs } from "@/db/schema";
import {
  addExerciseToProgramSchema,
  addProgramSetSchema,
  createProgramSchema,
  deleteProgramSetSchema,
  removeExerciseFromProgramSchema,
  reorderProgramExercisesSchema,
  reorderProgramSetsSchema,
  updateProgramSetSchema,
} from "@/lib/validators/workout";
import type {
  ActionResult,
  Program,
  ProgramExercise,
  ProgramSet,
  ProgramWithExercises,
} from "@/types/workout";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// Programs
// ─────────────────────────────────────────────────────────────────────────────

export async function getPrograms(
  userId: number,
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

export async function createProgram(
  data: unknown,
): Promise<ActionResult<Program>> {
  try {
    const validation = createProgramSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: "Invalid input" };
    }

    const [program] = await db
      .insert(programs)
      .values(validation.data)
      .returning();

    revalidatePath("/programs");
    return { success: true, data: program };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deleteProgram(
  programId: number,
): Promise<ActionResult<void>> {
  try {
    await db.delete(programs).where(eq(programs.id, programId));
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
  try {
    const validation = addExerciseToProgramSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: "Invalid input" };
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
  const validation = removeExerciseFromProgramSchema.safeParse({
    programExerciseId,
    programId,
  });
  if (!validation.success) return { success: false, error: "Invalid input" };
  try {
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
  if (incrementKg < 0 || incrementKg > 100) {
    return { success: false, error: "Increment must be between 0 and 100 kg" };
  }
  try {
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
  if (!Number.isInteger(incrementReps) || incrementReps < 0 || incrementReps > 100) {
    return { success: false, error: "Increment must be a whole number between 0 and 100" };
  }
  try {
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
  if (!VALID_PROGRESSION_MODES.includes(mode as ProgressionMode)) {
    return { success: false, error: "Invalid progression mode" };
  }
  try {
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
  const validation = reorderProgramExercisesSchema.safeParse({
    programId,
    orderedIds,
  });
  if (!validation.success) return { success: false, error: "Invalid input" };
  try {
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
  try {
    const validation = addProgramSetSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: "Invalid input" };
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
  try {
    const validation = updateProgramSetSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: "Invalid input" };
    }

    const { id, ...rest } = validation.data;
    const [ps] = await db
      .update(programSets)
      .set(rest as Partial<typeof programSets.$inferInsert>)
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
  const validation = deleteProgramSetSchema.safeParse({ programSetId });
  if (!validation.success) return { success: false, error: "Invalid input" };
  try {
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
  const validation = reorderProgramSetsSchema.safeParse({
    programExerciseId,
    orderedIds,
  });
  if (!validation.success) return { success: false, error: "Invalid input" };
  try {
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
