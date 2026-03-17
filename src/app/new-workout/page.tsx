/**
 * New Workout Page
 *
 * Program picker shown when starting a new workout from the home screen.
 */

import { getPrograms } from "@/lib/actions/programs";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = 1;

export default async function NewWorkoutPage() {
  const result = await getPrograms(DEMO_USER_ID);
  const programList = result.success ? result.data : [];

  return (
    <div className="h-[100dvh] pb-16 bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2 shrink-0">
        <Link href="/" className="text-primary text-sm font-medium">
          &lt; Home
        </Link>
        <span className="w-16" />
      </div>

      {/* Title */}
      <div className="px-4 pt-2 pb-6 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">New Workout</h1>
      </div>

      {/* Program list */}
      <div className="flex-1 overflow-y-auto px-4">
        {programList.length > 0 && (
          <div className="flex flex-col divide-y divide-border rounded-xl bg-muted overflow-hidden mb-4">
            {programList.map((program) => (
              <Link
                key={program.id}
                href={`/programs/${program.id}/workout`}
                className="flex items-center justify-between px-5 py-4 active:bg-muted/50 transition-colors"
              >
                <span className="text-base font-medium">{program.name}</span>
                <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
