"use client";

/**
 * AddExerciseForm
 *
 * Lets the user pick an exercise from the database and append it to a program.
 */

import { addExerciseToProgram } from "@/lib/actions/programs";
import type { Exercise } from "@/types/workout";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  programId: number;
  exercises: Exercise[];
};

export function AddExerciseForm({ programId, exercises }: Props) {
  const [open, setOpen] = useState(false);
  const [exerciseId, setExerciseId] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!exerciseId) return;
    setLoading(true);
    const result = await addExerciseToProgram({
      programId,
      exerciseId: Number(exerciseId),
    });
    setLoading(false);
    if (result.success) {
      setExerciseId("");
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-primary text-sm font-medium hover:opacity-80 transition-opacity"
      >
        <PlusIcon className="h-4 w-4" />
        Add Exercise
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <select
        autoFocus
        value={exerciseId}
        onChange={(e) =>
          setExerciseId(e.target.value === "" ? "" : Number(e.target.value))
        }
        className="rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 ring-primary"
      >
        <option value="">Select an exercise…</option>
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !exerciseId}
          className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setExerciseId("");
          }}
          className="flex-1 rounded-xl bg-muted py-3 text-sm text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
