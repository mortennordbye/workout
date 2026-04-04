"use server";

import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { exercises, workoutSessions, workoutSets } from "@/db/schema";
import { ActionResult } from "@/types/workout";

// ── Types ──────────────────────────────────────────────────────────────────

export type WeeklyMetric = {
  weekStart: string; // ISO date string (Monday)
  volumeKg: number;
  sessionCount: number;
};

export type PersonalRecord = {
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string | null;
  maxWeightKg: number;
};

export type MuscleBalance = {
  muscleGroup: string;
  setCount: number;
};

export type ExerciseProgress = {
  date: string;
  maxWeightKg: number;
};

export type MetricsData = {
  weekly: WeeklyMetric[];
  personalRecords: PersonalRecord[];
  muscleBalance: MuscleBalance[];
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns Monday of the week containing `from`, offset by `weeksAgo`. */
function getMondayOffset(from: Date, weeksAgo: number): string {
  const d = new Date(from);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff - weeksAgo * 7);
  return d.toISOString().split("T")[0];
}

/** Fills missing weeks with zero-value entries so the chart always shows 8 bars. */
function fillWeeklyGaps(rows: WeeklyMetric[], weeks = 8): WeeklyMetric[] {
  const today = new Date();
  const byWeek = new Map(rows.map((r) => [r.weekStart, r]));
  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = getMondayOffset(today, weeks - 1 - i);
    return byWeek.get(weekStart) ?? { weekStart, volumeKg: 0, sessionCount: 0 };
  });
}

// ── Queries ────────────────────────────────────────────────────────────────

async function fetchWeeklyMetrics(userId: string): Promise<WeeklyMetric[]> {
  const rows = await db
    .select({
      weekStart: sql<string>`date_trunc('week', ${workoutSessions.startTime})::date`,
      sessionCount: sql<number>`COUNT(DISTINCT ${workoutSessions.id})`,
      volumeKg: sql<number>`COALESCE(SUM(CAST(${workoutSets.weightKg} AS numeric) * ${workoutSets.actualReps}), 0)`,
    })
    .from(workoutSessions)
    .leftJoin(workoutSets, eq(workoutSets.sessionId, workoutSessions.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.isCompleted, true),
        sql`${workoutSessions.startTime} >= NOW() - interval '8 weeks'`,
      ),
    )
    .groupBy(sql`date_trunc('week', ${workoutSessions.startTime})`)
    .orderBy(asc(sql`date_trunc('week', ${workoutSessions.startTime})`));

  const mapped = rows.map((r) => ({
    weekStart: r.weekStart,
    volumeKg: Number(r.volumeKg),
    sessionCount: Number(r.sessionCount),
  }));

  return fillWeeklyGaps(mapped);
}

async function fetchPersonalRecords(userId: string): Promise<PersonalRecord[]> {
  const rows = await db
    .select({
      exerciseId: exercises.id,
      exerciseName: exercises.name,
      muscleGroup: exercises.muscleGroup,
      maxWeightKg: sql<number>`MAX(CAST(${workoutSets.weightKg} AS numeric))`,
    })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.isCompleted, true),
        sql`CAST(${workoutSets.weightKg} AS numeric) > 0`,
      ),
    )
    .groupBy(exercises.id, exercises.name, exercises.muscleGroup)
    .orderBy(desc(sql`MAX(CAST(${workoutSets.weightKg} AS numeric))`))
    .limit(20);

  return rows.map((r) => ({
    exerciseId: r.exerciseId,
    exerciseName: r.exerciseName,
    muscleGroup: r.muscleGroup ?? null,
    maxWeightKg: Number(r.maxWeightKg),
  }));
}

async function fetchMuscleBalance(userId: string): Promise<MuscleBalance[]> {
  const rows = await db
    .select({
      muscleGroup: exercises.muscleGroup,
      setCount: sql<number>`COUNT(${workoutSets.id})`,
    })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.isCompleted, true),
        sql`${workoutSessions.startTime} >= NOW() - interval '28 days'`,
        isNotNull(exercises.muscleGroup),
      ),
    )
    .groupBy(exercises.muscleGroup)
    .orderBy(desc(sql`COUNT(${workoutSets.id})`));

  return rows
    .filter((r) => r.muscleGroup !== null)
    .map((r) => ({
      muscleGroup: r.muscleGroup!,
      setCount: Number(r.setCount),
    }));
}

// ── Exported actions ───────────────────────────────────────────────────────

export async function getMetricsData(
  userId: string,
): Promise<ActionResult<MetricsData>> {
  try {
    const [weekly, personalRecords, muscleBalance] = await Promise.all([
      fetchWeeklyMetrics(userId),
      fetchPersonalRecords(userId),
      fetchMuscleBalance(userId),
    ]);
    return { success: true, data: { weekly, personalRecords, muscleBalance } };
  } catch (err) {
    console.error("getMetricsData failed:", err);
    return { success: false, error: "Failed to load metrics" };
  }
}

export async function getExerciseProgress(
  userId: string,
  exerciseId: number,
): Promise<ActionResult<ExerciseProgress[]>> {
  try {
    const rows = await db
      .select({
        date: workoutSessions.date,
        maxWeightKg: sql<number>`MAX(CAST(${workoutSets.weightKg} AS numeric))`,
      })
      .from(workoutSets)
      .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
      .where(
        and(
          eq(workoutSessions.userId, userId),
          eq(workoutSessions.isCompleted, true),
          eq(workoutSets.exerciseId, exerciseId),
          sql`CAST(${workoutSets.weightKg} AS numeric) > 0`,
        ),
      )
      .groupBy(workoutSessions.date)
      .orderBy(asc(workoutSessions.date))
      .limit(16);

    return {
      success: true,
      data: rows.map((r) => ({
        date: r.date,
        maxWeightKg: Number(r.maxWeightKg),
      })),
    };
  } catch (err) {
    console.error("getExerciseProgress failed:", err);
    return { success: false, error: "Failed to load progress" };
  }
}
