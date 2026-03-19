/**
 * Cycle Detail Page
 *
 * Shows the cycle's schedule builder, status, and actions.
 */

import { CycleCompletionBanner } from "@/components/features/CycleCompletionBanner";
import { DeleteCycleButton, StartCycleButton } from "@/components/features/CycleDetailClient";
import { CycleScheduleBuilder } from "@/components/features/CycleScheduleBuilder";
import { getTrainingCycleWithSlots } from "@/lib/actions/training-cycles";
import { getPrograms } from "@/lib/actions/programs";
import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = 1;

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cycleId = Number(id);
  if (isNaN(cycleId)) notFound();

  const [cycleResult, programsResult] = await Promise.all([
    getTrainingCycleWithSlots(cycleId),
    getPrograms(DEMO_USER_ID),
  ]);

  if (!cycleResult.success) notFound();

  const cycle = cycleResult.data;
  const programs = programsResult.success ? programsResult.data : [];

  const scheduleLabel =
    cycle.scheduleType === "day_of_week" ? "Day of week" : "Rotation";

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-8 pb-4">
        <Link
          href="/cycles"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-muted active:opacity-80"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight flex-1 truncate">
          {cycle.name}
        </h1>
      </div>

      <div className="flex flex-col gap-6 px-4">
        {/* Meta */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">
            {cycle.durationWeeks} weeks · {scheduleLabel}
          </span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
              cycle.status === "active"
                ? "bg-green-500/15 text-green-600"
                : cycle.status === "completed"
                  ? "bg-muted text-muted-foreground"
                  : "bg-amber-500/15 text-amber-600"
            }`}
          >
            {cycle.status}
          </span>
        </div>

        {/* Completion banner */}
        {cycle.status === "completed" && (
          <CycleCompletionBanner cycle={cycle} />
        )}

        {/* Start cycle CTA (draft only) */}
        {cycle.status === "draft" && <StartCycleButton cycle={cycle} />}

        {/* Schedule section header */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {cycle.scheduleType === "day_of_week"
              ? "Weekly Schedule"
              : "Rotation Order"}
          </p>
          <CycleScheduleBuilder cycle={cycle} programs={programs} />
        </div>

        {/* Destructive zone */}
        <div className="flex justify-center pt-4">
          <DeleteCycleButton cycleId={cycle.id} />
        </div>
      </div>
    </div>
  );
}
