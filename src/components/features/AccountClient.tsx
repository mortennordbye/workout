"use client";

import { authClient } from "@/lib/auth-client";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CheckCircle2, KeyRound, LogOut } from "lucide-react";
import { useState } from "react";

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
  const [showPasswordSheet, setShowPasswordSheet] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleSignOut() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  function closePasswordSheet() {
    setShowPasswordSheet(false);
    setPasswordStatus("idle");
    setPasswordError(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    setPasswordStatus("saving");
    setPasswordError(null);
    const result = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    });
    if (result.error) {
      setPasswordStatus("error");
      setPasswordError(result.error.message ?? "Failed to change password.");
    } else {
      setPasswordStatus("success");
      setTimeout(() => closePasswordSheet(), 1500);
    }
  }

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-2 pb-nav-safe-lg flex flex-col gap-6">

        {/* Profile */}
        <div>
          <SectionLabel>Profile</SectionLabel>
          <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border/50">
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

        {/* Security */}
        <div>
          <SectionLabel>Security</SectionLabel>
          <div className="rounded-2xl bg-card overflow-hidden">
            <button
              onClick={() => setShowPasswordSheet(true)}
              className="flex items-center gap-3 w-full px-4 py-3.5 active:opacity-60"
            >
              <KeyRound className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">Change Password</span>
            </button>
          </div>
        </div>

        {/* Sign out */}
        <div>
          <SectionLabel>Session</SectionLabel>
          <div className="rounded-2xl bg-card overflow-hidden">
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

      {/* Change Password Sheet */}
      <BottomSheet open={showPasswordSheet} onClose={closePasswordSheet} blur>
        <div className="bg-background rounded-t-2xl flex flex-col" style={{ maxHeight: "80dvh" }}>
          <div className="flex items-center justify-between px-4 pt-5 pb-4 shrink-0">
            <h2 className="text-lg font-semibold">Change Password</h2>
            <button
              onClick={closePasswordSheet}
              className="text-primary text-sm font-medium min-h-[44px] px-1"
            >
              Cancel
            </button>
          </div>

          <div className="overflow-y-auto flex flex-col gap-4 px-4 pb-10">
            {passwordStatus === "success" ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <p className="text-base font-semibold">Password updated</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(null); }}
                    className="w-full rounded-xl bg-muted px-4 py-3.5 text-sm outline-none focus:ring-2 ring-primary"
                  />
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null); }}
                    className="w-full rounded-xl bg-muted px-4 py-3.5 text-sm outline-none focus:ring-2 ring-primary"
                  />
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(null); }}
                    className="w-full rounded-xl bg-muted px-4 py-3.5 text-sm outline-none focus:ring-2 ring-primary"
                  />
                </div>

                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}

                <button
                  onClick={handleChangePassword}
                  disabled={passwordStatus === "saving" || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full rounded-xl bg-primary py-4 text-sm font-semibold text-primary-foreground disabled:opacity-50 active:opacity-80"
                >
                  {passwordStatus === "saving" ? "Updating…" : "Update Password"}
                </button>
              </>
            )}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
