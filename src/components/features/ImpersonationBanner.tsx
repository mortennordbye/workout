"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ImpersonationBanner() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const [stopping, setStopping] = useState(false);

  if (!session?.session.impersonatedBy) return null;

  async function handleStop() {
    setStopping(true);
    await authClient.admin.stopImpersonating();
    router.push("/more/admin/users");
    router.refresh();
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 bg-orange-500 px-4 py-2 text-white text-sm font-medium">
      <span>Viewing as <strong>{session.user.name}</strong> ({session.user.email})</span>
      <button
        type="button"
        onClick={handleStop}
        disabled={stopping}
        className="shrink-0 rounded-md bg-white/20 px-3 py-1 text-xs font-semibold active:bg-white/30 disabled:opacity-50"
      >
        {stopping ? "Exiting…" : "Exit"}
      </button>
    </div>
  );
}
