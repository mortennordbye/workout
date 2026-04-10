"use client";

import {
  getExerciseProgress,
  type ExerciseProgress,
  type MoodDistribution,
  type MuscleBalance,
  type PersonalRecord,
  type SummaryStats,
  type TopProgressingExercise,
  type WeeklyMetric,
} from "@/lib/actions/metrics";
import { estimate1RM } from "@/lib/utils/progression";
import { ChevronLeft, ChevronRight, TrendingUp, Zap } from "lucide-react";
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

function SummaryStatsRow({ stats }: { stats: SummaryStats }) {
  const cards = [
    {
      label: "Sessions",
      value: stats.totalSessions.toLocaleString(),
    },
    {
      label: "Week streak",
      value: stats.currentStreakWeeks === 0 ? "–" : `${stats.currentStreakWeeks}w`,
    },
    {
      label: "Avg. session",
      value:
        stats.avgSessionDurationMinutes < 1
          ? "–"
          : `${Math.round(stats.avgSessionDurationMinutes)}m`,
    },
    {
      label: "Total volume",
      value: formatVolume(stats.lifetimeVolumeKg),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl bg-muted p-4 flex flex-col gap-2"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {card.label}
          </span>
          <span className="text-2xl font-bold tabular-nums">{card.value}</span>
        </div>
      ))}
    </div>
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

const MOOD_CONFIG: { key: "Awesome" | "Good" | "OK" | "Tired"; color: string; label: string }[] = [
  { key: "Awesome", color: "bg-green-500", label: "Awesome" },
  { key: "Good", color: "bg-emerald-400", label: "Good" },
  { key: "OK", color: "bg-yellow-400", label: "OK" },
  { key: "Tired", color: "bg-rose-400", label: "Tired" },
];

function MoodDistributionSection({ data }: { data: MoodDistribution[] }) {
  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.count, 0);
  const byKey = new Map(data.map((d) => [d.feeling, d.count]));

  return (
    <div className="rounded-2xl bg-muted p-4 space-y-3">
      <SectionLabel>Session Mood · Last 28 days</SectionLabel>

      {/* Segmented bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {MOOD_CONFIG.map(({ key, color }) => {
          const count = byKey.get(key) ?? 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={key}
              className={`${color}`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-1">
        {MOOD_CONFIG.map(({ key, color, label }) => {
          const count = byKey.get(key) ?? 0;
          if (count === 0) return null;
          return (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${color} flex-none`} />
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-xs font-medium ml-auto">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopProgressingSection({ data }: { data: TopProgressingExercise[] }) {
  if (data.length === 0) return null;

  return (
    <div className="rounded-2xl bg-muted p-4 space-y-3">
      <div className="flex items-center justify-between">
        <SectionLabel>Top Gains · Last 8 weeks</SectionLabel>
        <Zap className="w-4 h-4 text-muted-foreground flex-none" />
      </div>
      <div className="divide-y divide-border -mx-1">
        {data.map((ex, i) => (
          <div
            key={ex.exerciseId}
            className="flex items-center gap-3 px-1 py-3 min-h-[44px]"
          >
            <span className="w-5 text-xs text-muted-foreground text-center flex-none">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{ex.exerciseName}</div>
              <div className="text-xs text-muted-foreground">
                {ex.baseline1RM} → {ex.current1RM} kg est. 1RM
              </div>
            </div>
            <div className="text-right flex-none">
              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                +{ex.gainPct}%
              </div>
              <div className="text-xs text-muted-foreground">+{ex.gainKg} kg</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type ChartMode = "weight" | "oneRM" | "volume";

function ProgressChart({
  data,
  exerciseName,
}: {
  data: ExerciseProgress[];
  exerciseName: string;
}) {
  const [mode, setMode] = useState<ChartMode>("weight");

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No weight data recorded yet.
      </p>
    );
  }

  const yValues = data.map((d) => {
    if (mode === "weight") return d.maxWeightKg;
    if (mode === "oneRM") return estimate1RM(d.maxWeightKg, d.repsAtMaxWeight);
    return d.totalVolume;
  });

  const max = Math.max(...yValues);
  const min = Math.min(...yValues);
  const current = yValues[yValues.length - 1];
  const first = yValues[0];
  const gain = current - first;

  const formatValue = (v: number) => {
    if (mode === "volume") return formatVolume(v);
    return `${v.toFixed(1)} kg`;
  };

  if (data.length === 1) {
    return (
      <div className="space-y-3">
        {/* Toggle */}
        <div className="flex gap-1 bg-background/50 rounded-xl p-1">
          {(["weight", "oneRM", "volume"] as ChartMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors min-h-[36px] ${
                mode === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {m === "weight" ? "Weight" : m === "oneRM" ? "Est. 1RM" : "Volume"}
            </button>
          ))}
        </div>
        <div className="text-center py-4 space-y-1">
          <div className="text-3xl font-bold">{formatValue(yValues[0])}</div>
          <div className="text-xs text-muted-foreground">
            First session · {formatDateShort(data[0].date)}
          </div>
        </div>
      </div>
    );
  }

  // SVG line chart
  const W = 280;
  const H = 56;
  const PAD = 8;
  const range = max - min || 1;
  const pts = yValues.map((v, i) => ({
    x: PAD + (i / (yValues.length - 1)) * (W - 2 * PAD),
    y: H - PAD - ((v - min) / range) * (H - 2 * PAD),
  }));
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-1 bg-background/50 rounded-xl p-1">
        {(["weight", "oneRM", "volume"] as ChartMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors min-h-[36px] ${
              mode === m
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {m === "weight" ? "Weight" : m === "oneRM" ? "Est. 1RM" : "Volume"}
          </button>
        ))}
      </div>

      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold">{formatValue(current)}</span>
        {gain > 0 && (
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">
            +{formatValue(gain)}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {data.length} sessions
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="currentColor"
              stopOpacity="0.15"
              className="text-primary"
            />
            <stop
              offset="100%"
              stopColor="currentColor"
              stopOpacity="0"
              className="text-primary"
            />
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
  moodDistribution: MoodDistribution[];
  summaryStats: SummaryStats | null;
  topProgressing: TopProgressingExercise[];
  initialProgress: ExerciseProgress[];
  initialExerciseId: number | null;
};

export function MetricsClient({
  userId,
  weekly,
  personalRecords,
  muscleBalance,
  moodDistribution,
  summaryStats,
  topProgressing,
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
        <Link
          href="/more"
          className="flex items-center gap-0.5 text-primary active:opacity-70 -ml-1"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">More</span>
        </Link>
      </div>
      <div className="px-4 pt-2 pb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Metrics</h1>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-nav-safe-lg">

        {/* ── Summary Stats ──────────────────────────────────────── */}
        {summaryStats && <SummaryStatsRow stats={summaryStats} />}

        {/* ── Volume & Frequency ─────────────────────────────────── */}
        <WeeklyChart data={weekly} />

        {/* ── Muscle Balance ─────────────────────────────────────── */}
        <MuscleBalanceSection data={muscleBalance} />

        {/* ── Session Mood ───────────────────────────────────────── */}
        <MoodDistributionSection data={moodDistribution} />

        {/* ── Top Gaining Exercises ──────────────────────────────── */}
        <TopProgressingSection data={topProgressing} />

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
              <div key={selectedId}>
                <ProgressChart
                  data={progressData}
                  exerciseName={selectedRecord.exerciseName}
                />
              </div>
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
