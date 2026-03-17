"use client";

import { WorkoutSetsList } from "@/components/features/WorkoutSetsList";
import { deleteProgramSet, reorderProgramSets, updateProgramSet } from "@/lib/actions/programs";
import type { ProgramSet } from "@/types/workout";
import { ChevronLeftIcon, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  programId: number;
  programExerciseId: number;
  programName: string;
  exerciseName: string;
  sets: ProgramSet[];
};

const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240, 300];

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function WorkoutSetsClient({
  programId,
  programExerciseId,
  programName,
  exerciseName,
  sets: initial,
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [sets, setSets] = useState(initial);
  const [editingRestSetId, setEditingRestSetId] = useState<number | null>(null);
  const [restDraft, setRestDraft] = useState(60);

  useEffect(() => {
    setSets(initial);
  }, [initial]);

  async function handleDeleteSet(setId: number) {
    setSets((prev) => prev.filter((s) => s.id !== setId));
    await deleteProgramSet(setId, programId, programExerciseId);
    router.refresh();
  }

  async function handleReorderSets(orderedIds: number[]) {
    setSets((prev) => orderedIds.map((id) => prev.find((s) => s.id === id)!));
    await reorderProgramSets(programExerciseId, orderedIds);
  }

  function openAddRest() {
    setShowActionSheet(false);
    const lastSet = sets[sets.length - 1];
    if (!lastSet) return;
    setRestDraft(60);
    setEditingRestSetId(lastSet.id);
  }

  async function handleSaveRest() {
    if (editingRestSetId === null) return;
    await updateProgramSet({ id: editingRestSetId, restTimeSeconds: restDraft });
    setEditingRestSetId(null);
    router.refresh();
  }

  return (
    <div className="h-[100dvh] pb-16 bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 shrink-0">
        {isEditing ? (
          <button
            onClick={() => setIsEditing(false)}
            className="text-primary text-sm font-medium"
          >
            Done
          </button>
        ) : (
          <Link
            href={`/programs/${programId}/workout`}
            className="flex items-center gap-1 text-primary"
          >
            <ChevronLeftIcon className="h-5 w-5" />
            <span className="text-sm font-medium">{programName}</span>
          </Link>
        )}
        <div className="text-lg font-bold">Sets</div>
        <div className="flex items-center gap-3">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-primary text-sm font-medium"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => setShowActionSheet(true)}
            className="w-7 h-7 rounded-full border-2 border-primary flex items-center justify-center"
          >
            <Plus className="w-4 h-4 text-primary" />
          </button>
        </div>
      </div>

      {/* Exercise title */}
      <div className="px-4 pb-4 shrink-0">
        <h1 className="text-3xl font-bold text-center">{exerciseName}</h1>
      </div>

      {/* Logged count and timer */}
      <div className="px-4 pb-4 flex items-center justify-between shrink-0">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Logged
          </div>
          <div className="text-base font-bold">0 times</div>
        </div>
        <button className="w-12 h-12 rounded-full border-2 border-primary/30 flex items-center justify-center">
          <Clock className="w-6 h-6 text-primary" />
        </button>
      </div>

      {/* Sets list or empty state */}
      <div className="flex-1 px-4 overflow-y-auto">
        {sets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 pb-16">
            {/* Dumbbell icon */}
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
              Tap the add button (+) at the top of the screen to add sets and
              rests
            </p>
            <button className="text-primary text-sm font-medium mt-2">
              Base on previous workout
            </button>
          </div>
        ) : (
          <>
            <WorkoutSetsList
              sets={sets}
              programId={programId}
              programExerciseId={programExerciseId}
              isEditing={isEditing}
              onDeleteSet={handleDeleteSet}
              onReorderSets={handleReorderSets}
            />
            <div className="py-4 border-t border-border">
              <button className="text-primary text-sm font-medium">
                Base on previous workout
              </button>
            </div>
          </>
        )}
      </div>

      {/* Action Sheet */}
      {showActionSheet && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={() => setShowActionSheet(false)}
        >
          <div
            className="w-full px-4 pb-8 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card rounded-2xl overflow-hidden">
              <Link
                href={`/programs/${programId}/exercises/${programExerciseId}/sets/new`}
                onClick={() => setShowActionSheet(false)}
                className="flex items-center justify-center py-4 text-base font-medium border-b border-border active:bg-muted/50 transition-colors"
              >
                Add Set
              </Link>
              <button
                onClick={openAddRest}
                disabled={sets.length === 0}
                className="w-full flex items-center justify-center py-4 text-base font-medium active:bg-muted/50 transition-colors disabled:opacity-40"
              >
                Add Rest
              </button>
            </div>
            <div className="bg-card rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowActionSheet(false)}
                className="w-full flex items-center justify-center py-4 text-base font-semibold text-primary active:bg-muted/50 transition-colors"
              >
                Cancel
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
                      <span className="text-lg">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span>
                      <span className="text-xs opacity-70">m</span>
                    </>
                  )}
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
