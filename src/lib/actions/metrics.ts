"use server";

import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { exercises, trainingCycles, workoutSessions, workoutSets } from "@/db/schema";
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

export type MoodDistribution = {
  feeling: "Tired" | "OK" | "Good" | "Awesome";
  count: number;
};

export type ExerciseProgress = {
  date: string;
  maxWeightKg: number;
  repsAtMaxWeight: number;
  totalVolume: number;
};

export type MetricsData = {
  weekly: WeeklyMetric[];
  personalRecords: PersonalRecord[];
  muscleBalance: MuscleBalance[];
  moodDistribution: MoodDistribution[];
};

export type SummaryStats = {
  totalSessions: number;
  currentStreakWeeks: number;
  avgSessionDurationMinutes: number;
  lifetimeVolumeKg: number;
};

export type TopProgressingExercise = {
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string | null;
  gainKg: number;
  gainPct: number;
  current1RM: number;
  baseline1RM: number;
};

export type CyclePickerItem = {
  id: number;
  name: string;
  status: "draft" | "active" | "completed";
  startDate: string | null;
  endDate: string | null;
  durationWeeks: number;
  sessionCount: number;
};

export type RpeTrendPoint = {
  weekStart: string;
  weekIndex: number;
  avgRpe: number | null;
  sessionCount: number;
};

export type CycleSummaryStats = {
  sessionCount: number;
  totalVolumeKg: number;
  avgSessionDurationMinutes: number;
  sessionsPerWeek: number;
};

export type CycleMetrics = {
  summary: CycleSummaryStats;
  weekly: WeeklyMetric[];
  muscleBalance: MuscleBalance[];
  moodDistribution: MoodDistribution[];
  topGains: TopProgressingExercise[];
  rpeTrend: RpeTrendPoint[];
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

/** Counts consecutive weeks with workouts, starting from the most recent week. */
function computeStreakWeeks(weekStarts: string[]): number {
  if (weekStarts.length === 0) return 0;

  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() + diff);
  const currentMondayStr = currentMonday.toISOString().split("T")[0];

  let streak = 0;
  let expectedMonday = currentMondayStr;

  for (const weekStart of weekStarts) {
    if (weekStart === expectedMonday) {
      streak++;
      const d = new Date(expectedMonday + "T00:00:00");
      d.setDate(d.getDate() - 7);
      expectedMonday = d.toISOString().split("T")[0];
    } else if (expectedMonday === currentMondayStr) {
      // Current week not yet trained — try previous week
      const d = new Date(expectedMonday + "T00:00:00");
      d.setDate(d.getDate() - 7);
      expectedMonday = d.toISOString().split("T")[0];
      if (weekStart === expectedMonday) {
        streak++;
        const d2 = new Date(expectedMonday + "T00:00:00");
        d2.setDate(d2.getDate() - 7);
        expectedMonday = d2.toISOString().split("T")[0];
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return streak;
}

/** Returns the ISO date strings for a half-open cycle interval [start, end). */
function getCycleDateRange(
  startDate: string,
  durationWeeks: number,
): { start: string; end: string } {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + durationWeeks * 7);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

/** Snaps a date to the Monday of its ISO week. */
function snapToMonday(d: Date): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon.toISOString().split("T")[0];
}

/** Fills all cycle weeks (exactly durationWeeks buckets, each snapped to Monday). */
function fillCycleWeeks(
  rows: WeeklyMetric[],
  cycleStartDate: string,
  durationWeeks: number,
): WeeklyMetric[] {
  const byWeek = new Map(rows.map((r) => [r.weekStart, r]));
  return Array.from({ length: durationWeeks }, (_, i) => {
    const d = new Date(cycleStartDate + "T00:00:00");
    d.setDate(d.getDate() + i * 7);
    const weekStart = snapToMonday(d);
    return byWeek.get(weekStart) ?? { weekStart, volumeKg: 0, sessionCount: 0 };
  });
}

type TopGainRow = {
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string | null;
  sessionDate: string;
  session1RM: number;
};

/** Shared JS logic: takes per-session 1RM rows and returns top 5 gaining exercises. */
function computeTopGains(rows: TopGainRow[]): TopProgressingExercise[] {
  const byExercise = new Map<
    number,
    { exerciseName: string; muscleGroup: string | null; sessions: { date: string; est1RM: number }[] }
  >();

  for (const row of rows) {
    if (!byExercise.has(row.exerciseId)) {
      byExercise.set(row.exerciseId, {
        exerciseName: row.exerciseName,
        muscleGroup: row.muscleGroup ?? null,
        sessions: [],
      });
    }
    byExercise.get(row.exerciseId)!.sessions.push({
      date: row.sessionDate,
      est1RM: Number(row.session1RM),
    });
  }

  const results: TopProgressingExercise[] = [];
  for (const [exerciseId, info] of byExercise) {
    if (info.sessions.length < 2) continue;
    const baseline1RM = info.sessions[0].est1RM;
    const current1RM = info.sessions[info.sessions.length - 1].est1RM;
    const gainKg = current1RM - baseline1RM;
    if (gainKg <= 0) continue;
    const gainPct = (gainKg / baseline1RM) * 100;
    results.push({
      exerciseId,
      exerciseName: info.exerciseName,
      muscleGroup: info.muscleGroup,
      gainKg: Math.round(gainKg * 10) / 10,
      gainPct: Math.round(gainPct * 10) / 10,
      current1RM: Math.round(current1RM * 10) / 10,
      baseline1RM: Math.round(baseline1RM * 10) / 10,
    });
  }

  return results.sort((a, b) => b.gainPct - a.gainPct).slice(0, 5);
}

// ── All-time queries ───────────────────────────────────────────────────────

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

async function fetchMoodDistribution(userId: string): Promise<MoodDistribution[]> {
  const rows = await db
    .select({
      feeling: workoutSessions.feeling,
      count: sql<number>`COUNT(*)`,
    })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.isCompleted, true),
        isNotNull(workoutSessions.feeling),
        sql`${workoutSessions.startTime} >= NOW() - interval '28 days'`,
      ),
    )
    .groupBy(workoutSessions.feeling)
    .orderBy(desc(sql`COUNT(*)`));

  return rows
    .filter((r) => r.feeling !== null)
    .map((r) => ({
      feeling: r.feeling as "Tired" | "OK" | "Good" | "Awesome",
      count: Number(r.count),
    }));
}

