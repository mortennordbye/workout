/**
 * Workout Exercise Sets Page
 */

import { WorkoutSetsClient } from "@/components/features/WorkoutSetsClient";
import { getProgramWithExercises } from "@/lib/actions/programs";
import { getExerciseLoggedCount, getProgressiveSuggestions } from "@/lib/actions/workout-sets";
import { requireSession } from "@/lib/utils/session";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string; programExerciseId: string }>;
};

export default async function WorkoutExerciseSetsPage({ params }: Props) {
  const { id, programExerciseId } = await params;
  const programId = Number(id);
  const peId = Number(programExerciseId);
  if (isNaN(programId) || isNaN(peId)) notFound();

  const session = await requireSession();
  const [result, suggestionsResult] = await Promise.all([
    getProgramWithExercises(programId),
    getProgressiveSuggestions(programId, session.user.id),
  ]);
  if (!result.success) notFound();

  const program = result.data;
  const pe = program.programExercises.find((e) => e.id === peId);
  if (!pe) notFound();

  const loggedCount = await getExerciseLoggedCount(pe.exercise.id);
  const suggestions = suggestionsResult.success ? suggestionsResult.data : {};

  return (
    <WorkoutSetsClient
      programId={programId}
      programExerciseId={peId}
      programName={program.name}
      exerciseName={pe.exercise.name}
      exerciseId={pe.exercise.id}
      sets={pe.programSets}
      isWorkout={true}
      loggedCount={loggedCount}
      exerciseCategory={pe.exercise.category ?? undefined}
      exerciseIsTimed={pe.exercise.isTimed}
      suggestions={suggestions}
      overloadIncrementKg={Number(pe.overloadIncrementKg ?? 2.5)}
      overloadIncrementReps={Number(pe.overloadIncrementReps ?? 0)}
      progressionMode={(pe.progressionMode ?? "weight") as "manual" | "weight" | "smart" | "reps"}
    />
  );
}
