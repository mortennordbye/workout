"use server";

/**
 * Training Cycles Server Actions
 *
 * CRUD operations for training cycles (mesocycles) and their weekly slots.
 */

import { db } from "@/db";
import { programs, trainingCycleSlots, trainingCycles, workoutSessions } from "@/db/schema";
import { requireSession } from "@/lib/utils/session";
import {
  createTrainingCycleSchema,
  importCycleSchema,
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
import { and, asc, count, eq, gte, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

export async function getTrainingCycles(
  userId: string,
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

export async function getAllCyclesWithSlots(
  userId: string,
): Promise<ActionResult<TrainingCycleWithSlots[]>> {
  try {
    const rows = await db.query.trainingCycles.findMany({
      where: eq(trainingCycles.userId, userId),
      orderBy: [asc(trainingCycles.startDate)],
      with: {
        slots: {
          orderBy: (s, { asc }) => [asc(s.dayOfWeek), asc(s.orderIndex)],
          with: { program: true },
        },
      },
    });
    return { success: true, data: rows as TrainingCycleWithSlots[] };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getActiveCycleForUser(
  userId: string,
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
      // Rotation: count completed sessions since this cycle started
      const [{ value: sessionCount }] = await db
        .select({ value: count() })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, userId),
            eq(workoutSessions.isCompleted, true),
            gte(workoutSessions.startTime, startDate),
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
        cycle: cycle as unknown as TrainingCycleWithSlots,
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
  const auth = await requireSession();

  const validation = createTrainingCycleSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: validation.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [cycle] = await db
      .insert(trainingCycles)
      .values({ ...validation.data, userId: auth.user.id })
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
  const auth = await requireSession();
  try {
    const validation = updateTrainingCycleSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: "Invalid input" };
    }

    const { id, ...rest } = validation.data;

    // Verify ownership
    const existing = await db.query.trainingCycles.findFirst({
      where: and(
        eq(trainingCycles.id, id),
        eq(trainingCycles.userId, auth.user.id),
      ),
    });
    if (!existing) return { success: false, error: "Cycle not found" };

    // Guard: disallow shortening an active cycle past its elapsed time
    if (rest.durationWeeks && existing.status === "active" && existing.startDate) {
      const start = new Date(existing.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const elapsed = Math.floor((today.getTime() - start.getTime()) / 86400000);
      if (rest.durationWeeks * 7 <= elapsed) {
        return {
          success: false,
          error: "New duration would end the cycle immediately — choose a longer duration",
        };
      }
    }

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
  const auth = await requireSession();

  try {
    const [existing] = await db
      .select({ userId: trainingCycles.userId })
      .from(trainingCycles)
      .where(eq(trainingCycles.id, cycleId));
    if (!existing) return { success: false, error: "Training cycle not found" };
    if (existing.userId !== auth.user.id) return { success: false, error: "Unauthorized" };

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
): Promise<ActionResult<TrainingCycle>> {
  const auth = await requireSession();
  const userId = auth.user.id;

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
      .where(and(eq(trainingCycles.id, cycleId), eq(trainingCycles.userId, userId)))
      .returning();

    if (!cycle) return { success: false, error: "Training cycle not found" };

    revalidatePath("/cycles");
    revalidatePath(`/cycles/${cycleId}`);
    revalidatePath("/");
    return { success: true, data: cycle };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function restartTrainingCycle(
  cycleId: number,
): Promise<ActionResult<TrainingCycle>> {
  const auth = await requireSession();
  const userId = auth.user.id;

  try {
    // Verify ownership
    const existing = await db.query.trainingCycles.findFirst({
      where: and(
        eq(trainingCycles.id, cycleId),
        eq(trainingCycles.userId, userId),
      ),
    });
    if (!existing) return { success: false, error: "Cycle not found" };

    // Deactivate any currently active cycle
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
  const auth = await requireSession();
  try {
    const validation = upsertCycleSlotSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: "Invalid input" };
    }

    const { trainingCycleId, dayOfWeek, orderIndex, ...rest } = validation.data;

    // Verify ownership of the cycle
    const [cycle] = await db
      .select({ userId: trainingCycles.userId })
      .from(trainingCycles)
      .where(eq(trainingCycles.id, trainingCycleId))
      .limit(1);
    if (!cycle || cycle.userId !== auth.user.id) {
      return { success: false, error: "Cycle not found" };
    }

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
  const auth = await requireSession();
  try {
    const [cycle] = await db
      .select({ userId: trainingCycles.userId })
      .from(trainingCycles)
      .where(eq(trainingCycles.id, cycleId))
      .limit(1);
    if (!cycle || cycle.userId !== auth.user.id) {
      return { success: false, error: "Cycle not found" };
    }
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
  const auth = await requireSession();
  const validation = reorderCycleSlotsSchema.safeParse({ cycleId, orderedIds });
  if (!validation.success) return { success: false, error: "Invalid input" };
  try {
    const [cycle] = await db
      .select({ userId: trainingCycles.userId })
      .from(trainingCycles)
      .where(eq(trainingCycles.id, cycleId))
      .limit(1);
    if (!cycle || cycle.userId !== auth.user.id) {
      return { success: false, error: "Cycle not found" };
    }
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

export async function importCycle(
  data: unknown,
): Promise<ActionResult<{ cycleName: string; unresolvedPrograms: string[] }>> {
  const auth = await requireSession();

  const parsed = importCycleSchema.safeParse(data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const detail = firstIssue
      ? `${firstIssue.path.join(".") || "cycle"}: ${firstIssue.message}`
      : null;
    return {
      success: false,
      error: detail
        ? `Cycle data is invalid — ${detail}`
        : "Cycle data is invalid. The AI may have used an unsupported format.",
    };
  }

  const { slots, weeks, sched, ...restCycleFields } = parsed.data;
  const cycleFields = { ...restCycleFields, durationWeeks: weeks, scheduleType: sched };

  // Resolve program names → IDs from the user's programs (includes just-imported ones)
  const programNames = [...new Set(slots.map((s) => s.prog))];
  const matched = programNames.length > 0
    ? await db
        .select({ id: programs.id, name: programs.name })
        .from(programs)
        .where(and(inArray(programs.name, programNames), eq(programs.userId, auth.user.id)))
    : [];

  const nameToId = new Map(matched.map((p) => [p.name, p.id]));

  // Detect slots whose program couldn't be resolved
  const unresolvedPrograms = [...new Set(
    slots.filter((s) => !nameToId.has(s.prog)).map((s) => s.prog),
  )];

  try {
    await db.transaction(async (tx) => {
      const [cycle] = await tx
        .insert(trainingCycles)
        .values({ ...cycleFields, userId: auth.user.id })
        .returning({ id: trainingCycles.id });

      for (const slot of slots) {
        await tx.insert(trainingCycleSlots).values({
          trainingCycleId: cycle.id,
          programId: nameToId.get(slot.prog) ?? null,
          dayOfWeek: slot.day,
          orderIndex: slot.idx,
          label: slot.label,
          notes: slot.notes,
        });
      }
    });

    revalidatePath("/cycles");
    revalidatePath("/");
    return { success: true, data: { cycleName: cycleFields.name, unresolvedPrograms } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