// ── Cycle-scoped queries ───────────────────────────────────────────────────

async function fetchCycleSummary(
  userId: string,
  start: string,
  end: string,
  durationWeeks: number,
): Promise<CycleSummaryStats> {
  const [sessionRow] = await db
    .select({
      sessionCount: sql<number>`COUNT(DISTINCT ${workoutSessions.id})`,
      totalVolumeKg: sql<number>`COALESCE(SUM(CAST(${workoutSets.weightKg} AS numeric) * ${workoutSets.actualReps}), 0)`,
      avgDurationMinutes: sql<number>`AVG(
        EXTRACT(EPOCH FROM (${workoutSessions.endTime} - ${workoutSessions.startTime})) / 60
      )`,
    })
    .from(workoutSessions)
    .leftJoin(workoutSets, eq(workoutSets.sessionId, workoutSessions.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.isCompleted, true),
        isNotNull(workoutSessions.endTime),
        sql`${workoutSessions.date} >= ${start}::date`,
        sql`${workoutSessions.date} < ${end}::date`,
      ),
    );

  const sessionCount = Number(sessionRow?.sessionCount ?? 0);
  return {
    sessionCount,
    totalVolumeKg: Number(sessionRow?.totalVolumeKg ?? 0),
    avgSessionDurationMinutes: Number(sessionRow?.avgDurationMinutes ?? 0),
    sessionsPerWeek: durationWeeks > 0 ? Math.round((sessionCount / durationWeeks) * 10) / 10 : 0,
  };
}

async function fetchCycleWeeklyVolume(
  userId: string,
  start: string,
  end: string,
  cycleStartDate: string,
  durationWeeks: number,
): Promise<WeeklyMetric[]> {
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
        sql`${workoutSessions.date} >= ${start}::date`,
        sql`${workoutSessions.date} < ${end}::date`,
      ),
    )
    .groupBy(sql`date_trunc('week', ${workoutSessions.startTime})`)
    .orderBy(asc(sql`date_trunc('week', ${workoutSessions.startTime})`));

  const mapped = rows.map((r) => ({
    weekStart: r.weekStart,
    volumeKg: Number(r.volumeKg),
    sessionCount: Number(r.sessionCount),
  }));

  return fillCycleWeeks(mapped, cycleStartDate, durationWeeks);
}

