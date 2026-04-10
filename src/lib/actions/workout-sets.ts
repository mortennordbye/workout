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
import { exercises, programExercises, programSets, programs, users, workoutSessions, workoutSets } from "@/db/schema";
import { getActiveCycleForUser } from "@/lib/actions/training-cycles";
import {
    logWorkoutSetSchema,
    workoutHistoryQuerySchema,
} from "@/lib/validators/workout";
import {
    buildSuggestion,
    CONSENSUS_WINDOW,
} from "@/lib/utils/progression";
import type { HistoryRow, ProgramSetData } from "@/lib/utils/progression";
import type {
    ActionResult,
    SessionDetail,
    SessionWithStats,
    SetSuggestion,
    WorkoutHistoryResult,
    WorkoutSet,
    WorkoutSetWithExercise,
    WorkoutStats,
} from "@/types/workout";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
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
      durationSeconds,
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
        durationSeconds,
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
  userId: string,
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
  userId: string,
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
        feeling: workoutSessions.feeling,
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
        workoutSessions.feeling,
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
        feeling: workoutSessions.feeling,
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
 * Get the number of completed sessions in which a given exercise was logged.
 */
export async function getExerciseLoggedCount(
  exerciseId: number,
): Promise<number> {
  try {
    const [row] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${workoutSets.sessionId})` })
      .from(workoutSets)
      .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
      .where(
        and(
          eq(workoutSets.exerciseId, exerciseId),
          eq(workoutSessions.isCompleted, true),
        ),
      );
    return Number(row?.count ?? 0);
  } catch {
    return 0;
  }
}


/**
 * Calculate progressive overload suggestions for every set in a program.
 *
 * For each program_set, we examine recent completed sessions (excluding "Tired"
 * sessions) and apply multi-session consensus logic:
 * - Requires REQUIRED_HITS confident hits within the last CONSENSUS_WINDOW sessions
 *   to trigger a progression (prevents single-fluke advances).
 * - RPE gates confidence: RPE 9-10 sets are not counted as confident hits.
 * - 3+ consecutive failures trigger a 10% deload suggestion.
 * - If no history exists for a set, it is omitted (caller uses the program default).
 *
 * NULL feeling (old sessions recorded before the column existed) is treated
 * as valid — only explicit "Tired" entries are excluded.
 */
export async function getProgressiveSuggestions(
  programId: number,
  userId: string,
): Promise<ActionResult<Record<number, SetSuggestion>>> {
  try {
    // Step 1: get all program sets for this program with their exercise ids and increment
    const programData = await db
      .select({
        programSetId: programSets.id,
        setNumber: programSets.setNumber,
        targetReps: programSets.targetReps,
        durationSeconds: programSets.durationSeconds,
        exerciseId: programExercises.exerciseId,
        overloadIncrementKg: programExercises.overloadIncrementKg,
        overloadIncrementReps: programExercises.overloadIncrementReps,
        progressionMode: programExercises.progressionMode,
      })
      .from(programSets)
      .innerJoin(
        programExercises,
        eq(programSets.programExerciseId, programExercises.id),
      )
      .where(eq(programExercises.programId, programId));

    if (programData.length === 0) {
      return { success: true, data: {} };
    }

    const exerciseIds = [...new Set(programData.map((r) => r.exerciseId))];

    // Step 2: fetch user profile for default increment personalisation
    const userProfile = await db
      .select({
        experienceLevel: users.experienceLevel,
        goal: users.goal,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((r) => r[0] ?? null);

    // Step 3: fetch history, excluding Tired sessions
    // NULL feeling (pre-feature sessions) is kept via IS DISTINCT FROM.
    // Limit to CONSENSUS_WINDOW rows per exercise+setNumber to avoid full scans
    // on accounts with hundreds of sessions.
    const history = await db
      .select({
        exerciseId: workoutSets.exerciseId,
        setNumber: workoutSets.setNumber,
        actualReps: workoutSets.actualReps,
        targetReps: workoutSets.targetReps,
        weightKg: workoutSets.weightKg,
        durationSeconds: workoutSets.durationSeconds,
        rpe: workoutSets.rpe,
        feeling: workoutSessions.feeling,
        date: workoutSessions.date,
      })
      .from(workoutSets)
      .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
      .where(
        and(
          eq(workoutSessions.userId, userId),
          eq(workoutSessions.programId, programId),
          eq(workoutSessions.isCompleted, true),
          sql`${workoutSessions.feeling} IS DISTINCT FROM 'Tired'`,
          inArray(workoutSets.exerciseId, exerciseIds),
        ),
      )
      .orderBy(desc(workoutSessions.date), desc(workoutSets.weightKg))
      .limit(programData.length * CONSENSUS_WINDOW);

    // Step 4: group history rows per exerciseId+setNumber (most-recent-first)
    const historyPerKey = new Map<string, HistoryRow[]>();
    for (const row of history) {
      const key = `${row.exerciseId}-${row.setNumber}`;
      if (!historyPerKey.has(key)) historyPerKey.set(key, []);
      const list = historyPerKey.get(key)!;
      if (list.length < CONSENSUS_WINDOW) list.push(row as HistoryRow);
    }

    // Step 5: build suggestion for each program set using the pure helper
    const suggestions: Record<number, SetSuggestion> = {};

    for (const ps of programData) {
      const key = `${ps.exerciseId}-${ps.setNumber}`;
      const rows = historyPerKey.get(key) ?? [];
      const suggestion = buildSuggestion(rows, ps as ProgramSetData, userProfile);
      if (suggestion) {
        suggestions[ps.programSetId] = suggestion;
      }
    }

    return { success: true, data: suggestions };
  } catch (error) {
    console.error("Error calculating progressive suggestions:", error);
    return { success: false, error: "Failed to calculate suggestions" };
  }
}

// Re-export SetSuggestion so existing callers don't need to change their imports.
export type { SetSuggestion } from "@/types/workout";

// ─── Workout insight ──────────────────────────────────────────────────────────

export type WorkoutInsight = {
  type: "fatigued" | "stagnating" | "progressing" | "first_session" | "on_track";
  headline: string;
  detail?: string;
  cycleWeek?: number;
  cycleTotalWeeks?: number;
  sessionCount: number;
};

/**
 * Compute a single pre-workout insight for the given program.
 * Priority: fatigued → stagnating → progressing → first_session → on_track
 */
export async function getWorkoutInsight(
  programId: number,
  userId: string,
): Promise<WorkoutInsight> {
  // Fetch last 3 completed sessions for this program
  const recentSessions = await db
    .select({ feeling: workoutSessions.feeling })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.programId, programId),
        eq(workoutSessions.isCompleted, true),
        isNotNull(workoutSessions.feeling),
      ),
    )
    .orderBy(desc(workoutSessions.startTime))
    .limit(3);

  const sessionCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.programId, programId),
        eq(workoutSessions.isCompleted, true),
      ),
    )
    .then((r) => Number(r[0]?.count ?? 0));

  // Fetch progressive suggestions
  const suggestionsResult = await getProgressiveSuggestions(programId, userId);
  const suggestions = suggestionsResult.success ? Object.values(suggestionsResult.data) : [];

  // Fetch active cycle
  const cycleResult = await getActiveCycleForUser(userId);
  const cycleWeek = cycleResult.success && cycleResult.data ? cycleResult.data.currentWeek : undefined;
  const cycleTotalWeeks = cycleResult.success && cycleResult.data
    ? cycleResult.data.cycle.durationWeeks
    : undefined;

  const cycleContext = { cycleWeek, cycleTotalWeeks };

  // 1. Fatigued — last 2+ sessions both "Tired"
  const lastTwoTired =
    recentSessions.length >= 2 &&
    recentSessions[0].feeling === "Tired" &&
    recentSessions[1].feeling === "Tired";

  if (lastTwoTired) {
    return {
      type: "fatigued",
      headline: "Your last 2 sessions felt tough.",
      detail: "Consider going slightly lighter today and focusing on form.",
      ...cycleContext,
      sessionCount,
    };
  }

  // 2. Stagnating — >50% of tracked sets held AND enough history
  const tracked = suggestions.filter((s) => s.reason !== "manual");
  const heldCount = tracked.filter((s) => s.reason === "held").length;
  const isStagnating = sessionCount >= 3 && tracked.length > 0 && heldCount / tracked.length > 0.5;

  if (isStagnating) {
    return {
      type: "stagnating",
      headline: "You've been holding the same weights for a few sessions.",
      detail: "Try a slow eccentric, drop sets, or a slight deload to break through.",
      ...cycleContext,
      sessionCount,
    };
  }

  // 3. Progressing — >50% of tracked sets progressed
  const progressedCount = tracked.filter(
    (s) => s.reason === "progressed" || s.reason === "progressed-reps",
  ).length;
  const isProgressing = tracked.length > 0 && progressedCount / tracked.length > 0.5;

  if (isProgressing) {
    return {
      type: "progressing",
      headline: `You're progressing on ${progressedCount} exercise${progressedCount === 1 ? "" : "s"} — keep the momentum.`,
      ...cycleContext,
      sessionCount,
    };
  }

  // 4. First session
  if (sessionCount === 0) {
    return {
      type: "first_session",
      headline: "First time with this program.",
      detail: "Focus on technique and get a feel for the weights.",
      ...cycleContext,
      sessionCount,
    };
  }

  // 5. On track (fallback)
  return {
    type: "on_track",
    headline: `Session ${sessionCount + 1} for this program. Stay consistent.`,
    ...cycleContext,
    sessionCount,
  };
}
