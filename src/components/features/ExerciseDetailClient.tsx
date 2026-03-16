"use client";

import { deleteProgramSet, updateProgramSet } from "@/lib/actions/programs";
import type { ProgramSet } from "@/types/workout";
import { ChevronLeftIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  programId: number;
  programExerciseId: number;
  programName: string;
  exerciseName: string;
  category: string;
  sets: ProgramSet[];
};

const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240, 300];

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function ExerciseDetailClient({
  programId,
  programExerciseId,
  programName,
  exerciseName,
  category,
  sets: initial,
}: Props) {
  const router = useRouter();
  const [sets, setSets] = useState(initial);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingRestSetId, setEditingRestSetId] = useState<number | null>(null);
  const [restDraft, setRestDraft] = useState(60);

  useEffect(() => {
    setSets(initial);
  }, [initial]);

  async function handleDeleteSet(setId: number) {
    setSets((prev) => prev.filter((s) => s.id !== setId));
    await deleteProgramSet(setId);
    router.refresh();
  }

  async function handleSaveRest() {
    if (editingRestSetId === null) return;
    await updateProgramSet({
      id: editingRestSetId,
      restTimeSeconds: restDraft,
    });
    setEditingRestSetId(null);
    router.refresh();
  }

  async function handleDeleteRest(setId: number) {
    await updateProgramSet({ id: setId, restTimeSeconds: 0 });
    router.refresh();
  }

  function openAddRest() {
    setShowAddSheet(false);
    const lastSet = sets[sets.length - 1];
    if (!lastSet) return;
    setRestDraft(60);
    setEditingRestSetId(lastSet.id);
  }

  function openEditRest(s: ProgramSet) {
    setRestDraft(Number(s.restTimeSeconds));
    setEditingRestSetId(s.id);
  }

  return (
    <div className="h-[100dvh] pb-16 bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-6 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <Link
            href={`/programs/${programId}`}
            className="flex items-center gap-1 text-primary"
          >
            <ChevronLeftIcon className="h-5 w-5" />
            <span className="text-sm font-medium">{programName}</span>
          </Link>
          <button
            onClick={() => setShowAddSheet(true)}
            className="text-primary text-sm font-medium px-1 py-1"
          >
            Add
          </button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">
          {exerciseName}
        </h1>
        <p className="text-sm text-muted-foreground capitalize">{category}</p>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-4 pt-4">
        {sets.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">
            No sets yet. Tap Add to get started.
          </p>
        )}

        {sets.map((s, index) => (
          <div key={s.id}>
            {/* Set row */}
            <div className="flex items-center gap-4 py-4 border-b border-border">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <span className="text-sm font-bold">{index + 1}</span>
              </div>

              <Link
                href={`/programs/${programId}/exercises/${programExerciseId}/sets/${s.id}`}
                className="flex-1 active:opacity-60 transition-opacity"
              >
                {s.durationSeconds != null ? (
                  <p className="text-lg font-medium">
                    {formatTime(Number(s.durationSeconds))} timed
                  </p>
                ) : (
                  <p className="text-lg font-medium">
                    {s.targetReps ?? "?"} x {Number(s.weightKg ?? 0)}kg
                  </p>
                )}
              </Link>

              <button
                onClick={() => handleDeleteSet(s.id)}
                className="w-10 h-10 flex items-center justify-center active:opacity-60 transition-opacity"
              >
                <Trash2Icon className="h-5 w-5 text-destructive" />
              </button>
            </div>

            {/* Rest row — only shown if rest > 0 */}
            {Number(s.restTimeSeconds) > 0 && (
              <div className="flex items-center pl-14 pr-2 py-2 border-b border-border/40">
                <button
                  onClick={() => openEditRest(s)}
                  className="flex-1 text-left active:opacity-60 transition-opacity"
                >
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    REST {formatTime(Number(s.restTimeSeconds))}
                  </span>
                </button>
                <button
                  onClick={() => handleDeleteRest(s.id)}
                  className="w-8 h-8 flex items-center justify-center active:opacity-60"
                >
                  <Trash2Icon className="h-4 w-4 text-destructive/60" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* "Add" bottom sheet */}
      {showAddSheet && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setShowAddSheet(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 bg-card rounded-t-3xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-3">
              <Link
                href={`/programs/${programId}/exercises/${programExerciseId}/sets/new`}
                onClick={() => setShowAddSheet(false)}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-center text-base"
              >
                Add Set
              </Link>
              <button
                onClick={openAddRest}
                disabled={sets.length === 0}
                className="w-full py-4 rounded-xl border border-border font-semibold text-base disabled:opacity-40 active:bg-muted/50 transition-colors"
              >
                Add Rest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rest duration picker */}
      {editingRestSetId !== null && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end">
          <div className="w-full bg-card rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-muted-foreground uppercase tracking-wider">
                Select Rest Time
              </span>
              <button
                onClick={handleSaveRest}
                className="text-primary text-sm font-medium"
              >
                Done
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-4">
              {REST_OPTIONS.map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => setRestDraft(seconds)}
                  className={`flex-shrink-0 w-20 h-20 rounded-full flex flex-col items-center justify-center font-bold transition-all active:scale-95 ${
                    restDraft === seconds
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <span className="text-lg">
                    {seconds < 60 ? seconds : Math.floor(seconds / 60)}
                  </span>
                  <span className="text-xs opacity-70">
                    {seconds < 60 ? "s" : "m"}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4">
              <input
                type="number"
                value={restDraft}
                onChange={(e) => setRestDraft(Number(e.target.value))}
                className="w-full rounded-xl bg-background px-4 py-3 text-center text-2xl font-bold outline-none focus:ring-2 ring-primary"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
