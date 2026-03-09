"use client";

/**
 * AddSetForm
 *
 * Form for adding sets to a program exercise - displays existing sets.
 */

import { deleteProgramSet } from "@/lib/actions/programs";
import type { ProgramSet } from "@/types/workout";
import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  programExerciseId: number;
  sets: ProgramSet[];
};

export function AddSetForm({ sets }: Props) {
  const router = useRouter();

  async function handleDelete(setId: number) {
    await deleteProgramSet(setId);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Existing sets */}
      {sets.map((s, index) => (
        <div key={s.id} className="flex items-center gap-4 py-4">
          {/* Set number badge */}
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            <span className="text-sm font-bold">{index + 1}</span>
          </div>

          {/* Set details */}
          <div className="flex-1">
            <p className="text-lg font-medium">
              {s.targetReps ?? "?"} x {Number(s.weightKg ?? 0)}kg
            </p>
          </div>

          {/* Delete button */}
          <button
            onClick={() => handleDelete(s.id)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <Trash2Icon className="h-4 w-4 text-destructive" />
          </button>
        </div>
      ))}
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
