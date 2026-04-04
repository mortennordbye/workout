"use client";

import {
  getExerciseProgress,
  type ExerciseProgress,
  type MuscleBalance,
  type PersonalRecord,
  type WeeklyMetric,
} from "@/lib/actions/metrics";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

// ── Formatters ─────────────────────────────────────────────────────────────

const MUSCLE_LABELS: Record<string, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  abs: "Abs",
  lower_back: "Lower Back",
  full_body: "Full Body",
  cardio: "Cardio",
};

function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatDateShort(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)} kg`;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-3">
      {children}
    </h2>
  );
}

function WeeklyChart({ data }: { data: WeeklyMetric[] }) {
  const maxVolume = Math.max(...data.map((w) => w.volumeKg), 1);
  const totalVolume = data.reduce((s, w) => s + w.volumeKg, 0);
  const totalSessions = data.reduce((s, w) => s + w.sessionCount, 0);

  return (
    <div className="rounded-2xl bg-muted p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <SectionLabel>Volume · Last 8 weeks</SectionLabel>
        <div className="text-xs text-muted-foreground">
          {totalSessions} sessions
        </div>
      </div>

      <div className="text-2xl font-bold">{formatVolume(totalVolume)}</div>

      {/* Bar chart */}
      <div className="flex items-end gap-1 h-20">
        {data.map((week) => {
          const pct = maxVolume > 0 ? (week.volumeKg / maxVolume) * 100 : 0;
          return (
            <div
              key={week.weekStart}
              className="flex-1 flex flex-col items-center justify-end gap-1"
            >
              <div className="w-full relative flex flex-col justify-end" style={{ height: "60px" }}>
                {week.sessionCount > 0 && (
                  <div
                    className="w-full bg-primary/80 rounded-t-sm"
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                )}
              </div>
              <span className="text-[9px] text-muted-foreground leading-none">
                {formatWeekLabel(week.weekStart)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Session dots */}
      <div className="flex gap-1">
        {data.map((week) => (
          <div key={week.weekStart} className="flex-1 flex justify-center">
            {week.sessionCount > 0 ? (
              <span className="text-[10px] font-medium text-primary">
                {week.sessionCount}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground/30">–</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MuscleBalanceSection({ data }: { data: MuscleBalance[] }) {
  const max = Math.max(...data.map((d) => d.setCount), 1);
  const totalSets = data.reduce((s, d) => s + d.setCount, 0);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl bg-muted p-4">
        <SectionLabel>Muscle Balance · Last 28 days</SectionLabel>
        <p className="text-sm text-muted-foreground">No workouts logged yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-muted p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <SectionLabel>Muscle Balance · Last 28 days</SectionLabel>
        <span className="text-xs text-muted-foreground">{totalSets} sets</span>
      </div>

      <div className="space-y-2">
        {data.map((row) => {
          const pct = (row.setCount / max) * 100;
          return (
            <div key={row.muscleGroup} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">
                  {MUSCLE_LABELS[row.muscleGroup] ?? row.muscleGroup}
                </span>
                <span className="text-xs text-muted-foreground">
                  {row.setCount} sets
                </span>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgressChart({ data, exerciseName }: { data: ExerciseProgress[]; exerciseName: string }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No weight data recorded yet.
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.maxWeightKg));
  const min = Math.min(...data.map((d) => d.maxWeightKg));
  const gain = max - data[0].maxWeightKg;

  if (data.length === 1) {
    return (
      <div className="text-center py-4 space-y-1">
        <div className="text-3xl font-bold">{data[0].maxWeightKg} kg</div>
        <div className="text-xs text-muted-foreground">
          First session · {formatDateShort(data[0].date)}
        </div>
      </div>
    );
  }

  // SVG line chart
  const W = 280;
  const H = 56;
  const PAD = 8;
  const range = max - min || 1;
  const pts = data.map((d, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - 2 * PAD),
    y: H - PAD - ((d.maxWeightKg - min) / range) * (H - 2 * PAD),
  }));
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold">{max} kg</span>
        {gain > 0 && (
          <span className="text-sm text-green-600 font-medium">
            +{gain} kg
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {data.length} sessions
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14">
        {/* Area fill */}
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" className="text-primary" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-primary" />
          </linearGradient>
        </defs>
        <polygon
          points={`${pts[0].x},${H} ${polyline} ${pts[pts.length - 1].x},${H}`}
          fill="url(#areaGrad)"
        />
        <polyline
          points={polyline}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        />
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="currentColor"
            className="text-primary"
          />
        ))}
      </svg>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{formatDateShort(data[0].date)}</span>
        <span>{formatDateShort(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

type Props = {
  userId: string;
  weekly: WeeklyMetric[];
  personalRecords: PersonalRecord[];
  muscleBalance: MuscleBalance[];
  initialProgress: ExerciseProgress[];
  initialExerciseId: number | null;
};

export function MetricsClient({
  userId,
  weekly,
  personalRecords,
  muscleBalance,
  initialProgress,
  initialExerciseId,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(initialExerciseId);
  const [progressData, setProgressData] = useState<ExerciseProgress[]>(initialProgress);
  const [isPending, startTransition] = useTransition();

  const selectedRecord = personalRecords.find((r) => r.exerciseId === selectedId);

  function selectExercise(exerciseId: number) {
    if (exerciseId === selectedId) return;
    setSelectedId(exerciseId);
    startTransition(async () => {
      const result = await getExerciseProgress(userId, exerciseId);
      if (result.success) setProgressData(result.data);
    });
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
        <h1 className="text-3xl font-bold tracking-tight">Metrics</h1>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-8">

        {/* ── Volume & Frequency ─────────────────────────────────── */}
        <WeeklyChart data={weekly} />

        {/* ── Muscle Balance ─────────────────────────────────────── */}
        <MuscleBalanceSection data={muscleBalance} />

        {/* ── Personal Records ───────────────────────────────────── */}
        <div className="rounded-2xl bg-muted p-4">
          <SectionLabel>Personal Records</SectionLabel>

          {personalRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lifts recorded yet.</p>
          ) : (
            <div className="divide-y divide-border -mx-1">
              {personalRecords.map((pr, i) => {
                const isSelected = pr.exerciseId === selectedId;
                return (
                  <button
                    key={pr.exerciseId}
                    onClick={() => selectExercise(pr.exerciseId)}
                    className={`w-full flex items-center gap-3 px-1 py-2.5 text-left active:bg-background/50 transition-colors rounded-lg ${
                      isSelected ? "bg-background/70" : ""
                    }`}
                  >
                    <span className="w-5 text-xs text-muted-foreground text-center flex-none">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {pr.exerciseName}
                      </div>
                      {pr.muscleGroup && (
                        <div className="text-xs text-muted-foreground">
                          {MUSCLE_LABELS[pr.muscleGroup] ?? pr.muscleGroup}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-semibold tabular-nums flex-none">
                      {pr.maxWeightKg} kg
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 flex-none transition-colors ${
                        isSelected ? "text-primary" : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Exercise Progress ──────────────────────────────────── */}
        {selectedRecord && (
          <div className="rounded-2xl bg-muted p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionLabel>Progress · {selectedRecord.exerciseName}</SectionLabel>
              {isPending && (
                <span className="text-xs text-muted-foreground">Loading…</span>
              )}
              <TrendingUp className="w-4 h-4 text-muted-foreground flex-none" />
            </div>
            {!isPending && (
              <ProgressChart
                data={progressData}
                exerciseName={selectedRecord.exerciseName}
              />
            )}
          </div>
        )}

        {!selectedRecord && personalRecords.length > 0 && (
          <p className="text-xs text-center text-muted-foreground pb-2">
            Tap a record to see its progress chart
          </p>
        )}
      </main>
    </div>
  );
}
