/**
 * Database Client Configuration
 *
 * This file initializes the Drizzle ORM client with a PostgreSQL connection pool.
 * The connection string is read from the DATABASE_URL environment variable.
 *
 * Connection pooling ensures efficient database connection management across
 * multiple concurrent requests in production environments.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Create PostgreSQL connection pool
// In production, consider adding SSL configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Uncomment for production with SSL
  // ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Initialize Drizzle ORM with schema for relational queries
export const db = drizzle({ client: pool, schema });
