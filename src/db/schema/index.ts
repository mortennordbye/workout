/**
 * Database Schema Barrel Export
 *
 * Central export point for all database schemas and relations.
 * Import from this file to access any table or relation definition.
 *
 * Usage:
 * ```typescript
 * import { users, workoutSessions, exercises } from "@/db/schema";
 * ```
 */

// Table schemas
export * from "./exercises";
export * from "./programs";
export * from "./training-cycles";
export * from "./users";
export * from "./workout-sessions";
export * from "./workout-sets";

// Relations for Drizzle relational queries
export * from "./relations";
