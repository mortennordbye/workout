"use client";

import { ExercisesClient } from "@/components/features/ExercisesClient";
import { addExerciseToProgram } from "@/lib/actions/programs";
import type { Exercise } from "@/types/workout";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  programId: number;
  exercises: Exercise[];
};

export function ProgramAddExerciseWrapper({ programId, exercises }: Props) {
  const router = useRouter();

  async function handleSelect(exercise: Exercise) {
    await addExerciseToProgram({ programId, exerciseId: exercise.id });
    router.push(`/programs/${programId}`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 pt-10 pb-3 shrink-0">
        <Link
          href={`/programs/${programId}`}
          className="flex items-center gap-0.5 min-h-[44px] text-primary active:opacity-70 -ml-1 w-20 shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-base">Back</span>
        </Link>
        <h1 className="flex-1 text-center text-xl font-bold whitespace-nowrap">Add Exercise</h1>
        <div className="w-20 shrink-0" />
      </div>

      {/* Exercise browser */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <ExercisesClient exercises={exercises} onSelectExercise={handleSelect} />
      </div>
    </div>
  );
}
