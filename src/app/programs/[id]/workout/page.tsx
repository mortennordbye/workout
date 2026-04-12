/**
 * Active Workout Session Page
 *
 * Shows the workout in progress for a selected program.
 * Users can check off exercises and see their progress.
 */

import { WorkoutSessionClient } from "@/components/features/WorkoutSessionClient";
import { getProgramWithExercises } from "@/lib/actions/programs";
import { getLastCompletedSession } from "@/lib/actions/workout-sessions";
import { getWorkoutInsight } from "@/lib/actions/workout-sets";
import { requireSession } from "@/lib/utils/session";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function WorkoutSessionPage({ params }: Props) {
  const { id } = await params;
  const programId = Number(id);
  if (isNaN(programId)) notFound();

  const auth = await requireSession();
  const userId = auth.user.id;

  const [result, lastSessionResult, insight] = await Promise.all([
    getProgramWithExercises(programId),
    getLastCompletedSession(programId),
    getWorkoutInsight(programId, userId),
  ]);

  if (!result.success) notFound();

  const program = result.data;

  const exercises = program.programExercises.map((pe) => ({
    id: pe.id,
    name: pe.exercise.name,
    exerciseId: pe.exercise.id,
    isTimed: pe.exercise.isTimed && pe.exercise.category !== "cardio",
    isRunning: pe.exercise.category === "cardio",
    sets: pe.programSets,
  }));

  return (
    <WorkoutSessionClient
      programId={programId}
      programName={program.name}
      exercises={exercises}
      lastSession={lastSessionResult.success ? lastSessionResult.data : null}
      insight={insight}
    />
  );
}
