"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { addProgramSet } from "@/lib/actions/programs";
import type { ProgramSet } from "@/types/workout";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Interpolates orange → yellow → green across the range
function gradientColor(index: number, total: number): string {
  const ratio = index / Math.max(total - 1, 1);
  if (ratio < 0.5) {
    const t = ratio / 0.5;
    return `rgb(${Math.round(249 + (234 - 249) * t)},${Math.round(115 + (179 - 115) * t)},${Math.round(22 + (8 - 22) * t)})`;
  }
  const t = (ratio - 0.5) / 0.5;
  return `rgb(${Math.round(234 + (34 - 234) * t)},${Math.round(179 + (197 - 179) * t)},${Math.round(8 + (94 - 8) * t)})`;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 300, 600];

type Props = {
  programId: number;
  programExerciseId: number;
  nextSetNumber: number;
  lastSet?: ProgramSet;
  isTimed?: boolean;
  isWorkout?: boolean;
};

export function NewSetView({
  programId,
  programExerciseId,
  nextSetNumber,
  lastSet,
  isTimed = false,
  isWorkout = false,
}: Props) {
  const router = useRouter();
  const [showRepsPicker, setShowRepsPicker] = useState(false);
  const [showWeightPicker, setShowWeightPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showRepsKeypad, setShowRepsKeypad] = useState(false);
  const [showWeightKeypad, setShowWeightKeypad] = useState(false);
  const [saving, setSaving] = useState(false);
  const repsInputRef = useRef<HTMLInputElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);

  const [reps, setReps] = useState(lastSet?.targetReps ?? 10);
  const [weight, setWeight] = useState(Number(lastSet?.weightKg ?? 0));
  const [duration, setDuration] = useState(Number(lastSet?.durationSeconds ?? 60));
  const [repsStr, setRepsStr] = useState(String(lastSet?.targetReps ?? 10));
  const [weightStr, setWeightStr] = useState(String(Number(lastSet?.weightKg ?? 0)));
  const [durationStr, setDurationStr] = useState(String(Number(lastSet?.durationSeconds ?? 60)));
  const weightScrollRef = useRef<HTMLDivElement>(null);

  const WEIGHT_OPTIONS = [0, ...Array.from({ length: 60 }, (_, i) => (i + 1) * 2.5)];
  const closestWeight = WEIGHT_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr - weight) < Math.abs(prev - weight) ? curr : prev
  );

  useEffect(() => {
    if (!showWeightPicker) return;
    requestAnimationFrame(() => {
      const el = weightScrollRef.current;
      if (!el) return;
      const index = WEIGHT_OPTIONS.indexOf(closestWeight);
      const itemWidth = 52; // w-11 (44px) + gap-2 (8px)
      el.scrollLeft = Math.max(0, index * itemWidth - el.clientWidth / 2 + 22);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWeightPicker]);

  const handleSave = async () => {
    setSaving(true);
    if (isTimed) {
      await addProgramSet({
        programExerciseId,
        setNumber: nextSetNumber,
        durationSeconds: duration,
        restTimeSeconds: 0,
      });
    } else {
      await addProgramSet({
        programExerciseId,
        setNumber: nextSetNumber,
        targetReps: reps,
        weightKg: weight,
        restTimeSeconds: 0,
      });
    }
    router.push(
      isWorkout
        ? `/programs/${programId}/workout/exercises/${programExerciseId}?edit=true`
        : `/programs/${programId}/exercises/${programExerciseId}?edit=true`
    );
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

      {/* Duration Picker Modal */}
      <BottomSheet open={showDurationPicker} onClose={() => setShowDurationPicker(false)} blur>
        <div className="w-full bg-card rounded-t-3xl pb-10">
          <div className="flex items-center justify-between px-5 pt-6 pb-5">
            <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Select Duration
            </span>
            <button
              onClick={() => setShowDurationPicker(false)}
              className="px-4 py-1.5 rounded-full border border-primary text-primary text-sm font-medium active:bg-primary/10 transition-colors"
            >
              Done
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto px-5 pb-3 no-scrollbar">
            {DURATION_OPTIONS.map((seconds) => (
              <button
                key={seconds}
                onClick={() => { setDuration(seconds); setDurationStr(String(seconds)); setShowDurationPicker(false); }}
                className={`flex-shrink-0 w-20 h-20 rounded-full flex flex-col items-center justify-center font-bold transition-all active:scale-95 ${
                  duration === seconds ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {seconds < 60 ? (
                  <><span className="text-lg">{seconds}</span><span className="text-xs opacity-70">s</span></>
                ) : seconds % 60 === 0 ? (
                  <><span className="text-lg">{seconds / 60}</span><span className="text-xs opacity-70">m</span></>
                ) : (
                  <><span className="text-lg">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span><span className="text-xs opacity-70">m</span></>
                )}
              </button>
            ))}
          </div>
          <div className="px-5 pt-2">
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
              className="w-full rounded-xl bg-background border border-border px-4 py-3 text-center text-2xl font-bold outline-none focus:ring-2 ring-primary"
            />
          </div>
        </div>
      </BottomSheet>

      {/* Reps Picker Modal */}
      <BottomSheet open={showRepsPicker} onClose={() => setShowRepsPicker(false)} blur>
          <div className="w-full bg-card rounded-t-3xl pb-10">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-6 pb-5">
              <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Select Reps
              </span>
              <button
                onClick={() => {
                  if (!showRepsKeypad) setRepsStr(String(reps));
                  setShowRepsKeypad((v) => !v);
                  setTimeout(() => repsInputRef.current?.focus(), 50);
                }}
                className="px-4 py-1.5 rounded-full border border-primary text-primary text-sm font-medium active:bg-primary/10 transition-colors"
              >
                Keypad
              </button>
            </div>

            {/* Scroll wheel */}
            <div className="flex gap-2 overflow-x-auto px-5 pb-3 no-scrollbar cursor-grab active:cursor-grabbing">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((num, idx) => {
                const color = gradientColor(idx, 30);
                const selected = reps === num;
                return (
                  <button
                    key={num}
                    onClick={() => setReps(num)}
                    style={
                      selected
                        ? { backgroundColor: color, borderColor: color }
                        : { borderColor: color, color }
                    }
                    className={`flex-shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-all ${
                      selected ? "text-black scale-110" : "bg-transparent"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            {/* Manual input */}
            {showRepsKeypad && (
              <div className="px-5 pt-2 pb-1">
                <input
                  ref={repsInputRef}
                  type="text"
                  inputMode="numeric"
                  value={repsStr}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setRepsStr(val);
                    setReps(Math.max(1, parseInt(val) || 1));
                  }}
                  onBlur={() => { const n = Math.max(1, parseInt(repsStr) || 1); setReps(n); setRepsStr(String(n)); }}
                  className="w-full rounded-xl bg-background border border-border px-4 py-3 text-center text-2xl font-bold outline-none focus:ring-2 ring-primary"
                />
              </div>
            )}
          </div>
      </BottomSheet>

      {/* Weight Picker Modal */}
      <BottomSheet open={showWeightPicker} onClose={() => setShowWeightPicker(false)} blur>
          <div className="w-full bg-card rounded-t-3xl pb-10">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-6 pb-5">
              <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Select Weight
              </span>
              <button
                onClick={() => {
                  if (!showWeightKeypad) setWeightStr(String(weight));
                  setShowWeightKeypad((v) => !v);
                  setTimeout(() => weightInputRef.current?.focus(), 50);
                }}
                className="px-4 py-1.5 rounded-full border border-primary text-primary text-sm font-medium active:bg-primary/10 transition-colors"
              >
                Keypad
              </button>
            </div>

            {/* Scroll wheel */}
            <div ref={weightScrollRef} className="flex gap-2 overflow-x-auto px-5 pb-3 no-scrollbar cursor-grab active:cursor-grabbing">
              {WEIGHT_OPTIONS.map((num, idx) => {
                  const total = 61;
                  const color = gradientColor(idx, total);
                  const selected = num === closestWeight;
                  return (
                    <button
                      key={num}
                      onClick={() => setWeight(num)}
                      style={
                        selected
                          ? { backgroundColor: color, borderColor: color }
                          : { borderColor: color, color }
                      }
                      className={`flex-shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center text-xs font-semibold transition-all ${
                        selected ? "text-black scale-110" : "bg-transparent"
                      }`}
                    >
                      {num % 1 === 0 ? num : num.toFixed(1)}
                    </button>
                  );
              })}
            </div>

            {/* Manual input */}
            {showWeightKeypad && (
              <div className="px-5 pt-2 pb-1">
                <input
                  ref={weightInputRef}
                  type="text"
                  inputMode="decimal"
                  value={weightStr}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d.]/g, "");
                    setWeightStr(val);
                    const n = parseFloat(val);
                    if (!isNaN(n)) setWeight(Math.max(0, n));
                  }}
                  onBlur={() => { const n = parseFloat(weightStr) || 0; setWeight(n); setWeightStr(String(n)); }}
                  className="w-full rounded-xl bg-background border border-border px-4 py-3 text-center text-2xl font-bold outline-none focus:ring-2 ring-primary"
                />
              </div>
            )}
          </div>
      </BottomSheet>
    </>
  );
}
