import * as Sentry from "@sentry/nextjs";

// Forwards uncaught Server Component / route handler errors into Sentry.
// No-op when DSN is unset (Sentry init is gated in sentry.*.config.ts).
export const onRequestError = Sentry.captureRequestError;

export async function register() {
  // Sentry runs in both nodejs and edge runtimes. Load the matching config.
  // No-op when SENTRY_DSN is unset (see config files).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }

  // The rest of register() is Node-only (DB, env, admin bootstrap).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Force env validation to run at boot — surfaces config errors immediately
  // instead of on the first request that touches the misconfigured value.
  const { env } = await import("@/lib/env");

  // Drain the DB pool on SIGTERM so K8s rolling deploys don't drop in-flight
  // requests. Idempotent — subsequent signals are no-ops.
  let shuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] received ${signal}, draining DB pool`);
    try {
      const { pool } = await import("@/db");
      await pool.end();
      console.log("[shutdown] pool drained");
    } catch (err) {
      console.error("[shutdown] failed to drain pool", err);
    }
    // Let Next.js's own signal handler take over from here (it logs and exits).
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));

  const adminEmail = env.ADMIN_EMAIL;
  const adminPassword = env.ADMIN_PASSWORD;
  const adminName = env.ADMIN_NAME;

  if (!adminEmail || !adminPassword) return;

  try {
    const { auth } = await import("@/lib/auth");
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    // Check if this admin already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, adminEmail),
    });

    if (existing) return;

    // Create the account via Better Auth
    const result = await auth.api.signUpEmail({
      body: { name: adminName, email: adminEmail, password: adminPassword },
    });

    if (!result?.user) return;

    // Promote to admin directly — no session available at startup
    await db
      .update(users)
      .set({ role: "admin" })
      .where(eq(users.id, result.user.id));

    console.log(`[auth] Admin account created: ${adminEmail}`);
  } catch (err) {
    // Non-fatal — app still starts normally
    console.error("[auth] Failed to auto-create admin account:", err);
  }
}
