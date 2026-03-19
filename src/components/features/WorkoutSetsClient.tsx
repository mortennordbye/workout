"use client";

import { WorkoutSetsList } from "@/components/features/WorkoutSetsList";
import { deleteProgramSet } from "@/lib/actions/programs";
import { useWorkoutSession } from "@/contexts/workout-session-context";
import type { ProgramSet } from "@/types/workout";
import { ChevronLeftIcon, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  programId: number;
  programExerciseId: number;
  programName: string;
  exerciseName: string;
  exerciseId?: number;
  sets: ProgramSet[];
  isWorkout?: boolean;
  loggedCount?: number;
  exerciseCategory?: string;
};

export function WorkoutSetsClient({
  programId,
  programExerciseId,
  programName,
  exerciseName,
  exerciseId,
  sets: initial,
  isWorkout = false,
  loggedCount = 0,
  exerciseCategory,
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [sets, setSets] = useState(initial);
  const workoutSession = useWorkoutSession();

  useEffect(() => {
    setSets(initial);
  }, [initial]);

  const displaySets = sets.map((s) => {
    const ov = workoutSession?.overrides[s.id];
    if (!ov) return s;
    return {
      ...s,
      targetReps: ov.targetReps,
      weightKg: String(ov.weightKg) as typeof s.weightKg,
    };
  });

  async function handleDeleteSet(setId: number) {
    setSets((prev) => prev.filter((s) => s.id !== setId));
    await deleteProgramSet(setId, programId, programExerciseId);
    router.refresh();
  }

  return (
    <div className="h-[100dvh] pb-16 bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 shrink-0">
        {isEditing ? (
          <button
            onClick={() => setIsEditing(false)}
            className="text-primary text-sm font-medium"
          >
            Done
          </button>
        ) : (
          <Link
            href={isWorkout ? `/programs/${programId}/workout` : `/programs/${programId}`}
            className="flex items-center gap-1 text-primary"
          >
            <ChevronLeftIcon className="h-5 w-5" />
            <span className="text-sm font-medium">
              {isWorkout ? "Workout" : programName}
            </span>
          </Link>
        )}
        <div className="text-lg font-bold">Sets</div>
        <div className="flex items-center gap-3">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-primary text-sm font-medium"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => setShowActionSheet(true)}
            className="w-7 h-7 rounded-full border-2 border-primary flex items-center justify-center"
          >
            <Plus className="w-4 h-4 text-primary" />
          </button>
        </div>
      </div>

      {/* Exercise title */}
      <div className="px-4 pb-4 shrink-0">
        <h1 className="text-3xl font-bold text-center">{exerciseName}</h1>
      </div>

      {/* Logged count and timer */}
      <div className="px-4 pb-4 flex items-center justify-between shrink-0">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Logged
          </div>
          <div className="text-base font-bold">{loggedCount} {loggedCount === 1 ? "time" : "times"}</div>
        </div>
        <button className="w-12 h-12 rounded-full border-2 border-primary/30 flex items-center justify-center">
          <Clock className="w-6 h-6 text-primary" />
        </button>
      </div>

      {/* Sets list or empty state */}
      <div className="flex-1 px-4 overflow-y-auto">
        {sets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 pb-16">
            {/* Dumbbell icon */}
            <svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              fill="currentColor"
              className="text-primary opacity-40"
            >
              <rect x="30" y="36" width="20" height="8" rx="2" />
              <rect x="16" y="28" width="14" height="24" rx="4" />
              <rect x="50" y="28" width="14" height="24" rx="4" />
              <rect x="8" y="32" width="10" height="16" rx="3" />
              <rect x="62" y="32" width="10" height="16" rx="3" />
            </svg>
            <h2 className="text-primary text-lg font-semibold">
              Add Sets &amp; Rests
            </h2>
            <p className="text-muted-foreground text-sm text-center px-8">
              Tap the add button (+) at the top of the screen to add sets and
              rests
            </p>
            <button className="text-primary text-sm font-medium mt-2">
              Base on previous workout
            </button>
          </div>
        ) : (
          <>
            <WorkoutSetsList
              sets={displaySets}
              programId={programId}
              programExerciseId={programExerciseId}
              isEditing={isEditing}
              isWorkout={isWorkout}
              isTimed={exerciseCategory === "cardio"}
              exerciseId={exerciseId}
              sessionId={workoutSession?.sessionId ?? undefined}
              onDeleteSet={handleDeleteSet}
            />
            <div className="py-4 border-t border-border">
              <button className="text-primary text-sm font-medium">
                Base on previous workout
              </button>
            </div>
          </>
        )}
      </div>

      {/* Action Sheet */}
      {showActionSheet && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={() => setShowActionSheet(false)}
        >
          <div
            className="w-full px-4 pb-8 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card rounded-2xl overflow-hidden">
              <Link
                href={`/programs/${programId}/exercises/${programExerciseId}/sets/new`}
                onClick={() => setShowActionSheet(false)}
                className="flex items-center justify-center py-4 text-base font-medium border-b border-border active:bg-muted/50 transition-colors"
              >
                Add Set
              </Link>
              <button
                onClick={() => {
                  setShowActionSheet(false);
                  setIsEditing(true);
                }}
                disabled={sets.length === 0}
                className="w-full flex items-center justify-center py-4 text-base font-medium active:bg-muted/50 transition-colors disabled:opacity-40"
              >
                Add Rest
              </button>
            </div>
            <div className="bg-card rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowActionSheet(false)}
                className="w-full flex items-center justify-center py-4 text-base font-semibold text-primary active:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
