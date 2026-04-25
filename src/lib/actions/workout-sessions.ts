"use server";

import { db } from "@/db";
import { workoutSessions } from "@/db/schema";
import { ForbiddenError, assertOwner, requireSession } from "@/lib/utils/session";
import {
  completeWorkoutSessionSchema,
  createWorkoutSessionSchema,
} from "@/lib/validators/workout";
import type { ActionResult, WorkoutSession } from "@/types/workout";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createWorkoutSession(
  data: unknown,
): Promise<ActionResult<WorkoutSession>> {
  const auth = await requireSession();

  const validation = createWorkoutSessionSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: "Invalid input data",
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  try {
    const { date, startTime, notes, programId } = validation.data;
    const [session] = await db
      .insert(workoutSessions)
      .values({
        userId: auth.user.id,
        date,
        startTime: startTime ? new Date(startTime) : new Date(),
        notes,
        programId,
        isCompleted: false,
      })
      .returning();

    revalidatePath("/workout");
    revalidatePath(`/workout/${session.id}`);
    return { success: true, data: session };
  } catch (error) {
    console.error("Error creating workout session:", error);
    return { success: false, error: "Failed to create workout session." };
  }
}

export async function completeWorkoutSession(
  data: unknown,
): Promise<ActionResult<WorkoutSession>> {
  const auth = await requireSession();

  const validation = completeWorkoutSessionSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: "Invalid input data",
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  try {
    const { sessionId, endTime, notes, feeling } = validation.data;

    const [existing] = await db
      .select({ userId: workoutSessions.userId })
      .from(workoutSessions)
      .where(eq(workoutSessions.id, sessionId));
    assertOwner(existing, auth.user.id);

    const [session] = await db
      .update(workoutSessions)
      .set({
        endTime: endTime ? new Date(endTime) : new Date(),
        notes,
        feeling,
        isCompleted: true,
      })
      .where(eq(workoutSessions.id, sessionId))
      .returning();

    revalidatePath("/workout");
    revalidatePath(`/workout/${sessionId}`);
    revalidatePath("/history");
    return { success: true, data: session };
  } catch (e) {
    if (e instanceof ForbiddenError) return { success: false, error: e.message };
    console.error("[completeWorkoutSession] failed", e);
    return { success: false, error: "Failed to complete workout session." };
  }
}

export async function deleteWorkoutSession(
  sessionId: number,
): Promise<ActionResult<undefined>> {
  const auth = await requireSession();

  try {
    const [existing] = await db
      .select({ userId: workoutSessions.userId })
      .from(workoutSessions)
      .where(eq(workoutSessions.id, sessionId));
    assertOwner(existing, auth.user.id);

    await db.delete(workoutSessions).where(eq(workoutSessions.id, sessionId));
    revalidatePath("/history");
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (e) {
    if (e instanceof ForbiddenError) return { success: false, error: e.message };
    console.error("[deleteWorkoutSession] failed", e);
    return { success: false, error: "Failed to delete workout session" };
  }
}

type LastSession = {
  feeling: string | null;
  notes: string | null;
  date: string;
  durationMinutes: number;
};

export async function getLastCompletedSession(
  programId: number,
): Promise<ActionResult<LastSession | null>> {
  const auth = await requireSession();
  try {
    const session = await db.query.workoutSessions.findFirst({
      where: (s, { eq, and }) =>
        and(
          eq(s.userId, auth.user.id),
          eq(s.programId, programId),
          eq(s.isCompleted, true),
        ),
      orderBy: (s, { desc }) => [desc(s.startTime)],
    });
    if (!session) return { success: true, data: null };
    const durationMinutes =
      session.endTime && session.startTime
        ? Math.max(1, Math.round((session.endTime.getTime() - session.startTime.getTime()) / 60000))
        : 0;
    return {
      success: true,
      data: {
        feeling: session.feeling ?? null,
        notes: session.notes ?? null,
        date: session.date,
        durationMinutes,
      },
    };
  } catch (error) {
    console.error("Error fetching last session:", error);
    return { success: false, error: "Failed to fetch last session" };
  }
}

/**
 * Record the user's pre-workout readiness score (1–5) on the active session.
 * Called once when the user responds to the readiness check-in sheet.
 */
export async function setSessionReadiness(
  sessionId: number,
  readiness: number,
): Promise<ActionResult<undefined>> {
  const auth = await requireSession();

  if (!Number.isInteger(readiness) || readiness < 1 || readiness > 5) {
    return { success: false, error: "Readiness must be an integer between 1 and 5" };
  }
  try {
    const [existing] = await db
      .select({ userId: workoutSessions.userId })
      .from(workoutSessions)
      .where(eq(workoutSessions.id, sessionId));
    assertOwner(existing, auth.user.id);

    await db
      .update(workoutSessions)
      .set({ readiness })
      .where(eq(workoutSessions.id, sessionId));
    return { success: true, data: undefined };
  } catch (e) {
    if (e instanceof ForbiddenError) return { success: false, error: e.message };
    console.error("[setSessionReadiness] failed", e);
    return { success: false, error: "Failed to set readiness" };
  }
}
