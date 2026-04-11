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
import { exercisePrs, exercises, programExercises, programSets, programs, users, workoutSessions, workoutSets } from "@/db/schema";
import { getActiveCycleForUser } from "@/lib/actions/training-cycles";
import { requireSession } from "@/lib/utils/session";
import {
    logWorkoutSetSchema,
    workoutHistoryQuerySchema,
} from "@/lib/validators/workout";
import {
    buildSuggestion,
    CONSENSUS_WINDOW,
    estimate1RM,
} from "@/lib/utils/progression";
import type { HistoryRow, ProgramSetData } from "@/lib/utils/progression";
import type {
    ActionResult,
    LogWorkoutSetResult,
    PRResult,
    SessionDetail,
    SessionWithStats,
    SetSuggestion,
    WorkoutHistoryResult,
    WorkoutSet,
    WorkoutSetWithExercise,
    WorkoutStats,
} from "@/types/workout";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
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
): Promise<ActionResult<LogWorkoutSetResult>> {
  const auth = await requireSession();

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
        weightKg: weightKg.toString(),
        durationSeconds,
        rpe,
        restTimeSeconds,
        isCompleted,
      })
      .returning();

    // PR Detection: check for new records using the authenticated user's ID
    let newPRs: PRResult[] = [];
    if (actualReps > 0 && weightKg > 0) {
      newPRs = await detectAndRecordPRs({
        userId: auth.user.id,
        exerciseId,
        sessionId,
        setId: set.id,
        weightKg,
        actualReps,
      });
    }

    revalidatePath(`/workout/${sessionId}`);
    revalidatePath("/history");

    return {
      success: true,
      data: { set, newPRs },
    };
  } catch (error) {
    console.error("Error logging workout set:", error);
    return {
      success: false,
      error: "Failed to log workout set. Please try again.",
    };
  }
}

// ─── PR Detection ─────────────────────────────────────────────────────────────

