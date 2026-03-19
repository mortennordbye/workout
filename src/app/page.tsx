import { WeeklyGoalProgress } from "@/components/features/WeeklyGoalProgress";
import { getActiveCycleForUser } from "@/lib/actions/training-cycles";
import { getCompletedSessions, getWorkoutStats } from "@/lib/actions/workout-sets";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = 1;

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_LABELS_FULL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getThisWeekDates(): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toDateStr(d);
  });
}

export default async function Home() {
  const [statsResult, cycleResult, sessionsResult] = await Promise.all([
    getWorkoutStats(DEMO_USER_ID),
    getActiveCycleForUser(DEMO_USER_ID),
    getCompletedSessions(DEMO_USER_ID),
  ]);

  const stats = statsResult.success
    ? statsResult.data
    : { totalWorkouts: 0, totalReps: 0, totalSets: 0, thisWeekWorkouts: 0 };
  const info = cycleResult.success ? cycleResult.data : null;
  const completedDates = new Set(
    sessionsResult.success ? sessionsResult.data.map((s) => s.date) : [],
  );

  const todayStr = toDateStr(new Date());
  const weekDates = getThisWeekDates();

  const todayProgram = info?.todaySlot?.program ?? null;
  const isRestDay = info !== null && info.todaySlot !== null && !todayProgram;

  const slotByDay =
    info?.cycle.scheduleType === "day_of_week"
      ? Object.fromEntries(
          info.cycle.slots
            .filter((s) => s.dayOfWeek !== null)
            .map((s) => [s.dayOfWeek!, s]),
        )
      : {};

  const progressPct = info
    ? Math.min(((info.currentWeek - 1) / info.cycle.durationWeeks) * 100, 100)
    : 0;
  const endFormatted = info
    ? new Date(info.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <div className="h-[100dvh] pb-16 bg-background flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-6 pt-6 pb-3 shrink-0 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Workout App</h1>
        {info && (
          <span className="text-xs font-semibold bg-green-500/15 text-green-600 px-2.5 py-1 rounded-full">
            Week {info.currentWeek}/{info.cycle.durationWeeks}
          </span>
        )}
      </div>

      {/* Content — fills remaining space evenly */}
      <div className="flex-1 flex flex-col justify-between px-6 pb-4 min-h-0">

        {/* ── Today card ─────────────────────────────────── */}
        {info ? (
          <div className="rounded-2xl bg-muted p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {info.cycle.name}
              </span>
              <span className="text-xs text-muted-foreground">ends {endFormatted}</span>
            </div>
            <div className="w-full h-1 bg-border rounded-full overflow-hidden mb-3">
              <div className="h-full bg-primary rounded-full" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-xl font-bold mb-3">
              {todayProgram?.name ?? (isRestDay ? "Rest Day" : "No program today")}
            </p>
            {todayProgram ? (
              <Link
                href={`/programs/${todayProgram.id}/workout`}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground active:opacity-80"
              >
                Start Today's Workout ▶
              </Link>
            ) : (
              <Link
                href="/new-workout"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground active:opacity-70"
              >
                Pick a workout →
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-muted px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">No active cycle</p>
              <p className="text-xs text-muted-foreground mt-0.5">Start a block to see your plan</p>
            </div>
            <Link href="/cycles" className="text-xs font-semibold text-primary border border-primary/30 rounded-xl px-3 py-2 active:opacity-70">
              Cycles →
            </Link>
          </div>
        )}

        {/* ── Week strip ─────────────────────────────────── */}
        {info?.cycle.scheduleType === "day_of_week" && (
          <div className="rounded-2xl bg-muted px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              This Week
            </p>
            <div className="grid grid-cols-7 gap-0.5">
              {weekDates.map((dateStr, i) => {
                const slot = slotByDay[i + 1];
                const hasProgram = !!slot?.program;
                const isToday = dateStr === todayStr;
                const isPast = dateStr < todayStr;
                const isCompleted = completedDates.has(dateStr);

                return (
                  <div key={dateStr} className="flex flex-col items-center gap-1">
                    <span className={`text-[10px] font-bold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {DAY_LETTERS[i]}
                    </span>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center
                      ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-muted" : ""}
                      ${isCompleted ? "bg-primary" : hasProgram ? "border-2 border-primary/50 bg-primary/10" : "border-2 border-border/30"}`}
                    >
                      {isCompleted && (
                        <svg className="w-3.5 h-3.5 text-primary-foreground" viewBox="0 0 14 14" fill="none">
                          <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-[9px] ${isToday ? "text-primary font-semibold" : isPast ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
                      {DAY_LABELS_FULL[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rotation strip */}
        {info?.cycle.scheduleType === "rotation" && (
          <div className="rounded-2xl bg-muted px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Rotation
            </p>
            <div className="flex gap-2 flex-wrap">
              {[...info.cycle.slots]
                .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
                .map((slot) => (
                  <span
                    key={slot.id}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium
                      ${slot.id === info.todaySlot?.id ? "bg-primary text-primary-foreground" : "bg-border/50 text-muted-foreground"}`}
                  >
                    {slot.program?.name ?? slot.label ?? "Rest"}
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* ── Weekly goal ────────────────────────────────── */}
        <WeeklyGoalProgress thisWeekWorkouts={stats.thisWeekWorkouts} />

        {/* ── Start Workout ──────────────────────────────── */}
        <div className="flex justify-center">
          <Link href="/new-workout">
            <button className="w-28 h-28 rounded-full border-4 border-primary flex items-center justify-center text-primary font-bold text-base text-center leading-snug active:scale-95 transition-transform">
              Start<br />Workout
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}
