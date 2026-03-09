/**
 * Workout Type Definitions
 *
 * Central location for all workout-related TypeScript types.
 * These types are inferred from Drizzle schemas to maintain perfect sync
 * between database structure and TypeScript types.
 *
 * Two type variants per table:
 * - Select types: Data as it comes from the database (includes defaults, auto-generated fields)
 * - Insert types: Data needed to insert a new row (excludes auto-generated fields)
 *
 * Usage:
 * ```typescript
 * const session: WorkoutSession = await db.query.workoutSessions.findFirst(...);
 * const newSet: NewWorkoutSet = { sessionId, exerciseId, ... };
 * ```
 */

import { exercises, users, workoutSessions, workoutSets } from "@/db/schema";

// ============================================================================
// Database Table Types (Inferred from Drizzle Schemas)
// ============================================================================

// Users
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Exercises
export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;

// Workout Sessions
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type NewWorkoutSession = typeof workoutSessions.$inferInsert;

// Workout Sets
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type NewWorkoutSet = typeof workoutSets.$inferInsert;

// ============================================================================
// Composite Types (For Complex Queries)
// ============================================================================

/**
 * Extended workout set with related exercise and session information.
 * Used when displaying workout history.
 */
export type WorkoutSetWithExercise = WorkoutSet & {
  exercise: Exercise;
};

/**
 * Workout session with all its sets and exercise details.
 * Used for displaying complete workout details.
 */
export type WorkoutSessionWithSets = WorkoutSession & {
  workoutSets: WorkoutSetWithExercise[];
};

/**
 * Exercise performance history for tracking progress.
 * Includes all sets for a specific exercise across sessions.
 */
export type ExerciseHistory = {
  exercise: Exercise;
  sets: (WorkoutSet & {
    workoutSession: Pick<WorkoutSession, "date" | "startTime">;
  })[];
};

// ============================================================================
// Server Action Response Types
// ============================================================================

/**
 * Generic success/error response for server actions.
 * Provides type-safe error handling.
 */
export type ActionResult<T = undefined> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

/**
 * Response type for workout history queries.
 * Includes pagination metadata.
 */
export type WorkoutHistoryResult = {
  sets: WorkoutSetWithExercise[];
  totalCount: number;
  hasMore: boolean;
};

// ============================================================================
// UI Component Props Types
// ============================================================================

/**
 * Props for components that need session context.
 */
export type SessionContextProps = {
  sessionId: number;
  userId: number;
};

/**
 * Props for the set logger form.
 */
export type SetLoggerProps = SessionContextProps & {
  exercises: Exercise[];
  onSetLogged?: (set: WorkoutSet) => void;
};
