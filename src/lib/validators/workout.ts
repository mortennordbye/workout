/**
 * Workout Validation Schemas (Zod)
 *
 * Type-safe runtime validation for server actions and API endpoints.
 * These schemas ensure data integrity before database operations.
 *
 * Benefits:
 * - Runtime type checking (TypeScript only checks at compile time)
 * - Automatic error messages for invalid data
 * - Easy integration with form libraries (React Hook Form, etc.)
 * - Prevents SQL injection and malformed data
 *
 * Usage in Server Actions:
 * ```typescript
 * const result = logWorkoutSetSchema.safeParse(data);
 * if (!result.success) {
 *   return { success: false, error: result.error.flatten() };
 * }
 * // Proceed with validated result.data
 * ```
 */

import { z } from "zod";

export const WORKOUT_FEELINGS = ["Tired", "OK", "Good", "Awesome"] as const;
export type WorkoutFeeling = (typeof WORKOUT_FEELINGS)[number];

const feelingSchema = z.enum(WORKOUT_FEELINGS).optional();

/**
 * Create Workout Session Schema
 *
 * Validates data when starting a new workout session.
 */
export const createWorkoutSessionSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z.string().optional(), // ISO timestamp, defaults to now in server action
  notes: z
    .string()
    .max(1000, "Notes must be 1000 characters or less")
    .optional(),
  programId: z.number().int().positive().optional(),
});

/**
 * Log Workout Set Schema
 *
 * Validates individual set data during a workout.
 *
 * RPE (Rate of Perceived Exertion) must be 1-10:
 * - 10: Maximum effort, no reps left
 * - 9: 1 rep in reserve (RIR)
 * - 8: 2-3 reps in reserve
 * - 7: Moderate effort
 * - 5-6: Easy, many reps left
 */
export const logWorkoutSetSchema = z.object({
  sessionId: z.number().int().positive("Session ID must be a positive integer"),
  exerciseId: z
    .number()
    .int()
    .positive("Exercise ID must be a positive integer"),
  setNumber: z.number().int().positive("Set number must be a positive integer"),
  targetReps: z
    .number()
    .int()
    .positive("Target reps must be positive")
    .optional(),
  actualReps: z.number().int().min(0, "Actual reps cannot be negative"),
  weightKg: z
    .number()
    .min(0, "Weight cannot be negative")
    .max(1000, "Weight must be under 1000kg"),
  durationSeconds: z.number().int().min(0).optional(),
  distanceMeters: z.number().int().min(0).optional(),
  inclinePercent: z.number().int().min(0).max(30).optional(),
  heartRateZone: z.number().int().min(1).max(5).optional(),
  rpe: z
    .number()
    .int()
    .min(1, "RPE must be at least 1")
    .max(10, "RPE must be at most 10"),
  restTimeSeconds: z
    .number()
    .int()
    .min(0, "Rest time cannot be negative")
    .max(3600, "Rest time must be under 1 hour"),
  isCompleted: z.boolean().default(true),
});

/**
 * Workout History Query Schema
 *
 * Validates parameters for fetching workout history.
 * Used to query past performance for a specific exercise.
 */
export const workoutHistoryQuerySchema = z.object({
  exerciseId: z
    .number()
    .int()
    .positive("Exercise ID must be a positive integer")
    .optional(),
  limit: z.number().int().positive().max(100).default(50).optional(),
  offset: z.number().int().min(0).default(0).optional(),
});

/**
 * Complete Workout Session Schema
 *
 * Validates data when marking a session as complete.
 */
export const completeWorkoutSessionSchema = z.object({
  sessionId: z.number().int().positive("Session ID must be a positive integer"),
  endTime: z.string().optional(), // ISO timestamp, defaults to now
  notes: z
    .string()
    .max(1000, "Notes must be 1000 characters or less")
    .optional(),
  feeling: feelingSchema,
});

/**
 * Create Exercise Schema
 *
 * Validates data when adding a custom exercise.
 */
export const createExerciseSchema = z.object({
  name: z
    .string()
    .min(1, "Exercise name is required")
    .max(100, "Name must be 100 characters or less"),
  category: z.enum(["strength", "cardio", "flexibility"], {
    message: "Category must be strength, cardio, or flexibility",
  }),
  isCustom: z.boolean().default(true),
  bodyArea: z.enum(["upper_body", "lower_body", "core", "full_body", "cardio"]).optional(),
  muscleGroup: z.enum(["chest", "back", "shoulders", "biceps", "triceps", "forearms", "quads", "hamstrings", "glutes", "calves", "abs", "lower_back", "full_body", "cardio"]).optional(),
  equipment: z.enum(["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "bands", "other"]).optional(),
  movementPattern: z.enum(["push", "pull", "hinge", "squat", "carry", "rotation", "isometric", "cardio"]).optional(),
});

/**
 * Programs Schemas
 */
export const createProgramSchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateProgramSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100),
});

