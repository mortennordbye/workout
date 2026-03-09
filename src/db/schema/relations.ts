/**
 * Drizzle ORM Relations
 *
 * This file defines relationships between tables for Drizzle's relational query API.
 * These relations enable intuitive querying with automatic joins:
 *
 * Example usage:
 * ```typescript
 * // Fetch user with all their workout sessions
 * const userWithSessions = await db.query.users.findFirst({
 *   where: eq(users.id, 1),
 *   with: {
 *     workoutSessions: true,
 *   },
 * });
 *
 * // Fetch session with all sets and exercise details
 * const sessionWithSets = await db.query.workoutSessions.findFirst({
 *   where: eq(workoutSessions.id, sessionId),
 *   with: {
 *     workoutSets: {
 *       with: {
 *         exercise: true,
 *       },
 *     },
 *   },
 * });
 * ```
 *
 * Relationship structure:
 * - User → has many WorkoutSessions
 * - WorkoutSession → belongs to User, has many WorkoutSets
 * - WorkoutSet → belongs to WorkoutSession, belongs to Exercise
 * - Exercise → has many WorkoutSets
 */

import { relations } from "drizzle-orm";
import { exercises } from "./exercises";
import { users } from "./users";
import { workoutSessions } from "./workout-sessions";
import { workoutSets } from "./workout-sets";

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  workoutSessions: many(workoutSessions),
}));

// Exercise relations
export const exercisesRelations = relations(exercises, ({ many }) => ({
  workoutSets: many(workoutSets),
}));

// Workout Session relations
export const workoutSessionsRelations = relations(
  workoutSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [workoutSessions.userId],
      references: [users.id],
    }),
    workoutSets: many(workoutSets),
  }),
);

// Workout Set relations
export const workoutSetsRelations = relations(workoutSets, ({ one }) => ({
  workoutSession: one(workoutSessions, {
    fields: [workoutSets.sessionId],
    references: [workoutSessions.id],
  }),
  exercise: one(exercises, {
    fields: [workoutSets.exerciseId],
    references: [exercises.id],
  }),
}));
