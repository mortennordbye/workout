"use client";

import { authClient } from "@/lib/auth-client";
import { LogOut } from "lucide-react";

interface AccountClientProps {
  name: string;
  email: string;
  role: string;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
      {children}
    </p>
  );
}

export function AccountClient({ name, email, role }: AccountClientProps) {
  async function handleSignOut() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-2 pb-nav-safe-lg flex flex-col gap-6">

      {/* Profile */}
      <div>
        <SectionLabel>Profile</SectionLabel>
        <div className="rounded-xl bg-muted overflow-hidden divide-y divide-border/50">
          <div className="px-4 py-3.5">
            <p className="text-xs text-muted-foreground mb-0.5">Name</p>
            <p className="text-sm font-medium">{name}</p>
          </div>
          <div className="px-4 py-3.5">
            <p className="text-xs text-muted-foreground mb-0.5">Email</p>
            <p className="text-sm font-medium">{email}</p>
          </div>
          <div className="px-4 py-3.5">
            <p className="text-xs text-muted-foreground mb-0.5">Role</p>
            <p className="text-sm font-medium capitalize">{role}</p>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div>
        <SectionLabel>Session</SectionLabel>
        <div className="rounded-xl bg-muted overflow-hidden">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3.5 active:opacity-60"
          >
            <LogOut className="w-5 h-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">Sign Out</span>
          </button>
        </div>
      </div>

    </div>
  );
}
