/**
 * Triathlon plan generator — pure blueprint builder (no DB access, fully testable).
 *
 * Produces one weekly template (7 day-of-week slots) mixing swim / bike / run
 * with two maintenance strength days. The distances picked are the *peak*
 * (race-prep) week; each endurance set stores that peak so the active cycle's
 * periodization (see periodization.ts) can scale the week-to-week volume —
 * Base → Build → Peak → Taper for "build", flat for "maintain". Endurance uses
 * `manual` progression because the periodization curve, not reactive
 * +increment suggestions, drives the load.
 *
 * Strength is two science-based sessions for endurance athletes: heavy,
 * lower-body and posterior-chain compound lifts plus plyometrics — the movements
 * the literature ties to swim/bike/run economy, not bench-press hypertrophy. The
 * main lifts are tagged sessionRole = "strength" so the active cycle periodizes
 * their reps/rest by phase (see strengthPhaseRecipe); plyometric and core work is
 * held constant.
 */

import {
  deloadCadenceForLevel,
  periodizedLoad,
  scaledDistance,
  strengthPhaseRecipe,
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
  /** Target HR zone (1–5) — drives the polarized 80/20 intensity prescription. */
  targetHeartRateZone?: number;
  /** "work" = a hard interval rep the active cycle phase-swaps (zone/rest) by block phase. */
  sessionRole?: string;
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

/** Working sets per main strength lift — held constant; reps/rest carry the phase. */
const STRENGTH_SETS = 3;

/**
 * Build a balanced Triathlon week. The `peakMeters` is the race-prep volume; the
 * stored `distanceMeters` is the week-1 prescription (scaled by the periodization
 * curve) and `peakDistanceMeters` is the anchor the active cycle ramps toward.
 * Two strength days (Mon/Fri) keep muscle; Saturday is a bike→run brick.
 */
export function buildTriathlonPlan({ weeks, restDay, goal = "build", level = "intermediate" }: BuildTriathlonPlanParams): PlanBlueprint {
  const durationWeeks = snapWeeks(weeks);
  const week1Load = periodizedLoad(1, durationWeeks, goal, deloadCadenceForLevel(level));
  const week1Multiplier = week1Load.multiplier;
  const v = PEAK_VOLUMES[level];

  // Week-1 strength prescription for the main lifts. The active cycle re-prescribes
  // reps/rest every week by phase (see strengthPhaseRecipe); this is just the start.
  const strength = strengthPhaseRecipe(week1Load.phase);

  // A periodized main barbell lift: STRENGTH_SETS working sets, reps/rest from the
  // current phase, weight left at 0 for the athlete to load to the target reps.
  // Tagged sessionRole "strength" so the weekly sync periodizes it.
  const mainLift = (name: string): PlanExercise => ({
    name,
    progressionMode: "manual",
    overloadIncrementReps: 0,
    sets: Array.from({ length: STRENGTH_SETS }, () => ({
      targetReps: strength.reps,
      weightKg: 0,
      restTimeSeconds: strength.restSeconds,
      sessionRole: "strength",
    })),
  });

  // A fixed accessory — plyometric (running economy) or core. Not periodized:
  // jumps stay explosive and low-rep, core stays moderate, all block long.
  const accessory = (name: string, sets: number, reps: number, restSeconds: number): PlanExercise => ({
    name,
    progressionMode: "manual",
    overloadIncrementReps: 0,
    sets: Array.from({ length: sets }, () => ({ targetReps: reps, weightKg: 0, restTimeSeconds: restSeconds })),
  });

  // Each session is built from structured segments — not one distance blob — so it
  // reads like a real workout. Easy Z2 warmup/cooldown bracket the work; the single
  // weekly quality run is genuine Z4 threshold intervals (you don't run 8 km flat
  // out), and the endurance swim is broken into repeats to hold stroke mechanics.
  // Polarized 80/20: only the interval reps are Z4, everything else easy Z2 —
  // keeping the athlete out of the Z3 "grey zone" the research brief warns against.
  const Z2 = 2;
  const Z4 = 4;

  type Segment = { meters: number; zone: number; restSeconds: number; role?: string };
  const sessionFrom = (name: string, segments: Segment[]): PlanExercise => ({
    name,
    progressionMode: "manual",
    overloadIncrementReps: 0,
    sets: segments.map((s) => ({
      distanceMeters: scaledDistance(s.meters, week1Multiplier),
      peakDistanceMeters: s.meters,
      targetHeartRateZone: s.zone,
      sessionRole: s.role,
      restTimeSeconds: s.restSeconds,
    })),
  });

  // Steady continuous aerobic effort — one easy Z2 set (long ride/run, recovery swim).
  const steady = (name: string, peakMeters: number): PlanExercise =>
    sessionFrom(name, [{ meters: peakMeters, zone: Z2, restSeconds: 0 }]);

  // Round a segment to a clean 100 m step so prescriptions read nicely and a
  // maintain week (multiplier 1.0) lands exactly on the peak anchor.
  const r100 = (m: number) => Math.max(100, Math.round(m / 100) * 100);

  // Threshold-interval run: Z2 warmup, `reps` hard Z4 efforts with jog recovery,
  // Z2 cooldown. Distances ≈ the session's peak so periodization/level scaling
  // are unchanged; each segment carries its own peak anchor.
  const intervalRun = (name: string, peakMeters: number, reps: number): PlanExercise => {
    const warm = r100(peakMeters * 0.2);
    const cool = r100(peakMeters * 0.15);
    const per = r100((peakMeters - warm - cool) / reps);
    return sessionFrom(name, [
      { meters: warm, zone: Z2, restSeconds: 90 },
      ...Array.from({ length: reps }, () => ({ meters: per, zone: Z4, restSeconds: 120, role: "work" })),
      { meters: cool, zone: Z2, restSeconds: 0 },
    ]);
  };

  // Endurance swim broken into Z2 repeats (vs one continuous blob) with short rest.
  const swimEndurance = (name: string, peakMeters: number, reps: number): PlanExercise => {
    const warm = r100(peakMeters * 0.12);
    const cool = r100(peakMeters * 0.12);
    const per = r100((peakMeters - warm - cool) / reps);
    return sessionFrom(name, [
      { meters: warm, zone: Z2, restSeconds: 30 },
      ...Array.from({ length: reps }, () => ({ meters: per, zone: Z2, restSeconds: 20 })),
      { meters: cool, zone: Z2, restSeconds: 0 },
    ]);
  };

  const days: PlanDay[] = [
    {
      dayOfWeek: 1,
      label: "Strength A — Lower Body",
      // Squat (knee-dominant) + RDL (hip hinge / posterior chain) are the heavy,
      // periodized mains; box jumps add reactive power for run economy; the Pallof
      // press trains the anti-rotation trunk stability all three disciplines need.
      exercises: [
        mainLift("Squat"),
        mainLift("Romanian Deadlift"),
        accessory("Box Jump", 4, 3, 120),
        accessory("Pallof Press", 3, 10, 60),
      ],
    },
    {
      dayOfWeek: 2,
      label: "Run — Threshold Intervals",
      exercises: [intervalRun("Run", v.runTempo, 4)],
    },
    {
      dayOfWeek: 3,
      label: "Swim — Endurance",
      exercises: [swimEndurance("Swim", v.swimLong, 5)],
    },
    {
      dayOfWeek: 4,
      label: "Bike — Endurance",
      exercises: [steady("Bike", v.bikeMid)],
    },
    {
      dayOfWeek: 5,
      label: "Strength B + Recovery Swim",
      // Hip thrust (glute/hip power for bike & run) + Bulgarian split squat
      // (unilateral, exposes left/right imbalance) are the periodized mains; pogo
      // hops train ankle/Achilles stiffness for run economy; one pull-up keeps the
      // swim's pulling muscles and posture balanced. Closes with an easy recovery swim.
      exercises: [
        mainLift("Hip Thrust"),
        mainLift("Bulgarian Split Squat"),
        accessory("Pogo Hops", 3, 12, 90),
        accessory("Pull-up", 3, 6, 120),
        steady("Swim", v.swimShort),
      ],
    },
    {
      dayOfWeek: 6,
      label: "Long Bike + Brick Run",
      exercises: [steady("Bike", v.bikeLong), steady("Run", v.runBrick)],
    },
    {
      dayOfWeek: 7,
      label: "Long Run",
      exercises: [steady("Run", v.runLong)],
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
