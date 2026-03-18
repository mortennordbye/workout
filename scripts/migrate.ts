import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const { Pool } = pg;

async function runMigrations() {
  console.log("🔄 Running database migrations...");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  try {
    // Check if migrations table exists
    const migrationsTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '__drizzle_migrations'
      );
    `);

    if (migrationsTableExists.rows[0].exists) {
      // Check if migration was already applied
      const appliedMigrations = await pool.query(
        `SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1`,
      );

      if (appliedMigrations.rows.length > 0) {
        console.log("ℹ️  Database migrations already applied, skipping");
        await pool.end();
        return;
      }
    }

    // Run migrations
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ Migrations completed successfully");
  } catch (error: unknown) {
    // If tables already exist but migrations table doesn't, manually create it
    const err = error as { cause?: { code?: string } };
    if (err?.cause?.code === "42P07") {
      console.log("ℹ️  Database tables already exist");

      try {
        // Manually mark migration as applied
        await pool.query(`
          CREATE TABLE IF NOT EXISTS __drizzle_migrations (
            id SERIAL PRIMARY KEY,
            hash text NOT NULL,
            created_at bigint
          );
        `);

        // Get the migration hash from the meta folder
        const fs = await import("fs");
        const path = await import("path");
        const journalPath = path.join(
          process.cwd(),
          "drizzle",
          "meta",
          "_journal.json",
        );
        const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));

        if (journal.entries && journal.entries.length > 0) {
          const latestEntry = journal.entries[journal.entries.length - 1];

          // Check if this migration is already recorded
          const existing = await pool.query(
            `SELECT hash FROM __drizzle_migrations WHERE hash = $1`,
            [latestEntry.hash],
          );

          if (existing.rows.length === 0) {
            await pool.query(
              `INSERT INTO __drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
              [latestEntry.hash, Date.now()],
            );
            console.log("✅ Registered existing migration state");
          } else {
            console.log("ℹ️  Migration state already registered");
          }
        }
      } catch (e) {
        console.error("⚠️  Could not register migration state:", e);
      }
    } else {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigrations();
