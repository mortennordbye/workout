import type { WorkoutInsight } from "@/lib/actions/workout-sets";

const BORDER: Record<WorkoutInsight["type"], string> = {
  progressing: "border-l-4 border-primary",
  fatigued: "border-l-4 border-yellow-500",
  stagnating: "border-l-4 border-yellow-500",
  first_session: "border-l-4 border-muted-foreground/40",
  on_track: "border-l-4 border-muted-foreground/40",
};

export function WorkoutInsightBanner({ insight }: { insight: WorkoutInsight }) {
  return (
    <div className={`bg-card rounded-2xl p-4 mb-4 ${BORDER[insight.type]}`}>
      <p className="text-sm font-semibold text-foreground leading-snug">
        {insight.headline}
      </p>
      {insight.detail && (
        <p className="text-xs text-muted-foreground mt-1 leading-snug">
          {insight.detail}
        </p>
      )}
      {insight.cycleWeek != null && insight.cycleTotalWeeks != null && (
        <p className="text-xs text-muted-foreground mt-2">
          Week {insight.cycleWeek} of {insight.cycleTotalWeeks} in your cycle.
        </p>
      )}
    </div>
  );
}
