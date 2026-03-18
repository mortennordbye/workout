"use client";

import { WorkoutExerciseList } from "@/components/features/WorkoutExerciseList";
import { useWorkoutSession } from "@/contexts/workout-session-context";
import { createWorkoutSession } from "@/lib/actions/workout-sessions";
import {
    removeExerciseFromProgram,
    reorderProgramExercises,
} from "@/lib/actions/programs";
import type { ProgramSet } from "@/types/workout";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const DEMO_USER_ID = 1;

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Exercise = {
  id: number;
  name: string;
  sets: ProgramSet[];
};

type Props = {
  programId: number;
  programName: string;
  exercises: Exercise[];
};

export function WorkoutSessionClient({
  programId,
  programName,
  exercises: initial,
}: Props) {
  const router = useRouter();
  const startTime = useMemo(() => new Date(), []);
  const [isEditing, setIsEditing] = useState(false);
  const workoutSession = useWorkoutSession();

  useEffect(() => {
    async function init() {
      const result = await createWorkoutSession({
        userId: DEMO_USER_ID,
        date: toDateString(startTime),
        startTime: startTime.toISOString(),
        programId,
      });
      if (result.success) {
        workoutSession?.setSessionId(result.data.id);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [exercises, setExercises] = useState(initial);

  async function handleDeleteExercise(peId: number) {
    setExercises((prev) => prev.filter((e) => e.id !== peId));
    await removeExerciseFromProgram(peId, programId);
    router.refresh();
  }

  async function handleReorder(orderedIds: number[]) {
    setExercises((prev) =>
      orderedIds.map((id) => prev.find((e) => e.id === id)!),
    );
    await reorderProgramExercises(programId, orderedIds);
  }

  return (
    <div className="h-[100dvh] pb-16 bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2 shrink-0">
        {isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-primary text-sm font-medium"
          >
            Done
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowFinishConfirm(true)}
            className="text-primary text-sm font-medium"
          >
            Finished
          </button>
        )}
        <h1 className="text-xl font-bold">Workout</h1>
        <div className="flex items-center gap-3">
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-primary text-sm font-medium"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowActionSheet(true)}
            className="w-7 h-7 rounded-full border-2 border-primary flex items-center justify-center"
          >
            <Plus className="w-4 h-4 text-primary" />
          </button>
        </div>
      </div>
      {/* Program name subtitle */}
      <div className="px-4 pb-3 shrink-0">
        <p className="text-sm text-muted-foreground text-center">{programName}</p>
      </div>

      {/* Exercises list + History */}
      <div className="flex-1 px-4 overflow-y-auto">
        <WorkoutExerciseList
          programId={programId}
          exercises={exercises}
          isEditing={isEditing}
          onDeleteExercise={handleDeleteExercise}
          onReorderExercises={handleReorder}
        />

      </div>

      {/* Finish Confirmation */}
      {showFinishConfirm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={() => setShowFinishConfirm(false)}
        >
          <div
            className="w-full px-4 pb-8 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card rounded-2xl overflow-hidden text-center">
              <div className="px-4 pt-5 pb-4 border-b border-border">
                <p className="font-semibold text-base">Finish Workout?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Are you sure you want to finish this workout?
                </p>
              </div>
              <button
                onClick={() => {
                  setShowFinishConfirm(false);
                  router.push(
                    `/programs/${programId}/workout/finish?start=${startTime.toISOString()}`,
                  );
                }}
                className="w-full py-4 text-base font-semibold text-primary active:bg-muted/50 transition-colors"
              >
                Yes, Finish
              </button>
            </div>
            <div className="bg-card rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="w-full py-4 text-base font-semibold active:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
                href={`/programs/${programId}/workout/add-exercise`}
                onClick={() => setShowActionSheet(false)}
                className="flex items-center justify-center py-4 text-base font-medium active:bg-muted/50 transition-colors"
              >
                Add Exercise
              </Link>
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

