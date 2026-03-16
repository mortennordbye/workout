/**
 * Active Workout Session Page
 *
 * Shows the workout in progress for a selected program.
 * Users can check off exercises and see their progress.
 */

import { WorkoutSessionClient } from "@/components/features/WorkoutSessionClient";
import { getProgramWithExercises } from "@/lib/actions/programs";
import type { ProgramSet } from "@/types/workout";
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
    <WorkoutSessionClient
      programId={programId}
      programName={program.name}
      exercises={exercises}
    />
  );
}
