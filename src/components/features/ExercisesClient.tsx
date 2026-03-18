"use client";

import { createCustomExercise } from "@/lib/actions/exercises";
import type { Exercise } from "@/types/workout";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Category = "strength" | "cardio" | "flexibility";

export function ExercisesClient({ exercises }: { exercises: Exercise[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("strength");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    const result = await createCustomExercise({
      name: name.trim(),
      category,
      isCustom: true,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Failed to create exercise");
      return;
    }
    setName("");
    setCategory("strength");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Exercises</h1>
        <button
          onClick={() => { setOpen(true); setError(""); }}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl min-h-[44px] active:opacity-80 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>

      {/* Create form */}
      {open && (
        <div className="bg-card rounded-2xl p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">New Exercise</p>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exercise name"
              className="w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 ring-primary"
            />
            <div className="grid grid-cols-3 gap-2">
              {(["strength", "cardio", "flexibility"] as Category[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2.5 rounded-xl text-sm font-semibold capitalize transition-colors ${
                    category === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground active:opacity-70"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create Exercise"}
            </button>
          </form>
        </div>
      )}

      {/* Exercise list */}
      {exercises.length > 0 ? (
        <div className="flex flex-col gap-2">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="flex items-center justify-between p-4 rounded-xl bg-muted"
            >
              <div>
                <h3 className="font-semibold">{exercise.name}</h3>
                {exercise.category && (
                  <p className="text-sm text-muted-foreground capitalize">
                    {exercise.category}
                  </p>
                )}
              </div>
              {exercise.isCustom && (
                <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                  Custom
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center mt-8">
          No exercises found.
        </p>
      )}
    </>
  );
}
