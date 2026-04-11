"use client";

import { WorkoutSetsList } from "@/components/features/WorkoutSetsList";
import {
  deleteProgramSet,
  updateProgramExerciseIncrement,
  updateProgramExerciseIncrementReps,
  updateProgramExerciseProgressionMode,
} from "@/lib/actions/programs";
import { useWorkoutSession } from "@/contexts/workout-session-context";
import type { ProgramSet } from "@/types/workout";
import { ChevronLeftIcon, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

// SetSuggestionDisplay is the canonical SetSuggestion type from types/workout.ts
export type { SetSuggestion as SetSuggestionDisplay } from "@/types/workout";
import type { SetSuggestion } from "@/types/workout";

type ProgressionMode = "manual" | "weight" | "smart" | "reps" | "time";

const KG_INCREMENT_PRESETS = [0.5, 1, 2.5, 5, 10] as const;
const REP_INCREMENT_PRESETS = [1, 2, 3] as const;

const MODE_OPTIONS: { mode: ProgressionMode; label: string; description: string }[] = [
  { mode: "manual",  label: "Manual",       description: "No auto-progression" },
  { mode: "weight",  label: "Weight",        description: "Add kg when target reps are hit" },
  { mode: "smart",   label: "Smart weight",  description: "Add kg and adjust reps via 1RM formula" },
  { mode: "reps",    label: "Reps",          description: "Add reps when target reps are hit" },
  { mode: "time",    label: "Duration",      description: "Add seconds when target duration is hit" },
];

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
  exerciseIsTimed?: boolean;
  suggestions?: Record<number, SetSuggestion>;
  overloadIncrementKg?: number;
  overloadIncrementReps?: number;
  progressionMode?: ProgressionMode;
  initialEditing?: boolean;
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
  exerciseIsTimed = false,
  suggestions,
  overloadIncrementKg: initialIncrement = 2.5,
  overloadIncrementReps: initialIncrementReps = 0,
  progressionMode: initialMode = "weight",
  initialEditing = false,
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [showProgressionPicker, setShowProgressionPicker] = useState(false);
  const [customKgInput, setCustomKgInput] = useState("");
  const [customRepInput, setCustomRepInput] = useState("");
  const [sets, setSets] = useState(initial);
  const [increment, setIncrement] = useState(initialIncrement);
  const [incrementReps, setIncrementReps] = useState(initialIncrementReps);
  const [mode, setMode] = useState<ProgressionMode>(initialMode);
  const workoutSession = useWorkoutSession();

  useEffect(() => {
    setSets(initial);
  }, [initial]);

  // Compute the best estimated 1RM across all sets for this exercise
  const bestEstimated1RM = useMemo(() => {
    if (!suggestions) return null;
    let best: number | null = null;
    for (const set of sets) {
      const sug = suggestions[set.id];
      if (sug?.estimated1RM != null) {
        if (best === null || sug.estimated1RM > best) best = sug.estimated1RM;
      }
    }
    return best;
  }, [suggestions, sets]);

  const displaySets = sets.map((s) => {
    const ov = workoutSession?.overrides[s.id];
    if (!ov) return s;
    return {
      ...s,
      targetReps: ov.targetReps,
      weightKg: String(ov.weightKg) as typeof s.weightKg,
    };
  });

  const pendingCount = isWorkout
    ? sets.filter((s) => {
        const sug = suggestions?.[s.id];
        if (!sug || sug.reason === "manual" || sug.reason === "held") return false;
        const currentWeight = workoutSession?.overrides[s.id]?.weightKg ?? Number(s.weightKg ?? 0);
        const currentReps = workoutSession?.overrides[s.id]?.targetReps ?? s.targetReps ?? 0;
        const weightPending =
          (sug.reason === "progressed" || sug.reason === "deload") &&
          currentWeight !== sug.suggestedWeightKg;
        const repsPending = sug.reason === "progressed-reps" && sug.suggestedReps !== undefined && sug.suggestedReps > currentReps;
        const timePending = sug.reason === "progressed-time" && sug.suggestedDurationSeconds !== undefined;
        return weightPending || repsPending || timePending;
      }).length
    : 0;

  function applySuggestion(setId: number, suggestedWeightKg: number, adjustedReps?: number) {
    if (!workoutSession) return;
    const set = sets.find((s) => s.id === setId);
    workoutSession.setOverride(setId, {
      weightKg: suggestedWeightKg,
      targetReps: adjustedReps ?? workoutSession.overrides[setId]?.targetReps ?? set?.targetReps ?? 0,
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

  async function handleModeChange(newMode: ProgressionMode) {
    setMode(newMode);
    await updateProgramExerciseProgressionMode(programExerciseId, newMode);
    router.refresh();
  }

  async function handleIncrementChange(newIncrement: number) {
    setIncrement(newIncrement);
    setCustomKgInput("");
    await updateProgramExerciseIncrement(programExerciseId, newIncrement);
    router.refresh();
  }

  async function handleIncrementRepsChange(newIncrement: number) {
    setIncrementReps(newIncrement);
    setCustomRepInput("");
    await updateProgramExerciseIncrementReps(programExerciseId, newIncrement);
    router.refresh();
  }

  async function handleDeleteSet(setId: number) {
    setSets((prev) => prev.filter((s) => s.id !== setId));
    await deleteProgramSet(setId, programId, programExerciseId);
    router.push(
      isWorkout
        ? `/programs/${programId}/workout/exercises/${programExerciseId}?edit=true`
        : `/programs/${programId}/exercises/${programExerciseId}?edit=true`,
    );
  }

  function modeBadgeLabel(): string {
    switch (mode) {
      case "manual": return "Manual";
      case "weight": return increment > 0 ? `+${increment}kg` : "Weight";
      case "smart":  return increment > 0 ? `+${increment}kg · smart` : "Smart";
      case "reps":   return incrementReps > 0 ? `+${incrementReps} rep` : "Reps";
      case "time":   return incrementReps > 0 ? `+${incrementReps}s` : "Duration";
    }
  }

  return (
    <div className="h-[100dvh] pb-nav-safe bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 pt-6 pb-4 shrink-0">
        {/* Left — fixed width so layout never shifts */}
        <div className="w-20 shrink-0 flex items-center">
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
              className="flex items-center gap-0.5 text-primary active:opacity-70 -ml-1 min-h-[44px]"
            >
              <ChevronLeftIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Back</span>
            </Link>
          )}
        </div>
        <div className="flex-1" />
        {/* Right — fixed width so layout never shifts */}
        <div className="w-20 shrink-0 flex items-center justify-end">
          {isEditing ? (
            <Link
              href={
                isWorkout
                  ? `/programs/${programId}/workout/exercises/${programExerciseId}/sets/new`
                  : `/programs/${programId}/exercises/${programExerciseId}/sets/new`
              }
              className="w-7 h-7 rounded-full border-2 border-primary flex items-center justify-center"
            >
              <Plus className="w-4 h-4 text-primary" />
            </Link>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-primary text-sm font-medium"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Exercise title */}
      <div className="px-4 pb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">{exerciseName}</h1>
      </div>

      {/* Progression badge + 1RM badge */}
      <div className="px-4 pb-4 shrink-0 flex items-center gap-2">
        <button
          onClick={() => setShowProgressionPicker(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground active:scale-95 transition-all"
        >
          ↑ {modeBadgeLabel()}
        </button>
        {isWorkout && bestEstimated1RM != null && (
          <span className="px-3 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary">
            1RM ~{Math.round(bestEstimated1RM)}kg
          </span>
        )}
      </div>

      {/* Sets list or empty state */}
      <div className="flex-1 px-4 overflow-y-auto">
        {sets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 pb-16">
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
              Tap the add button (+) at the top of the screen to add sets and rests
            </p>
          </div>
        ) : (
          <WorkoutSetsList
            sets={displaySets}
            programId={programId}
            programExerciseId={programExerciseId}
            isEditing={isEditing}
            isWorkout={isWorkout}
            isTimed={exerciseIsTimed || exerciseCategory === "cardio"}
            exerciseId={exerciseId}
            sessionId={workoutSession?.sessionId ?? undefined}
            onDeleteSet={handleDeleteSet}
            suggestions={suggestions}
            onApplySuggestion={isWorkout ? applySuggestion : undefined}
            onApplyRepSuggestion={isWorkout ? applyRepSuggestion : undefined}
          />
        )}
      </div>


      {/* Unified progression picker */}
      {showProgressionPicker && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={() => { setShowProgressionPicker(false); setCustomKgInput(""); setCustomRepInput(""); }}
        >
          <div
            className="w-full px-4 pb-8 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card rounded-2xl overflow-hidden max-h-[80vh] flex flex-col">
              <p className="text-center text-sm font-semibold text-muted-foreground pt-4 pb-2 shrink-0">
                Progression
              </p>
              <div className="overflow-y-auto">
                {/* Mode selector — "time" only shown for timed/cardio exercises */}
                {MODE_OPTIONS.filter((opt) =>
                  opt.mode !== "time" || exerciseIsTimed || exerciseCategory === "cardio"
                ).map((opt, i) => (
                  <button
                    key={opt.mode}
                    onClick={() => handleModeChange(opt.mode)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 border-b border-border active:bg-muted/50 transition-colors ${
                      mode === opt.mode ? "text-primary" : ""
                    }`}
                  >
                    <div className="text-left">
                      <p className={`text-base font-medium ${mode === opt.mode ? "font-semibold" : ""}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                    {mode === opt.mode && (
                      <span className="text-primary text-lg">✓</span>
                    )}
                  </button>
                ))}

                {/* Kg increment — shown for weight and smart modes */}
                {(mode === "weight" || mode === "smart") && (
                  <div className="border-t border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-1">
                      Weight increment
                    </p>
                    <div className="flex flex-wrap gap-2 px-4 pb-3">
                      {KG_INCREMENT_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          onClick={() => handleIncrementChange(preset)}
                          className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                            increment === preset
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          +{preset}kg
                        </button>
                      ))}
                    </div>
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
                )}

                {/* Rep increment — shown for reps mode */}
                {mode === "reps" && (
                  <div className="border-t border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-1">
                      Rep increment
                    </p>
                    <div className="flex gap-2 px-4 pb-3">
                      {REP_INCREMENT_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          onClick={() => handleIncrementRepsChange(preset)}
                          className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                            incrementReps === preset
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
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
                )}
              </div>
            </div>
            <div className="bg-card rounded-2xl overflow-hidden">
              <button
                onClick={() => { setShowProgressionPicker(false); setCustomKgInput(""); setCustomRepInput(""); }}
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
