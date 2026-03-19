import { CycleCalendarClient } from "@/components/features/CycleCalendarClient";
import { getAllCyclesWithSlots } from "@/lib/actions/training-cycles";
import { getCompletedSessions } from "@/lib/actions/workout-sets";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = 1;

export default async function CalendarPage() {
  const [cyclesResult, sessionsResult] = await Promise.all([
    getAllCyclesWithSlots(DEMO_USER_ID),
    getCompletedSessions(DEMO_USER_ID),
  ]);

  const cycles = cyclesResult.success ? cyclesResult.data : [];
  const completedDates = sessionsResult.success
    ? sessionsResult.data.map((s) => s.date)
    : [];

  return (
    <div className="h-[100dvh] pb-16 bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2 shrink-0">
        <Link href="/more" className="text-primary text-sm font-medium">
          &lt; More
        </Link>
        <span className="w-16" />
      </div>

      <div className="px-4 pt-2 pb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
      </div>

      <CycleCalendarClient cycles={cycles} completedDates={completedDates} />
    </div>
  );
}
