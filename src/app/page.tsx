import { TodayBanner } from "@/components/features/TodayBanner";
import { WeeklyGoalProgress } from "@/components/features/WeeklyGoalProgress";
import { getActiveCycleForUser } from "@/lib/actions/training-cycles";
import { getWorkoutStats } from "@/lib/actions/workout-sets";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = 1;

export default async function Home() {
  const [statsResult, cycleResult] = await Promise.all([
    getWorkoutStats(DEMO_USER_ID),
    getActiveCycleForUser(DEMO_USER_ID),
  ]);
  const stats = statsResult.success
    ? statsResult.data
    : { totalWorkouts: 0, totalReps: 0, totalSets: 0, thisWeekWorkouts: 0 };
  const activeCycleInfo = cycleResult.success ? cycleResult.data : null;

  return (
    <div className="h-[100dvh] pb-16 bg-background flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center px-6 pt-6 pb-2">
        <h1 className="text-xl font-bold tracking-tight">Workout App</h1>
      </div>

      {/* Main content — evenly distributed to fill the screen */}
      <div className="flex-1 flex flex-col items-center justify-evenly px-6">
        {/* Main stats */}
        <div className="text-center">
          <div className="text-7xl font-bold mb-1">{stats.totalWorkouts}</div>
          <div className="text-sm text-muted-foreground uppercase tracking-wider">
            Workouts
          </div>
        </div>

        {/* Reps and Sets stats */}
        <div className="flex gap-10">
          <div className="text-center">
            <div className="text-3xl font-bold">
              {stats.totalReps.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Reps
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">
              {stats.totalSets.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Sets
            </div>
          </div>
        </div>

        {/* Active cycle — today's program */}
        {activeCycleInfo && <TodayBanner info={activeCycleInfo} />}

        {/* Weekly progress — reads goal from localStorage via client component */}
        <WeeklyGoalProgress thisWeekWorkouts={stats.thisWeekWorkouts} />

        {/* Start Workout Button */}
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
  );
}
