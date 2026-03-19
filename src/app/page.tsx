import { WeeklyGoalProgress } from "@/components/features/WeeklyGoalProgress";
import { getActiveCycleForUser } from "@/lib/actions/training-cycles";
import { getCompletedSessions, getWorkoutStats } from "@/lib/actions/workout-sets";
import type { ActiveCycleInfo } from "@/types/workout";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = 1;

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

function CycleProgressCard({ info }: { info: ActiveCycleInfo }) {
  const { cycle, currentWeek, endDate } = info;
  const progressPct = Math.min(((currentWeek - 1) / cycle.durationWeeks) * 100, 100);
  const weeksLeft = cycle.durationWeeks - currentWeek + 1;
  const endFormatted = new Date(endDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-2xl bg-muted p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
            Active Cycle
          </p>
          <h2 className="text-base font-bold">{cycle.name}</h2>
        </div>
        <span className="text-xs font-semibold bg-green-500/15 text-green-600 px-2 py-0.5 rounded-full">
          Week {currentWeek}/{cycle.durationWeeks}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{weeksLeft} week{weeksLeft !== 1 ? "s" : ""} remaining</span>
        <span>Ends {endFormatted}</span>
      </div>
    </div>
  );
}

function WeekScheduleStrip({
  info,
  completedDates,
}: {
  info: ActiveCycleInfo;
  completedDates: Set<string>;
}) {
  const { cycle } = info;
  if (cycle.scheduleType !== "day_of_week") return null;

  const todayStr = toDateStr(new Date());
  const weekDates = getThisWeekDates();

  // Map dayOfWeek (1=Mon…7=Sun) → slot
  const slotByDay = Object.fromEntries(
    cycle.slots
      .filter((s) => s.dayOfWeek !== null)
      .map((s) => [s.dayOfWeek!, s]),
  );

  return (
    <div className="rounded-2xl bg-muted p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        This Week
      </p>
      <div className="grid grid-cols-7 gap-1">
        {weekDates.map((dateStr, i) => {
          const dayOfWeek = i + 1; // 1=Mon…7=Sun
          const slot = slotByDay[dayOfWeek];
          const program = slot?.program ?? null;
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          const isCompleted = completedDates.has(dateStr);
          const isRestDay = !slot || !program;

          return (
            <div
              key={dateStr}
              className={`flex flex-col items-center gap-1 py-2 rounded-xl ${
                isToday ? "bg-primary/10 ring-1 ring-primary" : ""
              }`}
            >
              {/* Day label */}
              <span
                className={`text-[10px] font-semibold uppercase ${
                  isToday ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {DAY_LABELS[i].slice(0, 3)}
              </span>

              {/* Completion / schedule dot */}
              {isCompleted ? (
                <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : isRestDay ? (
                <span className={`w-5 h-5 rounded-full border-2 ${isPast ? "border-muted-foreground/20" : "border-border"}`} />
              ) : (
                <span className={`w-5 h-5 rounded-full border-2 ${isToday ? "border-primary" : isPast ? "border-muted-foreground/30" : "border-primary/40"}`} />
              )}

              {/* Program name */}
              <span
                className={`text-[9px] font-medium text-center leading-tight px-0.5 ${
                  isRestDay
                    ? "text-muted-foreground/40"
                    : isToday
                      ? "text-primary"
                      : isPast
                        ? "text-muted-foreground/60"
                        : "text-foreground"
                }`}
                style={{ maxWidth: "100%", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
              >
                {isRestDay ? "Rest" : program!.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RotationStrip({ info }: { info: ActiveCycleInfo }) {
  const { cycle, todaySlot } = info;
  if (cycle.scheduleType !== "rotation") return null;

  const sorted = [...cycle.slots].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
  );
  const currentIndex = todaySlot ? sorted.findIndex((s) => s.id === todaySlot.id) : -1;

  return (
    <div className="rounded-2xl bg-muted p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Rotation
      </p>
      <div className="flex flex-col gap-1">
        {sorted.map((slot, i) => {
          const isCurrent = i === currentIndex;
          return (
            <div
              key={slot.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isCurrent ? "bg-primary/10 ring-1 ring-primary" : ""}`}
            >
              <span className={`text-xs font-bold w-5 text-center ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                {slot.orderIndex}
              </span>
              <span className={`text-sm font-medium flex-1 ${isCurrent ? "text-primary" : ""}`}>
                {slot.program?.name ?? slot.label ?? "Rest"}
              </span>
              {isCurrent && (
                <span className="text-xs text-primary font-semibold">Next</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
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
  const activeCycleInfo = cycleResult.success ? cycleResult.data : null;
  const completedDates = new Set(
    sessionsResult.success ? sessionsResult.data.map((s) => s.date) : [],
  );

  return (
    <div className="h-[100dvh] pb-16 bg-background flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <h1 className="text-xl font-bold tracking-tight">Workout App</h1>
      </div>

      <div className="flex flex-col gap-4 px-6 pb-6">
        {/* Cycle progress */}
        {activeCycleInfo && <CycleProgressCard info={activeCycleInfo} />}

        {/* Week schedule (day_of_week) or rotation strip */}
        {activeCycleInfo && activeCycleInfo.cycle.scheduleType === "day_of_week" && (
          <WeekScheduleStrip info={activeCycleInfo} completedDates={completedDates} />
        )}
        {activeCycleInfo && activeCycleInfo.cycle.scheduleType === "rotation" && (
          <RotationStrip info={activeCycleInfo} />
        )}

        {/* No cycle CTA */}
        {!activeCycleInfo && (
          <div className="rounded-2xl bg-muted px-4 py-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">No active cycle</p>
              <p className="text-xs text-muted-foreground mt-0.5">Start a training block to track your plan</p>
            </div>
            <Link
              href="/cycles"
              className="text-xs font-semibold text-primary border border-primary/30 rounded-xl px-3 py-2 active:opacity-70"
            >
              Cycles
            </Link>
          </div>
        )}

        {/* Weekly goal */}
        <WeeklyGoalProgress thisWeekWorkouts={stats.thisWeekWorkouts} />

        {/* Start Workout */}
        <div className="flex justify-center pt-2 pb-4">
          <Link href="/new-workout">
            <button
              className="
                w-36 h-36 rounded-full
                border-4 border-primary
                flex items-center justify-center
                text-primary font-semibold text-lg text-center leading-snug
                active:scale-95 transition-transform
              "
            >
              Start
              <br />
              Workout
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
