/**
 * Home Page - Workout Statistics Dashboard
 *
 * Displays workout statistics and quick start button
 */

import { ThemeToggle } from "@/components/ui/theme-toggle";
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <h1 className="text-xl font-bold tracking-tight">Workout App</h1>
        <ThemeToggle />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center px-6 pt-8">
        {/* Main stats */}
        <div className="text-center mb-8">
          <div className="text-8xl font-bold mb-2">{stats.totalWorkouts}</div>
          <div className="text-sm text-muted-foreground uppercase tracking-wider">
            Workouts
          </div>
        </div>

        {/* Reps and Sets stats */}
        <div className="flex gap-8 mb-12">
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
        <div className="w-full max-w-sm mb-12">
          <div className="text-center mb-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
              Workouts Per Week
            </div>
            <div className="flex items-center justify-center gap-4">
              {/* Circular progress indicator */}
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - weeklyProgress / 100)}`}
                    className="text-primary"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-4xl font-bold">
                  {stats.workoutsPerWeek}/{stats.weeklyGoal}
                </div>
                <div className="text-xs text-muted-foreground max-w-[200px]">
                  You averaged {stats.workoutsPerWeek} workouts a week over the
                  last 30 days
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Start Workout Button */}
        <Link href="/programs">
          <button
            className="
              w-40 h-40 rounded-full
              border-4 border-primary
              flex items-center justify-center
              text-primary font-semibold text-lg text-center leading-snug
              hover:bg-primary/10 active:scale-95 transition-transform
            "
          >
            Start
            <br />
            Workout
          </button>
        </Link>

        {/* Measurements link */}
        <Link
          href="/measurements"
          className="text-primary text-sm font-medium hover:opacity-80 mt-8"
        >
          Measurements
        </Link>
      </div>
    </div>
  );
}
