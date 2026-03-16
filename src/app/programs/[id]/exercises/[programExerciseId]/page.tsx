/**
 * Program Exercise Detail Page
 *
 * Shows all planned sets for a specific exercise within a program,
 * and allows adding or removing sets.
 */

import { ExerciseDetailClient } from "@/components/features/ExerciseDetailClient";
import { getProgramWithExercises } from "@/lib/actions/programs";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string; programExerciseId: string }>;
};

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

  return (
    <ExerciseDetailClient
      programId={programId}
      programExerciseId={peId}
      programName={program.name}
      exerciseName={pe.exercise.name}
      category={pe.exercise.category ?? ""}
      sets={pe.programSets}
    />
  );
}
