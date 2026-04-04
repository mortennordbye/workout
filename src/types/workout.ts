/**
 * Workout Type Definitions
 *
 * Central location for all workout-related TypeScript types.
 * These types are inferred from Drizzle schemas to maintain perfect sync
 * between database structure and TypeScript types.
 */

import {
  exercises,
  programExercises,
  programSets,
  programs,
  trainingCycleSlots,
  trainingCycles,
  workoutSessions,
  workoutSets,
} from "@/db/schema";

// ============================================================================
// Database Table Types (Inferred from Drizzle Schemas)
// ============================================================================

export type Exercise = typeof exercises.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type Program = typeof programs.$inferSelect;
export type ProgramExercise = typeof programExercises.$inferSelect;
export type ProgramSet = typeof programSets.$inferSelect;

// Program with nested exercises and sets
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
export type TrainingCycleSlot = typeof trainingCycleSlots.$inferSelect;

export type TrainingCycleSlotWithProgram = TrainingCycleSlot & {
  program: Program | null;
};

export type TrainingCycleWithSlots = TrainingCycle & {
  slots: TrainingCycleSlotWithProgram[];
};

// The active cycle with today's slot resolved
export type ActiveCycleInfo = {
  cycle: TrainingCycleWithSlots;
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
  userId: string;
};

// ============================================================================
// Program Import/Export
// ============================================================================

export type ExportedProgram = {
  version: 1;
  exportedAt: string;
  program: {
    name: string;
    exercises: Array<{
      orderIndex: number;
      notes: string | null;
      overloadIncrementKg: number;
      overloadIncrementReps: number;
      progressionMode: string;
      exercise: {
        name: string;
        category: string;
        bodyArea: string | null;
        muscleGroup: string | null;
        equipment: string | null;
        movementPattern: string | null;
      };
      sets: Array<{
        setNumber: number;
        targetReps: number | null;
        weightKg: number | null;
        durationSeconds: number | null;
        restTimeSeconds: number;
      }>;
    }>;
  };
};
