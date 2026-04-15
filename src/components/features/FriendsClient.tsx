"use client";

import { respondToFriendRequest, removeFriend } from "@/lib/actions/friends";
import type { FriendWithActivity, PendingRequest } from "@/types/workout";
import { Dumbbell, UserPlus, Users, ChevronRight, Check, X, UserMinus, Gift } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  friends: FriendWithActivity[];
  pendingRequests: PendingRequest[];
  currentUserId: string;
}

function Avatar({ name, image, size = 10 }: { name: string; image: string | null; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`w-${size} h-${size} rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0`}
    >
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-sm font-semibold text-muted-foreground">{initials}</span>
      )}
    </div>
  );
}

function PendingRequestRow({
  request,
  onAccept,
  onDecline,
  loading,
}: {
  request: PendingRequest;
  onAccept: () => void;
  onDecline: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar name={request.requesterName} image={request.requesterImage} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{request.requesterName}</p>
        <p className="text-sm text-muted-foreground">Wants to be your friend</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onDecline}
          disabled={loading}
          className="w-9 h-9 rounded-full border border-border flex items-center justify-center active:opacity-70 disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={onAccept}
          disabled={loading}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:opacity-70 disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function FriendRow({
  friend,
  onRemove,
  removing,
}: {
  friend: FriendWithActivity;
  onRemove: () => void;
  removing: boolean;
}) {
  const [showRemove, setShowRemove] = useState(false);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link href={`/more/friends/${friend.userId}`} className="flex-1 flex items-center gap-3 min-w-0">
        <Avatar name={friend.name} image={friend.image} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{friend.name}</p>
          {friend.workedOutToday !== null && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              {friend.workedOutToday ? (
                <>
                  <Dumbbell className="w-3 h-3 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">Worked out today</span>
                </>
              ) : (
                <span>No workout today</span>
              )}
            </p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </Link>
      {showRemove ? (
        <button
          onClick={onRemove}
          disabled={removing}
          className="ml-2 text-destructive text-sm active:opacity-70 disabled:opacity-50 shrink-0"
        >
          {removing ? "Removing…" : "Remove"}
        </button>
      ) : (
        <button
          onClick={() => setShowRemove(true)}
          className="ml-2 w-8 h-8 flex items-center justify-center text-muted-foreground active:opacity-70 shrink-0"
        >
          <UserMinus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function FriendsClient({ friends, pendingRequests, currentUserId }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  async function handleRespond(friendshipId: number, action: "accepted" | "declined") {
    setLoadingId(friendshipId);
    await respondToFriendRequest({ friendshipId, action });
    setLoadingId(null);
    router.refresh();
  }

  async function handleRemove(friendshipId: number) {
    setRemovingId(friendshipId);
    await removeFriend({ friendshipId });
    setRemovingId(null);
    router.refresh();
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Action buttons */}
      <div className="px-4 py-3 flex gap-3">
        <Link
          href="/more/friends/search"
          className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm active:opacity-80"
        >
          <UserPlus className="w-4 h-4" />
          Add Friends
        </Link>
        <Link
          href="/more/friends/shared-programs"
          className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-border font-medium text-sm active:opacity-70"
        >
          <Gift className="w-4 h-4" />
          Shared Programs
        </Link>
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <section className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2">
            Friend Requests
          </p>
          <div className="divide-y divide-border border-y border-border">
            {pendingRequests.map((req) => (
              <PendingRequestRow
                key={req.friendshipId}
                request={req}
                loading={loadingId === req.friendshipId}
                onAccept={() => handleRespond(req.friendshipId, "accepted")}
                onDecline={() => handleRespond(req.friendshipId, "declined")}
              />
            ))}
          </div>
        </section>
      )}

      {/* Friends list */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2">
          {friends.length > 0 ? `Friends · ${friends.length}` : "Friends"}
        </p>
        {friends.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center px-8">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-medium">No friends yet</p>
            <p className="text-sm text-muted-foreground">Search for people you know to connect and share programs.</p>
          </div>
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {friends.map((friend) => (
              <FriendRow
                key={friend.friendshipId}
                friend={friend}
                removing={removingId === friend.friendshipId}
                onRemove={() => handleRemove(friend.friendshipId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
