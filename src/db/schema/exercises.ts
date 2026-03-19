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

export const bodyAreaEnum = [
  "upper_body",
  "lower_body",
  "core",
  "full_body",
  "cardio",
] as const;

export const muscleGroupEnum = [
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
] as const;

export const equipmentEnum = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "kettlebell",
  "bands",
  "other",
] as const;

export const movementPatternEnum = [
  "push",
  "pull",
  "hinge",
  "squat",
  "carry",
  "rotation",
  "isometric",
  "cardio",
] as const;

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category", { enum: exerciseCategoryEnum }).notNull(),
  isCustom: boolean("is_custom").default(false).notNull(),
  bodyArea: text("body_area", { enum: bodyAreaEnum }),
  muscleGroup: text("muscle_group", { enum: muscleGroupEnum }),
  equipment: text("equipment", { enum: equipmentEnum }),
  movementPattern: text("movement_pattern", { enum: movementPatternEnum }),
});
