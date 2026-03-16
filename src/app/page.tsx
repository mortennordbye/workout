/**
 * Home Page - Workout Statistics Dashboard
 *
 * Displays workout statistics and quick start button
 */

import Link from "next/link";

export default function Home() {
  // TODO: Replace with actual data from database
  const stats = {
    totalWorkouts: 0,
    totalReps: 0,
    totalSets: 0,
    workoutsPerWeek: 0,
    weeklyGoal: 7,
  };

  const weeklyProgress = (stats.workoutsPerWeek / stats.weeklyGoal) * 100;

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

        {/* Weekly progress */}
        <div className="w-full max-w-sm">
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
              Workouts Per Week
            </div>
            <div className="flex items-center justify-center gap-4">
              {/* Circular progress indicator */}
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 26}`}
                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - weeklyProgress / 100)}`}
                    className="text-primary"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-4xl font-bold">
                  {stats.workoutsPerWeek}/{stats.weeklyGoal}
                </div>
                <div className="text-xs text-muted-foreground max-w-[180px]">
                  You averaged {stats.workoutsPerWeek} workouts a week over the
                  last 30 days
                </div>
              </div>
            </div>
          </div>
        </div>

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
