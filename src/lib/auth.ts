import { db } from "@/db";
import { accounts, sessions, users, verifications } from "@/db/schema";
import { env, trustedOrigins } from "@/lib/env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    // 30 days — refreshed on each request so active users stay logged in
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24, // refresh session cookie daily
    cookieCache: {
      // Cache session data in an encrypted cookie for 5 minutes.
      // Skips the DB session-validation query on repeat page loads within that window.
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRole: ["admin"],
    }),
  ],
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: trustedOrigins(),
});

export type Session = typeof auth.$Infer.Session;
