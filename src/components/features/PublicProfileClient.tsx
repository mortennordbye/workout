"use client";

import { removeFriend, respondToFriendRequest, sendFriendRequest } from "@/lib/actions/friends";
import { Check, Dumbbell, Loader2, UserCheck, UserMinus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type FriendshipStatus = "none" | "pending_sent" | "pending_received" | "accepted";

interface Profile {
  id: string;
  name: string;
  image: string | null;
  workedOutToday: boolean | null;
}

interface Props {
  profile: Profile;
  friendshipStatus: FriendshipStatus;
  friendshipId: number | null;
}

export function PublicProfileClient({ profile, friendshipStatus: initialStatus, friendshipId: initialFriendshipId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [friendshipId, setFriendshipId] = useState(initialFriendshipId);
  const [loading, setLoading] = useState(false);

  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleAction() {
    setLoading(true);

    if (status === "none") {
      const result = await sendFriendRequest({ addresseeId: profile.id });
      if (result.success) setStatus("pending_sent");
    } else if (status === "pending_sent" && friendshipId) {
      const result = await removeFriend({ friendshipId });
      if (result.success) { setStatus("none"); setFriendshipId(null); }
    } else if (status === "pending_received" && friendshipId) {
      const result = await respondToFriendRequest({ friendshipId, action: "accepted" });
      if (result.success) setStatus("accepted");
    } else if (status === "accepted" && friendshipId) {
      const result = await removeFriend({ friendshipId });
      if (result.success) { setStatus("none"); setFriendshipId(null); }
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Profile header */}
      <div className="flex flex-col items-center gap-4 py-8 px-4">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {profile.image ? (
            <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-muted-foreground">{initials}</span>
          )}
        </div>

        <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>

        {/* Activity badge */}
        {profile.workedOutToday !== null && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
              profile.workedOutToday
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            {profile.workedOutToday ? "Worked out today" : "No workout today"}
          </div>
        )}

        {/* Friendship action button */}
        <button
          onClick={handleAction}
          disabled={loading}
          className={`flex items-center gap-2 h-11 px-6 rounded-xl font-medium text-sm active:opacity-80 disabled:opacity-50 ${
            status === "accepted"
              ? "border border-border text-foreground"
              : status === "pending_sent"
              ? "border border-border text-muted-foreground"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : status === "accepted" ? (
            <>
              <UserMinus className="w-4 h-4" />
              Remove Friend
            </>
          ) : status === "pending_sent" ? (
            <>
              <UserCheck className="w-4 h-4" />
              Request Sent
            </>
          ) : status === "pending_received" ? (
            <>
              <Check className="w-4 h-4" />
              Accept Request
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Add Friend
            </>
          )}
        </button>
      </div>
    </div>
  );
}
