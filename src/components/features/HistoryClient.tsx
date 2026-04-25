"use client";

import { formatDuration } from "@/lib/utils/format";
import type { SessionWithStats } from "@/types/workout";
import { Calendar, ChevronLeft } from "lucide-react";
import Link from "next/link";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function HistoryClient({ sessions }: { sessions: SessionWithStats[] }) {
  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <div className="flex items-center px-4 pt-6 pb-2 shrink-0">
        <Link href="/more" className="flex items-center gap-0.5 text-primary active:opacity-70 -ml-1">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
      </div>
      <div className="px-4 pt-2 pb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 pb-nav-safe">
            <Calendar className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Complete a workout to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-nav-safe">
            {sessions.map((session) => (
              <Link key={session.id} href={`/history/${session.id}`}>
                <div className="bg-card rounded-2xl p-4 active:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">
                        {session.programName ?? "Ad hoc workout"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {formatDate(new Date(session.startTime))}
                      </p>
                    </div>
                    {session.durationMinutes > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(session.durationMinutes)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {session.setCount === 0 ? (
                      <span className="text-xs text-muted-foreground/60 italic px-0.5">
                        No sets tracked
                      </span>
                    ) : (
                      <>
                        <span className="text-xs bg-muted rounded-full px-2.5 py-1">
                          {session.setCount} {session.setCount === 1 ? "set" : "sets"}
                        </span>
                        <span className="text-xs bg-muted rounded-full px-2.5 py-1">
                          {session.exerciseCount} {session.exerciseCount === 1 ? "exercise" : "exercises"}
                        </span>
                        {session.totalVolumeKg > 0 && (
                          <span className="text-xs bg-muted rounded-full px-2.5 py-1">
                            {session.totalVolumeKg.toLocaleString()}kg
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
