"use server";

/**
 * Workout Session Server Actions
 *
 * Server actions for managing workout sessions.
 * These functions run on the server and can be called directly from client components.
 *
 * Key features:
 * - Input validation with Zod
 * - Type-safe database operations
 * - Automatic error handling
 * - Cache revalidation for updated data
 *
 * Usage in Client Components:
 * ```typescript
 * import { createWorkoutSession } from "@/lib/actions/workout-sessions";
 *
 * const handleStart = async () => {
 *   const result = await createWorkoutSession({ userId: 1, date: "2026-03-06" });
 *   if (result.success) {
 *     // Navigate to workout page with result.data.id
 *   }
 * };
 * ```
 */

import { db } from "@/db";
import { workoutSessions } from "@/db/schema";
import {
    completeWorkoutSessionSchema,
    createWorkoutSessionSchema,
} from "@/lib/validators/workout";
import type { ActionResult, WorkoutSession } from "@/types/workout";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Create a new workout session
 *
 * Starts a new workout session for a user. The session is initially marked as
 * incomplete and can be updated with sets as the workout progresses.
 *
 * @returns The created workout session on success
 */
export async function createWorkoutSession(
  data: unknown,
): Promise<ActionResult<WorkoutSession>> {
  try {
    // Validate input
    const validation = createWorkoutSessionSchema.safeParse(data);

    if (!validation.success) {
      return {
        success: false,
        error: "Invalid input data",
        fieldErrors: validation.error.flatten().fieldErrors,
      };
    }

    const { userId, date, startTime, notes, programId } = validation.data;

    // Insert session into database
    const [session] = await db
      .insert(workoutSessions)
      .values({
        userId,
        date,
        startTime: startTime ? new Date(startTime) : new Date(),
        notes,
        programId,
        isCompleted: false,
      })
      .returning();

    // Revalidate workout pages to show new session
    revalidatePath("/workout");
    revalidatePath(`/workout/${session.id}`);

    return {
      success: true,
      data: session,
    };
  } catch (error) {
    console.error("Error creating workout session:", error);
    return {
      success: false,
      error: "Failed to create workout session. Please try again.",
    };
  }
}

/**
 * Complete a workout session
 *
 * Marks a workout session as completed and sets the end time.
 * After completion, the session becomes part of the user's workout history.
 *
 * @returns The updated workout session on success
 */
export async function completeWorkoutSession(
  data: unknown,
): Promise<ActionResult<WorkoutSession>> {
  try {
    // Validate input
    const validation = completeWorkoutSessionSchema.safeParse(data);

    if (!validation.success) {
      return {
        success: false,
        error: "Invalid input data",
        fieldErrors: validation.error.flatten().fieldErrors,
      };
    }

    const { sessionId, endTime, notes, feeling } = validation.data;

    // Update session
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

    if (!session) {
      return {
        success: false,
        error: "Workout session not found",
      };
    }

    // Revalidate relevant pages
    revalidatePath("/workout");
    revalidatePath(`/workout/${sessionId}`);
    revalidatePath("/history");

    return {
      success: true,
      data: session,
    };
  } catch (error) {
    console.error("Error completing workout session:", error);
    return {
      success: false,
      error: "Failed to complete workout session. Please try again.",
    };
  }
}

/**
 * Delete a workout session (and its sets via cascade)
 */
export async function deleteWorkoutSession(
  sessionId: number,
): Promise<ActionResult<undefined>> {
  try {
    await db.delete(workoutSessions).where(eq(workoutSessions.id, sessionId));
    revalidatePath("/history");
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error deleting workout session:", error);
    return { success: false, error: "Failed to delete workout session" };
  }
}

/**
 * Get the active (incomplete) workout session for a user
 *
 * Useful for resuming an ongoing workout when the user returns to the app.
 *
 * @returns The active session if found, null otherwise
 */
export async function getActiveSession(
  userId: number,
): Promise<ActionResult<WorkoutSession | null>> {
  try {
    const session = await db.query.workoutSessions.findFirst({
      where: (sessions, { eq, and }) =>
        and(eq(sessions.userId, userId), eq(sessions.isCompleted, false)),
      orderBy: (sessions, { desc }) => [desc(sessions.startTime)],
    });

    return {
      success: true,
      data: session || null,
    };
  } catch (error) {
    console.error("Error fetching active session:", error);
    return {
      success: false,
      error: "Failed to fetch active session",
    };
  }
}
