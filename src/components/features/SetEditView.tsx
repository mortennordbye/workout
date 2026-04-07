"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { updateProgramSet } from "@/lib/actions/programs";
import { useWorkoutSession } from "@/contexts/workout-session-context";
import type { ProgramSet } from "@/types/workout";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const override = isWorkout ? (workoutSession?.overrides[set.id] ?? null) : null;

  const [reps, setReps] = useState(override?.targetReps ?? set.targetReps ?? 10);
  const [weight, setWeight] = useState(override?.weightKg ?? Number(set.weightKg ?? 0));
  const [duration, setDuration] = useState(Number(set.durationSeconds ?? 60));
  const [repsStr, setRepsStr] = useState(String(override?.targetReps ?? set.targetReps ?? 10));
  const [weightStr, setWeightStr] = useState(String(override?.weightKg ?? Number(set.weightKg ?? 0)));
  const [durationStr, setDurationStr] = useState(String(Number(set.durationSeconds ?? 60)));
  const weightScrollRef = useRef<HTMLDivElement>(null);
  const repsScrollRef = useRef<HTMLDivElement>(null);

  const WEIGHT_OPTIONS = [0, ...Array.from({ length: 40 }, (_, i) => (i + 1) * 2.5)];
  const closestWeight = WEIGHT_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr - weight) < Math.abs(prev - weight) ? curr : prev
  );

  const BASE_REPS = Array.from({ length: 20 }, (_, i) => i + 1);
  const repOptions = reps > 20 ? [...BASE_REPS, reps] : BASE_REPS;

  // Scroll reps circles to current value when picker opens or reps change
  useEffect(() => {
    if (!showRepsPicker) return;
    requestAnimationFrame(() => {
      const el = repsScrollRef.current;
      if (!el) return;
      const index = repOptions.indexOf(reps);
      const itemWidth = 72; // w-16 (64px) + gap-2 (8px)
      el.scrollLeft = Math.max(0, index * itemWidth - el.clientWidth / 2 + 32);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRepsPicker, reps]);

  useEffect(() => {
    if (!showWeightPicker) return;
    requestAnimationFrame(() => {
      const el = weightScrollRef.current;
      if (!el) return;
      const index = WEIGHT_OPTIONS.indexOf(closestWeight);
      const itemWidth = 88; // w-20 (80px) + gap-2 (8px)
      el.scrollLeft = Math.max(0, index * itemWidth - el.clientWidth / 2 + 40);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWeightPicker]);

  const handleSave = async () => {
    setSaving(true);
    if (isWorkout) {
      // During a workout, changes apply to the active session only — never write back to the program
      workoutSession?.setOverride(set.id, { targetReps: reps, weightKg: weight });
    } else if (isTimed) {
      await updateProgramSet({ id: set.id, durationSeconds: duration });
    } else {
      await updateProgramSet({ id: set.id, targetReps: reps, weightKg: weight });
    }
    router.back();
  };

  return (
    <>
      <div className="flex-1 px-4 animate-in fade-in duration-150">
        {isTimed ? (
          /* Duration row for timed exercises */
          <button
            onClick={() => { setDurationStr(String(duration)); setShowDurationPicker(true); }}
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
              onClick={() => { setRepsStr(String(reps)); setShowRepsPicker(true); }}
              className="w-full flex items-center justify-between py-4 border-b border-border transition-colors hover:bg-muted/50 active:bg-muted/70"
            >
              <span className="text-base font-medium">Reps</span>
              <span className="text-base text-muted-foreground">{reps}</span>
            </button>

            {/* Weight */}
            <button
              onClick={() => { setWeightStr(String(weight)); setShowWeightPicker(true); }}
              className="w-full flex items-center justify-between py-4 border-b border-border transition-colors hover:bg-muted/50 active:bg-muted/70"
            >
              <span className="text-base font-medium">Weight (kg)</span>
              <span className="text-base text-muted-foreground">{weight}</span>
            </button>
          </>
        )}

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
      <BottomSheet open={showRepsPicker} onClose={() => setShowRepsPicker(false)} blur>
          <div className="w-full bg-card rounded-t-3xl p-6">
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
            <div ref={repsScrollRef} className="flex gap-2 overflow-x-auto pb-4">
              {repOptions.map((num) => (
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
                type="text"
                inputMode="numeric"
                value={repsStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setRepsStr(val);
                  setReps(Math.max(1, parseInt(val) || 1));
                }}
                onBlur={() => { const n = Math.max(1, parseInt(repsStr) || 1); setReps(n); setRepsStr(String(n)); }}
                className="w-full rounded-xl bg-background px-4 py-3 text-center text-2xl font-bold outline-none focus:ring-2 ring-primary"
              />
            </div>
          </div>
      </BottomSheet>

      {/* Duration Picker Modal */}
      <BottomSheet open={showDurationPicker} onClose={() => setShowDurationPicker(false)} blur>
          <div className="w-full bg-card rounded-t-3xl p-6">
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
                type="text"
                inputMode="numeric"
                value={durationStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setDurationStr(val);
                  setDuration(Math.max(0, parseInt(val) || 0));
                }}
                onBlur={() => { const n = Math.max(0, parseInt(durationStr) || 0); setDuration(n); setDurationStr(String(n)); }}
                className="w-full rounded-xl bg-background px-4 py-3 text-center text-2xl font-bold outline-none focus:ring-2 ring-primary"
              />
            </div>
          </div>
      </BottomSheet>

      {/* Weight Picker Modal */}
      <BottomSheet open={showWeightPicker} onClose={() => setShowWeightPicker(false)} blur>
          <div className="w-full bg-card rounded-t-3xl p-6">
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
            <div ref={weightScrollRef} className="flex gap-2 overflow-x-auto pb-4">
              {WEIGHT_OPTIONS.map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setWeight(num);
                    setShowWeightPicker(false);
                  }}
                  className={`flex-shrink-0 w-20 h-20 rounded-full flex flex-col items-center justify-center font-bold transition-all hover:scale-105 active:scale-95 ${
                    num === closestWeight
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80 active:bg-muted"
                  }`}
                >
                  <span className="text-lg">{num}</span>
                  <span className="text-xs opacity-70">kg</span>
                </button>
              ))}
            </div>

            {/* Manual input */}
            <div className="mt-4">
              <input
                type="text"
                inputMode="decimal"
                value={weightStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d.]/g, "");
                  setWeightStr(val);
                  const n = parseFloat(val);
                  if (!isNaN(n)) setWeight(n);
                }}
                onBlur={() => { const n = parseFloat(weightStr) || 0; setWeight(n); setWeightStr(String(n)); }}
                className="w-full rounded-xl bg-background px-4 py-3 text-center text-2xl font-bold outline-none focus:ring-2 ring-primary"
              />
            </div>
          </div>
      </BottomSheet>
    </>
  );
}
