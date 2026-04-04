import { ProgramDetailClient } from "@/components/features/ProgramDetailClient";
import { getProgramWithExercises } from "@/lib/actions/programs";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editing?: string }>;
};

export default async function ProgramDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { editing } = await searchParams;
  const programId = Number(id);
  if (isNaN(programId)) notFound();

  const programResult = await getProgramWithExercises(programId);
  if (!programResult.success) notFound();

  const program = programResult.data;
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
      initialEditing={editing === "true"}
    />
  );
}
