"use server";

/**
 * Training Cycles Server Actions
 *
 * CRUD operations for training cycles (mesocycles) and their weekly slots.
 */

import { db } from "@/db";
import { trainingCycleSlots, trainingCycles, workoutSessions } from "@/db/schema";
import {
  createTrainingCycleSchema,
  reorderCycleSlotsSchema,
  updateTrainingCycleSchema,
  upsertCycleSlotSchema,
} from "@/lib/validators/training-cycles";
import type {
  ActionResult,
  ActiveCycleInfo,
  TrainingCycle,
  TrainingCycleSlot,
  TrainingCycleWithSlots,
} from "@/types/workout";
import { and, asc, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

export async function getTrainingCycles(
  userId: number,
): Promise<ActionResult<TrainingCycle[]>> {
  try {
    const rows = await db
      .select()
      .from(trainingCycles)
      .where(eq(trainingCycles.userId, userId))
      .orderBy(asc(trainingCycles.status), asc(trainingCycles.createdAt));
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getTrainingCycleWithSlots(
  cycleId: number,
): Promise<ActionResult<TrainingCycleWithSlots>> {
  try {
    const cycle = await db.query.trainingCycles.findFirst({
      where: eq(trainingCycles.id, cycleId),
      with: {
        slots: {
          orderBy: (s, { asc }) => [asc(s.dayOfWeek), asc(s.orderIndex)],
          with: {
            program: true,
          },
        },
      },
    });

    if (!cycle) {
      return { success: false, error: "Cycle not found" };
    }

    return { success: true, data: cycle as TrainingCycleWithSlots };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getActiveCycleForUser(
  userId: number,
): Promise<ActionResult<ActiveCycleInfo | null>> {
  try {
    const cycle = await db.query.trainingCycles.findFirst({
      where: and(
        eq(trainingCycles.userId, userId),
        eq(trainingCycles.status, "active"),
      ),
      with: {
        slots: {
          orderBy: (s, { asc }) => [asc(s.dayOfWeek), asc(s.orderIndex)],
          with: {
            program: true,
          },
        },
      },
    });

    if (!cycle) {
      return { success: true, data: null };
    }

    const startDate = new Date(cycle.startDate!);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + cycle.durationWeeks * 7);
    const endDateStr = endDate.toISOString().split("T")[0];

    // Auto-complete if past end date
    if (today > endDate) {
      await db
        .update(trainingCycles)
        .set({ status: "completed" })
        .where(eq(trainingCycles.id, cycle.id));
      revalidatePath("/cycles");
      revalidatePath("/");
      return { success: true, data: null };
    }

    const daysSinceStart = Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const currentWeek = Math.floor(daysSinceStart / 7) + 1;

    let todaySlot = null;

    if (cycle.scheduleType === "day_of_week") {
      // JS getDay(): 0=Sun,1=Mon…6=Sat → convert to 1=Mon…7=Sun
      const jsDay = today.getDay();
      const dayOfWeek = jsDay === 0 ? 7 : jsDay;
      todaySlot =
        (cycle.slots as TrainingCycleWithSlots["slots"]).find(
          (s) => s.dayOfWeek === dayOfWeek,
        ) ?? null;
    } else {
      // Rotation: count completed sessions in this cycle since startDate
      const [{ value: sessionCount }] = await db
        .select({ value: count() })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, userId),
            eq(workoutSessions.isCompleted, true),
          ),
        );

      const slots = (cycle.slots as TrainingCycleWithSlots["slots"]).sort(
        (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
      );

      if (slots.length > 0) {
        const slotIndex = Number(sessionCount) % slots.length;
        todaySlot = slots[slotIndex] ?? null;
      }
    }

    return {
      success: true,
      data: {
        cycle,
        todaySlot,
        currentWeek,
        endDate: endDateStr,
      },
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export async function createTrainingCycle(
  data: unknown,
): Promise<ActionResult<TrainingCycle>> {
  try {
    const validation = createTrainingCycleSchema.safeParse(data);
    if (!validation.success) {
      return {
        success: false,
        error: "Invalid input",
        fieldErrors: validation.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      };
    }

    const [cycle] = await db
      .insert(trainingCycles)
      .values(validation.data)
      .returning();

    revalidatePath("/cycles");
    return { success: true, data: cycle };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateTrainingCycle(
  data: unknown,
): Promise<ActionResult<TrainingCycle>> {
  try {
    const validation = updateTrainingCycleSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: "Invalid input" };
    }

    const { id, ...rest } = validation.data;
    const [cycle] = await db
      .update(trainingCycles)
      .set(rest as Partial<typeof trainingCycles.$inferInsert>)
      .where(eq(trainingCycles.id, id))
      .returning();

    revalidatePath("/cycles");
    revalidatePath(`/cycles/${id}`);
    return { success: true, data: cycle };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deleteTrainingCycle(
  cycleId: number,
): Promise<ActionResult<void>> {
  try {
    await db
      .delete(trainingCycles)
      .where(eq(trainingCycles.id, cycleId));
    revalidatePath("/cycles");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function startTrainingCycle(
  cycleId: number,
  userId: number,
): Promise<ActionResult<TrainingCycle>> {
  try {
    // Only one active cycle at a time — deactivate any current active cycle
    await db
      .update(trainingCycles)
      .set({ status: "completed" })
      .where(
        and(
          eq(trainingCycles.userId, userId),
          eq(trainingCycles.status, "active"),
        ),
      );

    const today = new Date().toISOString().split("T")[0];
    const [cycle] = await db
      .update(trainingCycles)
      .set({ status: "active", startDate: today })
      .where(eq(trainingCycles.id, cycleId))
      .returning();

    revalidatePath("/cycles");
    revalidatePath(`/cycles/${cycleId}`);
    revalidatePath("/");
    return { success: true, data: cycle };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function upsertCycleSlot(
  data: unknown,
): Promise<ActionResult<TrainingCycleSlot>> {
  try {
    const validation = upsertCycleSlotSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: "Invalid input" };
    }

    const { trainingCycleId, dayOfWeek, orderIndex, ...rest } = validation.data;

    // Find existing slot to upsert
    let existingSlot = null;
    if (dayOfWeek !== undefined) {
      existingSlot = await db.query.trainingCycleSlots.findFirst({
        where: and(
          eq(trainingCycleSlots.trainingCycleId, trainingCycleId),
          eq(trainingCycleSlots.dayOfWeek, dayOfWeek),
        ),
      });
    } else if (orderIndex !== undefined) {
      existingSlot = await db.query.trainingCycleSlots.findFirst({
        where: and(
          eq(trainingCycleSlots.trainingCycleId, trainingCycleId),
          eq(trainingCycleSlots.orderIndex, orderIndex),
        ),
      });
    }

    let slot: TrainingCycleSlot;
    if (existingSlot) {
      const [updated] = await db
        .update(trainingCycleSlots)
        .set({ ...rest, dayOfWeek, orderIndex })
        .where(eq(trainingCycleSlots.id, existingSlot.id))
        .returning();
      slot = updated;
    } else {
      const [inserted] = await db
        .insert(trainingCycleSlots)
        .values({ trainingCycleId, dayOfWeek, orderIndex, ...rest })
        .returning();
      slot = inserted;
    }

    revalidatePath(`/cycles/${trainingCycleId}`);
    return { success: true, data: slot };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function removeCycleSlot(
  slotId: number,
  cycleId: number,
): Promise<ActionResult<void>> {
  try {
    await db
      .delete(trainingCycleSlots)
      .where(eq(trainingCycleSlots.id, slotId));
    revalidatePath(`/cycles/${cycleId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function reorderCycleSlots(
  cycleId: number,
  orderedIds: number[],
): Promise<ActionResult<void>> {
  const validation = reorderCycleSlotsSchema.safeParse({ cycleId, orderedIds });
  if (!validation.success) return { success: false, error: "Invalid input" };
  try {
    await Promise.all(
      validation.data.orderedIds.map((id, index) =>
        db
          .update(trainingCycleSlots)
          .set({ orderIndex: index + 1 })
          .where(eq(trainingCycleSlots.id, id)),
      ),
    );
    revalidatePath(`/cycles/${cycleId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
