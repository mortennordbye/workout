"use client";

import { WorkoutSetsList } from "@/components/features/WorkoutSetsList";
import { deleteProgramSet, updateProgramExerciseIncrement, updateProgramExerciseIncrementReps } from "@/lib/actions/programs";
import { useWorkoutSession } from "@/contexts/workout-session-context";
import type { ProgramSet } from "@/types/workout";
import { ChevronLeftIcon, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type SetSuggestionDisplay = {
  suggestedWeightKg: number;
  suggestedReps?: number;
  basedOnWeightKg: number;
  basedOnReps: number;
  basedOnFeeling: string;
  reason: "progressed" | "held" | "manual" | "progressed-reps";
};

const KG_INCREMENT_PRESETS = [0, 1, 2.5, 5, 10] as const;
const REP_INCREMENT_PRESETS = [0, 1, 2, 3] as const;

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
  overloadIncrementReps?: number;
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
  overloadIncrementReps: initialIncrementReps = 0,
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showKgPicker, setShowKgPicker] = useState(false);
  const [showRepPicker, setShowRepPicker] = useState(false);
  const [customKgInput, setCustomKgInput] = useState("");
  const [customRepInput, setCustomRepInput] = useState("");
  const [sets, setSets] = useState(initial);
  const [increment, setIncrement] = useState(initialIncrement);
  const [incrementReps, setIncrementReps] = useState(initialIncrementReps);
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
        const currentWeight = workoutSession?.overrides[s.id]?.weightKg ?? Number(s.weightKg ?? 0);
        const currentReps = workoutSession?.overrides[s.id]?.targetReps ?? s.targetReps ?? 0;
        const weightPending = sug.reason !== "manual" && sug.reason !== "held" && sug.reason !== "progressed-reps" && currentWeight !== sug.suggestedWeightKg;
        const repsPending = sug.suggestedReps !== undefined && sug.suggestedReps > currentReps;
        return weightPending || repsPending;
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

  function applyRepSuggestion(setId: number, suggestedReps: number) {
    if (!workoutSession) return;
    const set = sets.find((s) => s.id === setId);
    const currentReps = workoutSession.overrides[setId]?.targetReps ?? set?.targetReps ?? 0;
    workoutSession.setOverride(setId, {
      weightKg: workoutSession.overrides[setId]?.weightKg ?? Number(set?.weightKg ?? 0),
      targetReps: Math.max(suggestedReps, currentReps),
    });
  }

  function applyAllSuggestions() {
    if (!workoutSession || !suggestions) return;
    for (const set of sets) {
      const sug = suggestions[set.id];
      if (!sug) continue;
      const currentWeight = workoutSession.overrides[set.id]?.weightKg ?? Number(set.weightKg ?? 0);
      const currentReps = workoutSession.overrides[set.id]?.targetReps ?? set.targetReps ?? 0;
      const newWeight = sug.reason !== "manual" && sug.reason !== "held" && sug.reason !== "progressed-reps" && currentWeight !== sug.suggestedWeightKg
        ? sug.suggestedWeightKg
        : currentWeight;
      const newReps = sug.suggestedReps !== undefined && currentReps !== sug.suggestedReps
        ? sug.suggestedReps
        : currentReps;
      if (newWeight === currentWeight && newReps === currentReps) continue;
      workoutSession.setOverride(set.id, { weightKg: newWeight, targetReps: newReps });
    }
  }

  async function handleIncrementChange(newIncrement: number) {
    setIncrement(newIncrement);
    setShowKgPicker(false);
    await updateProgramExerciseIncrement(programExerciseId, newIncrement);
    router.refresh();
  }

  async function handleIncrementRepsChange(newIncrement: number) {
    setIncrementReps(newIncrement);
    setShowRepPicker(false);
    await updateProgramExerciseIncrementReps(programExerciseId, newIncrement);
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

      {/* Compact increment badges */}
      <div className="px-4 pb-4 shrink-0 flex items-center gap-2">
        <button
          onClick={() => setShowKgPicker(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground active:scale-95 transition-all"
        >
          ↑ {increment === 0 ? "Manual kg" : `+${increment}kg`}
        </button>
        <button
          onClick={() => setShowRepPicker(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground active:scale-95 transition-all"
        >
          ↑ {incrementReps === 0 ? "Manual reps" : `+${incrementReps} rep`}
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
              onApplyRepSuggestion={isWorkout ? applyRepSuggestion : undefined}
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

      {/* Kg increment picker */}
      {showKgPicker && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={() => { setShowKgPicker(false); setCustomKgInput(""); }}
        >
          <div
            className="w-full px-4 pb-8 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card rounded-2xl overflow-hidden max-h-[70vh] flex flex-col">
              <p className="text-center text-sm font-semibold text-muted-foreground pt-4 pb-2 shrink-0">
                Weight increment
              </p>
              <div className="overflow-y-auto">
                {KG_INCREMENT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleIncrementChange(preset)}
                    className={`w-full flex items-center justify-center py-4 text-base font-medium border-b border-border active:bg-muted/50 transition-colors ${
                      increment === preset ? "text-primary font-semibold" : ""
                    }`}
                  >
                    {preset === 0 ? "Manual (no auto-progression)" : `+${preset} kg`}
                  </button>
                ))}
                <div className="flex items-center gap-3 px-4 py-3 border-t border-border">
                  <span className="text-base font-medium text-muted-foreground shrink-0">+</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Custom kg"
                    value={customKgInput}
                    onChange={(e) => setCustomKgInput(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground/50"
                  />
                  <button
                    onClick={() => {
                      const val = parseFloat(customKgInput);
                      if (!isNaN(val) && val >= 0) handleIncrementChange(val);
                    }}
                    disabled={!customKgInput || isNaN(parseFloat(customKgInput))}
                    className="shrink-0 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-30 active:scale-95 transition-all"
                  >
                    Set
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-2xl overflow-hidden">
              <button
                onClick={() => { setShowKgPicker(false); setCustomKgInput(""); }}
                className="w-full flex items-center justify-center py-4 text-base font-semibold text-primary active:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rep increment picker */}
      {showRepPicker && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={() => { setShowRepPicker(false); setCustomRepInput(""); }}
        >
          <div
            className="w-full px-4 pb-8 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card rounded-2xl overflow-hidden max-h-[70vh] flex flex-col">
              <p className="text-center text-sm font-semibold text-muted-foreground pt-4 pb-2 shrink-0">
                Rep increment
              </p>
              <div className="overflow-y-auto">
                {REP_INCREMENT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleIncrementRepsChange(preset)}
                    className={`w-full flex items-center justify-center py-4 text-base font-medium border-b border-border active:bg-muted/50 transition-colors ${
                      incrementReps === preset ? "text-primary font-semibold" : ""
                    }`}
                  >
                    {preset === 0 ? "Manual (no auto-progression)" : `+${preset} rep${preset > 1 ? "s" : ""}`}
                  </button>
                ))}
                <div className="flex items-center gap-3 px-4 py-3 border-t border-border">
                  <span className="text-base font-medium text-muted-foreground shrink-0">+</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Custom reps"
                    value={customRepInput}
                    onChange={(e) => setCustomRepInput(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground/50"
                  />
                  <button
                    onClick={() => {
                      const val = parseInt(customRepInput, 10);
                      if (!isNaN(val) && val >= 0) handleIncrementRepsChange(val);
                    }}
                    disabled={!customRepInput || isNaN(parseInt(customRepInput, 10))}
                    className="shrink-0 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-30 active:scale-95 transition-all"
                  >
                    Set
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-2xl overflow-hidden">
              <button
                onClick={() => { setShowRepPicker(false); setCustomRepInput(""); }}
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
