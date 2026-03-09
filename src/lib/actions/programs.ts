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
    return { success: true, data: pe };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function removeExerciseFromProgram(
  programExerciseId: number,
  programId: number,
): Promise<ActionResult<void>> {
  try {
    await db
      .delete(programExercises)
      .where(eq(programExercises.id, programExerciseId));
    revalidatePath(`/programs/${programId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function reorderProgramExercises(
  programId: number,
  orderedIds: number[],
): Promise<ActionResult<void>> {
  try {
    await Promise.all(
      orderedIds.map((id, index) =>
        db
          .update(programExercises)
          .set({ orderIndex: index })
          .where(eq(programExercises.id, id)),
      ),
    );
    revalidatePath(`/programs/${programId}`);
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
): Promise<ActionResult<void>> {
  try {
    await db.delete(programSets).where(eq(programSets.id, programSetId));
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
