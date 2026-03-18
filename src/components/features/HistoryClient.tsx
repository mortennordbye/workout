"use client";

import type { SessionWithStats } from "@/types/workout";
import { Calendar } from "lucide-react";
import Link from "next/link";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function HistoryClient({ sessions }: { sessions: SessionWithStats[] }) {
  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      <header className="flex-none px-4 pt-6 pb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 pb-16">
            <Calendar className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Complete a workout to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-16">
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
                    <span className="text-xs bg-muted rounded-full px-2.5 py-1">
                      {session.setCount} sets
                    </span>
                    <span className="text-xs bg-muted rounded-full px-2.5 py-1">
                      {session.exerciseCount} exercises
                    </span>
                    {session.totalVolumeKg > 0 && (
                      <span className="text-xs bg-muted rounded-full px-2.5 py-1">
                        {session.totalVolumeKg.toLocaleString()}kg
                      </span>
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
