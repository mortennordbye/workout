export async function register() {
  // Only run in Node.js (not during edge runtime or client builds)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME ?? "Admin";

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