async function fetchCycleMuscleBalance(
  userId: string,
  start: string,
  end: string,
): Promise<MuscleBalance[]> {
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
        sql`${workoutSessions.date} >= ${start}::date`,
        sql`${workoutSessions.date} < ${end}::date`,
        isNotNull(exercises.muscleGroup),
      ),
    )
    .groupBy(exercises.muscleGroup)
    .orderBy(desc(sql`COUNT(${workoutSets.id})`));

  return rows
    .filter((r) => r.muscleGroup !== null)
    .map((r) => ({ muscleGroup: r.muscleGroup!, setCount: Number(r.setCount) }));
}

async function fetchCycleMoodDistribution(
  userId: string,
  start: string,
  end: string,
): Promise<MoodDistribution[]> {
  const rows = await db
    .select({
      feeling: workoutSessions.feeling,
      count: sql<number>`COUNT(*)`,
    })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.isCompleted, true),
        isNotNull(workoutSessions.feeling),
        sql`${workoutSessions.date} >= ${start}::date`,
        sql`${workoutSessions.date} < ${end}::date`,
      ),
    )
    .groupBy(workoutSessions.feeling)
    .orderBy(desc(sql`COUNT(*)`));

  return rows
    .filter((r) => r.feeling !== null)
    .map((r) => ({
      feeling: r.feeling as MoodDistribution["feeling"],
      count: Number(r.count),
    }));
}

async function fetchCycleTopGains(
  userId: string,
  start: string,
  end: string,
): Promise<TopProgressingExercise[]> {
  const rows = await db
    .select({
      exerciseId: workoutSets.exerciseId,
      exerciseName: exercises.name,
      muscleGroup: exercises.muscleGroup,
      sessionDate: workoutSessions.date,
      session1RM: sql<number>`MAX(CAST(${workoutSets.weightKg} AS numeric) * (1 + ${workoutSets.actualReps} / 30.0))`,
    })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.isCompleted, true),
        sql`${workoutSessions.date} >= ${start}::date`,
        sql`${workoutSessions.date} < ${end}::date`,
        sql`CAST(${workoutSets.weightKg} AS numeric) > 0`,
        sql`${workoutSets.actualReps} BETWEEN 1 AND 12`,
      ),
    )
    .groupBy(workoutSets.exerciseId, exercises.name, exercises.muscleGroup, workoutSessions.date)
    .orderBy(workoutSets.exerciseId, asc(workoutSessions.date));

  return computeTopGains(
    rows.map((r) => ({
      exerciseId: r.exerciseId,
      exerciseName: r.exerciseName,
      muscleGroup: r.muscleGroup ?? null,
      sessionDate: r.sessionDate,
      session1RM: Number(r.session1RM),
    })),
  );
}

async function fetchCycleRpeTrend(
  userId: string,
  start: string,
  end: string,
  cycleStartDate: string,
  durationWeeks: number,
): Promise<RpeTrendPoint[]> {
  const rows = await db
    .select({
      weekStart: sql<string>`date_trunc('week', ${workoutSessions.startTime})::date`,
      avgRpe: sql<number>`AVG(CAST(${workoutSets.rpe} AS numeric))`,
      sessionCount: sql<number>`COUNT(DISTINCT ${workoutSessions.id})`,
    })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.isCompleted, true),
        sql`${workoutSessions.date} >= ${start}::date`,
        sql`${workoutSessions.date} < ${end}::date`,
        sql`${workoutSets.rpe} > 0`,
      ),
    )
    .groupBy(sql`date_trunc('week', ${workoutSessions.startTime})`)
    .orderBy(asc(sql`date_trunc('week', ${workoutSessions.startTime})`));

  const byWeek = new Map(rows.map((r) => [r.weekStart, r]));

  return Array.from({ length: durationWeeks }, (_, i) => {
    const d = new Date(cycleStartDate + "T00:00:00");
    d.setDate(d.getDate() + i * 7);
    const weekStart = snapToMonday(d);
    const row = byWeek.get(weekStart);
    return {
      weekStart,
      weekIndex: i + 1,
      avgRpe: row ? Math.round(Number(row.avgRpe) * 10) / 10 : null,
      sessionCount: row ? Number(row.sessionCount) : 0,
    };
  });
}

// ── Exported actions ───────────────────────────────────────────────────────

