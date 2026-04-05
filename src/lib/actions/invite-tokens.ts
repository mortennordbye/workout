"use server";

import { db } from "@/db";
import { inviteTokens } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireSession } from "@/lib/utils/session";
import type { ActionResult } from "@/types/workout";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

type InviteToken = typeof inviteTokens.$inferSelect;

// ─── Public (no session required) ────────────────────────────────────────────

export async function validateInviteToken(
  token: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const row = await db.query.inviteTokens.findFirst({
      where: (t, { eq }) => eq(t.token, token.trim()),
    });

    if (!row) return { success: false, error: "Invalid invite token" };

    if (row.expiresAt && row.expiresAt < new Date()) {
      return { success: false, error: "This invite token has expired" };
    }

    if (row.maxUses !== null && row.usedCount >= row.maxUses) {
      return { success: false, error: "This invite token has already been used" };
    }

    return { success: true, data: { id: row.id } };
  } catch (error) {
    console.error("Error validating invite token:", error);
    return { success: false, error: "Failed to validate token" };
  }
}

export async function registerWithToken(
  token: string,
  name: string,
  email: string,
  password: string,
): Promise<ActionResult> {
  try {
    if (!token.trim() || !name.trim() || !email.trim() || !password) {
      return { success: false, error: "All fields are required" };
    }

    // Re-validate token under a transaction to prevent double-use
    const row = await db.query.inviteTokens.findFirst({
      where: (t, { eq }) => eq(t.token, token.trim()),
    });

    if (!row) return { success: false, error: "Invalid invite token" };

    if (row.expiresAt && row.expiresAt < new Date()) {
      return { success: false, error: "This invite token has expired" };
    }

    if (row.maxUses !== null && row.usedCount >= row.maxUses) {
      return { success: false, error: "This invite token has already been used" };
    }

    // Create the user via better-auth's public sign-up endpoint
    const result = await auth.api.signUpEmail({
      body: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      },
    });

    if (!result?.user) {
      return { success: false, error: "Failed to create account" };
    }

    // Increment token usage after successful account creation
    await db
      .update(inviteTokens)
      .set({ usedCount: row.usedCount + 1 })
      .where(eq(inviteTokens.id, row.id));

    return { success: true, data: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("email") || message.includes("user already exists")) {
      return { success: false, error: "An account with this email already exists" };
    }
    console.error("Error registering user:", error);
    return { success: false, error: "Failed to create account. Please try again." };
  }
}

// ─── Admin only ───────────────────────────────────────────────────────────────

export async function listInviteTokens(): Promise<ActionResult<InviteToken[]>> {
  const session = await requireSession();
  if (session.user.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const rows = await db.query.inviteTokens.findMany({
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
    return { success: true, data: rows };
  } catch (error) {
    console.error("Error listing invite tokens:", error);
    return { success: false, error: "Failed to load invite tokens" };
  }
}

export async function createInviteToken(data: {
  label: string;
  token: string | null;
  maxUses: number | null;
  expiresAt: Date | null;
}): Promise<ActionResult<InviteToken>> {
  const session = await requireSession();
  if (session.user.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const token = data.token ?? randomBytes(12).toString("base64url");
    const id = randomBytes(8).toString("hex");

    // Check for token collision
    const existing = await db.query.inviteTokens.findFirst({
      where: (t, { eq }) => eq(t.token, token),
    });
    if (existing) {
      return { success: false, error: "A token with that value already exists" };
    }

    const [row] = await db
      .insert(inviteTokens)
      .values({
        id,
        token,
        label: data.label.trim() || null,
        createdBy: session.user.id,
        maxUses: data.maxUses,
        expiresAt: data.expiresAt,
      })
      .returning();

    return { success: true, data: row };
  } catch (error) {
    console.error("Error creating invite token:", error);
    return { success: false, error: "Failed to create invite token" };
  }
}

export async function revokeInviteToken(id: string): Promise<ActionResult> {
  const session = await requireSession();
  if (session.user.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db.delete(inviteTokens).where(eq(inviteTokens.id, id));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error revoking invite token:", error);
    return { success: false, error: "Failed to revoke invite token" };
  }
}
