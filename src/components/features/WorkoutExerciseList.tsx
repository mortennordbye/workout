"use client";

import type { ProgramSet } from "@/types/workout";
import { Check, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Exercise = {
  id: number;
  name: string;
  sets: ProgramSet[];
};

type Props = {
  programId: number;
  exercises: Exercise[];
};

/** Format a single set into a compact summary token */
function setToken(s: ProgramSet): string {
  const totalSeconds = Number(s.durationSeconds ?? 0);
  if (s.durationSeconds != null) {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const sec = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }
  return `${s.targetReps ?? "?"}x${Number(s.weightKg ?? 0)}kg`;
}

/** Format rest time */
function restToken(s: ProgramSet): string {
  const totalSeconds = Number(s.restTimeSeconds);
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const sec = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

/** Build the set summary line */
function buildSetSummary(sets: ProgramSet[]): string {
  if (sets.length === 0) return "";
  const tokens = sets.map((s) => `${setToken(s)}; ${restToken(s)}`);
  // Show first few sets, then ellipsis if too many
  if (tokens.length > 3) {
    return tokens.slice(0, 3).join("; ") + "; ...";
  }
  return tokens.join("; ");
}

export function WorkoutExerciseList({ programId, exercises }: Props) {
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(
    new Set(),
  );

  const toggleExercise = (exerciseId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCompletedExercises((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  return (
    <>
      {exercises.map((exercise) => {
        const isCompleted = completedExercises.has(exercise.id);
        const summary = buildSetSummary(exercise.sets);

        return (
          <Link
            key={exercise.id}
            href={`/programs/${programId}/workout/exercises/${exercise.id}`}
            className="flex items-center gap-4 py-4 border-b border-border"
          >
            {/* Completion status circle */}
            <button
              onClick={(e) => toggleExercise(exercise.id, e)}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center shrink-0
                ${
                  isCompleted
                    ? "bg-primary"
                    : "border-2 border-muted-foreground"
                }
              `}
            >
              {isCompleted && (
                <Check className="w-6 h-6 text-primary-foreground" />
              )}
            </button>

            {/* Exercise info */}
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium">{exercise.name}</p>
              {summary && (
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {summary}
                </p>
              )}
            </div>

            {/* Chevron */}
            <ChevronRightIcon className="h-5 w-5 text-muted-foreground shrink-0" />
          </Link>
        );
      })}
    </>
  );
}