export async function getMetricsData(
  userId: string,
): Promise<ActionResult<MetricsData>> {
  try {
    const [weekly, personalRecords, muscleBalance, moodDistribution] =
      await Promise.all([
        fetchWeeklyMetrics(userId),
        fetchPersonalRecords(userId),
        fetchMuscleBalance(userId),
        fetchMoodDistribution(userId),
      ]);
    return {
      success: true,
      data: { weekly, personalRecords, muscleBalance, moodDistribution },
    };
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
        repsAtMaxWeight: sql<number>`(
          SELECT ws2.actual_reps
          FROM workout_sets ws2
          WHERE ws2.session_id = ${workoutSessions.id}
            AND ws2.exercise_id = ${exerciseId}
            AND CAST(ws2.weight_kg AS numeric) = MAX(CAST(${workoutSets.weightKg} AS numeric))
          ORDER BY ws2.id ASC
          LIMIT 1
        )`,
        totalVolume: sql<number>`SUM(CAST(${workoutSets.weightKg} AS numeric) * ${workoutSets.actualReps})`,
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
      .groupBy(workoutSessions.date, workoutSessions.id)
      .orderBy(asc(workoutSessions.date))
      .limit(16);

    return {
      success: true,
      data: rows.map((r) => ({
        date: r.date,
        maxWeightKg: Number(r.maxWeightKg),
        repsAtMaxWeight: Number(r.repsAtMaxWeight ?? 1),
        totalVolume: Number(r.totalVolume),
      })),
    };
  } catch (err) {
    console.error("getExerciseProgress failed:", err);
    return { success: false, error: "Failed to load progress" };
  }
}

export async function getSummaryStats(
  userId: string,
): Promise<ActionResult<SummaryStats>> {
  try {
    const [sessionRows, volumeRows, weekRows] = await Promise.all([
      db
        .select({
          totalSessions: sql<number>`COUNT(*)`,
          avgDurationMinutes: sql<number>`AVG(
            EXTRACT(EPOCH FROM (${workoutSessions.endTime} - ${workoutSessions.startTime})) / 60
          )`,
        })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, userId),
            eq(workoutSessions.isCompleted, true),
            isNotNull(workoutSessions.endTime),
          ),
        ),

      db
        .select({
          lifetimeVolumeKg: sql<number>`COALESCE(SUM(CAST(${workoutSets.weightKg} AS numeric) * ${workoutSets.actualReps}), 0)`,
        })
        .from(workoutSets)
        .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
        .where(
          and(
            eq(workoutSessions.userId, userId),
            eq(workoutSessions.isCompleted, true),
          ),
        ),

      db
        .select({
          weekStart: sql<string>`date_trunc('week', ${workoutSessions.startTime})::date`,
        })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, userId),
            eq(workoutSessions.isCompleted, true),
            sql`${workoutSessions.startTime} >= NOW() - interval '52 weeks'`,
          ),
        )
        .groupBy(sql`date_trunc('week', ${workoutSessions.startTime})`)
        .orderBy(desc(sql`date_trunc('week', ${workoutSessions.startTime})`)),
    ]);

    const sessionRow = sessionRows[0];
    const volumeRow = volumeRows[0];

    return {
      success: true,
      data: {
        totalSessions: Number(sessionRow?.totalSessions ?? 0),
        avgSessionDurationMinutes: Number(sessionRow?.avgDurationMinutes ?? 0),
        lifetimeVolumeKg: Number(volumeRow?.lifetimeVolumeKg ?? 0),
        currentStreakWeeks: computeStreakWeeks(weekRows.map((r) => r.weekStart)),
      },
    };
  } catch (err) {
    console.error("getSummaryStats failed:", err);
    return { success: false, error: "Failed to load summary stats" };
  }
}

export async function getTopProgressingExercises(
  userId: string,
): Promise<ActionResult<TopProgressingExercise[]>> {
  try {
    const rows = await db
      .select({
        exerciseId: workoutSets.exerciseId,
        exerciseName: exercises.name,
        muscleGroup: exercises.muscleGroup,
        sessionDate: workoutSessions.date,
        session1RM: sql<number>`MAX(CAST(${workoutSets.weightKg} AS numeric) * (1 + ${workoutSets.actualReps} / 30.0))`,
      })
      .from(workoutSets)
      .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
      .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
      .where(
        and(
          eq(workoutSessions.userId, userId),
          eq(workoutSessions.isCompleted, true),
          sql`${workoutSessions.startTime} >= NOW() - interval '8 weeks'`,
          sql`CAST(${workoutSets.weightKg} AS numeric) > 0`,
          sql`${workoutSets.actualReps} BETWEEN 1 AND 12`,
        ),
      )
      .groupBy(
        workoutSets.exerciseId,
        exercises.name,
        exercises.muscleGroup,
        workoutSessions.date,
      )
      .orderBy(workoutSets.exerciseId, asc(workoutSessions.date));

    return {
      success: true,
      data: computeTopGains(
        rows.map((r) => ({
          exerciseId: r.exerciseId,
          exerciseName: r.exerciseName,
          muscleGroup: r.muscleGroup ?? null,
          sessionDate: r.sessionDate,
          session1RM: Number(r.session1RM),
        })),
      ),
    };
  } catch (err) {
    console.error("getTopProgressingExercises failed:", err);
    return { success: false, error: "Failed to load progression data" };
  }
}

