/**
 * Users Table Schema
 *
 * Stores user account information. This is kept simple for now but can be
 * extended with additional fields like:
 * - username, password_hash (for authentication)
 * - name, avatar_url (for profile info)
 * - preferences (JSON column for app settings)
 * - bodyweight_kg, height_cm (for tracking metrics)
 */

import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
