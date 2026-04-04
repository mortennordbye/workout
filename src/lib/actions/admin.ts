"use server";

import { inArray, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  exercises,
  programExercises,
  programSets,
  programs,
  trainingCycleSlots,
  trainingCycles,
  workoutSessions,
  workoutSets,
} from "@/db/schema";
import { ActionResult } from "@/types/workout";

const DEMO_USER_ID = 1;

// ── Helpers ────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function lastMonday(from: Date): Date {
  const d = new Date(from);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

// ── Program definitions ────────────────────────────────────────────────────

type SetBlueprint = {
  setNumber: number;
  targetReps: number;
  weightKg: number;
  restTimeSeconds: number;
};

type ExerciseBlueprint = {
  name: string;
  /** kg added to every set's weight each week (always a multiple of 2.5) */
  weeklyIncrementKg: number;
  sets: SetBlueprint[];
};

type ProgramBlueprint = {
  name: string;
  exercises: ExerciseBlueprint[];
};

const FAKE_PROGRAMS: ProgramBlueprint[] = [
  {
    name: "Push Pull Legs A",
    exercises: [
      {
        name: "Bench Press",
        weeklyIncrementKg: 2.5,
        sets: [
          { setNumber: 1, targetReps: 8, weightKg: 80, restTimeSeconds: 90 },
          { setNumber: 2, targetReps: 8, weightKg: 80, restTimeSeconds: 90 },
          { setNumber: 3, targetReps: 8, weightKg: 80, restTimeSeconds: 90 },
          { setNumber: 4, targetReps: 8, weightKg: 80, restTimeSeconds: 90 },
        ],
      },
      {
        name: "Incline Dumbbell Press",
        weeklyIncrementKg: 2.5,
        sets: [
          { setNumber: 1, targetReps: 10, weightKg: 30, restTimeSeconds: 75 },
          { setNumber: 2, targetReps: 10, weightKg: 30, restTimeSeconds: 75 },
          { setNumber: 3, targetReps: 10, weightKg: 30, restTimeSeconds: 75 },
        ],
      },
      {
        name: "Tricep Pushdown",
        weeklyIncrementKg: 2.5,
        sets: [
          { setNumber: 1, targetReps: 12, weightKg: 25, restTimeSeconds: 60 },
          { setNumber: 2, targetReps: 12, weightKg: 25, restTimeSeconds: 60 },
          { setNumber: 3, targetReps: 12, weightKg: 25, restTimeSeconds: 60 },
        ],
      },
    ],
  },
  {
    name: "Upper Body",
    exercises: [
      {
        name: "Pull-up",
        weeklyIncrementKg: 2.5,
        sets: [
          { setNumber: 1, targetReps: 8, weightKg: 0, restTimeSeconds: 90 },
          { setNumber: 2, targetReps: 8, weightKg: 0, restTimeSeconds: 90 },
          { setNumber: 3, targetReps: 8, weightKg: 0, restTimeSeconds: 90 },
        ],
      },
      {
        name: "Barbell Row",
        weeklyIncrementKg: 2.5,
        sets: [
          { setNumber: 1, targetReps: 8, weightKg: 70, restTimeSeconds: 90 },
          { setNumber: 2, targetReps: 8, weightKg: 70, restTimeSeconds: 90 },
          { setNumber: 3, targetReps: 8, weightKg: 70, restTimeSeconds: 90 },
          { setNumber: 4, targetReps: 8, weightKg: 70, restTimeSeconds: 90 },
        ],
      },
      {
        name: "Overhead Press",
        weeklyIncrementKg: 2.5,
        sets: [
          { setNumber: 1, targetReps: 8, weightKg: 50, restTimeSeconds: 90 },
          { setNumber: 2, targetReps: 8, weightKg: 50, restTimeSeconds: 90 },
          { setNumber: 3, targetReps: 8, weightKg: 50, restTimeSeconds: 90 },
        ],
      },
    ],
  },
];

// ── Actions ────────────────────────────────────────────────────────────────

export async function adminResetUserData(): Promise<ActionResult<{ sessions: number; programs: number; cycles: number }>> {
  try {
    const deletedSessions = await db
      .delete(workoutSessions)
      .where(eq(workoutSessions.userId, DEMO_USER_ID))
      .returning({ id: workoutSessions.id });

    const deletedPrograms = await db
      .delete(programs)
      .where(eq(programs.userId, DEMO_USER_ID))
      .returning({ id: programs.id });

    const deletedCycles = await db
      .delete(trainingCycles)
      .where(eq(trainingCycles.userId, DEMO_USER_ID))
      .returning({ id: trainingCycles.id });

    revalidatePath("/", "layout");

    return {
      success: true,
      data: {
        sessions: deletedSessions.length,
        programs: deletedPrograms.length,
        cycles: deletedCycles.length,
      },
    };
  } catch (err) {
    console.error("adminResetUserData failed:", err);
    return { success: false, error: "Failed to reset user data" };
  }
}

