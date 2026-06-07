import { describe, expect, it } from "vitest";
import {
  formatPeriodizationSummary,
  periodizedLoad,
  phaseLayout,
  type PeriodizationSummaryInput,
  type TrainingGoal,
} from "@/lib/utils/periodization";

describe("phaseLayout", () => {
  it("caps taper at 3 weeks and uses 2 peak weeks for long blocks", () => {
    expect(phaseLayout(52)).toEqual({ taperWeeks: 3, peakWeeks: 2, rampWeeks: 47 });
    expect(phaseLayout(24)).toEqual({ taperWeeks: 3, peakWeeks: 2, rampWeeks: 19 });
  });

  it("degrades gracefully for short blocks", () => {
    expect(phaseLayout(4)).toEqual({ taperWeeks: 1, peakWeeks: 1, rampWeeks: 2 });
  });
});

describe("periodizedLoad — maintain", () => {
  it("is flat 1.0 every week", () => {
    for (const w of [1, 5, 12, 24]) {
      const load = periodizedLoad(w, 24, "maintain");
      expect(load.multiplier).toBe(1);
      expect(load.phase).toBe("maintain");
      expect(load.isDeload).toBe(false);
    }
  });
});

describe("periodizedLoad — build (24-week block)", () => {
  const load = (w: number) => periodizedLoad(w, 24, "build");

  it("starts in base at the ramp-start fraction", () => {
    expect(load(1)).toMatchObject({ phase: "base", multiplier: 0.6, isDeload: false });
  });

  it("hits full volume at peak", () => {
    expect(load(20)).toMatchObject({ phase: "peak", multiplier: 1 });
    expect(load(21)).toMatchObject({ phase: "peak", multiplier: 1 });
  });

  it("tapers down into race week", () => {
    expect(load(22).phase).toBe("taper");
    expect(load(22).multiplier).toBe(0.8);
    expect(load(24)).toMatchObject({ phase: "taper", multiplier: 0.45 });
    // strictly decreasing across the taper
    expect(load(22).multiplier).toBeGreaterThan(load(23).multiplier);
    expect(load(23).multiplier).toBeGreaterThan(load(24).multiplier);
  });

  it("inserts recovery deload weeks that dip below their neighbours", () => {
    const wk4 = load(4);
    expect(wk4.isDeload).toBe(true);
    expect(wk4.multiplier).toBeLessThan(load(3).multiplier);
    expect(wk4.multiplier).toBeLessThan(load(5).multiplier);
  });

  it("never exceeds peak and never collapses to zero", () => {
    for (let w = 1; w <= 24; w++) {
      const m = load(w).multiplier;
      expect(m).toBeGreaterThanOrEqual(0.3);
      expect(m).toBeLessThanOrEqual(1);
    }
  });
});

describe("periodizedLoad — short block (4 weeks)", () => {
  it("still ramps and tapers", () => {
    const g: TrainingGoal = "build";
    expect(periodizedLoad(1, 4, g).multiplier).toBe(0.6);
    expect(periodizedLoad(3, 4, g).phase).toBe("peak");
    expect(periodizedLoad(4, 4, g)).toMatchObject({ phase: "taper", multiplier: 0.45 });
  });
});

describe("periodizedLoad — bounds", () => {
  it("clamps out-of-range weeks", () => {
    expect(periodizedLoad(0, 12, "build").week).toBe(1);
    expect(periodizedLoad(99, 12, "build").week).toBe(12);
  });
});

describe("formatPeriodizationSummary", () => {
  // Build a summary input from the canonical curve so the phrasing tests track
  // the real load function rather than hand-picked numbers.
  const summary = (week: number, totalWeeks: number, goal: TrainingGoal) => {
    const load = periodizedLoad(week, totalWeeks, goal);
    const { rampWeeks, peakWeeks } = phaseLayout(totalWeeks);
    const input: PeriodizationSummaryInput = {
      goal,
      phase: load.phase,
      phaseLabel: load.phase.charAt(0).toUpperCase() + load.phase.slice(1),
      currentWeek: load.week,
      totalWeeks,
      multiplier: load.multiplier,
      isDeload: load.isDeload,
      weeksUntilPeak: Math.max(0, rampWeeks + 1 - load.week),
      weeksUntilTaper: Math.max(0, rampWeeks + peakWeeks + 1 - load.week),
    };
    return formatPeriodizationSummary(input);
  };

  it("describes a ramping build week with weeks-until-peak and percent", () => {
    const { headline, note } = summary(1, 24, "build");
    expect(headline).toBe("Base · Week 1 of 24");
    expect(note).toBe("Peak in 19 wks · this week ~60% of peak volume.");
  });

  it("flags deload weeks in the headline", () => {
    const { headline } = summary(4, 24, "build");
    expect(headline).toContain("· deload");
  });

  it("singularizes the week unit when peak is one week away", () => {
    const { note } = summary(19, 24, "build"); // rampWeeks=19 → peak at 20
    expect(note).toBe("Peak in 1 wk · this week ~100% of peak volume.");
  });

  it("announces taper countdown once at peak", () => {
    const { note } = summary(20, 24, "build");
    expect(note).toBe("At peak · taper in 2 wks.");
  });

  it("describes the taper phase", () => {
    const { note } = summary(24, 24, "build");
    expect(note).toBe("Tapering into race week - easing volume to arrive fresh.");
  });

  it("holds steady for maintain goal", () => {
    const { headline, note } = summary(5, 24, "maintain");
    expect(headline).toBe("Maintain · Week 5 of 24");
    expect(note).toBe("Endurance held steady; strength at maintenance.");
  });
});