export async function getMetricsCycles(
  userId: string,
): Promise<ActionResult<CyclePickerItem[]>> {
  try {
    const rows = await db
      .select({
        id: trainingCycles.id,
        name: trainingCycles.name,
        status: trainingCycles.status,
        startDate: trainingCycles.startDate,
        durationWeeks: trainingCycles.durationWeeks,
        sessionCount: sql<number>`COUNT(${workoutSessions.id})`,
      })
      .from(trainingCycles)
      .leftJoin(
        workoutSessions,
        and(
          eq(workoutSessions.userId, trainingCycles.userId),
          eq(workoutSessions.isCompleted, true),
          sql`${workoutSessions.date} >= ${trainingCycles.startDate}`,
          sql`${workoutSessions.date} < ${trainingCycles.startDate}::date + (${trainingCycles.durationWeeks} * 7 * interval '1 day')`,
        ),
      )
      .where(eq(trainingCycles.userId, userId))
      .groupBy(
        trainingCycles.id,
        trainingCycles.name,
        trainingCycles.status,
        trainingCycles.startDate,
        trainingCycles.durationWeeks,
      )
      .orderBy(
        sql`CASE ${trainingCycles.status} WHEN 'active' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END`,
        desc(trainingCycles.startDate),
      );

    return {
      success: true,
      data: rows.map((r) => {
        const endDate = r.startDate
          ? (() => {
              const d = new Date(r.startDate + "T00:00:00");
              d.setDate(d.getDate() + r.durationWeeks * 7);
              return d.toISOString().split("T")[0];
            })()
          : null;
        return {
          id: r.id,
          name: r.name,
          status: r.status,
          startDate: r.startDate ?? null,
          endDate,
          durationWeeks: r.durationWeeks,
          sessionCount: Number(r.sessionCount),
        };
      }),
    };
  } catch (err) {
    console.error("getMetricsCycles failed:", err);
    return { success: false, error: "Failed to load cycles" };
  }
}

export async function getCycleMetrics(
  userId: string,
  cycleId: number,
): Promise<ActionResult<CycleMetrics>> {
  const emptyCycleMetrics: CycleMetrics = {
    summary: { sessionCount: 0, totalVolumeKg: 0, avgSessionDurationMinutes: 0, sessionsPerWeek: 0 },
    weekly: [],
    muscleBalance: [],
    moodDistribution: [],
    topGains: [],
    rpeTrend: [],
  };

  try {
    const cycleRows = await db
      .select({
        startDate: trainingCycles.startDate,
        durationWeeks: trainingCycles.durationWeeks,
      })
      .from(trainingCycles)
      .where(and(eq(trainingCycles.id, cycleId), eq(trainingCycles.userId, userId)));

    const cycleRow = cycleRows[0] ?? null;

    if (!cycleRow || !cycleRow.startDate) {
      return { success: true, data: emptyCycleMetrics };
    }

    const { start, end } = getCycleDateRange(cycleRow.startDate, cycleRow.durationWeeks);

    const [summary, weekly, muscleBalance, moodDistribution, topGains, rpeTrend] =
      await Promise.all([
        fetchCycleSummary(userId, start, end, cycleRow.durationWeeks),
        fetchCycleWeeklyVolume(userId, start, end, cycleRow.startDate, cycleRow.durationWeeks),
        fetchCycleMuscleBalance(userId, start, end),
        fetchCycleMoodDistribution(userId, start, end),
        fetchCycleTopGains(userId, start, end),
        fetchCycleRpeTrend(userId, start, end, cycleRow.startDate, cycleRow.durationWeeks),
      ]);

    return { success: true, data: { summary, weekly, muscleBalance, moodDistribution, topGains, rpeTrend } };
  } catch (err) {
    console.error("getCycleMetrics failed:", err);
    return { success: false, error: "Failed to load cycle metrics" };
  }
}
