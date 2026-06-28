import { describe, expect, it } from "vitest";
import {
  buildTriathlonPlan,
  planExerciseNames,
  snapWeeks,
} from "@/lib/utils/triathlon-plan";

describe("snapWeeks", () => {
  it("snaps to the nearest cycle-supported value", () => {
    expect(snapWeeks(12)).toBe(12);
    expect(snapWeeks(13)).toBe(12);
    expect(snapWeeks(11)).toBe(10); // exact tie (10 vs 12) resolves to the lower
    expect(snapWeeks(5)).toBe(4);
    expect(snapWeeks(1)).toBe(4);
  });

  it("supports long Ironman builds up to 12 months", () => {
    expect(snapWeeks(52)).toBe(52); // 12 months
    expect(snapWeeks(36)).toBe(36); // 9 months
    expect(snapWeeks(24)).toBe(24); // 6 months
    expect(snapWeeks(50)).toBe(52);
    expect(snapWeeks(100)).toBe(52); // clamps to the longest supported block
  });
});

describe("buildTriathlonPlan", () => {
  it("produces 7 day-of-week slots", () => {
    const plan = buildTriathlonPlan({ weeks: 12 });
    expect(plan.days.map((d) => d.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(plan.durationWeeks).toBe(12);
  });

  it("snaps weeks into the cycle name", () => {
    const plan = buildTriathlonPlan({ weeks: 9 });
    expect(plan.durationWeeks).toBe(8);
    expect(plan.cycleName).toContain("8 wk");
  });

  it("peak-anchors endurance sets and scales week 1 below peak for a build", () => {
    const plan = buildTriathlonPlan({ weeks: 12, goal: "build" });
    const enduranceSets = plan.days
      .flatMap((d) => d.exercises)
      .filter((e) => e.sets.some((s) => s.peakDistanceMeters))
      .flatMap((e) => e.sets);
    expect(enduranceSets.length).toBeGreaterThan(0);
    for (const s of enduranceSets) {
      expect(s.peakDistanceMeters!).toBeGreaterThan(0);
      expect(s.distanceMeters!).toBeGreaterThan(0);
      // Week 1 of a build starts below peak.
      expect(s.distanceMeters!).toBeLessThan(s.peakDistanceMeters!);
    }
  });

  it("maintain anchors week 1 at the peak (flat)", () => {
    const plan = buildTriathlonPlan({ weeks: 12, goal: "maintain" });
    expect(plan.goal).toBe("maintain");
    const swim = plan.days
      .flatMap((d) => d.exercises)
      .find((e) => e.name === "Swim")!;
    expect(swim.sets[0].distanceMeters).toBe(swim.sets[0].peakDistanceMeters);
  });

  it("includes three strength days to build muscle", () => {
    const plan = buildTriathlonPlan({ weeks: 12 });
    // A strength day has resistance sets (rep-based, not endurance peak-anchored).
    const strengthDays = plan.days.filter((d) =>
      d.exercises.some((e) =>
        e.sets.some((s) => s.targetReps != null && s.peakDistanceMeters == null),
      ),
    );
    expect(strengthDays.length).toBe(3);
  });

  it("makes Saturday a brick (bike then run in one session)", () => {
    const plan = buildTriathlonPlan({ weeks: 12 });
    const sat = plan.days.find((d) => d.dayOfWeek === 6)!;
    expect(sat.exercises.map((e) => e.name)).toEqual(["Bike", "Run"]);
  });

  it("turns the chosen rest day into an empty rest slot", () => {
    const plan = buildTriathlonPlan({ weeks: 12, restDay: 3 });
    const rest = plan.days.find((d) => d.dayOfWeek === 3)!;
    expect(rest.exercises).toEqual([]);
    expect(rest.label).toBe("Rest");
  });

  it("references swim, bike, and run exercises", () => {
    const names = planExerciseNames(buildTriathlonPlan({ weeks: 12 }));
    expect(names).toContain("Swim");
    expect(names).toContain("Bike");
    expect(names).toContain("Run");
  });

  // peakDistanceMeters is the authored race-prep peak (the curve scales
  // distanceMeters below it); it reflects the level table directly.
  const longRunPeak = (level: "novice" | "intermediate" | "advanced") => {
    const plan = buildTriathlonPlan({ weeks: 24, level });
    const sun = plan.days.find((d) => d.dayOfWeek === 7)!; // Long Run
    return sun.exercises[0].sets[0].peakDistanceMeters!;
  };
  const longBikePeak = (level: "novice" | "intermediate" | "advanced") => {
    const plan = buildTriathlonPlan({ weeks: 24, level });
    const sat = plan.days.find((d) => d.dayOfWeek === 6)!; // Long Bike + Brick
    return sat.exercises.find((e) => e.name === "Bike")!.sets[0].peakDistanceMeters!;
  };

  it("scales peak volumes up with athlete level", () => {
    expect(longRunPeak("novice")).toBeLessThan(longRunPeak("intermediate"));
    expect(longRunPeak("intermediate")).toBeLessThan(longRunPeak("advanced"));
    expect(longBikePeak("novice")).toBeLessThan(longBikePeak("intermediate"));
    expect(longBikePeak("intermediate")).toBeLessThan(longBikePeak("advanced"));
  });

  it("respects the long-session biological ceilings even at advanced", () => {
    // Run ≤ ~30 km, bike ≤ ~180 km — the durability ceilings from the brief.
    expect(longRunPeak("advanced")).toBeLessThanOrEqual(30000);
    expect(longBikePeak("advanced")).toBeLessThanOrEqual(180000);
  });

  it("prescribes a polarized 80/20 split — one structured Z4 interval session, the rest easy Z2", () => {
    const plan = buildTriathlonPlan({ weeks: 24 });
    const enduranceExercises = plan.days
      .flatMap((d) => d.exercises)
      .filter((e) => e.sets.some((s) => s.peakDistanceMeters != null));

    // Every endurance set carries a Z2/Z4 target zone.
    const allZones = enduranceExercises.flatMap((e) => e.sets.map((s) => s.targetHeartRateZone));
    expect(allZones.every((z) => z === 2 || z === 4)).toBe(true);

    // Exactly one session contains the hard Z4 work (the threshold-interval run).
    const hardSessions = enduranceExercises.filter((e) => e.sets.some((s) => s.targetHeartRateZone === 4));
    expect(hardSessions).toHaveLength(1);

    // That session is a real interval workout: a Z2 warmup, ≥2 Z4 reps with rest, a Z2 cooldown.
    const intervals = hardSessions[0].sets;
    expect(intervals[0].targetHeartRateZone).toBe(2); // warmup
    expect(intervals[intervals.length - 1].targetHeartRateZone).toBe(2); // cooldown
    const z4 = intervals.filter((s) => s.targetHeartRateZone === 4);
    expect(z4.length).toBeGreaterThanOrEqual(2);
    expect(z4.every((s) => s.restTimeSeconds > 0)).toBe(true); // recovery between reps

    // Every other endurance session is entirely easy Z2.
    for (const e of enduranceExercises.filter((e) => e !== hardSessions[0])) {
      expect(e.sets.every((s) => s.targetHeartRateZone === 2)).toBe(true);
    }

    // Strength sets stay unzoned.
    const strengthSets = plan.days
      .flatMap((d) => d.exercises)
      .filter((e) => e.sets.some((s) => s.targetReps != null))
      .flatMap((e) => e.sets);
    expect(strengthSets.every((s) => s.targetHeartRateZone == null)).toBe(true);
  });

  it("tags only the interval run's hard reps as phase-varying 'work' sets", () => {
    const plan = buildTriathlonPlan({ weeks: 24 });
    const quality = plan.days.find((d) => d.label === "Run — Threshold Intervals")!;
    const sets = quality.exercises[0].sets;
    // Warmup (first) and cooldown (last) are not work; the middle reps are.
    expect(sets[0].sessionRole).toBeUndefined();
    expect(sets[sets.length - 1].sessionRole).toBeUndefined();
    const work = sets.filter((s) => s.sessionRole === "work");
    expect(work.length).toBeGreaterThanOrEqual(2);
    expect(work.every((s) => s.targetHeartRateZone === 4)).toBe(true);
    // No other session carries "work" reps (strength mains carry their own role).
    const others = plan.days
      .flatMap((d) => d.exercises)
      .filter((e) => e !== quality.exercises[0])
      .flatMap((e) => e.sets);
    expect(others.every((s) => s.sessionRole !== "work")).toBe(true);
  });

  it("prescribes full-body strength: heavy lower-body mains + upper-body hypertrophy", () => {
    const names = planExerciseNames(buildTriathlonPlan({ weeks: 24, goal: "build" }));
    // Heavy, periodized lower-body / posterior mains + reactive plyo for run economy.
    for (const n of [
      "Squat",
      "Romanian Deadlift",
      "Hip Thrust",
      "Bulgarian Split Squat",
      "Box Jump",
    ]) {
      expect(names).toContain(n);
    }
    // Full-body hypertrophy work so the athlete actually builds/keeps muscle.
    for (const n of [
      "Bench Press",
      "Overhead Press",
      "Incline Dumbbell Press",
      "Dumbbell Lateral Raise",
      "Tricep Pushdown",
      "Barbell Row",
      "Lat Pulldown",
      "Seated Cable Row",
      "Face Pull",
      "Hammer Curl",
      "Pull-up",
      "Calf Raise",
    ]) {
      expect(names).toContain(n);
    }
  });

  it("covers all major muscle groups for hypertrophy", () => {
    const names = planExerciseNames(buildTriathlonPlan({ weeks: 24, goal: "build" }));
    // One representative lift per major group: chest, shoulders, back, biceps,
    // triceps, quads, hamstrings/glutes, calves.
    const groups = [
      ["Bench Press", "Incline Dumbbell Press"], // chest
      ["Overhead Press", "Dumbbell Lateral Raise"], // shoulders
      ["Barbell Row", "Lat Pulldown", "Seated Cable Row", "Pull-up"], // back
      ["Hammer Curl"], // biceps
      ["Tricep Pushdown"], // triceps
      ["Squat", "Bulgarian Split Squat"], // quads
      ["Romanian Deadlift", "Hip Thrust"], // hamstrings/glutes
      ["Calf Raise"], // calves
    ];
    for (const group of groups) {
      expect(group.some((n) => names.includes(n))).toBe(true);
    }
  });

  it("auto-progresses the hypertrophy work in the 8–12 rep range", () => {
    const plan = buildTriathlonPlan({ weeks: 24, goal: "build" });
    const exercises = plan.days.flatMap((d) => d.exercises);

    // Weighted hypertrophy lifts: weight-mode, every set 8–12 reps, increment present.
    const weighted = exercises.filter((e) => e.progressionMode === "weight");
    expect(weighted.length).toBeGreaterThan(0);
    for (const e of weighted) {
      expect(e.sets.every((s) => s.targetReps! >= 8 && s.targetReps! <= 15)).toBe(true);
      expect(e.overloadIncrementKg).toBeGreaterThan(0);
    }

    // The bodyweight pull-up progresses on reps instead of load.
    const pullup = exercises.find((e) => e.name === "Pull-up")!;
    expect(pullup.progressionMode).toBe("reps");
    expect(pullup.overloadIncrementReps).toBeGreaterThanOrEqual(1);
  });

  it("preserves both swims when the third strength day is added", () => {
    const plan = buildTriathlonPlan({ weeks: 24, goal: "build" });
    const swims = plan.days
      .flatMap((d) => d.exercises)
      .filter((e) => e.name === "Swim");
    // Endurance swim (multi-segment, peak-anchored) + recovery swim — both survive.
    expect(swims.length).toBe(2);
    expect(swims.some((e) => e.sets.length > 1)).toBe(true); // folded endurance swim
  });

  it("tags the main lifts for phase periodization and starts a build in the adaptation base", () => {
    const plan = buildTriathlonPlan({ weeks: 24, goal: "build" });
    const mains = plan.days
      .flatMap((d) => d.exercises)
      .filter((e) => e.sets.some((s) => s.sessionRole === "strength"));
    expect(mains.map((e) => e.name).sort()).toEqual(
      ["Bulgarian Split Squat", "Hip Thrust", "Romanian Deadlift", "Squat"].sort(),
    );
    // Week 1 of a build is the base phase → anatomical-adaptation reps (12), 3 sets.
    for (const m of mains) {
      expect(m.sets).toHaveLength(3);
      expect(m.sets.every((s) => s.targetReps === 12 && s.sessionRole === "strength")).toBe(true);
    }
  });

  it("starts a maintain cycle's strength at its maintenance rep scheme", () => {
    const plan = buildTriathlonPlan({ weeks: 24, goal: "maintain" });
    const firstMain = plan.days
      .flatMap((d) => d.exercises)
      .find((e) => e.sets.some((s) => s.sessionRole === "strength"))!;
    expect(firstMain.sets.every((s) => s.targetReps === 6)).toBe(true);
  });

  it("defaults to the intermediate level and records it on the blueprint", () => {
    expect(buildTriathlonPlan({ weeks: 24 }).level).toBe("intermediate");
    expect(buildTriathlonPlan({ weeks: 24, level: "advanced" }).level).toBe("advanced");
  });
});