async function detectAndRecordPRs({
  userId,
  exerciseId,
  sessionId,
  setId,
  weightKg,
  actualReps,
}: {
  userId: string;
  exerciseId: number;
  sessionId: number;
  setId: number;
  weightKg: number;
  actualReps: number;
}): Promise<PRResult[]> {
  const newPRs: PRResult[] = [];
  const now = new Date();

  // Bodyweight / timed sets have no meaningful weight PR — skip entirely
  if (weightKg <= 0) return newPRs;

  try {
    // 1. Weight PR — heaviest single set ever
    const [currentWeightPR] = await db
      .select()
      .from(exercisePrs)
      .where(
        and(
          eq(exercisePrs.userId, userId),
          eq(exercisePrs.exerciseId, exerciseId),
          eq(exercisePrs.prType, "weight"),
          isNull(exercisePrs.supersededAt),
        ),
      )
      .limit(1);

    if (!currentWeightPR || weightKg > Number(currentWeightPR.value)) {
      if (currentWeightPR) {
        await db
          .update(exercisePrs)
          .set({ supersededAt: now })
          .where(and(eq(exercisePrs.id, currentWeightPR.id), isNull(exercisePrs.supersededAt)));
      }
      await db.insert(exercisePrs).values({
        userId,
        exerciseId,
        prType: "weight",
        value: weightKg.toFixed(2),
        sessionId,
        setId,
      });
      newPRs.push({
        type: "weight",
        value: weightKg,
        previousValue: currentWeightPR ? Number(currentWeightPR.value) : undefined,
      });
    }

    // 2. Estimated 1RM PR — Epley formula, valid for 2–12 reps
    if (actualReps >= 2 && actualReps <= 12) {
      const new1RM = estimate1RM(weightKg, actualReps);
      const [current1RMPR] = await db
        .select()
        .from(exercisePrs)
        .where(
          and(
            eq(exercisePrs.userId, userId),
            eq(exercisePrs.exerciseId, exerciseId),
            eq(exercisePrs.prType, "estimated_1rm"),
            isNull(exercisePrs.supersededAt),
          ),
        )
        .limit(1);

      if (!current1RMPR || new1RM > Number(current1RMPR.value)) {
        if (current1RMPR) {
          await db
            .update(exercisePrs)
            .set({ supersededAt: now })
            .where(and(eq(exercisePrs.id, current1RMPR.id), isNull(exercisePrs.supersededAt)));
        }
        await db.insert(exercisePrs).values({
          userId,
          exerciseId,
          prType: "estimated_1rm",
          value: new1RM.toFixed(2),
          weightKg: weightKg.toFixed(2),
          sessionId,
          setId,
        });
        newPRs.push({
          type: "estimated_1rm",
          value: Math.round(new1RM * 10) / 10,
          previousValue: current1RMPR
            ? Math.round(Number(current1RMPR.value) * 10) / 10
            : undefined,
        });
      }
    }

    // 3. Reps-at-weight PR — most reps ever at this load (±0.5 kg)
    if (actualReps > 0) {
      const [currentRepsAtWeightPR] = await db
        .select()
        .from(exercisePrs)
        .where(
          and(
            eq(exercisePrs.userId, userId),
            eq(exercisePrs.exerciseId, exerciseId),
            eq(exercisePrs.prType, "reps_at_weight"),
            sql`ABS(CAST(${exercisePrs.weightKg} AS numeric) - ${weightKg}) <= 0.5`,
            isNull(exercisePrs.supersededAt),
          ),
        )
        .limit(1);

      if (!currentRepsAtWeightPR || actualReps > Number(currentRepsAtWeightPR.value)) {
        if (currentRepsAtWeightPR) {
          await db
            .update(exercisePrs)
            .set({ supersededAt: now })
            .where(and(eq(exercisePrs.id, currentRepsAtWeightPR.id), isNull(exercisePrs.supersededAt)));
        }
        await db.insert(exercisePrs).values({
          userId,
          exerciseId,
          prType: "reps_at_weight",
          value: actualReps.toString(),
          weightKg: weightKg.toFixed(2),
          sessionId,
          setId,
        });
        newPRs.push({
          type: "reps_at_weight",
          value: actualReps,
          previousValue: currentRepsAtWeightPR
            ? Number(currentRepsAtWeightPR.value)
            : undefined,
        });
      }
    }
  } catch (err) {
    // PR detection is non-critical — log and continue
    console.error("PR detection error:", err);
  }

  return newPRs;
}

/**
 * Get the current (non-superseded) personal records for an exercise.
 * Returns a map of prType → value number.
 */
export async function getExercisePRs(
  exerciseId: number,
  userId: string,
): Promise<ActionResult<Record<string, number>>> {
  try {
    const prs = await db
      .select({
        prType: exercisePrs.prType,
        value: exercisePrs.value,
      })
      .from(exercisePrs)
      .where(
        and(
          eq(exercisePrs.userId, userId),
          eq(exercisePrs.exerciseId, exerciseId),
          isNull(exercisePrs.supersededAt),
        ),
      );

    const result: Record<string, number> = {};
    for (const pr of prs) {
      result[pr.prType] = Number(pr.value);
    }
    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching exercise PRs:", error);
    return { success: false, error: "Failed to fetch PRs" };
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
        readiness: workoutSessions.readiness,
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
        workoutSessions.readiness,
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
        readiness: workoutSessions.readiness,
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
    // Step 1: get all program sets for this program with exercise metadata
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
        movementPattern: exercises.movementPattern,
        exerciseName: exercises.name,
      })
      .from(programSets)
      .innerJoin(
        programExercises,
        eq(programSets.programExerciseId, programExercises.id),
      )
      .innerJoin(exercises, eq(programExercises.exerciseId, exercises.id))
      .where(eq(programExercises.programId, programId));

    if (programData.length === 0) {
      return { success: true, data: {} };
    }

    const exerciseIds = [...new Set(programData.map((r) => r.exerciseId))];

    // Step 2: fetch user profile and current session readiness in parallel
    const [userProfile, activeSession] = await Promise.all([
      db
        .select({ experienceLevel: users.experienceLevel, goal: users.goal })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .then((r) => r[0] ?? null),
      db
        .select({ readiness: workoutSessions.readiness })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, userId),
            eq(workoutSessions.programId, programId),
            eq(workoutSessions.isCompleted, false),
          ),
        )
        .orderBy(desc(workoutSessions.startTime))
        .limit(1)
        .then((r) => r[0] ?? null),
    ]);

    const readiness = activeSession?.readiness ?? null;

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
      .orderBy(desc(workoutSessions.startTime), desc(workoutSets.id))
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
      const psData: ProgramSetData = {
        programSetId: ps.programSetId,
        setNumber: ps.setNumber,
        targetReps: ps.targetReps,
        durationSeconds: ps.durationSeconds,
        exerciseId: ps.exerciseId,
        overloadIncrementKg: ps.overloadIncrementKg,
        overloadIncrementReps: ps.overloadIncrementReps,
        progressionMode: ps.progressionMode,
        movementPattern: ps.movementPattern,
        exerciseName: ps.exerciseName,
      };
      const suggestion = buildSuggestion(rows, psData, userProfile, readiness);
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

