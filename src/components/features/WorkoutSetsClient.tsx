"use client";

import { WorkoutSetsList } from "@/components/features/WorkoutSetsList";
import { deleteProgramSet, updateProgramExerciseIncrement } from "@/lib/actions/programs";
import { useWorkoutSession } from "@/contexts/workout-session-context";
import type { ProgramSet } from "@/types/workout";
import { ChevronLeftIcon, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type SetSuggestionDisplay = {
  suggestedWeightKg: number;
  basedOnWeightKg: number;
  basedOnReps: number;
  basedOnFeeling: string;
  reason: "progressed" | "held" | "manual";
};

const INCREMENT_PRESETS = [0, 1, 2.5, 5, 10] as const;

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
  suggestions?: Record<number, SetSuggestionDisplay>;
  overloadIncrementKg?: number;
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
  suggestions,
  overloadIncrementKg: initialIncrement = 2.5,
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [sets, setSets] = useState(initial);
  const [increment, setIncrement] = useState(initialIncrement);
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

  // How many sets still have a pending suggestion (not yet applied via override)
  const pendingCount = isWorkout
    ? sets.filter((s) => {
        const sug = suggestions?.[s.id];
        if (!sug || sug.reason === "manual") return false;
        const current = workoutSession?.overrides[s.id]?.weightKg ?? Number(s.weightKg ?? 0);
        return current !== sug.suggestedWeightKg;
      }).length
    : 0;

  function applySuggestion(setId: number, suggestedWeightKg: number) {
    if (!workoutSession) return;
    const set = sets.find((s) => s.id === setId);
    workoutSession.setOverride(setId, {
      weightKg: suggestedWeightKg,
      targetReps: workoutSession.overrides[setId]?.targetReps ?? set?.targetReps ?? 0,
    });
  }

  function applyAllSuggestions() {
    if (!workoutSession || !suggestions) return;
    for (const set of sets) {
      const sug = suggestions[set.id];
      if (!sug) continue;
      const current = workoutSession.overrides[set.id]?.weightKg ?? Number(set.weightKg ?? 0);
      if (current === sug.suggestedWeightKg) continue; // already applied
      workoutSession.setOverride(set.id, {
        weightKg: sug.suggestedWeightKg,
        targetReps: workoutSession.overrides[set.id]?.targetReps ?? set.targetReps ?? 0,
      });
    }
  }

  async function handleIncrementChange(newIncrement: number) {
    setIncrement(newIncrement);
    await updateProgramExerciseIncrement(programExerciseId, newIncrement);
    router.refresh();
  }

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

      {/* Logged count */}
      <div className="px-4 pb-4 shrink-0">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          Logged
        </div>
        <div className="text-base font-bold">{loggedCount} {loggedCount === 1 ? "time" : "times"}</div>
      </div>

      {/* Overload increment selector */}
      {isWorkout && (
        <div className="px-4 pb-4 shrink-0">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Progression
          </div>
          <div className="flex gap-2">
            {INCREMENT_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => handleIncrementChange(preset)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                  increment === preset
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {preset === 0 ? "Manual" : `+${preset}kg`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progressive overload banner */}
      {isWorkout && pendingCount > 0 && !isEditing && (
        <div className="px-4 pb-3 shrink-0">
          <div className="flex items-center justify-between bg-primary/10 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-primary">
                ↑ Progressive overload ready
              </p>
              <p className="text-xs text-muted-foreground">
                Based on your last session
              </p>
            </div>
            <button
              onClick={applyAllSuggestions}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold active:scale-95 transition-all"
            >
              Apply all
            </button>
          </div>
        </div>
      )}

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
              suggestions={suggestions}
              onApplySuggestion={isWorkout ? applySuggestion : undefined}
            />
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
