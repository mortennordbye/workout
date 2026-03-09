/**
 * Workout Exercise Sets Page
 *
 * Shows individual sets for an exercise during an active workout.
 * Users can check off sets as they complete them.
 */

import { WorkoutSetsList } from "@/components/features/WorkoutSetsList";
import { getProgramWithExercises } from "@/lib/actions/programs";
import { ChevronLeftIcon, Clock, Plus } from "lucide-react";
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

export default async function WorkoutExerciseSetsPage({ params }: Props) {
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
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 shrink-0">
        <Link
          href={`/programs/${programId}/workout`}
          className="flex items-center gap-1 text-primary"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          <span className="text-sm font-medium">{program.name}</span>
        </Link>
        <div className="text-lg font-bold">Sets</div>
        <div className="flex items-center gap-3">
          <Link
            href={`/programs/${programId}/exercises/${peId}`}
            className="text-primary text-sm font-medium"
          >
            Edit
          </Link>
          <button className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="w-5 h-5 text-primary" />
          </button>
        </div>
      </div>

      {/* Exercise title */}
      <div className="px-4 pb-4 shrink-0">
        <h1 className="text-3xl font-bold text-center">{pe.exercise.name}</h1>
      </div>

      {/* Logged count and timer */}
      <div className="px-4 pb-6 flex items-center justify-between shrink-0">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Logged
          </div>
          <div className="text-lg font-bold">0 times</div>
        </div>
        <button className="w-12 h-12 rounded-full border-2 border-primary/30 flex items-center justify-center">
          <Clock className="w-6 h-6 text-primary" />
        </button>
      </div>

      {/* Sets list - scrollable when long */}
      <div className="flex-1 px-4 overflow-y-auto">
        <WorkoutSetsList
          sets={sets}
          programId={programId}
          programExerciseId={peId}
        />
      </div>

      {/* Notes section */}
      <div className="px-4 pb-6 shrink-0">
        <button className="w-full py-3 border border-dashed border-muted-foreground/30 rounded-xl text-muted-foreground text-sm">
          Add notes
        </button>
      </div>
    </div>
  );
}
