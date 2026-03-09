/**
 * New Workout Page – Program Selection
 *
 * Shown after tapping "Start Workout" on the home screen.
 * Users pick a pre-defined program or choose "No Program" to start a
 * free-form session. All options navigate to the active workout page.
 *
 * Programs are currently hardcoded. When a programs table is added to the
 * database, replace the PROGRAMS constant with a server-side query.
 */

import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";

const PROGRAMS = [
  "Interval (1k)",
  "Legs 1",
  "Pull 1",
  "Push 1",
  "Upper Body 1",
];

export default function NewWorkoutPage() {
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

      {/* Program list */}
      <div className="flex flex-col gap-2 mb-4">
        {PROGRAMS.map((program) => (
          <Link
            key={program}
            href="/workout"
            className="
              bg-muted rounded-xl px-5 py-4
              text-base font-medium
              hover:bg-muted/70 active:bg-muted/50
              transition-colors
            "
          >
            {program}
          </Link>
        ))}
      </div>

      {/* No Program – visually separated */}
      <div className="flex flex-col gap-2">
        <Link
          href="/workout"
          className="
            bg-muted rounded-xl px-5 py-4
            text-base font-medium
            hover:bg-muted/70 active:bg-muted/50
            transition-colors
          "
        >
          No Program
        </Link>
      </div>
    </div>
  );
}
