import { CycleCalendarClient } from "@/components/features/CycleCalendarClient";
import { getAllCyclesWithSlots } from "@/lib/actions/training-cycles";
import { getCompletedSessions } from "@/lib/actions/workout-sets";
import { requireSession } from "@/lib/utils/session";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await requireSession();
  const [cyclesResult, sessionsResult] = await Promise.all([
    getAllCyclesWithSlots(session.user.id),
    getCompletedSessions(session.user.id),
  ]);

  const cycles = cyclesResult.success ? cyclesResult.data : [];
  const completedDates = sessionsResult.success
    ? sessionsResult.data.map((s) => s.date)
    : [];

  return (
    <div className="h-[100dvh] pb-nav-safe bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 pt-6 pb-2 shrink-0">
        <Link href="/more" className="flex items-center gap-0.5 text-primary active:opacity-70 -ml-1">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">More</span>
        </Link>
      </div>

      <div className="px-4 pt-2 pb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
      </div>

      <CycleCalendarClient cycles={cycles} completedDates={completedDates} />
    </div>
  );
}
