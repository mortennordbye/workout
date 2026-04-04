"use client";

import { adminResetUserData, adminSeedFakeData } from "@/lib/actions/admin";
import { useWorkoutSession } from "@/contexts/workout-session-context";
import { BarChart3, ChevronLeft, ChevronRight, DatabaseZap, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Status = { type: "success" | "error"; message: string } | null;

export function AdminPanelClient() {
  const workoutSession = useWorkoutSession();
  const [seedLoading, setSeedLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function handleSeed() {
    setSeedLoading(true);
    setStatus(null);
    try {
      const result = await adminSeedFakeData();
      if (result.success) {
        setStatus({
          type: "success",
          message: `Created ${result.data.programs} programs and ${result.data.sessions} workout sessions.`,
        });
      } else {
        setStatus({ type: "error", message: result.error });
      }
    } catch (err) {
      setStatus({ type: "error", message: String(err) });
    } finally {
      setSeedLoading(false);
    }
  }

  async function handleReset() {
    setConfirmingReset(false);
    setResetLoading(true);
    setStatus(null);
    try {
      const result = await adminResetUserData();
      if (result.success) {
        workoutSession?.clearActiveWorkout();
        setStatus({
          type: "success",
          message: `Deleted ${result.data.sessions} sessions, ${result.data.programs} programs, ${result.data.cycles} cycles.`,
        });
      } else {
        setStatus({ type: "error", message: result.error });
      }
    } catch (err) {
      setStatus({ type: "error", message: String(err) });
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      <div className="flex items-center px-4 pt-6 pb-2 shrink-0">
        <Link href="/more" className="flex items-center gap-0.5 text-primary active:opacity-70 -ml-1">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">More</span>
        </Link>
      </div>
      <div className="px-4 pt-2 pb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Admin Tools</h1>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {status && (
          <div
            className={`px-4 py-3 rounded-lg text-sm ${
              status.type === "success"
                ? "bg-green-500/10 text-green-600"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {status.message}
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Users
          </h2>
          <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
            <Link
              href="/more/admin/users"
              className="w-full flex items-center gap-4 px-4 min-h-[64px] active:bg-muted/50 transition-colors"
            >
              <Users className="w-5 h-5 text-muted-foreground flex-none" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">User management</div>
                <div className="text-sm text-muted-foreground">View and impersonate users</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link
              href="/more/admin/insights"
              className="w-full flex items-center gap-4 px-4 min-h-[64px] active:bg-muted/50 transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-muted-foreground flex-none" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">Insights</div>
                <div className="text-sm text-muted-foreground">Usage analytics and engagement funnel</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Test Data
          </h2>
          <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
            <button
              onClick={handleSeed}
              disabled={seedLoading || resetLoading}
              className="w-full flex items-center gap-4 px-4 min-h-[64px] active:bg-muted/50 transition-colors disabled:opacity-50 text-left"
            >
              <DatabaseZap className="w-5 h-5 text-muted-foreground flex-none" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">Seed fake data</div>
                <div className="text-sm text-muted-foreground">
                  Add 2 programs, a training cycle, and 4 weeks of workouts
                </div>
              </div>
              {seedLoading && (
                <span className="text-sm text-muted-foreground">Running…</span>
              )}
            </button>

            {confirmingReset ? (
              <div className="flex items-center gap-3 px-4 min-h-[64px]">
                <Trash2 className="w-5 h-5 text-destructive flex-none" />
                <span className="flex-1 text-sm text-destructive font-medium">
                  Delete everything?
                </span>
                <button
                  onClick={() => setConfirmingReset(false)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-border active:bg-muted/50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-sm rounded-lg bg-destructive text-destructive-foreground active:opacity-80"
                >
                  Delete
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingReset(true)}
                disabled={seedLoading || resetLoading}
                className="w-full flex items-center gap-4 px-4 min-h-[64px] active:bg-destructive/10 transition-colors disabled:opacity-50 text-left"
              >
                <Trash2 className="w-5 h-5 text-destructive flex-none" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-destructive">
                    Reset user data
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Delete all programs, sessions, and training cycles
                  </div>
                </div>
                {resetLoading && (
                  <span className="text-sm text-muted-foreground">Running…</span>
                )}
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
