"use server";

/**
 * Workout Set Server Actions
 *
 * Server actions for logging workout sets and fetching workout history.
 * These are the core functions for tracking workout performance.
 *
 * Key responsibilities:
 * - Log individual sets with weight, reps, RPE, and rest time
 * - Fetch workout history for progress tracking
 * - Enable future features: PR detection, auto-deload suggestions
 *
 * Usage in Client Components:
 * ```typescript
 * import { logWorkoutSet } from "@/lib/actions/workout-sets";
 *
 * const handleLogSet = async (setData) => {
 *   const result = await logWorkoutSet(setData);
 *   if (result.success) {
 *     // Start rest timer, update UI
 *   }
 * };
 * ```
 */

import { db } from "@/db";
import { exercises, programs, workoutSessions, workoutSets } from "@/db/schema";
import {
    logWorkoutSetSchema,
    workoutHistoryQuerySchema,
} from "@/lib/validators/workout";
import type {
    ActionResult,
    SessionDetail,
    SessionWithStats,
    WorkoutHistoryResult,
    WorkoutSet,
    WorkoutSetWithExercise,
    WorkoutStats,
} from "@/types/workout";
import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Log a workout set
 *
 * Records a single set within a workout session. This is called after each
 * set is completed by the user.
 *
 * Future enhancement opportunities (marked with comments):
 * - Compare against historical data to detect PRs
 * - Analyze RPE trends to suggest deloads
 * - Calculate estimated 1RM using formulas
 *
 * @returns The created workout set on success
 */
export async function logWorkoutSet(
  data: unknown,
): Promise<ActionResult<WorkoutSet>> {
  try {
    // Validate input
    const validation = logWorkoutSetSchema.safeParse(data);

    if (!validation.success) {
      return {
        success: false,
        error: "Invalid input data",
        fieldErrors: validation.error.flatten().fieldErrors,
      };
    }

    const {
      sessionId,
      exerciseId,
      setNumber,
      targetReps,
      actualReps,
      weightKg,
      rpe,
      restTimeSeconds,
      isCompleted,
    } = validation.data;

    // Insert set into database
    const [set] = await db
      .insert(workoutSets)
      .values({
        sessionId,
        exerciseId,
        setNumber,
        targetReps,
        actualReps,
        weightKg: weightKg.toString(), // Convert to string for decimal type
        rpe,
        restTimeSeconds,
        isCompleted,
      })
      .returning();

    // TODO: PR Detection Logic
    // Compare this set's performance against historical data:
    // const isPR = await detectPR({ exerciseId, weightKg, actualReps });
    // if (isPR) { /* Trigger celebration UI, save PR record */ }

    // TODO: Auto-Deload Detection
    // Analyze recent sets to detect overtraining:
    // const shouldDeload = await checkDeloadNeeded({ exerciseId, sessionId });
    // if (shouldDeload) { /* Suggest lighter weight for next session */ }

    // Revalidate relevant pages
    revalidatePath(`/workout/${sessionId}`);
    revalidatePath("/history");

    return {
      success: true,
      data: set,
    };
  } catch (error) {
    console.error("Error logging workout set:", error);
    return {
      success: false,
      error: "Failed to log workout set. Please try again.",
    };
  }
}

/**
 * Get aggregate workout stats for the home page dashboard.
 *
 * - totalWorkouts: all completed sessions (lifetime)
 * - totalReps / totalSets: lifetime totals across all logged sets
 * - thisWeekWorkouts: completed sessions in the current Mon–Sun week
 */
export async function getWorkoutStats(
  userId: number,
): Promise<ActionResult<WorkoutStats>> {
  try {
    // Lifetime totals
    const [totals] = await db
      .select({
        totalWorkouts: sql<number>`COUNT(DISTINCT ${workoutSessions.id})`,
        totalReps: sql<number>`COALESCE(SUM(${workoutSets.actualReps}), 0)`,
        totalSets: sql<number>`COUNT(${workoutSets.id})`,
      })
      .from(workoutSessions)
      .leftJoin(workoutSets, eq(workoutSets.sessionId, workoutSessions.id))
      .where(
        and(
          eq(workoutSessions.userId, userId),
          eq(workoutSessions.isCompleted, true),
        ),
      );

    // This week's session count (Monday 00:00 UTC to now)
    const [thisWeek] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          eq(workoutSessions.isCompleted, true),
          sql`${workoutSessions.startTime} >= date_trunc('week', NOW())`,
        ),
      );

    return {
      success: true,
      data: {
        totalWorkouts: Number(totals.totalWorkouts),
        totalReps: Number(totals.totalReps),
        totalSets: Number(totals.totalSets),
        thisWeekWorkouts: Number(thisWeek.count),
      },
    };
  } catch (error) {
    console.error("Error fetching workout stats:", error);
    return { success: false, error: "Failed to fetch workout stats" };
  }
}

