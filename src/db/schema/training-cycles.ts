/**
 * Training Cycles Schema
 *
 * A training cycle (mesocycle) groups programs into a time-boxed training block
 * with a weekly schedule and defined duration.
 *
 * Tables:
 *  training_cycles       – the named block (e.g. "Spring Strength Block")
 *  training_cycle_slots  – program assignments for each day/position in the cycle
 */

import {
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { programs } from "./programs";
import { users } from "./users";

// -------------------------------------------------------------------
// training_cycles
// -------------------------------------------------------------------
export const trainingCycles = pgTable("training_cycles", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  durationWeeks: integer("duration_weeks").notNull(),
  scheduleType: text("schedule_type", {
    enum: ["day_of_week", "rotation"],
  })
    .default("day_of_week")
    .notNull(),
  startDate: date("start_date"),
  status: text("status", { enum: ["draft", "active", "completed"] })
    .default("draft")
    .notNull(),
  endAction: text("end_action", {
    enum: ["deload", "new_cycle", "rest", "none"],
  })
    .default("none")
    .notNull(),
  endMessage: text("end_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_tc_user_status").on(t.userId, t.status),
]);

// -------------------------------------------------------------------
// training_cycle_slots
// -------------------------------------------------------------------
export const trainingCycleSlots = pgTable(
  "training_cycle_slots",
  {
    id: serial("id").primaryKey(),
    trainingCycleId: integer("training_cycle_id")
      .references(() => trainingCycles.id, { onDelete: "cascade" })
      .notNull(),
    // For day_of_week mode: 1=Mon…7=Sun; null for rotation mode
    dayOfWeek: integer("day_of_week"),
    // For rotation mode: 1, 2, 3… defines the sequence; null for day_of_week mode
    orderIndex: integer("order_index"),
    label: text("label"),
    programId: integer("program_id").references(() => programs.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
  },
  (t) => [
    unique("uniq_cycle_day").on(t.trainingCycleId, t.dayOfWeek),
    unique("uniq_cycle_order").on(t.trainingCycleId, t.orderIndex),
  ],
);