export type ExerciseInsight = {
  exerciseName: string;
  status: "progressing" | "held" | "near_deload" | "deloading";
  sessionsUntilDeload?: number;
};

export type WorkoutInsight = {
  type:
    | "fatigued"
    | "stagnating"
    | "progressing"
    | "first_session"
    | "on_track"
    | "readiness_low"
    | "plateau_warning"
    | "pr_streak";
  headline: string;
  detail?: string;
  cycleWeek?: number;
  cycleTotalWeeks?: number;
  sessionCount: number;
  exerciseInsights?: ExerciseInsight[];
};

/**
 * Compute a single pre-workout insight for the given program.
 *
 * Priority order:
 *   readiness_low → fatigued → plateau_warning → stagnating →
 *   progressing → pr_streak → first_session → on_track
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

  const [sessionCountRow, cycleResult, suggestionsResult, currentSessionRow] =
    await Promise.all([
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, userId),
            eq(workoutSessions.programId, programId),
            eq(workoutSessions.isCompleted, true),
          ),
        )
        .then((r) => Number(r[0]?.count ?? 0)),
      getActiveCycleForUser(userId),
      getProgressiveSuggestions(programId, userId),
      // Fetch the current (incomplete) session to read readiness
      db
        .select({ readiness: workoutSessions.readiness })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, userId),
            eq(workoutSessions.programId, programId),
            eq(workoutSessions.isCompleted, false),
          ),
        )
        .orderBy(desc(workoutSessions.startTime))
        .limit(1)
        .then((r) => r[0] ?? null),
    ]);

  const sessionCount = sessionCountRow;
  const cycleWeek = cycleResult.success && cycleResult.data ? cycleResult.data.currentWeek : undefined;
  const cycleTotalWeeks = cycleResult.success && cycleResult.data
    ? cycleResult.data.cycle.durationWeeks
    : undefined;
  const cycleContext = { cycleWeek, cycleTotalWeeks };
  const readiness = currentSessionRow?.readiness ?? null;
  const suggestions = suggestionsResult.success ? Object.values(suggestionsResult.data) : [];

  // ── Build per-exercise insight pills ────────────────────────────────────────
  // Deduplicate by exercise name: take the worst status per exercise
  const exerciseStatusMap = new Map<string, ExerciseInsight>();
  for (const sug of suggestions) {
    if (!sug.exerciseName) continue;
    const prev = exerciseStatusMap.get(sug.exerciseName);
    let status: ExerciseInsight["status"];
    if (sug.reason === "deload") {
      status = "deloading";
    } else if (sug.sessionsUntilDeload === 1) {
      status = "near_deload";
    } else if (sug.reason === "progressed" || sug.reason === "progressed-reps" || sug.reason === "progressed-time") {
      status = "progressing";
    } else {
      status = "held";
    }
    // Keep worst status: deloading > near_deload > held > progressing
    const rank = { deloading: 4, near_deload: 3, held: 2, progressing: 1 };
    if (!prev || rank[status] > rank[prev.status]) {
      exerciseStatusMap.set(sug.exerciseName, {
        exerciseName: sug.exerciseName,
        status,
        sessionsUntilDeload: sug.sessionsUntilDeload ?? undefined,
      });
    }
  }
  const exerciseInsights = Array.from(exerciseStatusMap.values());

  // ── Priority 0: readiness_low — if energy is very low today ─────────────────
  if (readiness != null && readiness <= 2) {
    return {
      type: "readiness_low",
      headline: "Energy is low today. Targets adjusted — focus on technique.",
      detail: "Weights have been reduced to match your readiness. Quality over quantity.",
      ...cycleContext,
      sessionCount,
      exerciseInsights,
    };
  }

  // ── Priority 1: fatigued — last 2+ sessions both "Tired" ───────────────────
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
      exerciseInsights,
    };
  }

  // ── Priority 2: plateau_warning — any set is 1 miss from deload ────────────
  const nearDeloadExercise = exerciseInsights.find((e) => e.status === "near_deload");
  if (nearDeloadExercise) {
    return {
      type: "plateau_warning",
      headline: `${nearDeloadExercise.exerciseName} is 1 miss from a deload.`,
      detail: "Push through with good form, or adjust weights proactively.",
      ...cycleContext,
      sessionCount,
      exerciseInsights,
    };
  }

  // ── Priority 3: stagnating — >50% sets held for 3+ sessions ────────────────
  const tracked = suggestions.filter((s) => s.reason !== "manual");
  const heldCount = tracked.filter((s) => s.reason === "held" || s.reason === "held-readiness").length;
  const isStagnating = sessionCount >= 3 && tracked.length > 0 && heldCount / tracked.length > 0.5;

  if (isStagnating) {
    return {
      type: "stagnating",
      headline: "You've been holding the same weights for a few sessions.",
      detail: "Try a slow eccentric, drop sets, or a slight deload to break through.",
      ...cycleContext,
      sessionCount,
      exerciseInsights,
    };
  }

  // ── Priority 4: progressing — >50% sets progressed ─────────────────────────
  const progressedCount = tracked.filter(
    (s) =>
      s.reason === "progressed" ||
      s.reason === "progressed-reps" ||
      s.reason === "progressed-time",
  ).length;
  const isProgressing = tracked.length > 0 && progressedCount / tracked.length > 0.5;

  if (isProgressing) {
    return {
      type: "progressing",
      headline: `You're progressing on ${progressedCount} exercise${progressedCount === 1 ? "" : "s"} — keep the momentum.`,
      ...cycleContext,
      sessionCount,
      exerciseInsights,
    };
  }

  // ── Priority 5: pr_streak — PRs logged in this program's sessions recently ──
  const recentPRs = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(exercisePrs)
    .innerJoin(workoutSessions, eq(exercisePrs.sessionId, workoutSessions.id))
    .where(
      and(
        eq(exercisePrs.userId, userId),
        eq(workoutSessions.programId, programId),
        sql`${exercisePrs.achievedAt} >= NOW() - INTERVAL '7 days'`,
      ),
    )
    .then((r) => Number(r[0]?.count ?? 0));

  if (recentPRs > 0) {
    return {
      type: "pr_streak",
      headline: "You've hit personal records this week — great momentum!",
      ...cycleContext,
      sessionCount,
      exerciseInsights,
    };
  }

  // ── Priority 6: first_session ───────────────────────────────────────────────
  if (sessionCount === 0) {
    return {
      type: "first_session",
      headline: "First time with this program.",
      detail: "Focus on technique and get a feel for the weights.",
      ...cycleContext,
      sessionCount,
      exerciseInsights,
    };
  }

  // ── Priority 7: on_track (fallback) ────────────────────────────────────────
  return {
    type: "on_track",
    headline: `Session ${sessionCount + 1} for this program. Stay consistent.`,
    ...cycleContext,
    sessionCount,
    exerciseInsights,
  };
}
