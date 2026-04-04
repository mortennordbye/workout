import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Verifies the current request has a valid session.
 * Redirects to /login if unauthenticated.
 * Use this in Server Components and Server Actions.
 */
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}

/**
 * Returns the session if present, null otherwise.
 * Use this when you need to conditionally render based on auth state
 * without triggering a redirect.
 */
export async function getOptionalSession() {
  return auth.api.getSession({ headers: await headers() });
}
