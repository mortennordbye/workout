import { describe, expect, it } from "vitest";
import { buildSetSummary, formatTime, restToken, setToken } from "@/lib/utils/format";
import type { ProgramSet } from "@/types/workout";

// Minimal ProgramSet factory
function makeSet(overrides: Partial<ProgramSet> = {}): ProgramSet {
  return {
    id: 1,
    programExerciseId: 1,
    setNumber: 1,
    targetReps: 10,
    weightKg: "50.00",
    durationSeconds: null,
    restTimeSeconds: 60,
    ...overrides,
  } as ProgramSet;
}

describe("formatTime", () => {
  it("formats seconds only", () => {
    expect(formatTime(45)).toBe("00:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(90)).toBe("01:30");
  });

  it("formats exact minutes", () => {
    expect(formatTime(120)).toBe("02:00");
  });

  it("formats zero", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("pads single-digit seconds", () => {
    expect(formatTime(61)).toBe("01:01");
  });

  it("formats large values (1 hour)", () => {
    expect(formatTime(3600)).toBe("60:00");
  });

  it("formats very large values", () => {
    expect(formatTime(7261)).toBe("121:01");
  });

  it("formats value with no remainder", () => {
    expect(formatTime(3661)).toBe("61:01");
  });
});

describe("setToken", () => {
  it("formats reps x weight for strength sets", () => {
    expect(setToken(makeSet({ targetReps: 8, weightKg: "100.00" }))).toBe("8x100kg");
  });

  it("shows ? when targetReps is null", () => {
    expect(setToken(makeSet({ targetReps: null }))).toBe("?x50kg");
  });

  it("formats duration for timed sets", () => {
    expect(setToken(makeSet({ durationSeconds: 90, targetReps: null, weightKg: null }))).toBe("01:30");
  });

  it("shows 0kg when weightKg is null", () => {
    expect(setToken(makeSet({ weightKg: null, targetReps: 10 }))).toBe("10x0kg");
  });
});

describe("restToken", () => {
  it("formats rest time in mm:ss", () => {
    expect(restToken(makeSet({ restTimeSeconds: 90 }))).toBe("01:30");
  });

  it("formats zero rest", () => {
    expect(restToken(makeSet({ restTimeSeconds: 0 }))).toBe("00:00");
  });

  it("formats null restTimeSeconds as 00:00", () => {
    expect(restToken(makeSet({ restTimeSeconds: null }))).toBe("00:00");
  });
});

describe("buildSetSummary", () => {
  it("returns empty string for no sets", () => {
    expect(buildSetSummary([])).toBe("");
  });

  it("formats a single set", () => {
    const sets = [makeSet({ targetReps: 10, weightKg: "50.00", restTimeSeconds: 60 })];
    expect(buildSetSummary(sets)).toBe("10x50kg; 01:00");
  });

  it("joins up to 3 sets", () => {
    const sets = [
      makeSet({ id: 1, setNumber: 1, targetReps: 10, weightKg: "50.00", restTimeSeconds: 60 }),
      makeSet({ id: 2, setNumber: 2, targetReps: 8, weightKg: "60.00", restTimeSeconds: 90 }),
      makeSet({ id: 3, setNumber: 3, targetReps: 6, weightKg: "70.00", restTimeSeconds: 120 }),
    ];
    expect(buildSetSummary(sets)).toBe("10x50kg; 01:00; 8x60kg; 01:30; 6x70kg; 02:00");
  });

  it("truncates to 3 sets with ellipsis", () => {
    const sets = [
      makeSet({ id: 1, setNumber: 1, targetReps: 10, weightKg: "50.00", restTimeSeconds: 60 }),
      makeSet({ id: 2, setNumber: 2, targetReps: 10, weightKg: "50.00", restTimeSeconds: 60 }),
      makeSet({ id: 3, setNumber: 3, targetReps: 10, weightKg: "50.00", restTimeSeconds: 60 }),
      makeSet({ id: 4, setNumber: 4, targetReps: 10, weightKg: "50.00", restTimeSeconds: 60 }),
    ];
    expect(buildSetSummary(sets)).toContain("...");
    expect(buildSetSummary(sets).split(";").length).toBeLessThanOrEqual(7); // 3 pairs + ellipsis
  });

  it("formats two sets without ellipsis", () => {
    const sets = [
      makeSet({ id: 1, setNumber: 1, targetReps: 10, weightKg: "50.00", restTimeSeconds: 60 }),
      makeSet({ id: 2, setNumber: 2, targetReps: 8, weightKg: "60.00", restTimeSeconds: 90 }),
    ];
    const result = buildSetSummary(sets);
    expect(result).not.toContain("...");
    expect(result).toBe("10x50kg; 01:00; 8x60kg; 01:30");
  });

  it("formats mixed timed and strength sets", () => {
    const sets = [
      makeSet({ id: 1, setNumber: 1, durationSeconds: 60, targetReps: null, weightKg: null, restTimeSeconds: 30 }),
      makeSet({ id: 2, setNumber: 2, targetReps: 10, weightKg: "50.00", restTimeSeconds: 60 }),
    ];
    const result = buildSetSummary(sets);
    expect(result).toContain("01:00");
    expect(result).toContain("10x50kg");
  });

  it("formats all timed sets without weight", () => {
    const sets = [
      makeSet({ id: 1, setNumber: 1, durationSeconds: 30, targetReps: null, weightKg: null, restTimeSeconds: 15 }),
      makeSet({ id: 2, setNumber: 2, durationSeconds: 60, targetReps: null, weightKg: null, restTimeSeconds: 15 }),
    ];
    const result = buildSetSummary(sets);
    expect(result).not.toContain("kg");
    expect(result).toContain("00:30");
    expect(result).toContain("01:00");
  });
});
