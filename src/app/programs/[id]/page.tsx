/**
 * Program Detail Page
 *
 * Shows all exercises in a program and their planned sets summary.
 * Allows adding new exercises to the program.
 */

import { AddExerciseForm } from "@/components/features/AddExerciseForm";
import { getAllExercises } from "@/lib/actions/exercises";
import { getProgramWithExercises } from "@/lib/actions/programs";
import type { ProgramSet } from "@/types/workout";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

/** Format a single set into a compact summary token.
 *  Rep set → "8x12.5kg"  |  Timed → "05:00" */
function setToken(s: ProgramSet): string {
  if (s.durationSeconds != null) {
    return formatTime(Number(s.durationSeconds));
  }
  return `${s.targetReps ?? "?"}x${Number(s.weightKg ?? 0)}kg`;
}

/** Format rest time → "01:30" */
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

/** Build the line shown under the exercise name in image 2.
 *  e.g. "8x0kg; 01:30; 4x15kg; 02:00; 4x30kg; 03:30" */
function buildSetSummary(sets: ProgramSet[]): string {
  if (sets.length === 0) return "No sets yet";
  return sets.map((s) => `${setToken(s)}; ${restToken(s)}`).join("; ");
}

export default async function ProgramDetailPage({ params }: Props) {
  const { id } = await params;
  const programId = Number(id);
  if (isNaN(programId)) notFound();

  const [programResult, exercisesResult] = await Promise.all([
    getProgramWithExercises(programId),
    getAllExercises(),
  ]);

  if (!programResult.success) notFound();

  const program = programResult.data;
  const exercises = exercisesResult.success ? exercisesResult.data : [];

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 pt-6">
      {/* Back nav */}
      <Link
        href="/programs"
        className="flex items-center gap-1 text-primary mb-4 w-fit"
      >
        <ChevronLeftIcon className="h-5 w-5" />
        <span className="text-sm font-medium">Programs</span>
      </Link>

      <h1 className="text-3xl font-bold tracking-tight mb-6">{program.name}</h1>

      {/* Exercise list */}
      {program.programExercises.length > 0 ? (
        <div className="flex flex-col divide-y divide-border rounded-xl bg-muted overflow-hidden mb-6">
          {program.programExercises.map((pe) => {
            const summary = buildSetSummary(pe.programSets);
            return (
              <Link
                key={pe.id}
                href={`/programs/${programId}/exercises/${pe.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/70 active:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium truncate">
                    {pe.exercise.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {summary}
                  </p>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-muted-foreground shrink-0" />
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm mb-6">
          No exercises yet. Add one below.
        </p>
      )}

      {/* Add exercise */}
      <AddExerciseForm programId={programId} exercises={exercises} />
    </div>
  );
}
