/**
 * Workout Sessions Table Schema
 *
 * Represents a complete workout session. Each session can contain multiple sets
 * across different exercises.
 *
 * The is_completed flag helps distinguish:
 * - Active/ongoing workouts (false)
 * - Completed workouts (true)
 *
 * Timestamps:
 * - date: The calendar day of the workout
 * - start_time: When the user began the workout
 * - end_time: When the user finished (null if still in progress)
 *
 * Future enhancements:
 * - Add workout_template_id (for following pre-built programs)
 * - Add total_volume_kg (calculated: sum of all set weight × reps)
 * - Add duration_minutes (calculated: end_time - start_time)
 * - Add location (home, gym, outdoor)
 * - Add mood/energy_level (pre and post workout)
 */

import {
    boolean,
    date,
    integer,
    pgTable,
    serial,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const workoutSessions = pgTable("workout_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  date: date("date").notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  notes: text("notes"),
  isCompleted: boolean("is_completed").default(false).notNull(),
});
