"use server";

import { db } from "@/db";
import { exercisePrs, exercises, friendships, programs, users, workoutReactions, workoutSessions, workoutSets } from "@/db/schema";
import {
  removeFriendSchema,
  respondToFriendRequestSchema,
  searchUsersSchema,
  sendFriendRequestSchema,
  toggleReactionSchema,
  updateActivityPrivacySchema,
} from "@/lib/validators/friends";
import { requireSession } from "@/lib/utils/session";
import type {
  ActionResult,
  FriendActivityItem,
  FriendWithActivity,
  PendingRequest,
  ReactionSummary,
  UserSearchResult,
} from "@/types/workout";
import { and, count, eq, gt, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── Search ────────────────────────────────────────────────────────────────

export async function searchUsers(query: unknown): Promise<ActionResult<UserSearchResult[]>> {
  const session = await requireSession();
  const parsed = searchUsersSchema.safeParse(query);
  if (!parsed.success) {
    return { success: false, error: "Invalid search query" };
  }

  try {
    const pattern = `%${parsed.data.query}%`;
    const me = session.user.id;

    // Fetch matching users excluding self
    const matchingUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(users)
      .where(
        and(
          or(ilike(users.name, pattern), ilike(users.email, pattern)),
          ne(users.id, me),
        ),
      )
      .limit(20);

    if (matchingUsers.length === 0) {
      return { success: true, data: [] };
    }

    // Fetch all friendships involving me to determine status per result
    const allMyFriendships = await db
      .select()
      .from(friendships)
      .where(
        or(eq(friendships.requesterId, me), eq(friendships.addresseeId, me)),
      );

    const results: UserSearchResult[] = matchingUsers.map((u) => {
      const row = allMyFriendships.find(
        (f) =>
          (f.requesterId === me && f.addresseeId === u.id) ||
          (f.addresseeId === me && f.requesterId === u.id),
      );

      let friendshipStatus: UserSearchResult["friendshipStatus"] = "none";
      let friendshipId: number | null = null;

      if (row) {
        friendshipId = row.id;
        if (row.status === "accepted") {
          friendshipStatus = "accepted";
        } else if (row.status === "pending") {
          friendshipStatus = row.requesterId === me ? "pending_sent" : "pending_received";
        }
        // "declined" rows are treated as "none" so either party can retry
      }

      return { ...u, friendshipStatus, friendshipId };
    });

    return { success: true, data: results };
  } catch {
    return { success: false, error: "Search failed" };
  }
}

// ─── Send Friend Request ───────────────────────────────────────────────────

export async function sendFriendRequest(data: unknown): Promise<ActionResult<void>> {
  const session = await requireSession();
  const parsed = sendFriendRequestSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const me = session.user.id;
  const { addresseeId } = parsed.data;

  if (addresseeId === me) {
    return { success: false, error: "You cannot add yourself as a friend" };
  }

  try {
    // Check the target user exists
    const target = await db.query.users.findFirst({ where: eq(users.id, addresseeId) });
    if (!target) {
      return { success: false, error: "User not found" };
    }

    // Check for any existing row in either direction (pending or accepted)
    const existing = await db.query.friendships.findFirst({
      where: or(
        and(eq(friendships.requesterId, me), eq(friendships.addresseeId, addresseeId)),
        and(eq(friendships.requesterId, addresseeId), eq(friendships.addresseeId, me)),
      ),
    });

    if (existing) {
      if (existing.status === "accepted") {
        return { success: false, error: "You are already friends" };
      }
      if (existing.status === "pending") {
        return { success: false, error: "A friend request already exists" };
      }
      // declined — delete the old row so a fresh request can be sent
      await db.delete(friendships).where(eq(friendships.id, existing.id));
    }

    await db.insert(friendships).values({
      requesterId: me,
      addresseeId,
      status: "pending",
    });

    revalidatePath("/more/friends");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to send friend request" };
  }
}

// ─── Respond to Friend Request ─────────────────────────────────────────────

export async function respondToFriendRequest(data: unknown): Promise<ActionResult<void>> {
  const session = await requireSession();
  const parsed = respondToFriendRequestSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const me = session.user.id;
  const { friendshipId, action } = parsed.data;

  try {
    const row = await db.query.friendships.findFirst({
      where: eq(friendships.id, friendshipId),
    });

    if (!row) {
      return { success: false, error: "Friend request not found" };
    }
    if (row.addresseeId !== me) {
      return { success: false, error: "Not authorised" };
    }
    if (row.status !== "pending") {
      return { success: false, error: "Request is no longer pending" };
    }

    await db
      .update(friendships)
      .set({ status: action, updatedAt: new Date() })
      .where(eq(friendships.id, friendshipId));

    revalidatePath("/more/friends");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to respond to request" };
  }
}

// ─── Remove Friend / Cancel Request ───────────────────────────────────────

export async function removeFriend(data: unknown): Promise<ActionResult<void>> {
  const session = await requireSession();
  const parsed = removeFriendSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const me = session.user.id;
  const { friendshipId } = parsed.data;

  try {
    const row = await db.query.friendships.findFirst({
      where: eq(friendships.id, friendshipId),
    });

    if (!row) {
      return { success: false, error: "Not found" };
    }
    if (row.requesterId !== me && row.addresseeId !== me) {
      return { success: false, error: "Not authorised" };
    }

    await db.delete(friendships).where(eq(friendships.id, friendshipId));

    revalidatePath("/more/friends");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to remove friend" };
  }
}

// ─── Get Friends List ──────────────────────────────────────────────────────

export async function getFriends(): Promise<ActionResult<FriendWithActivity[]>> {
  const session = await requireSession();
  const me = session.user.id;

  try {
    const rows = await db.query.friendships.findMany({
      where: and(
        or(eq(friendships.requesterId, me), eq(friendships.addresseeId, me)),
        eq(friendships.status, "accepted"),
      ),
      with: {
        requester: true,
        addressee: true,
      },
    });

    // Today's date string in local server time (YYYY-MM-DD)
    const today = new Date().toISOString().slice(0, 10);

    const result: FriendWithActivity[] = await Promise.all(
      rows.map(async (row) => {
        const friend = row.requesterId === me ? row.addressee : row.requester;

        let workedOutToday: boolean | null = null;

        if (friend.showActivityToFriends) {
          const ws = await db.query.workoutSessions.findFirst({
            where: and(
              eq(workoutSessions.userId, friend.id),
              eq(workoutSessions.isCompleted, true),
              eq(workoutSessions.date, today),
            ),
          });
          workedOutToday = !!ws;
        }

        return {
          friendshipId: row.id,
          userId: friend.id,
          name: friend.name,
          image: friend.image,
          workedOutToday,
        };
      }),
    );

    return { success: true, data: result };
  } catch {
    return { success: false, error: "Failed to load friends" };
  }
}

// ─── Get Pending Incoming Requests ────────────────────────────────────────

export async function getPendingRequests(): Promise<ActionResult<PendingRequest[]>> {
  const session = await requireSession();
  const me = session.user.id;

  try {
    const rows = await db.query.friendships.findMany({
      where: and(eq(friendships.addresseeId, me), eq(friendships.status, "pending")),
      with: { requester: true },
      orderBy: (f, { desc }) => [desc(f.createdAt)],
    });

    return {
      success: true,
      data: rows.map((row) => ({
        friendshipId: row.id,
        requesterId: row.requester.id,
        requesterName: row.requester.name,
        requesterImage: row.requester.image,
        createdAt: row.createdAt,
      })),
    };
  } catch {
    return { success: false, error: "Failed to load requests" };
  }
}

// ─── Friends Activity Feed ─────────────────────────────────────────────────

export async function getFriendsActivityFeed(): Promise<ActionResult<FriendActivityItem[]>> {
  const session = await requireSession();
  const me = session.user.id;

  try {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const rows = await db
      .select({
        friendshipId: friendships.id,
        userId: users.id,
        name: users.name,
        image: users.image,
        sessionId: workoutSessions.id,
        date: workoutSessions.date,
        startTime: workoutSessions.startTime,
        endTime: workoutSessions.endTime,
        programName: programs.name,
        feeling: workoutSessions.feeling,
        setCount: count(workoutSets.id),
        exerciseCount: sql<number>`count(distinct ${workoutSets.exerciseId})`,
        totalVolumeKg: sql<number>`coalesce(sum(${workoutSets.weightKg} * ${workoutSets.actualReps}), 0)`,
      })
      .from(friendships)
      .innerJoin(
        users,
        and(
          or(
            and(eq(friendships.requesterId, me), eq(users.id, friendships.addresseeId)),
            and(eq(friendships.addresseeId, me), eq(users.id, friendships.requesterId)),
          ),
          eq(users.showActivityToFriends, true),
        ),
      )
      .innerJoin(
        workoutSessions,
        and(
          eq(workoutSessions.userId, users.id),
          eq(workoutSessions.isCompleted, true),
          gt(workoutSessions.startTime, since),
        ),
      )
      .leftJoin(programs, eq(programs.id, workoutSessions.programId))
      .leftJoin(
        workoutSets,
        and(eq(workoutSets.sessionId, workoutSessions.id), eq(workoutSets.isCompleted, true)),
      )
      .where(
        and(
          eq(friendships.status, "accepted"),
          or(eq(friendships.requesterId, me), eq(friendships.addresseeId, me)),
        ),
      )
      .groupBy(
        friendships.id,
        users.id,
        users.name,
        users.image,
        workoutSessions.id,
        workoutSessions.date,
        workoutSessions.startTime,
        workoutSessions.endTime,
        programs.name,
        workoutSessions.feeling,
      )
      .orderBy(sql`${workoutSessions.startTime} desc`)
      .limit(20);

    const sessionIds = rows.map((r) => r.sessionId);

    // Batch-fetch PRs for these sessions (prefer estimated_1rm > weight > reps_at_weight)
    const prRows = sessionIds.length > 0
      ? await db
          .select({
            sessionId: exercisePrs.sessionId,
            exerciseName: exercises.name,
            prType: exercisePrs.prType,
            value: exercisePrs.value,
          })
          .from(exercisePrs)
          .innerJoin(exercises, eq(exercises.id, exercisePrs.exerciseId))
          .where(and(inArray(exercisePrs.sessionId, sessionIds), isNull(exercisePrs.supersededAt)))
      : [];

    // Pick one PR per session: estimated_1rm > weight > reps_at_weight
    const prPriority: Record<string, number> = { estimated_1rm: 0, weight: 1, reps_at_weight: 2 };
    const prBySession = new Map<number, { exerciseName: string; prType: string; value: number }>();
    for (const pr of prRows) {
      if (pr.sessionId == null) continue;
      const existing = prBySession.get(pr.sessionId);
      const newPriority = prPriority[pr.prType] ?? 99;
      const existingPriority = existing ? (prPriority[existing.prType] ?? 99) : 99;
      if (!existing || newPriority < existingPriority) {
        prBySession.set(pr.sessionId, {
          exerciseName: pr.exerciseName,
          prType: pr.prType,
          value: Number(pr.value),
        });
      }
    }

    // Batch-fetch reactions for these sessions
    const reactionRows = sessionIds.length > 0
      ? await db
          .select({
            sessionId: workoutReactions.sessionId,
            emoji: workoutReactions.emoji,
            reactorId: workoutReactions.userId,
          })
          .from(workoutReactions)
          .where(inArray(workoutReactions.sessionId, sessionIds))
      : [];

    // Aggregate reactions per session
    const reactionsBySession = new Map<number, Map<string, { count: number; reactedByMe: boolean }>>();
    for (const r of reactionRows) {
      if (!reactionsBySession.has(r.sessionId)) reactionsBySession.set(r.sessionId, new Map());
      const emojiMap = reactionsBySession.get(r.sessionId)!;
      const existing = emojiMap.get(r.emoji) ?? { count: 0, reactedByMe: false };
      emojiMap.set(r.emoji, {
        count: existing.count + 1,
        reactedByMe: existing.reactedByMe || r.reactorId === me,
      });
    }

    const data: FriendActivityItem[] = rows.map((r) => {
      const durationMinutes =
        r.endTime && r.startTime
          ? Math.max(1, Math.round((r.endTime.getTime() - r.startTime.getTime()) / 60000))
          : 0;

      const emojiMap = reactionsBySession.get(r.sessionId);
      const reactions: ReactionSummary[] = ["🔥", "💪", "👏"].map((emoji) => {
        const data = emojiMap?.get(emoji);
        return { emoji, count: data?.count ?? 0, reactedByMe: data?.reactedByMe ?? false };
      });

      return {
        friendshipId: r.friendshipId,
        userId: r.userId,
        name: r.name,
        image: r.image,
        sessionId: r.sessionId,
        date: r.date,
        startTime: r.startTime,
        programName: r.programName ?? null,
        durationMinutes,
        setCount: Number(r.setCount),
        exerciseCount: Number(r.exerciseCount),
        totalVolumeKg: Number(r.totalVolumeKg),
        feeling: r.feeling ?? null,
        prHighlight: prBySession.get(r.sessionId) ?? null,
        reactions,
      };
    });

    return { success: true, data };
  } catch {
    return { success: false, error: "Failed to load activity feed" };
  }
}

// ─── Activity Privacy ──────────────────────────────────────────────────────

export async function updateActivityPrivacy(data: unknown): Promise<ActionResult<void>> {
  const session = await requireSession();
  const parsed = updateActivityPrivacySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Invalid data" };
  }

  try {
    await db
      .update(users)
      .set({ showActivityToFriends: parsed.data.showActivityToFriends })
      .where(eq(users.id, session.user.id));

    revalidatePath("/more/account");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to update privacy setting" };
  }
}

