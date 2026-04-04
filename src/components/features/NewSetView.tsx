"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { addProgramSet } from "@/lib/actions/programs";
import type { ProgramSet } from "@/types/workout";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

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

type Props = {
  programId: number;
  programExerciseId: number;
  nextSetNumber: number;
  lastSet?: ProgramSet;
};

export function NewSetView({
  programId,
  programExerciseId,
  nextSetNumber,
  lastSet,
}: Props) {
  const router = useRouter();
  const [showRepsPicker, setShowRepsPicker] = useState(false);
  const [showWeightPicker, setShowWeightPicker] = useState(false);
  const [showRepsKeypad, setShowRepsKeypad] = useState(false);
  const [showWeightKeypad, setShowWeightKeypad] = useState(false);
  const [saving, setSaving] = useState(false);
  const repsInputRef = useRef<HTMLInputElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);

  const [reps, setReps] = useState(lastSet?.targetReps ?? 10);
  const [weight, setWeight] = useState(Number(lastSet?.weightKg ?? 0));

  const handleSave = async () => {
    setSaving(true);
    await addProgramSet({
      programExerciseId,
      setNumber: nextSetNumber,
      targetReps: reps,
      weightKg: weight,
      restTimeSeconds: 0,
    });
    router.push(`/programs/${programId}/exercises/${programExerciseId}?edit=true`);
  };

  return (
    <>
      <div className="flex-1 px-4 animate-in fade-in duration-150">
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
          <div className="w-full bg-card rounded-t-3xl pb-10">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-6 pb-5">
              <span className="text-sm font-semibold uppercase tracking-widest text-foreground">
                Select Reps
              </span>
              <button
                onClick={() => {
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
                  type="number"
                  inputMode="numeric"
                  value={reps}
                  onChange={(e) =>
                    setReps(Math.max(1, Number(e.target.value) || 1))
                  }
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
              <span className="text-sm font-semibold uppercase tracking-widest text-foreground">
                Select Weight
              </span>
              <button
                onClick={() => {
                  setShowWeightKeypad((v) => !v);
                  setTimeout(() => weightInputRef.current?.focus(), 50);
                }}
                className="px-4 py-1.5 rounded-full border border-primary text-primary text-sm font-medium active:bg-primary/10 transition-colors"
              >
                Keypad
              </button>
            </div>

            {/* Scroll wheel */}
            <div className="flex gap-2 overflow-x-auto px-5 pb-3 no-scrollbar cursor-grab active:cursor-grabbing">
              {[0, ...Array.from({ length: 60 }, (_, i) => (i + 1) * 2.5)].map(
                (num, idx) => {
                  const total = 61;
                  const color = gradientColor(idx, total);
                  const selected = weight === num;
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
                },
              )}
            </div>

            {/* Manual input */}
            {showWeightKeypad && (
              <div className="px-5 pt-2 pb-1">
                <input
                  ref={weightInputRef}
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={weight}
                  onChange={(e) =>
                    setWeight(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-full rounded-xl bg-background border border-border px-4 py-3 text-center text-2xl font-bold outline-none focus:ring-2 ring-primary"
                />
              </div>
            )}
          </div>
      </BottomSheet>
    </>
  );
}
