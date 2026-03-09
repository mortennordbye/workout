/**
 * Workout Sets Table Schema
 *
 * Represents individual sets within a workout session. This is the core data
 * structure for tracking workout performance.
 *
 * Fields:
 * - set_number: Order within the exercise (1, 2, 3, etc.)
 * - target_reps: The planned number of reps (optional, for following programs)
 * - actual_reps: The reps actually completed
 * - weight_kg: Load lifted (use decimal for fractional plates like 2.5kg)
 * - rpe: Rate of Perceived Exertion (1-10 scale, where 10 = absolute max effort)
 * - rest_time_seconds: Rest period after this set
 * - is_completed: Whether the set was finished or skipped
 *
 * RPE Scale Reference:
 * - 10: Maximum effort, no reps left in reserve (RIR = 0)
 * - 9: Could do 1 more rep (RIR = 1)
 * - 8: Could do 2-3 more reps (RIR = 2-3)
 * - 7: Moderate effort, 3-4 reps left
 * - 5-6: Comfortable, many reps in reserve
 *
 * Future enhancements for Auto-Deload & PR Detection:
 * - Track RPE trends: If RPE consistently > 9 for same weight, trigger deload
 * - Compare weight × reps to historical maxes for PR detection
 * - Add tempo column (e.g., "3-1-1" for 3s eccentric, 1s pause, 1s concentric)
 * - Add failure_point (sticking point in the rep)
 * - Add estimated_1rm (calculated using Epley or Brzycki formulas)
 */

import {
    boolean,
    decimal,
    integer,
    pgTable,
    serial,
    timestamp,
} from "drizzle-orm/pg-core";
import { exercises } from "./exercises";
import { workoutSessions } from "./workout-sessions";

export const workoutSets = pgTable("workout_sets", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .references(() => workoutSessions.id, { onDelete: "cascade" })
    .notNull(),
  exerciseId: integer("exercise_id")
    .references(() => exercises.id, { onDelete: "cascade" })
    .notNull(),
  setNumber: integer("set_number").notNull(),
  targetReps: integer("target_reps"),
  actualReps: integer("actual_reps").notNull(),
  weightKg: decimal("weight_kg", { precision: 6, scale: 2 }).notNull(),
  rpe: integer("rpe").notNull(), // 1-10 scale
  restTimeSeconds: integer("rest_time_seconds").notNull(),
  isCompleted: boolean("is_completed").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
