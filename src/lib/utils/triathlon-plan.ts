/**
 * Triathlon plan generator — pure blueprint builder (no DB access, fully testable).
 *
 * Produces a single progressive weekly template (7 day-of-week slots) that mixes
 * swim / bike / run with two maintenance strength days. The training-cycle model
 * repeats this one weekly template across `durationWeeks`; week-to-week volume
 * ramp is handled by the app's existing time/distance progression engine, which
 * is why each endurance exercise carries a progressionMode + increment.
 *
 * See BACKLOG.md for the deferred "true periodization (phase blocks + taper)".
 */

export type PlanProgressionMode = "manual" | "distance";

export type PlanSet = {
  targetReps?: number;
  weightKg?: number;
  distanceMeters?: number;
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
  days: PlanDay[];
};

export type BuildTriathlonPlanParams = {
  /** Desired length; snapped to the nearest cycle-supported value. */
  weeks: number;
  /** 1 = Monday … 7 = Sunday. The session on this day becomes a rest day. */
  restDay?: number;
};

const ALLOWED_WEEKS = [4, 6, 8, 10, 12, 16];

/** Snap an arbitrary week count to the nearest cycle-supported value. */
export function snapWeeks(weeks: number): number {
  return ALLOWED_WEEKS.reduce((best, v) =>
    Math.abs(v - weeks) < Math.abs(best - weeks) ? v : best,
  );
}

function strengthSet(): PlanSet {
  return { targetReps: 5, weightKg: 0, restTimeSeconds: 120 };
}

function enduranceSet(distanceMeters: number): PlanSet {
  return { distanceMeters, restTimeSeconds: 0 };
}

function strengthExercise(name: string): PlanExercise {
  return { name, progressionMode: "manual", overloadIncrementReps: 0, sets: [strengthSet(), strengthSet(), strengthSet()] };
}

function enduranceExercise(name: string, distanceMeters: number, incrementMeters: number): PlanExercise {
  return {
    name,
    progressionMode: "distance",
    overloadIncrementReps: incrementMeters,
    sets: [enduranceSet(distanceMeters)],
  };
}

/**
 * Build a balanced Triathlon base week. Two strength days (Mon/Fri) keep muscle
 * mass; Saturday is a bike→run brick (one session, two exercises).
 */
export function buildTriathlonPlan({ weeks, restDay }: BuildTriathlonPlanParams): PlanBlueprint {
  const durationWeeks = snapWeeks(weeks);

  const days: PlanDay[] = [
    {
      dayOfWeek: 1,
      label: "Strength — Full Body A",
      exercises: [strengthExercise("Squat"), strengthExercise("Bench Press"), strengthExercise("Barbell Row")],
    },
    {
      dayOfWeek: 2,
      label: "Run — Tempo",
      exercises: [enduranceExercise("Run", 5000, 500)],
    },
    {
      dayOfWeek: 3,
      label: "Swim — Endurance",
      exercises: [enduranceExercise("Swim", 1500, 100)],
    },
    {
      dayOfWeek: 4,
      label: "Bike — Endurance",
      exercises: [enduranceExercise("Bike", 40000, 2000)],
    },
    {
      dayOfWeek: 5,
      label: "Strength B + Swim",
      exercises: [
        strengthExercise("Deadlift"),
        strengthExercise("Overhead Press"),
        strengthExercise("Pull-up"),
        enduranceExercise("Swim", 1000, 100),
      ],
    },
    {
      dayOfWeek: 6,
      label: "Long Bike + Brick Run",
      exercises: [enduranceExercise("Bike", 90000, 5000), enduranceExercise("Run", 5000, 500)],
    },
    {
      dayOfWeek: 7,
      label: "Long Run",
      exercises: [enduranceExercise("Run", 15000, 1000)],
    },
  ];

  if (restDay != null) {
    const target = days.find((d) => d.dayOfWeek === restDay);
    if (target) {
      target.label = "Rest";
      target.exercises = [];
    }
  }

  return { cycleName: `Triathlon Base — ${durationWeeks} wk`, durationWeeks, days };
}

/** Distinct exercises referenced by a blueprint, in first-seen order. */
export function planExerciseNames(plan: PlanBlueprint): string[] {
  const seen = new Set<string>();
  for (const day of plan.days) {
    for (const ex of day.exercises) seen.add(ex.name);
  }
  return [...seen];
}
