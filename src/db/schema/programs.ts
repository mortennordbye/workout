/**
 * Programs Schema
 *
 * A "program" is a named workout template that lists exercises and their
 * planned sets (reps, weight, rest). Users can select a program when
 * starting a workout.
 *
 * Tables:
 *  programs            – the named collection (e.g. "Push 1", "Legs 1")
 *  program_exercises   – ordered exercise slots inside a program
 *  program_sets        – individual set blueprints for each exercise slot
 */

import {
    decimal,
    integer,
    pgTable,
    serial,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import { exercises } from "./exercises";
import { users } from "./users";

// -------------------------------------------------------------------
// programs
// -------------------------------------------------------------------
export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// -------------------------------------------------------------------
// program_exercises  (ordered exercise slots within a program)
// -------------------------------------------------------------------
export const programExercises = pgTable("program_exercises", {
  id: serial("id").primaryKey(),
  programId: integer("program_id")
    .references(() => programs.id, { onDelete: "cascade" })
    .notNull(),
  exerciseId: integer("exercise_id")
    .references(() => exercises.id, { onDelete: "cascade" })
    .notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  notes: text("notes"),
  overloadIncrementKg: decimal("overload_increment_kg", { precision: 4, scale: 2 }),
  overloadIncrementReps: integer("overload_increment_reps").default(0),
  // "none" | "manual" | "weight" | "smart" | "reps" | "time" | "distance"
  progressionMode: text("progression_mode").default("manual"),
});

// -------------------------------------------------------------------
// program_sets  (planned set blueprint for an exercise slot)
// -------------------------------------------------------------------
export const programSets = pgTable("program_sets", {
  id: serial("id").primaryKey(),
  programExerciseId: integer("program_exercise_id")
    .references(() => programExercises.id, { onDelete: "cascade" })
    .notNull(),
  setNumber: integer("set_number").notNull(),
  // For rep-based sets
  targetReps: integer("target_reps"),
  weightKg: decimal("weight_kg", { precision: 6, scale: 2 }),
  // For time-based sets (seconds)
  durationSeconds: integer("duration_seconds"),
  // For running/cardio sets (meters)
  distanceMeters: integer("distance_meters"),
  // For running: treadmill incline (whole percent, 0-30)
  inclinePercent: integer("incline_percent"),
  // For running: target heart rate zone (1-5)
  targetHeartRateZone: integer("target_heart_rate_zone"),
  // Rest after this set (seconds)
  restTimeSeconds: integer("rest_time_seconds").notNull().default(0),
});
