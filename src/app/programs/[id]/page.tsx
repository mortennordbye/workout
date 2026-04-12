import { ProgramDetailClient } from "@/components/features/ProgramDetailClient";
import { getProgramWithExercises } from "@/lib/actions/programs";
import { getLastCompletedSession } from "@/lib/actions/workout-sessions";
import { requireSession } from "@/lib/utils/session";
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

  await requireSession();
  const [programResult, lastSessionResult] = await Promise.all([
    getProgramWithExercises(programId),
    getLastCompletedSession(programId),
  ]);
  if (!programResult.success) notFound();

  const program = programResult.data;
  const exercises = program.programExercises.map((pe) => ({
    id: pe.id,
    name: pe.exercise.name,
    isTimed: pe.exercise.isTimed && pe.exercise.category !== "cardio",
    isRunning: pe.exercise.category === "cardio",
    sets: pe.programSets,
  }));

  return (
    <ProgramDetailClient
      programId={programId}
      programName={program.name}
      exercises={exercises}
      initialEditing={editing === "true"}
      lastSession={lastSessionResult.success ? lastSessionResult.data : null}
    />
  );
}
