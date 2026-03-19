"use client";

import { updateProgramSet } from "@/lib/actions/programs";
import { useWorkoutSession } from "@/contexts/workout-session-context";
import { useTheme } from "@/components/ui/theme-provider";
import type { ProgramSet } from "@/types/workout";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  set: ProgramSet;
  isWorkout?: boolean;
  isTimed?: boolean;
};

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 300, 600];

export function SetEditView({ set, isWorkout = false, isTimed = false }: Props) {
  const router = useRouter();
  const [showRepsPicker, setShowRepsPicker] = useState(false);
  const [showWeightPicker, setShowWeightPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const workoutSession = useWorkoutSession();
  const { autoSaveToProgram } = useTheme();
  const override = isWorkout ? (workoutSession?.overrides[set.id] ?? null) : null;

  const [reps, setReps] = useState(override?.targetReps ?? set.targetReps ?? 10);
  const [weight, setWeight] = useState(override?.weightKg ?? Number(set.weightKg ?? 0));
  const [duration, setDuration] = useState(Number(set.durationSeconds ?? 60));

  const handleSave = async () => {
    setSaving(true);
    if (isTimed) {
      await updateProgramSet({ id: set.id, durationSeconds: duration });
    } else if (!isWorkout || autoSaveToProgram) {
      await updateProgramSet({ id: set.id, targetReps: reps, weightKg: weight });
    } else if (isWorkout && !autoSaveToProgram) {
      workoutSession?.setOverride(set.id, { targetReps: reps, weightKg: weight });
    }
    router.back();
  };

  return (
    <>
      <div className="flex-1 px-4 animate-in fade-in duration-150">
        {isTimed ? (
          /* Duration row for timed exercises */
          <button
            onClick={() => setShowDurationPicker(true)}
            className="w-full flex items-center justify-between py-4 border-b border-border transition-colors hover:bg-muted/50 active:bg-muted/70"
          >
            <span className="text-base font-medium">Duration</span>
            <span className="text-base text-muted-foreground">
              {duration < 60
                ? `${duration}s`
                : duration % 60 === 0
                  ? `${duration / 60}m`
                  : `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`}
            </span>
          </button>
        ) : (
          <>
            {/* Reps */}
            <button
              onClick={() => setShowRepsPicker(true)}
              className="w-full flex items-center justify-between py-4 border-b border-border transition-colors hover:bg-muted/50 active:bg-muted/70"
            >
              <span className="text-base font-medium">Reps</span>
              <span className="text-base text-muted-foreground">{reps}</span>
            </button>

            {/* Weight */}
            <button
              onClick={() => setShowWeightPicker(true)}
              className="w-full flex items-center justify-between py-4 border-b border-border transition-colors hover:bg-muted/50 active:bg-muted/70"
            >
              <span className="text-base font-medium">Weight (kg)</span>
              <span className="text-base text-muted-foreground">{weight}</span>
            </button>
          </>
        )}

        {/* Base on previous workout suggestion */}
        <div className="mt-6">
          <button className="text-primary text-sm">
            Base on previous workout
          </button>
        </div>
      </div>

      {/* Save button */}
      <div className="p-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2Icon className="h-5 w-5 animate-spin" />
              Saving...
            </span>
          ) : (
            "Save"
          )}
        </button>
      </div>

      {/* Reps Picker Modal */}
      {showRepsPicker && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end animate-in fade-in duration-150">
          <div className="w-full bg-card rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-200 ease-spring">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-muted-foreground uppercase tracking-wider">
                Select Reps
              </span>
              <button
                onClick={() => setShowRepsPicker(false)}
                className="text-primary text-sm font-medium"
              >
                Done
              </button>
            </div>

            {/* Number picker */}
            <div className="flex gap-2 overflow-x-auto pb-4">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setReps(num);
                    setShowRepsPicker(false);
                  }}
                  className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold transition-all hover:scale-105 active:scale-95 ${
                    reps === num
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80 active:bg-muted"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Manual input */}
            <div className="mt-4">
              <input
                type="number"
                value={reps}
                onChange={(e) => setReps(Number(e.target.value))}
                className="w-full rounded-xl bg-background px-4 py-3 text-center text-2xl font-bold outline-none focus:ring-2 ring-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Duration Picker Modal */}
      {showDurationPicker && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end animate-in fade-in duration-150">
          <div className="w-full bg-card rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-200 ease-spring">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-muted-foreground uppercase tracking-wider">
                Select Duration
              </span>
              <button
                onClick={() => setShowDurationPicker(false)}
                className="text-primary text-sm font-medium"
              >
                Done
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-4">
              {DURATION_OPTIONS.map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => {
                    setDuration(seconds);
                    setShowDurationPicker(false);
                  }}
                  className={`flex-shrink-0 w-20 h-20 rounded-full flex flex-col items-center justify-center font-bold transition-all active:scale-95 ${
                    duration === seconds
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {seconds < 60 ? (
                    <>
                      <span className="text-lg">{seconds}</span>
                      <span className="text-xs opacity-70">s</span>
                    </>
                  ) : seconds % 60 === 0 ? (
                    <>
                      <span className="text-lg">{seconds / 60}</span>
                      <span className="text-xs opacity-70">m</span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg">
                        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
                      </span>
                      <span className="text-xs opacity-70">m</span>
                    </>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full rounded-xl bg-background px-4 py-3 text-center text-2xl font-bold outline-none focus:ring-2 ring-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Weight Picker Modal */}
      {showWeightPicker && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end animate-in fade-in duration-150">
          <div className="w-full bg-card rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-200 ease-spring">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-muted-foreground uppercase tracking-wider">
                Select Weight
              </span>
              <button
                onClick={() => setShowWeightPicker(false)}
                className="text-primary text-sm font-medium"
              >
                Done
              </button>
            </div>

            {/* Weight picker */}
            <div className="flex gap-2 overflow-x-auto pb-4">
              {Array.from({ length: 40 }, (_, i) => (i + 1) * 2.5).map(
                (num) => (
                  <button
                    key={num}
                    onClick={() => {
                      setWeight(num);
                      setShowWeightPicker(false);
                    }}
                    className={`flex-shrink-0 w-20 h-20 rounded-full flex flex-col items-center justify-center font-bold transition-all hover:scale-105 active:scale-95 ${
                      weight === num
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground hover:bg-muted/80 active:bg-muted"
                    }`}
                  >
                    <span className="text-lg">{num}</span>
                    <span className="text-xs opacity-70">kg</span>
                  </button>
                ),
              )}
            </div>

            {/* Manual input */}
            <div className="mt-4">
              <input
                type="number"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full rounded-xl bg-background px-4 py-3 text-center text-2xl font-bold outline-none focus:ring-2 ring-primary"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