/**
 * Get workout history for a specific exercise
 *
 * Retrieves all sets performed for an exercise, ordered by date.
 * Used to display progress charts and analyze performance trends.
 *
 * This data powers:
 * - Progress tracking charts
 * - PR detection (heaviest weight, most reps, best estimated 1RM)
 * - Volume calculations (total sets × reps × weight)
 * - RPE trend analysis (detecting overtraining)
 *
 * @returns Paginated workout history
 */
export async function getWorkoutHistory(
  data: unknown,
): Promise<ActionResult<WorkoutHistoryResult>> {
  try {
    // Validate input
    const validation = workoutHistoryQuerySchema.safeParse(data);

    if (!validation.success) {
      return {
        success: false,
        error: "Invalid query parameters",
        fieldErrors: validation.error.flatten().fieldErrors,
      };
    }

    const { userId, exerciseId, limit = 50, offset = 0 } = validation.data;

    // Build query conditions
    const conditions = [
      eq(workoutSessions.userId, userId),
      eq(workoutSessions.isCompleted, true),
    ];

    if (exerciseId) {
      conditions.push(eq(workoutSets.exerciseId, exerciseId));
    }

    // Fetch sets with related data
    const sets = await db
      .select({
        id: workoutSets.id,
        sessionId: workoutSets.sessionId,
        exerciseId: workoutSets.exerciseId,
        setNumber: workoutSets.setNumber,
        targetReps: workoutSets.targetReps,
        actualReps: workoutSets.actualReps,
        weightKg: workoutSets.weightKg,
        rpe: workoutSets.rpe,
        restTimeSeconds: workoutSets.restTimeSeconds,
        isCompleted: workoutSets.isCompleted,
        createdAt: workoutSets.createdAt,
        exercise: {
          id: exercises.id,
          name: exercises.name,
          category: exercises.category,
          isCustom: exercises.isCustom,
        },
        workoutSession: {
          date: workoutSessions.date,
          startTime: workoutSessions.startTime,
        },
      })
      .from(workoutSets)
      .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
      .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
      .where(and(...conditions))
      .orderBy(desc(workoutSets.createdAt))
      .limit(limit + 1) // Fetch one extra to check if there are more
      .offset(offset);

    // Check if there are more results
    const hasMore = sets.length > limit;
    const resultSets = hasMore ? sets.slice(0, limit) : sets;

    // Count total matching records (for pagination)
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workoutSets)
      .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
      .where(and(...conditions));

    return {
      success: true,
      data: {
        sets: resultSets as unknown as WorkoutSetWithExercise[],
        totalCount: Number(count),
        hasMore,
      },
    };
  } catch (error) {
    console.error("Error fetching workout history:", error);
    return {
      success: false,
      error: "Failed to fetch workout history. Please try again.",
    };
  }
}

/**
 * Get all completed sessions for a user with aggregate stats.
 * Used for the history list view.
 */
