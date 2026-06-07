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
    expect(snapWeeks(100)).toBe(16);
    expect(snapWeeks(1)).toBe(4);
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

  it("tags endurance exercises with distance progression and an increment", () => {
    const plan = buildTriathlonPlan({ weeks: 12 });
    const enduranceExercises = plan.days
      .flatMap((d) => d.exercises)
      .filter((e) => e.progressionMode === "distance");
    expect(enduranceExercises.length).toBeGreaterThan(0);
    for (const e of enduranceExercises) {
      expect(e.overloadIncrementReps).toBeGreaterThan(0);
      expect(e.sets.every((s) => s.distanceMeters && s.distanceMeters > 0)).toBe(true);
    }
  });

  it("includes two strength days to maintain muscle", () => {
    const plan = buildTriathlonPlan({ weeks: 12 });
    const strengthDays = plan.days.filter((d) =>
      d.exercises.some((e) => e.progressionMode === "manual" && e.sets.some((s) => s.targetReps)),
    );
    expect(strengthDays.length).toBe(2);
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
});
