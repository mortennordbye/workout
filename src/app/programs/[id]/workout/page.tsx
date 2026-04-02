/**
 * Active Workout Session Page
 *
 * Shows the workout in progress for a selected program.
 * Users can check off exercises and see their progress.
 */

import { WorkoutSessionClient } from "@/components/features/WorkoutSessionClient";
import { SuggestionsInitializer } from "@/components/features/SuggestionsInitializer";
import { getProgramWithExercises } from "@/lib/actions/programs";
import { getProgressiveSuggestions } from "@/lib/actions/workout-sets";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = 1;

type Props = {
  params: Promise<{ id: string }>;
};

export default async function WorkoutSessionPage({ params }: Props) {
  const { id } = await params;
  const programId = Number(id);
  if (isNaN(programId)) notFound();

  const [result, suggestionsResult] = await Promise.all([
    getProgramWithExercises(programId),
    getProgressiveSuggestions(programId, DEMO_USER_ID),
  ]);
  if (!result.success) notFound();

  const program = result.data;
  const suggestions = suggestionsResult.success ? suggestionsResult.data : {};

  const exercises = program.programExercises.map((pe) => ({
    id: pe.id,
    name: pe.exercise.name,
    sets: pe.programSets,
  }));

  const programSetReps: Record<number, number> = {};
  for (const pe of program.programExercises) {
    for (const ps of pe.programSets) {
      if (ps.targetReps != null) programSetReps[ps.id] = ps.targetReps;
    }
  }

  return (
    <>
      <SuggestionsInitializer
        suggestions={suggestions}
        programSetReps={programSetReps}
      />
      <WorkoutSessionClient
        programId={programId}
        programName={program.name}
        exercises={exercises}
      />
    </>
  );
}
