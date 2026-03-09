/**
 * Exercises Table Schema
 *
 * Stores all available exercises, both system-defined and user-created.
 *
 * Categories:
 * - strength: Barbell, dumbbell, machine exercises (Squat, Bench, Deadlift, etc.)
 * - cardio: Running, cycling, rowing, etc.
 * - flexibility: Stretching, yoga poses, mobility work
 *
 * The is_custom flag distinguishes user-created exercises from system defaults.
 *
 * Future enhancements:
 * - Add muscle_groups (JSON array: ["chest", "triceps", "shoulders"])
 * - Add equipment_type (barbell, dumbbell, machine, bodyweight, etc.)
 * - Add instruction_url (link to video demonstrations)
 * - Add created_by_user_id for custom exercises
 */

import { boolean, pgTable, serial, text } from "drizzle-orm/pg-core";

export const exerciseCategoryEnum = [
  "strength",
  "cardio",
  "flexibility",
] as const;

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category", { enum: exerciseCategoryEnum }).notNull(),
  isCustom: boolean("is_custom").default(false).notNull(),
});
