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

import {
  exercises,
  programExercises,
  programSets,
  programs,
  trainingCycleSlots,
  trainingCycles,
  users,
  workoutSessions,
  workoutSets,
} from "@/db/schema";

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

// Programs
export type Program = typeof programs.$inferSelect;
export type NewProgram = typeof programs.$inferInsert;

export type ProgramExercise = typeof programExercises.$inferSelect;
export type NewProgramExercise = typeof programExercises.$inferInsert;

export type ProgramSet = typeof programSets.$inferSelect;
export type NewProgramSet = typeof programSets.$inferInsert;

// Program with nested exercises and sets
export type ProgramSetRow = ProgramSet;
export type ProgramExerciseWithSets = ProgramExercise & {
  exercise: Exercise;
  programSets: ProgramSet[];
};
export type ProgramWithExercises = Program & {
  programExercises: ProgramExerciseWithSets[];
};

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

/**
 * Aggregate workout statistics for the home page dashboard.
 */
export type WorkoutStats = {
  totalWorkouts: number;
  totalReps: number;
  totalSets: number;
  thisWeekWorkouts: number;
};

/**
 * Session with aggregate stats for the history list view.
 */
export type SessionWithStats = WorkoutSession & {
  programName: string | null;
  setCount: number;
  exerciseCount: number;
  totalVolumeKg: number;
  durationMinutes: number;
};

/**
 * Session detail with sets grouped by exercise.
 */
export type SessionDetail = WorkoutSession & {
  programName: string | null;
  setsByExercise: Array<{ exerciseName: string; sets: WorkoutSet[] }>;
};

// Training Cycles
export type TrainingCycle = typeof trainingCycles.$inferSelect;
export type NewTrainingCycle = typeof trainingCycles.$inferInsert;

export type TrainingCycleSlot = typeof trainingCycleSlots.$inferSelect;
export type NewTrainingCycleSlot = typeof trainingCycleSlots.$inferInsert;

export type TrainingCycleSlotWithProgram = TrainingCycleSlot & {
  program: Program | null;
};

export type TrainingCycleWithSlots = TrainingCycle & {
  slots: TrainingCycleSlotWithProgram[];
};

// The active cycle with today's slot resolved
export type ActiveCycleInfo = {
  cycle: TrainingCycle;
  todaySlot: TrainingCycleSlotWithProgram | null;
  currentWeek: number;
  endDate: string; // ISO date string
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
