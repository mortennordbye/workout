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
    <div className="w-full max-w-sm">
      <div className="text-center">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          Workouts Per Week
        </div>
        <div className="flex items-center justify-center gap-4">
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
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - progress / 100)}`}
                className="text-primary"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="text-left">
            <div className="text-4xl font-bold">
              {thisWeekWorkouts}/{weeklyGoal}
            </div>
            <div className="text-xs text-muted-foreground max-w-[180px]">
              {remaining === 0
                ? "Weekly goal reached"
                : `${remaining} more to reach your weekly goal`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
