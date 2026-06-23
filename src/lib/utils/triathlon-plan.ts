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

import {
  deloadCadenceForLevel,
  periodizedLoad,
  scaledDistance,
  type AthleteLevel,
  type TrainingGoal,
} from "@/lib/utils/periodization";

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
  level: AthleteLevel;
  days: PlanDay[];
};

export type BuildTriathlonPlanParams = {
  /** Desired length; snapped to the nearest cycle-supported value. */
  weeks: number;
  /** 1 = Monday … 7 = Sunday. The session on this day becomes a rest day. */
  restDay?: number;
  /** "build" ramps to a race peak then tapers; "maintain" holds flat. Default "build". */
  goal?: TrainingGoal;
  /** Experience tier — scales peak volumes and deload cadence. Default "intermediate". */
  level?: AthleteLevel;
};

const ALLOWED_WEEKS = [4, 6, 8, 10, 12, 16, 24, 36, 52];

/** Peak (race-prep) per-session distances in meters for each endurance slot. */
type PeakVolumes = {
  swimLong: number;
  swimShort: number;
  bikeMid: number;
  bikeLong: number;
  runTempo: number;
  runBrick: number;
  runLong: number;
};

/**
 * Ironman-distance peak volumes per athlete tier. Anchored to the longest-session
 * biological ceilings from the research brief — run ≤ ~30 km, bike ≤ ~180 km,
 * swim ≤ ~4.2 km — since long-session durability, not single-week mileage, is
 * what carries an age-grouper through 140.6. Weekly totals land a touch under the
 * high end of published ranges because this is a fixed two-swim / two-ride /
 * three-run week with no double days; the periodization curve scales every figure
 * below these toward race week. The brick run is held short (15–30 min) by design.
 */
const PEAK_VOLUMES: Record<AthleteLevel, PeakVolumes> = {
  novice:       { swimLong: 3000, swimShort: 1500, bikeMid: 40000, bikeLong: 90000,  runTempo: 6000,  runBrick: 3000, runLong: 18000 },
  intermediate: { swimLong: 3800, swimShort: 2000, bikeMid: 50000, bikeLong: 130000, runTempo: 8000,  runBrick: 4000, runLong: 26000 },
  advanced:     { swimLong: 4200, swimShort: 2500, bikeMid: 60000, bikeLong: 160000, runTempo: 10000, runBrick: 5000, runLong: 30000 },
};

const LEVEL_LABELS: Record<AthleteLevel, string> = {
  novice: "Novice",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

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
export function buildTriathlonPlan({ weeks, restDay, goal = "build", level = "intermediate" }: BuildTriathlonPlanParams): PlanBlueprint {
  const durationWeeks = snapWeeks(weeks);
  const week1Multiplier = periodizedLoad(1, durationWeeks, goal, deloadCadenceForLevel(level)).multiplier;
  const v = PEAK_VOLUMES[level];

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
      exercises: [endurance("Run", v.runTempo)],
    },
    {
      dayOfWeek: 3,
      label: "Swim — Endurance",
      exercises: [endurance("Swim", v.swimLong)],
    },
    {
      dayOfWeek: 4,
      label: "Bike — Endurance",
      exercises: [endurance("Bike", v.bikeMid)],
    },
    {
      dayOfWeek: 5,
      label: "Strength B + Swim",
      exercises: [
        strengthExercise("Deadlift"),
        strengthExercise("Overhead Press"),
        strengthExercise("Pull-up"),
        endurance("Swim", v.swimShort),
      ],
    },
    {
      dayOfWeek: 6,
      label: "Long Bike + Brick Run",
      exercises: [endurance("Bike", v.bikeLong), endurance("Run", v.runBrick)],
    },
    {
      dayOfWeek: 7,
      label: "Long Run",
      exercises: [endurance("Run", v.runLong)],
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
  return {
    cycleName: `Triathlon ${goalLabel} · ${LEVEL_LABELS[level]} — ${durationWeeks} wk`,
    durationWeeks,
    goal,
    level,
    days,
  };
}

/** Distinct exercises referenced by a blueprint, in first-seen order. */
export function planExerciseNames(plan: PlanBlueprint): string[] {
  const seen = new Set<string>();
  for (const day of plan.days) {
    for (const ex of day.exercises) seen.add(ex.name);
  }
  return [...seen];
}