export async function adminSeedFakeData(): Promise<ActionResult<{ programs: number; sessions: number }>> {
  try {
    // Fetch exercise IDs by name
    const exerciseNames = FAKE_PROGRAMS.flatMap((p) =>
      p.exercises.map((e) => e.name)
    );
    const exerciseRows = await db
      .select({ id: exercises.id, name: exercises.name })
      .from(exercises)
      .where(inArray(exercises.name, exerciseNames));

    const exerciseIdByName = new Map(exerciseRows.map((e) => [e.name, e.id]));

    // Create programs
    const createdPrograms: Array<{
      id: number;
      blueprint: ProgramBlueprint;
    }> = [];

    for (const blueprint of FAKE_PROGRAMS) {
      const [program] = await db
        .insert(programs)
        .values({ userId: DEMO_USER_ID, name: blueprint.name })
        .returning({ id: programs.id });

      for (let i = 0; i < blueprint.exercises.length; i++) {
        const exBlueprint = blueprint.exercises[i];
        const exerciseId = exerciseIdByName.get(exBlueprint.name);
        if (!exerciseId) continue;

        const [pe] = await db
          .insert(programExercises)
          .values({ programId: program.id, exerciseId, orderIndex: i })
          .returning({ id: programExercises.id });

        await db.insert(programSets).values(
          exBlueprint.sets.map((s) => ({
            programExerciseId: pe.id,
            setNumber: s.setNumber,
            targetReps: s.targetReps,
            weightKg: s.weightKg.toString(),
            restTimeSeconds: s.restTimeSeconds,
          }))
        );
      }

      createdPrograms.push({ id: program.id, blueprint });
    }

    // Create training cycle
    const today = new Date();
    const startDate = addDays(lastMonday(today), -28);

    const pplProgram = createdPrograms.find(
      (p) => p.blueprint.name === "Push Pull Legs A"
    );
    const upperProgram = createdPrograms.find(
      (p) => p.blueprint.name === "Upper Body"
    );

    const [cycle] = await db
      .insert(trainingCycles)
      .values({
        userId: DEMO_USER_ID,
        name: "12-Week Strength Block",
        durationWeeks: 12,
        scheduleType: "day_of_week",
        startDate: toDateString(startDate),
        status: "active",
        endAction: "none",
      })
      .returning({ id: trainingCycles.id });

    if (pplProgram) {
      await db.insert(trainingCycleSlots).values([
        { trainingCycleId: cycle.id, dayOfWeek: 1, programId: pplProgram.id, label: "Push" },
        { trainingCycleId: cycle.id, dayOfWeek: 5, programId: pplProgram.id, label: "Push" },
      ]);
    }
    if (upperProgram) {
      await db.insert(trainingCycleSlots).values([
        { trainingCycleId: cycle.id, dayOfWeek: 3, programId: upperProgram.id, label: "Upper" },
      ]);
    }

    // Create workout sessions (Mon/Wed/Fri over past 4 weeks)
    const monday = lastMonday(today);
    let sessionCount = 0;

    for (let week = 0; week < 4; week++) {
      const weekStart = addDays(monday, -28 + week * 7);
      const dayOffsets = [0, 2, 4];
      const sessionPrograms = [pplProgram, upperProgram, pplProgram];

      for (let d = 0; d < 3; d++) {
        const sessionDate = addDays(weekStart, dayOffsets[d]);
        if (sessionDate >= today) continue;
        const prog = sessionPrograms[d];
        if (!prog) continue;

        const startTime = new Date(sessionDate);
        startTime.setHours(7, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + 60);

        const [session] = await db
          .insert(workoutSessions)
          .values({
            userId: DEMO_USER_ID,
            programId: prog.id,
            date: toDateString(sessionDate),
            startTime,
            endTime,
            isCompleted: true,
          })
          .returning({ id: workoutSessions.id });

        for (const exBlueprint of prog.blueprint.exercises) {
          const exerciseId = exerciseIdByName.get(exBlueprint.name);
          if (!exerciseId) continue;

          for (const setBlueprint of exBlueprint.sets) {
            // Progressive overload: add increment each week, always a clean multiple of 2.5
            const weightKg = setBlueprint.weightKg + week * exBlueprint.weeklyIncrementKg;
            // Reps always hit target; occasionally +1 when weights are lighter (early weeks)
            const actualReps = setBlueprint.targetReps + (week < 2 && Math.random() < 0.25 ? 1 : 0);
            const rpe = 6 + week + (Math.random() < 0.4 ? 1 : 0); // harder as weeks progress

            await db.insert(workoutSets).values({
              sessionId: session.id,
              exerciseId,
              setNumber: setBlueprint.setNumber,
              targetReps: setBlueprint.targetReps,
              actualReps,
              weightKg: weightKg.toString(),
              rpe,
              restTimeSeconds: setBlueprint.restTimeSeconds,
              isCompleted: true,
            });
          }
        }

        sessionCount++;
      }
    }

    revalidatePath("/", "layout");

    return {
      success: true,
      data: { programs: createdPrograms.length, sessions: sessionCount },
    };
  } catch (err) {
    console.error("adminSeedFakeData failed:", err);
    return { success: false, error: "Failed to seed fake data" };
  }
}
