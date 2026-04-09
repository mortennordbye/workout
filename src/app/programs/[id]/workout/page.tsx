/**
 * Active Workout Session Page
 *
 * Shows the workout in progress for a selected program.
 * Users can check off exercises and see their progress.
 */

import { WorkoutSessionClient } from "@/components/features/WorkoutSessionClient";
import { getProgramWithExercises } from "@/lib/actions/programs";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

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
    exerciseId: pe.exercise.id,
    isTimed: pe.exercise.isTimed || pe.exercise.category === "cardio",
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