// ─── Reactions ─────────────────────────────────────────────────────────────

export async function toggleReaction(
  data: unknown,
): Promise<ActionResult<{ reacted: boolean }>> {
  const session = await requireSession();
  const parsed = toggleReactionSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Invalid reaction data" };

  const { sessionId, emoji } = parsed.data;
  const me = session.user.id;

  try {
    // Verify the session belongs to an accepted friend (privacy guard)
    const [ws] = await db
      .select({ ownerId: workoutSessions.userId })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.isCompleted, true)))
      .limit(1);

    if (!ws) return { success: false, error: "Workout not found" };

    const [friendship] = await db
      .select({ id: friendships.id })
      .from(friendships)
      .where(
        and(
          eq(friendships.status, "accepted"),
          or(
            and(eq(friendships.requesterId, me), eq(friendships.addresseeId, ws.ownerId)),
            and(eq(friendships.addresseeId, me), eq(friendships.requesterId, ws.ownerId)),
          ),
        ),
      )
      .limit(1);

    if (!friendship) return { success: false, error: "Not a friend" };

    // Toggle: delete if exists, insert if not
    const [existing] = await db
      .select({ id: workoutReactions.id })
      .from(workoutReactions)
      .where(
        and(
          eq(workoutReactions.sessionId, sessionId),
          eq(workoutReactions.userId, me),
          eq(workoutReactions.emoji, emoji),
        ),
      )
      .limit(1);

    if (existing) {
      await db.delete(workoutReactions).where(eq(workoutReactions.id, existing.id));
      revalidatePath("/more/friends");
      return { success: true, data: { reacted: false } };
    }

    await db.insert(workoutReactions).values({ sessionId, userId: me, emoji });
    revalidatePath("/more/friends");
    return { success: true, data: { reacted: true } };
  } catch {
    return { success: false, error: "Failed to toggle reaction" };
  }
}
