/**
 * Active Workout Session Page
 *
 * Shows the workout in progress for a selected program.
 * Users can check off exercises and see their progress.
 */

import { WorkoutExerciseList } from "@/components/features/WorkoutExerciseList";
import { getProgramWithExercises } from "@/lib/actions/programs";
import type { ProgramSet } from "@/types/workout";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

/** Format a single set into a compact summary token */
function setToken(s: ProgramSet): string {
  if (s.durationSeconds != null) {
    return formatTime(Number(s.durationSeconds));
  }
  return `${s.targetReps ?? "?"}x${Number(s.weightKg ?? 0)}kg`;
}

/** Format rest time */
function restToken(s: ProgramSet): string {
  return formatTime(Number(s.restTimeSeconds));
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const sec = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

/** Build the set summary line */
function buildSetSummary(sets: ProgramSet[]): string {
  if (sets.length === 0) return "";
  const tokens = sets.map((s) => `${setToken(s)}; ${restToken(s)}`);
  // Show first few sets, then ellipsis if too many
  if (tokens.length > 3) {
    return tokens.slice(0, 3).join("; ") + "; ...";
  }
  return tokens.join("; ");
}

export default async function WorkoutSessionPage({ params }: Props) {
  const { id } = await params;
  const programId = Number(id);
  if (isNaN(programId)) notFound();

  const result = await getProgramWithExercises(programId);
  if (!result.success) notFound();

  const program = result.data;

  const exercises = program.programExercises.map((pe) => ({
    id: pe.id,
    name: pe.exercise.name,
    sets: pe.programSets,
  }));

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 shrink-0">
        <Link href="/" className="text-primary text-sm font-medium">
          &lt; New Workout
        </Link>
        <h1 className="text-xl font-bold">{program.name}</h1>
        <Link
          href={`/programs/${programId}`}
          className="text-primary text-sm font-medium"
        >
          Edit
        </Link>
      </div>

      {/* Status badge */}
      <div className="px-4 pb-4 shrink-0">
        <div className="inline-block text-primary text-sm font-medium">
          In Progress
        </div>
      </div>

      {/* Exercises list - scrollable when long */}
      <div className="flex-1 px-4 overflow-y-auto">
        <WorkoutExerciseList programId={programId} exercises={exercises} />
      </div>

      {/* History section */}
      <div className="px-4 py-6 border-t border-border shrink-0">
        <h2 className="text-primary text-lg font-medium mb-2">History</h2>
        <p className="text-sm text-muted-foreground">
          You have completed this program 0 times...
        </p>
      </div>

      {/* Finish button */}
      <div className="px-4 pb-6 shrink-0">
        <button className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold">
          Finish Workout
        </button>
      </div>
    </div>
  );
}
