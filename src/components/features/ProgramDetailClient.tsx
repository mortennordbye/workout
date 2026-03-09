"use client";

import { AddExerciseForm } from "@/components/features/AddExerciseForm";
import {
    deleteProgram,
    removeExerciseFromProgram,
    reorderProgramExercises,
} from "@/lib/actions/programs";
import type { Exercise, ProgramSet } from "@/types/workout";
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ProgramExItem = {
  id: number;
  name: string;
  sets: ProgramSet[];
};

type Props = {
  programId: number;
  programName: string;
  exercises: ProgramExItem[];
  allExercises: Exercise[];
};

function setToken(s: ProgramSet): string {
  if (s.durationSeconds != null) {
    const t = Number(s.durationSeconds);
    return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  }
  return `${s.targetReps ?? "?"}x${Number(s.weightKg ?? 0)}kg`;
}

function restToken(s: ProgramSet): string {
  const t = Number(s.restTimeSeconds);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function buildSetSummary(sets: ProgramSet[]): string {
  if (sets.length === 0) return "";
  const tokens = sets.map((s) => `${setToken(s)}; ${restToken(s)}`);
  return tokens.length > 3
    ? tokens.slice(0, 3).join("; ") + "; ..."
    : tokens.join("; ");
}

function SortableExerciseRow({
  exercise,
  programId,
  isEditing,
  onDelete,
}: {
  exercise: ProgramExItem;
  programId: number;
  isEditing: boolean;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id, disabled: !isEditing });

  const summary = buildSetSummary(exercise.sets);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center gap-3 px-4 py-4 border-b border-border last:border-0"
    >
      {/* Left: drag handle in edit, decorative circle in view */}
      {isEditing ? (
        <button
          {...attributes}
          {...listeners}
          className="w-10 h-10 flex items-center justify-center shrink-0 text-muted-foreground touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-5 h-5" />
        </button>
      ) : (
        <div className="w-10 h-10 rounded-full border-2 border-muted-foreground/30 shrink-0" />
      )}

      {/* Exercise info */}
      <Link
        href={`/programs/${programId}/exercises/${exercise.id}`}
        className="flex-1 min-w-0"
      >
        <p className="text-base font-medium">{exercise.name}</p>
        {summary && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {summary}
          </p>
        )}
      </Link>

      {/* Right: delete in edit mode only */}
      {isEditing && (
        <button
          type="button"
          onClick={() => onDelete(exercise.id)}
          className="w-10 h-10 flex items-center justify-center shrink-0 text-destructive"
          aria-label="Remove exercise"
        >
          <Trash2Icon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export function ProgramDetailClient({
  programId,
  programName,
  exercises: initial,
  allExercises,
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [exercises, setExercises] = useState(initial);
  const [deletingProgram, setDeletingProgram] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = exercises.findIndex((e) => e.id === active.id);
    const newIndex = exercises.findIndex((e) => e.id === over.id);
    const reordered = arrayMove(exercises, oldIndex, newIndex);
    setExercises(reordered); // optimistic
    await reorderProgramExercises(
      programId,
      reordered.map((e) => e.id),
    );
  }

  async function handleDeleteExercise(peId: number) {
    setExercises((prev) => prev.filter((e) => e.id !== peId));
    await removeExerciseFromProgram(peId, programId);
    router.refresh();
  }

  async function handleDeleteProgram() {
    if (!confirm(`Delete "${programName}"? This cannot be undone.`)) return;
    setDeletingProgram(true);
    await deleteProgram(programId);
    router.push("/programs");
    router.refresh();
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header — same layout as workout page */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 shrink-0">
        <Link href="/programs" className="text-primary text-sm font-medium">
          &lt; Programs
        </Link>
        <h1 className="text-xl font-bold truncate px-2">{programName}</h1>
        <button
          type="button"
          onClick={() => setIsEditing((v) => !v)}
          className="text-primary text-sm font-medium"
        >
          {isEditing ? "Done" : "Edit"}
        </button>
      </div>

      {/* Exercises — scrollable */}
      <div className="flex-1 overflow-y-auto px-4">
        {exercises.length === 0 && !isEditing && (
          <p className="text-muted-foreground text-sm py-4">
            No exercises yet. Tap Edit to add one.
          </p>
        )}

        {exercises.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={exercises.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col">
                {exercises.map((ex) => (
                  <SortableExerciseRow
                    key={ex.id}
                    exercise={ex}
                    programId={programId}
                    isEditing={isEditing}
                    onDelete={handleDeleteExercise}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {isEditing && (
          <div className="mt-4">
            <AddExerciseForm programId={programId} exercises={allExercises} />
          </div>
        )}

        {isEditing && (
          <button
            type="button"
            onClick={handleDeleteProgram}
            disabled={deletingProgram}
            className="w-full mt-8 mb-6 py-4 rounded-xl text-destructive text-sm font-semibold border border-destructive/30 disabled:opacity-50"
          >
            {deletingProgram ? "Deleting…" : "Delete Program"}
          </button>
        )}
      </div>

      {/* Start Workout — view mode only, pinned to bottom */}
      {!isEditing && (
        <div className="px-4 pb-8 shrink-0">
          <Link
            href={`/programs/${programId}/workout`}
            className="block w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-center text-base"
          >
            Start Workout
          </Link>
        </div>
      )}
    </div>
  );
}
