"use client";

import { WorkoutExerciseList } from "@/components/features/WorkoutExerciseList";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useWorkoutSession } from "@/contexts/workout-session-context";
import { createWorkoutSession } from "@/lib/actions/workout-sessions";
import { formatTime, toDateString } from "@/lib/utils/format";
import {
    removeExerciseFromProgram,
    reorderProgramExercises,
} from "@/lib/actions/programs";
import type { ProgramSet } from "@/types/workout";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";


type Exercise = {
  id: number;
  exerciseId: number;
  name: string;
  sets: ProgramSet[];
  isTimed?: boolean;
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
  const [isEditing, setIsEditing] = useState(false);
  const workoutSession = useWorkoutSession();

  useEffect(() => {
    // Read localStorage directly — context may not be hydrated yet (child effects run before parent effects)
    const raw = localStorage.getItem("activeWorkout");
    let persistedStart: string | null = null;
    let persistedSessionId: number | null = null;
    if (raw) {
      try {
        const stored = JSON.parse(raw) as { programId: number; startTime: string; sessionId: number | null };
        if (stored.programId === programId) {
          persistedStart = stored.startTime;
          persistedSessionId = stored.sessionId;
        }
      } catch {
        // fall through to create new session
      }
    }

    // If there's a persisted session for this program, restore it without creating a new DB session
    if (persistedSessionId != null && persistedStart != null) {
      workoutSession?.setActiveWorkout(programId, persistedStart, persistedSessionId);
      return;
    }

    if (workoutSession?.sessionId != null) return; // already initialized in this browser session

    const effectiveStart = persistedStart ? new Date(persistedStart) : new Date();

    async function init() {
      const result = await createWorkoutSession({
        date: toDateString(effectiveStart),
        startTime: effectiveStart.toISOString(),
        programId,
      });
      if (result.success) {
        workoutSession?.setActiveWorkout(programId, effectiveStart.toISOString(), result.data.id);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTime = useMemo(() => new Date(), []);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const origin = workoutSession?.startTime
      ? new Date(workoutSession.startTime)
      : startTime;
    setElapsed(Math.floor((Date.now() - origin.getTime()) / 1000));
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - origin.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutSession?.startTime]);

  const [showActionSheet, setShowActionSheet] = useState(false);
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
    <div className="h-[100dvh] pb-nav-safe bg-background flex flex-col overflow-hidden">
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
            onClick={() => router.push(`/programs/${programId}/workout/finish?start=${startTime.toISOString()}`)}
            className="text-primary text-sm font-medium"
          >
            Finished
          </button>
        )}
        <h1 className="text-3xl font-bold tracking-tight">Workout</h1>
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
      {/* Program name + elapsed time */}
      <div className="px-4 pb-3 shrink-0 flex flex-col items-center gap-0.5">
        <p className="text-sm text-muted-foreground">{programName}</p>
        <p className="text-xs text-muted-foreground/60 tabular-nums">{formatTime(elapsed)}</p>
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

      {/* Action Sheet */}
      <BottomSheet
        open={showActionSheet}
        onClose={() => setShowActionSheet(false)}
      >
        <div className="w-full px-4 pb-8 space-y-2">
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
      </BottomSheet>
    </div>
  );
}

