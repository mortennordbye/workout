/**
 * Exercise Personal Records Table Schema
 *
 * Tracks personal records per exercise per user. When a new PR supersedes
 * an existing one, the old record is marked with superseded_at rather than
 * deleted — preserving the full PR history for future charts.
 *
 * PR types:
 *   weight       — heaviest single set ever logged for this exercise
 *   reps_at_weight — most reps ever at this exact weight (±0.5kg)
 *   estimated_1rm — highest Epley-estimated 1RM ever
 *
 * Query pattern:
 *   Current PR  → WHERE superseded_at IS NULL
 *   PR history  → ORDER BY achieved_at ASC (for trend curves)
 */

import { decimal, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { exercises } from "./exercises";
import { users } from "./users";
import { workoutSessions } from "./workout-sessions";
import { workoutSets } from "./workout-sets";

export const exercisePrs = pgTable("exercise_prs", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "cascade" }),
  // 'weight' | 'reps_at_weight' | 'estimated_1rm'
  prType: text("pr_type").notNull(),
  // The PR value: kg for weight/estimated_1rm, rep count for reps_at_weight
  value: decimal("value", { precision: 8, scale: 2 }).notNull(),
  // Context: the weight used (populated for 'reps_at_weight' type)
  weightKg: decimal("weight_kg", { precision: 6, scale: 2 }),
  sessionId: integer("session_id").references(() => workoutSessions.id, {
    onDelete: "set null",
  }),
  setId: integer("set_id").references(() => workoutSets.id, {
    onDelete: "set null",
  }),
  achievedAt: timestamp("achieved_at").notNull().defaultNow(),
  // Set when a newer PR beats this one (NULL = current record)
  supersededAt: timestamp("superseded_at"),
});
