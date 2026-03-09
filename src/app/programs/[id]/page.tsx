import { ProgramDetailClient } from "@/components/features/ProgramDetailClient";
import { getAllExercises } from "@/lib/actions/exercises";
import { getProgramWithExercises } from "@/lib/actions/programs";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

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
  const allExercises = exercisesResult.success ? exercisesResult.data : [];

  const exercises = program.programExercises.map((pe) => ({
    id: pe.id,
    name: pe.exercise.name,
    sets: pe.programSets,
  }));

  return (
    <ProgramDetailClient
      programId={programId}
      programName={program.name}
      exercises={exercises}
      allExercises={allExercises}
    />
  );
}
