"use client";

import { useTheme } from "@/components/ui/theme-provider";

export function WeeklyGoalProgress({
  thisWeekWorkouts,
}: {
  thisWeekWorkouts: number;
}) {
  const { weeklyGoal } = useTheme();
  const progress = Math.min((thisWeekWorkouts / weeklyGoal) * 100, 100);
  const remaining = Math.max(weeklyGoal - thisWeekWorkouts, 0);

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">
        Workouts Per Week
      </div>
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="26"
            stroke="currentColor"
            strokeWidth="5"
            fill="none"
            className="text-border/40"
          />
          <circle
            cx="32"
            cy="32"
            r="26"
            stroke="currentColor"
            strokeWidth="5"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 26}`}
            strokeDashoffset={`${2 * Math.PI * 26 * (1 - progress / 100)}`}
            className="text-primary"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold tabular-nums">
            {thisWeekWorkouts}/{weeklyGoal}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {remaining === 0 ? "Weekly goal reached 🎉" : `${remaining} more to reach your goal`}
      </p>
    </div>
  );
}
