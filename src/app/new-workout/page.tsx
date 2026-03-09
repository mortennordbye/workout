/**
 * New Workout Page – Program Selection
 *
 * Shown after tapping "Start Workout" on the home screen.
 * Users pick a program (loaded from the DB) or "No Program" to start a
 * free-form session. Program options link to the workout page; "No Program"
 * also links to the workout page without a program context.
 */

import { getPrograms } from "@/lib/actions/programs";
import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = 1;

export default async function NewWorkoutPage() {
  const result = await getPrograms(DEMO_USER_ID);
  const programs = result.success ? result.data : [];

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 pt-6">
      {/* Back navigation */}
      <Link
        href="/"
        className="flex items-center gap-1 text-primary mb-6 w-fit"
      >
        <ChevronLeftIcon className="h-5 w-5" />
        <span className="text-sm font-medium">Home</span>
      </Link>

      <h1 className="text-3xl font-bold tracking-tight mb-8">New Workout</h1>

      {/* Programs from DB */}
      {programs.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-xl bg-muted overflow-hidden mb-4">
          {programs.map((program) => (
            <Link
              key={program.id}
              href="/workout"
              className="px-5 py-4 text-base font-medium hover:bg-muted/70 active:bg-muted/50 transition-colors"
            >
              {program.name}
            </Link>
          ))}
        </div>
      )}

      {/* No Program – always shown, visually separated */}
      <div className="rounded-xl bg-muted overflow-hidden">
        <Link
          href="/workout"
          className="block px-5 py-4 text-base font-medium hover:bg-muted/70 active:bg-muted/50 transition-colors"
        >
          No Program
        </Link>
      </div>
    </div>
  );
}
