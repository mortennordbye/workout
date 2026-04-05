import { WeeklyGoalProgress } from "@/components/features/WeeklyGoalProgress";
import { getActiveCycleForUser } from "@/lib/actions/training-cycles";
import { getCompletedSessions, getWorkoutStats } from "@/lib/actions/workout-sets";
import { requireSession } from "@/lib/utils/session";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
  const session = await requireSession();
  const userId = session.user.id;

  const [statsResult, cycleResult, sessionsResult] = await Promise.all([
    getWorkoutStats(userId),
    getActiveCycleForUser(userId),
    getCompletedSessions(userId),
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
    <div className="h-[100dvh] pb-nav-safe bg-background flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-6 pt-6 pb-3 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-center">LogEveryLift</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-3 px-6 min-h-0 overflow-hidden pb-4">

        {/* ── Today card ─────────────────────────────────── */}
        {info ? (
          <div className="rounded-2xl bg-muted p-4 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold">{info.cycle.name}</span>
              <span className="text-xs text-muted-foreground">Week {info.currentWeek}/{info.cycle.durationWeeks}</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">ends {endFormatted}</span>
            </div>
            <p className="text-xl font-bold mb-3">
              {todayProgram?.name ?? (isRestDay ? "Rest Day" : "No program today")}
            </p>
            {todayProgram ? (
              <div className="flex gap-2 flex-wrap">
                <Link
                  href={`/programs/${todayProgram.id}/workout`}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground active:opacity-80"
                >
                  Start Today's Workout
                </Link>
                <Link
                  href="/new-workout"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground active:opacity-70"
                >
                  Different Program
                </Link>
              </div>
            ) : (
              <Link
                href="/new-workout"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground active:opacity-70"
              >
                Start a Workout →
              </Link>
            )}
          </div>
        ) : null}

        {/* ── Week strip ─────────────────────────────────── */}
        {info?.cycle.scheduleType === "day_of_week" && (
          <div className="rounded-2xl bg-muted px-4 pt-3 pb-5 flex-1 flex flex-col gap-3 overflow-hidden">
            <div>
              <Link href="/more/calendar" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1 active:opacity-60">
                This Week ›
              </Link>
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
            <div className="border-t border-border/30 pt-3">
              <WeeklyGoalProgress thisWeekWorkouts={stats.thisWeekWorkouts} />
            </div>
          </div>
        )}

        {/* Rotation strip */}
        {info?.cycle.scheduleType === "rotation" && (
          <div className="rounded-2xl bg-muted px-4 pt-3 pb-5 flex-1 flex flex-col gap-3 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
            <div className="border-t border-border/30 pt-3">
              <WeeklyGoalProgress thisWeekWorkouts={stats.thisWeekWorkouts} />
            </div>
          </div>
        )}

        {/* ── No cycle: progress ring ───────────────────── */}
        {!info && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-0">
            <WeeklyGoalProgress thisWeekWorkouts={stats.thisWeekWorkouts} size="lg" />
          </div>
        )}

      </div>

      {/* No-cycle actions — pinned above nav bar */}
      {!info && (
        <div className="px-6 pb-4 space-y-3 shrink-0">
          <Link
            href="/new-workout"
            className="flex items-center justify-center w-full rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground active:opacity-80"
          >
            Start a Workout
          </Link>
          <Link
            href="/cycles"
            className="flex items-center justify-center w-full rounded-2xl bg-muted py-4 text-sm font-medium text-foreground active:opacity-70"
          >
            Set up a Training Cycle
          </Link>
        </div>
      )}

    </div>
  );
}
