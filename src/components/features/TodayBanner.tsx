/**
 * TodayBanner
 *
 * Shows the current day's program from the active training cycle.
 * Displayed on the home page when a cycle is active.
 */

import type { ActiveCycleInfo } from "@/types/workout";
import Link from "next/link";

export function TodayBanner({ info }: { info: ActiveCycleInfo }) {
  const { cycle, todaySlot, currentWeek } = info;
  const programName = todaySlot?.program?.name ?? null;
  const programId = todaySlot?.program?.id ?? null;

  return (
    <div className="w-full rounded-2xl bg-muted px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          Today · Week {currentWeek} of {cycle.durationWeeks}
        </span>
        <span className="text-base font-semibold">
          {programName ?? "Rest day"}
        </span>
      </div>

      {programId && (
        <Link
          href={`/programs/${programId}/workout`}
          className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground active:scale-[0.97] transition-transform"
        >
          Start
        </Link>
      )}
    </div>
  );
}
