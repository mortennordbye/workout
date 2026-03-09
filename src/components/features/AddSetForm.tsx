"use client";

/**
 * AddSetForm
 *
 * Form for adding rep-based or timed sets to a program exercise.
 */

import { addProgramSet, deleteProgramSet } from "@/lib/actions/programs";
import type { ProgramSet } from "@/types/workout";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  programExerciseId: number;
  nextSetNumber: number;
  sets: ProgramSet[];
};

type Mode = "reps" | "timed";

export function AddSetForm({ programExerciseId, nextSetNumber, sets }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("reps");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [duration, setDuration] = useState("");
  const [rest, setRest] = useState("60");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload: Record<string, unknown> = {
      programExerciseId,
      setNumber: nextSetNumber,
      restTimeSeconds: Number(rest) || 60,
    };

    if (mode === "reps") {
      payload.targetReps = Number(reps) || undefined;
      payload.weightKg = weight !== "" ? Number(weight) : undefined;
    } else {
      payload.durationSeconds = Number(duration) || undefined;
    }

    const result = await addProgramSet(payload);
    setLoading(false);
    if (result.success) {
      setReps("");
      setWeight("");
      setDuration("");
      setRest("60");
      setOpen(false);
      router.refresh();
    }
  }

  async function handleDelete(setId: number) {
    await deleteProgramSet(setId);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Existing sets delete controls */}
      {sets.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between bg-muted/60 rounded-xl px-4 py-3"
        >
          <span className="text-sm font-medium">
            {s.durationSeconds != null
              ? `${formatTime(s.durationSeconds)} timed`
              : `${s.targetReps ?? "?"}x${s.weightKg ?? 0}kg`}{" "}
            — rest {formatTime(Number(s.restTimeSeconds))}
          </span>
          <button
            onClick={() => handleDelete(s.id)}
            className="text-destructive hover:opacity-80"
          >
            <Trash2Icon className="h-4 w-4" />
          </button>
        </div>
      ))}

      {/* Add new set */}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-primary text-sm font-medium hover:opacity-80 transition-opacity"
        >
          <PlusIcon className="h-4 w-4" />
          Add Set
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 bg-muted rounded-xl p-4"
        >
          {/* Mode toggle */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(["reps", "timed"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {m === "reps" ? "Reps / Weight" : "Timed"}
              </button>
            ))}
          </div>

          {mode === "reps" ? (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={1}
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="Reps"
                className="rounded-xl bg-background px-4 py-3 text-sm outline-none focus:ring-2 ring-primary"
              />
              <input
                type="number"
                min={0}
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Weight (kg)"
                className="rounded-xl bg-background px-4 py-3 text-sm outline-none focus:ring-2 ring-primary"
              />
            </div>
          ) : (
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Duration (seconds)"
              className="rounded-xl bg-background px-4 py-3 text-sm outline-none focus:ring-2 ring-primary"
            />
          )}

          <input
            type="number"
            min={0}
            value={rest}
            onChange={(e) => setRest(e.target.value)}
            placeholder="Rest (seconds)"
            className="rounded-xl bg-background px-4 py-3 text-sm outline-none focus:ring-2 ring-primary"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save Set"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl bg-background py-3 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