export const addExerciseToProgramSchema = z.object({
  programId: z.number().int().positive(),
  exerciseId: z.number().int().positive(),
  orderIndex: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const addProgramSetSchema = z.object({
  programExerciseId: z.number().int().positive(),
  setNumber: z.number().int().positive(),
  targetReps: z.number().int().positive().optional(),
  weightKg: z.number().min(0).max(1000).optional(),
  durationSeconds: z.number().int().min(0).optional(),
  distanceMeters: z.number().int().min(0).optional(),
  inclinePercent: z.number().int().min(0).max(30).optional(),
  targetHeartRateZone: z.number().int().min(1).max(5).optional(),
  restTimeSeconds: z.number().int().min(0).max(3600).default(0),
});

export const updateProgramSetSchema = addProgramSetSchema
  .omit({ programExerciseId: true, setNumber: true })
  .extend({
    id: z.number().int().positive(),
    // No default — partial updates must not overwrite fields that weren't provided
    restTimeSeconds: z.number().int().min(0).max(3600).optional(),
    // Allow explicit null to clear these fields (e.g., switching run mode from distance to time)
    distanceMeters: z.number().int().min(0).nullable().optional(),
    durationSeconds: z.number().int().min(0).nullable().optional(),
  });

export const removeExerciseFromProgramSchema = z.object({
  programExerciseId: z.number().int().positive(),
  programId: z.number().int().positive(),
});

export const reorderProgramExercisesSchema = z.object({
  programId: z.number().int().positive(),
  orderedIds: z.array(z.number().int().positive()).min(1),
});

export const reorderProgramSetsSchema = z.object({
  programExerciseId: z.number().int().positive(),
  orderedIds: z.array(z.number().int().positive()).min(1),
});

export const deleteProgramSetSchema = z.object({
  programSetId: z.number().int().positive(),
});

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type AddExerciseToProgramInput = z.infer<
  typeof addExerciseToProgramSchema
>;
export type AddProgramSetInput = z.infer<typeof addProgramSetSchema>;

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;

/**
 * Program Import/Export Schemas
 */
const importProgramEntrySchema = z.object({
  name: z.string().min(1).max(100),
  exercises: z
      .array(
        z.object({
          idx: z.number().int().min(0),
          notes: z.string().max(500).nullable().optional(),
          incKg: z.number().min(0).max(100).catch(2.5),
          incReps: z.number().int().min(0).max(100).catch(0),
          mode: z
            .enum(["none", "manual", "weight", "smart", "reps", "time", "distance"])
            .catch("weight"),
          exercise: z.object({
            name: z.string().min(1).max(100),
            category: z.enum(["strength", "cardio", "flexibility"]).catch("strength"),
            area: z
              .enum(["upper_body", "lower_body", "core", "full_body", "cardio"])
              .nullable()
              .optional()
              .catch(null),
            muscle: z
              .enum([
                "chest",
                "back",
                "shoulders",
                "biceps",
                "triceps",
                "forearms",
                "quads",
                "hamstrings",
                "glutes",
                "calves",
                "abs",
                "lower_back",
                "full_body",
                "cardio",
              ])
              .nullable()
              .optional()
              .catch(null),
            equipment: z
              .enum([
                "barbell",
                "dumbbell",
                "machine",
                "cable",
                "bodyweight",
                "kettlebell",
                "bands",
                "other",
              ])
              .nullable()
              .optional()
              .catch(null),
            pattern: z
              .enum([
                "push",
                "pull",
                "hinge",
                "squat",
                "carry",
                "rotation",
                "isometric",
                "cardio",
              ])
              .nullable()
              .optional()
              .catch(null),
          }),
          sets: z.array(
            z.object({
              n: z.number().int().min(0),
              reps: z.number().int().min(0).nullable().optional(),
              kg: z.number().min(0).max(1000).nullable().optional(),
              durSec: z.number().int().min(0).nullable().optional(),
              distM: z.number().int().min(0).nullable().optional(),
              rest: z.number().int().min(0).max(3600).catch(0),
            }),
          ),
        }),
      )
      .max(50),
});

// Accepts either a single program or an array of programs.
// version is optional to accommodate AI-generated JSON that may omit or vary the field.
export const importProgramSchema = z.object({
  version: z.union([z.number(), z.string()]).optional(),
  exportedAt: z.string().optional(),
}).and(
  z.union([
    z.object({ program: importProgramEntrySchema }),
    z.object({ programs: z.array(importProgramEntrySchema).min(1).max(100) }),
  ])
);

export type ImportProgramInput = z.infer<typeof importProgramSchema>;
