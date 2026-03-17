import { describe, expect, it } from "vitest";
import {
  addProgramSetSchema,
  completeWorkoutSessionSchema,
  createExerciseSchema,
  createProgramSchema,
  createWorkoutSessionSchema,
  logWorkoutSetSchema,
  reorderProgramExercisesSchema,
  reorderProgramSetsSchema,
} from "@/lib/validators/workout";

// ─── createWorkoutSessionSchema ───────────────────────────────────────────────

describe("createWorkoutSessionSchema", () => {
  const valid = { userId: 1, date: "2026-03-17" };

  it("accepts valid input", () => {
    expect(createWorkoutSessionSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects non-positive userId", () => {
    expect(createWorkoutSessionSchema.safeParse({ ...valid, userId: 0 }).success).toBe(false);
    expect(createWorkoutSessionSchema.safeParse({ ...valid, userId: -1 }).success).toBe(false);
  });

  it("rejects invalid date format", () => {
    expect(createWorkoutSessionSchema.safeParse({ ...valid, date: "17-03-2026" }).success).toBe(false);
    expect(createWorkoutSessionSchema.safeParse({ ...valid, date: "2026/03/17" }).success).toBe(false);
    expect(createWorkoutSessionSchema.safeParse({ ...valid, date: "not-a-date" }).success).toBe(false);
  });

  it("accepts valid date format", () => {
    expect(createWorkoutSessionSchema.safeParse({ ...valid, date: "2026-01-01" }).success).toBe(true);
  });

  it("accepts optional notes within limit", () => {
    expect(createWorkoutSessionSchema.safeParse({ ...valid, notes: "Felt good" }).success).toBe(true);
  });

  it("rejects notes over 1000 characters", () => {
    const longNotes = "a".repeat(1001);
    expect(createWorkoutSessionSchema.safeParse({ ...valid, notes: longNotes }).success).toBe(false);
  });
});

// ─── logWorkoutSetSchema ──────────────────────────────────────────────────────

describe("logWorkoutSetSchema", () => {
  const valid = {
    sessionId: 1,
    exerciseId: 1,
    setNumber: 1,
    actualReps: 10,
    weightKg: 80,
    rpe: 8,
    restTimeSeconds: 90,
  };

  it("accepts valid input", () => {
    expect(logWorkoutSetSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects RPE below 1", () => {
    expect(logWorkoutSetSchema.safeParse({ ...valid, rpe: 0 }).success).toBe(false);
  });

  it("rejects RPE above 10", () => {
    expect(logWorkoutSetSchema.safeParse({ ...valid, rpe: 11 }).success).toBe(false);
  });

  it("accepts RPE boundary values 1 and 10", () => {
    expect(logWorkoutSetSchema.safeParse({ ...valid, rpe: 1 }).success).toBe(true);
    expect(logWorkoutSetSchema.safeParse({ ...valid, rpe: 10 }).success).toBe(true);
  });

  it("rejects negative weight", () => {
    expect(logWorkoutSetSchema.safeParse({ ...valid, weightKg: -1 }).success).toBe(false);
  });

  it("rejects weight over 1000kg", () => {
    expect(logWorkoutSetSchema.safeParse({ ...valid, weightKg: 1001 }).success).toBe(false);
  });

  it("accepts 0kg weight", () => {
    expect(logWorkoutSetSchema.safeParse({ ...valid, weightKg: 0 }).success).toBe(true);
  });

  it("rejects negative actualReps", () => {
    expect(logWorkoutSetSchema.safeParse({ ...valid, actualReps: -1 }).success).toBe(false);
  });

  it("accepts 0 actualReps (failed set)", () => {
    expect(logWorkoutSetSchema.safeParse({ ...valid, actualReps: 0 }).success).toBe(true);
  });

  it("rejects rest time over 3600 seconds", () => {
    expect(logWorkoutSetSchema.safeParse({ ...valid, restTimeSeconds: 3601 }).success).toBe(false);
  });

  it("accepts 3600 seconds rest (boundary)", () => {
    expect(logWorkoutSetSchema.safeParse({ ...valid, restTimeSeconds: 3600 }).success).toBe(true);
  });

  it("defaults isCompleted to true", () => {
    const result = logWorkoutSetSchema.safeParse(valid);
    expect(result.success && result.data.isCompleted).toBe(true);
  });
});

// ─── addProgramSetSchema ──────────────────────────────────────────────────────

describe("addProgramSetSchema", () => {
  const valid = { programExerciseId: 1, setNumber: 1 };

  it("accepts valid minimal input", () => {
    expect(addProgramSetSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults restTimeSeconds to 60", () => {
    const result = addProgramSetSchema.safeParse(valid);
    expect(result.success && result.data.restTimeSeconds).toBe(60);
  });

  it("accepts optional weightKg", () => {
    expect(addProgramSetSchema.safeParse({ ...valid, weightKg: 100 }).success).toBe(true);
  });

  it("rejects weightKg over 1000", () => {
    expect(addProgramSetSchema.safeParse({ ...valid, weightKg: 1001 }).success).toBe(false);
  });

  it("rejects non-positive setNumber", () => {
    expect(addProgramSetSchema.safeParse({ ...valid, setNumber: 0 }).success).toBe(false);
  });
});

// ─── createProgramSchema ──────────────────────────────────────────────────────

describe("createProgramSchema", () => {
  const valid = { userId: 1, name: "Push Day" };

  it("accepts valid input", () => {
    expect(createProgramSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(createProgramSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects name over 100 characters", () => {
    expect(createProgramSchema.safeParse({ ...valid, name: "a".repeat(101) }).success).toBe(false);
  });

  it("accepts name of exactly 100 characters", () => {
    expect(createProgramSchema.safeParse({ ...valid, name: "a".repeat(100) }).success).toBe(true);
  });
});

// ─── createExerciseSchema ─────────────────────────────────────────────────────

describe("createExerciseSchema", () => {
  const valid = { name: "Bench Press", category: "strength" as const };

  it("accepts valid strength exercise", () => {
    expect(createExerciseSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts cardio and flexibility categories", () => {
    expect(createExerciseSchema.safeParse({ ...valid, category: "cardio" }).success).toBe(true);
    expect(createExerciseSchema.safeParse({ ...valid, category: "flexibility" }).success).toBe(true);
  });

  it("rejects invalid category", () => {
    expect(createExerciseSchema.safeParse({ ...valid, category: "yoga" }).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(createExerciseSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects name over 100 characters", () => {
    expect(createExerciseSchema.safeParse({ ...valid, name: "a".repeat(101) }).success).toBe(false);
  });

  it("defaults isCustom to true", () => {
    const result = createExerciseSchema.safeParse(valid);
    expect(result.success && result.data.isCustom).toBe(true);
  });
});

// ─── completeWorkoutSessionSchema ─────────────────────────────────────────────

describe("completeWorkoutSessionSchema", () => {
  it("accepts valid sessionId", () => {
    expect(completeWorkoutSessionSchema.safeParse({ sessionId: 1 }).success).toBe(true);
  });

  it("rejects non-positive sessionId", () => {
    expect(completeWorkoutSessionSchema.safeParse({ sessionId: 0 }).success).toBe(false);
  });

  it("accepts optional notes", () => {
    expect(completeWorkoutSessionSchema.safeParse({ sessionId: 1, notes: "Good session" }).success).toBe(true);
  });

  it("rejects notes over 1000 characters", () => {
    expect(completeWorkoutSessionSchema.safeParse({ sessionId: 1, notes: "a".repeat(1001) }).success).toBe(false);
  });
});

// ─── reorder schemas ──────────────────────────────────────────────────────────

describe("reorderProgramExercisesSchema", () => {
  it("accepts valid input", () => {
    expect(reorderProgramExercisesSchema.safeParse({ programId: 1, orderedIds: [3, 1, 2] }).success).toBe(true);
  });

  it("rejects empty orderedIds array", () => {
    expect(reorderProgramExercisesSchema.safeParse({ programId: 1, orderedIds: [] }).success).toBe(false);
  });

  it("rejects non-positive IDs in orderedIds", () => {
    expect(reorderProgramExercisesSchema.safeParse({ programId: 1, orderedIds: [1, 0] }).success).toBe(false);
  });
});

describe("reorderProgramSetsSchema", () => {
  it("accepts valid input", () => {
    expect(reorderProgramSetsSchema.safeParse({ programExerciseId: 1, orderedIds: [2, 1] }).success).toBe(true);
  });

  it("rejects empty orderedIds array", () => {
    expect(reorderProgramSetsSchema.safeParse({ programExerciseId: 1, orderedIds: [] }).success).toBe(false);
  });
});