export async function getCompletedSessions(
  userId: number,
): Promise<ActionResult<SessionWithStats[]>> {
  try {
    const rows = await db
      .select({
        id: workoutSessions.id,
        userId: workoutSessions.userId,
        programId: workoutSessions.programId,
        date: workoutSessions.date,
        startTime: workoutSessions.startTime,
        endTime: workoutSessions.endTime,
        notes: workoutSessions.notes,
        isCompleted: workoutSessions.isCompleted,
        programName: programs.name,
        setCount: sql<number>`COUNT(${workoutSets.id})`,
        exerciseCount: sql<number>`COUNT(DISTINCT ${workoutSets.exerciseId})`,
        totalVolumeKg: sql<string>`COALESCE(SUM(CAST(${workoutSets.weightKg} AS numeric) * ${workoutSets.actualReps}), 0)`,
      })
      .from(workoutSessions)
      .leftJoin(programs, eq(workoutSessions.programId, programs.id))
      .leftJoin(workoutSets, eq(workoutSets.sessionId, workoutSessions.id))
      .where(
        and(
          eq(workoutSessions.userId, userId),
          eq(workoutSessions.isCompleted, true),
        ),
      )
      .groupBy(
        workoutSessions.id,
        workoutSessions.userId,
        workoutSessions.programId,
        workoutSessions.date,
        workoutSessions.startTime,
        workoutSessions.endTime,
        workoutSessions.notes,
        workoutSessions.isCompleted,
        programs.name,
      )
      .orderBy(desc(workoutSessions.startTime));

    return {
      success: true,
      data: rows.map((row) => ({
        ...row,
        programName: row.programName ?? null,
        setCount: Number(row.setCount),
        exerciseCount: Number(row.exerciseCount),
        totalVolumeKg: Number(row.totalVolumeKg),
        durationMinutes:
          row.endTime && row.startTime
            ? Math.max(
                1,
                Math.round(
                  (row.endTime.getTime() - row.startTime.getTime()) / 60000,
                ),
              )
            : 0,
      })),
    };
  } catch (error) {
    console.error("Error fetching completed sessions:", error);
    return { success: false, error: "Failed to fetch workout history" };
  }
}

/**
 * Get full detail for a single session, with sets grouped by exercise.
 */
export async function getSessionDetail(
  sessionId: number,
): Promise<ActionResult<SessionDetail>> {
  try {
    const [sessionRow] = await db
      .select({
        id: workoutSessions.id,
        userId: workoutSessions.userId,
        programId: workoutSessions.programId,
        date: workoutSessions.date,
        startTime: workoutSessions.startTime,
        endTime: workoutSessions.endTime,
        notes: workoutSessions.notes,
        isCompleted: workoutSessions.isCompleted,
        programName: programs.name,
      })
      .from(workoutSessions)
      .leftJoin(programs, eq(workoutSessions.programId, programs.id))
      .where(eq(workoutSessions.id, sessionId));

    if (!sessionRow) {
      return { success: false, error: "Session not found" };
    }

    const setsRows = await db
      .select({ set: workoutSets, exerciseName: exercises.name })
      .from(workoutSets)
      .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
      .where(eq(workoutSets.sessionId, sessionId))
      .orderBy(workoutSets.exerciseId, workoutSets.setNumber);

    // Group by exercise name
    const exerciseMap = new Map<
      string,
      { exerciseName: string; sets: WorkoutSet[] }
    >();
    for (const row of setsRows) {
      if (!exerciseMap.has(row.exerciseName)) {
        exerciseMap.set(row.exerciseName, {
          exerciseName: row.exerciseName,
          sets: [],
        });
      }
      exerciseMap.get(row.exerciseName)!.sets.push(row.set);
    }

    return {
      success: true,
      data: {
        ...sessionRow,
        programName: sessionRow.programName ?? null,
        setsByExercise: Array.from(exerciseMap.values()),
      },
    };
  } catch (error) {
    console.error("Error fetching session detail:", error);
    return { success: false, error: "Failed to fetch session detail" };
  }
}

/**
 * Get all sets for a specific workout session
 *
 * Fetches complete session data including all sets and exercise details.
 * Used for displaying the current workout or reviewing past workouts.
 *
 * @returns All sets in the session with exercise details
 */
export async function getSessionSets(
  sessionId: number,
): Promise<ActionResult<WorkoutSet[]>> {
  try {
    const sets = await db.query.workoutSets.findMany({
      where: eq(workoutSets.sessionId, sessionId),
      with: {
        exercise: true,
      },
      orderBy: [desc(workoutSets.createdAt)],
    });

    return {
      success: true,
      data: sets as unknown as WorkoutSetWithExercise[],
    };
  } catch (error) {
    console.error("Error fetching session sets:", error);
    return {
      success: false,
      error: "Failed to fetch session sets",
    };
  }
}
