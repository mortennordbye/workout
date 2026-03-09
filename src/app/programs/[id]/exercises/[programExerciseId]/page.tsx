/**
 * Program Exercise Detail Page
 *
 * Shows all planned sets for a specific exercise within a program,
 * and allows adding or removing sets.
 */

import { AddSetForm } from "@/components/features/AddSetForm";
import { getProgramWithExercises } from "@/lib/actions/programs";
import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string; programExerciseId: string }>;
};

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const sec = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export default async function ProgramExerciseDetailPage({ params }: Props) {
  const { id, programExerciseId } = await params;
  const programId = Number(id);
  const peId = Number(programExerciseId);
  if (isNaN(programId) || isNaN(peId)) notFound();

  const result = await getProgramWithExercises(programId);
  if (!result.success) notFound();

  const program = result.data;
  const pe = program.programExercises.find((e) => e.id === peId);
  if (!pe) notFound();

  const sets = pe.programSets;

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 pt-6">
      {/* Back nav */}
      <Link
        href={`/programs/${programId}`}
        className="flex items-center gap-1 text-primary mb-4 w-fit"
      >
        <ChevronLeftIcon className="h-5 w-5" />
        <span className="text-sm font-medium">{program.name}</span>
      </Link>

      <h1 className="text-3xl font-bold tracking-tight mb-2">
        {pe.exercise.name}
      </h1>
      <p className="text-sm text-muted-foreground mb-6 capitalize">
        {pe.exercise.category}
      </p>

      {/* Sets list (read-only view) */}
      {sets.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-xl bg-muted overflow-hidden mb-6">
          {sets.map((s, i) => (
            <div key={s.id} className="flex items-center px-5 py-4">
              <span className="text-muted-foreground text-sm w-8">
                #{i + 1}
              </span>
              <div className="flex-1">
                {s.durationSeconds != null ? (
                  <p className="text-base font-medium">
                    {formatTime(Number(s.durationSeconds))} timed
                  </p>
                ) : (
                  <p className="text-base font-medium">
                    {s.targetReps ?? "?"} reps &times; {Number(s.weightKg ?? 0)}{" "}
                    kg
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Rest: {formatTime(Number(s.restTimeSeconds))}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {sets.length === 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          No sets planned yet.
        </p>
      )}

      {/* Existing sets with delete */}
      <AddSetForm programExerciseId={peId} sets={sets} />

      {/* Add new set button */}
      <Link
        href={`/programs/${programId}/exercises/${peId}/sets/new`}
        className="mt-4 w-full rounded-xl bg-primary py-4 text-center text-base font-semibold text-primary-foreground"
      >
        Add Set
      </Link>
    </div>
  );
}
