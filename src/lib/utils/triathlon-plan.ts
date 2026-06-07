/**
 * Triathlon plan generator — pure blueprint builder (no DB access, fully testable).
 *
 * Produces one weekly template (7 day-of-week slots) mixing swim / bike / run
 * with two maintenance strength days. The distances picked are the *peak*
 * (race-prep) week; each endurance set stores that peak so the active cycle's
 * periodization (see periodization.ts) can scale the week-to-week volume —
 * Base → Build → Peak → Taper for "build", flat for "maintain". Endurance uses
 * `manual` progression because the periodization curve, not reactive
 * +increment suggestions, drives the load. Strength stays maintenance.
 */

import { periodizedLoad, scaledDistance, type TrainingGoal } from "@/lib/utils/periodization";

export type PlanProgressionMode = "manual" | "distance";

export type PlanSet = {
  targetReps?: number;
  weightKg?: number;
  distanceMeters?: number;
  /** Peak (race-prep) distance this endurance set ramps toward. */
  peakDistanceMeters?: number;
  durationSeconds?: number;
  restTimeSeconds: number;
};

export type PlanExercise = {
  /** Exercise name — resolved to an exercises row at persist time. */
  name: string;
  progressionMode: PlanProgressionMode;
  /** Doubles as the meters increment for distance mode (see programExercises). */
  overloadIncrementReps: number;
  sets: PlanSet[];
};

export type PlanDay = {
  /** 1 = Monday … 7 = Sunday. */
  dayOfWeek: number;
  /** Program name for this day. */
  label: string;
  /** Empty = rest day (no program created for this slot). */
  exercises: PlanExercise[];
};

export type PlanBlueprint = {
  cycleName: string;
  durationWeeks: number;
  goal: TrainingGoal;
  days: PlanDay[];
};

export type BuildTriathlonPlanParams = {
  /** Desired length; snapped to the nearest cycle-supported value. */
  weeks: number;
  /** 1 = Monday … 7 = Sunday. The session on this day becomes a rest day. */
  restDay?: number;
  /** "build" ramps to a race peak then tapers; "maintain" holds flat. Default "build". */
  goal?: TrainingGoal;
};

const ALLOWED_WEEKS = [4, 6, 8, 10, 12, 16, 24, 36, 52];

/** Snap an arbitrary week count to the nearest cycle-supported value. */
export function snapWeeks(weeks: number): number {
  return ALLOWED_WEEKS.reduce((best, v) =>
    Math.abs(v - weeks) < Math.abs(best - weeks) ? v : best,
  );
}

function strengthSet(): PlanSet {
  return { targetReps: 5, weightKg: 0, restTimeSeconds: 120 };
}

function strengthExercise(name: string): PlanExercise {
  return { name, progressionMode: "manual", overloadIncrementReps: 0, sets: [strengthSet(), strengthSet(), strengthSet()] };
}

/**
 * Build a balanced Triathlon week. The `peakMeters` is the race-prep volume; the
 * stored `distanceMeters` is the week-1 prescription (scaled by the periodization
 * curve) and `peakDistanceMeters` is the anchor the active cycle ramps toward.
 * Two strength days (Mon/Fri) keep muscle; Saturday is a bike→run brick.
 */
export function buildTriathlonPlan({ weeks, restDay, goal = "build" }: BuildTriathlonPlanParams): PlanBlueprint {
  const durationWeeks = snapWeeks(weeks);
  const week1Multiplier = periodizedLoad(1, durationWeeks, goal).multiplier;

  const endurance = (name: string, peakMeters: number): PlanExercise => ({
    name,
    progressionMode: "manual",
    overloadIncrementReps: 0,
    sets: [
      {
        distanceMeters: scaledDistance(peakMeters, week1Multiplier),
        peakDistanceMeters: peakMeters,
        restTimeSeconds: 0,
      },
    ],
  });

  const days: PlanDay[] = [
    {
      dayOfWeek: 1,
      label: "Strength — Full Body A",
      exercises: [strengthExercise("Squat"), strengthExercise("Bench Press"), strengthExercise("Barbell Row")],
    },
    {
      dayOfWeek: 2,
      label: "Run — Tempo",
      exercises: [endurance("Run", 5000)],
    },
    {
      dayOfWeek: 3,
      label: "Swim — Endurance",
      exercises: [endurance("Swim", 1500)],
    },
    {
      dayOfWeek: 4,
      label: "Bike — Endurance",
      exercises: [endurance("Bike", 40000)],
    },
    {
      dayOfWeek: 5,
      label: "Strength B + Swim",
      exercises: [
        strengthExercise("Deadlift"),
        strengthExercise("Overhead Press"),
        strengthExercise("Pull-up"),
        endurance("Swim", 1000),
      ],
    },
    {
      dayOfWeek: 6,
      label: "Long Bike + Brick Run",
      exercises: [endurance("Bike", 90000), endurance("Run", 5000)],
    },
    {
      dayOfWeek: 7,
      label: "Long Run",
      exercises: [endurance("Run", 15000)],
    },
  ];

  if (restDay != null) {
    const target = days.find((d) => d.dayOfWeek === restDay);
    if (target) {
      target.label = "Rest";
      target.exercises = [];
    }
  }

  const goalLabel = goal === "maintain" ? "Maintain" : "Build";
  return { cycleName: `Triathlon ${goalLabel} — ${durationWeeks} wk`, durationWeeks, goal, days };
}

/** Distinct exercises referenced by a blueprint, in first-seen order. */
export function planExerciseNames(plan: PlanBlueprint): string[] {
  const seen = new Set<string>();
  for (const day of plan.days) {
    for (const ex of day.exercises) seen.add(ex.name);
  }
  return [...seen];
}
