"use client";

import { authClient } from "@/lib/auth-client";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string | null | undefined;
  createdAt: Date;
};

export function AdminUsersClient({ users }: { users: User[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleImpersonate(userId: string) {
    setLoadingId(userId);
    await authClient.admin.impersonateUser({ userId });
    router.push("/programs");
    router.refresh();
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      <div className="flex items-center px-4 pt-6 pb-2 shrink-0">
        <Link href="/more/admin" className="flex items-center gap-0.5 text-primary active:opacity-70 -ml-1">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Admin</span>
        </Link>
      </div>
      <div className="px-4 pt-2 pb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">{users.length} accounts</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-3 px-4 py-3.5 min-h-[64px]">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.name}</p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
              {user.role === "admin" && (
                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">
                  Admin
                </span>
              )}
              <button
                type="button"
                onClick={() => handleImpersonate(user.id)}
                disabled={loadingId !== null}
                className="shrink-0 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium active:opacity-70 disabled:opacity-40"
              >
                {loadingId === user.id ? "Loading…" : "View as"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
