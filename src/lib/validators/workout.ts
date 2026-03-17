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

/**
 * Create Workout Session Schema
 *
 * Validates data when starting a new workout session.
 */
export const createWorkoutSessionSchema = z.object({
  userId: z.number().int().positive("User ID must be a positive integer"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z.string().optional(), // ISO timestamp, defaults to now in server action
  notes: z
    .string()
    .max(1000, "Notes must be 1000 characters or less")
    .optional(),
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
  userId: z.number().int().positive("User ID must be a positive integer"),
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
});

/**
 * Programs Schemas
 */
export const createProgramSchema = z.object({
  userId: z.number().int().positive(),
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
  restTimeSeconds: z.number().int().min(0).max(3600).default(60),
});

export const updateProgramSetSchema = addProgramSetSchema
  .omit({ programExerciseId: true, setNumber: true })
  .extend({ id: z.number().int().positive() });

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

// Type exports for use in components
export type CreateWorkoutSessionInput = z.infer<
  typeof createWorkoutSessionSchema
>;
export type LogWorkoutSetInput = z.infer<typeof logWorkoutSetSchema>;
export type WorkoutHistoryQueryInput = z.infer<
  typeof workoutHistoryQuerySchema
>;
export type CompleteWorkoutSessionInput = z.infer<
  typeof completeWorkoutSessionSchema
>;
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
