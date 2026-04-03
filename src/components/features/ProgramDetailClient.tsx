"use client";

import {
  removeExerciseFromProgram,
  reorderProgramExercises,
} from "@/lib/actions/programs";
import { buildSetSummary } from "@/lib/utils/format";
import type { ProgramSet } from "@/types/workout";
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
import { ChevronRight, GripVertical, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ProgramExItem = {
  id: number;
  name: string;
  sets: ProgramSet[];
};

type Props = {
  programId: number;
  programName: string;
  exercises: ProgramExItem[];
};


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
      className="flex items-center gap-3 py-4 border-b border-border last:border-0"
    >
      {/* Left: red minus in edit, decorative circle in view — identical size, no layout shift */}
      {isEditing ? (
        <button
          type="button"
          onClick={() => onDelete(exercise.id)}
          className="w-7 h-7 rounded-full bg-destructive flex items-center justify-center shrink-0"
          aria-label="Remove exercise"
        >
          <Minus className="w-4 h-4 text-white" />
        </button>
      ) : (
        <div className="w-7 h-7 rounded-full border-2 border-muted-foreground/30 shrink-0" />
      )}

      {/* Exercise info */}
      <Link
        href={`/programs/${programId}/exercises/${exercise.id}`}
        className="flex-1 min-w-0"
        onClick={(e) => { if (isEditing) e.preventDefault(); }}
      >
        <p className="text-base font-medium">{exercise.name}</p>
        {summary && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {summary}
          </p>
        )}
      </Link>

      {/* Right: fixed w-10 container in both modes — chevron in view, grip in edit, no layout shift */}
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
        <div className="w-10 h-10 flex items-center justify-center shrink-0">
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export function ProgramDetailClient({
  programId,
  programName,
  exercises: initial,
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exercises, setExercises] = useState(initial);
  // Snapshot of exercise order when entering edit mode — used for Cancel
  const [preEditExercises, setPreEditExercises] = useState<ProgramExItem[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(new Set());

  // Sync when server data refreshes (e.g. after AddExerciseForm adds a new exercise)
  useEffect(() => {
    if (!isEditing) {
      setExercises(initial);
    }
  }, [initial, isEditing]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function startEditing() {
    setPreEditExercises(exercises);
    setPendingDeleteIds(new Set());
    setIsEditing(true);
  }

  function cancelEditing() {
    setExercises(preEditExercises);
    setPendingDeleteIds(new Set());
    setIsEditing(false);
  }

  async function saveEditing() {
    setSaving(true);
    // Apply deletions
    for (const peId of pendingDeleteIds) {
      await removeExerciseFromProgram(peId, programId);
    }
    // Apply reorder on the surviving exercises
    const surviving = exercises.filter((e) => !pendingDeleteIds.has(e.id));
    if (surviving.length > 1) {
      await reorderProgramExercises(programId, surviving.map((e) => e.id));
    }
    setSaving(false);
    setIsEditing(false);
    router.refresh();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = exercises.findIndex((e) => e.id === active.id);
    const newIndex = exercises.findIndex((e) => e.id === over.id);
    // Only update local state — persisted on Save
    setExercises(arrayMove(exercises, oldIndex, newIndex));
  }

  function handleDeleteExercise(peId: number) {
    // Mark as pending delete and hide from list — persisted on Save
    setPendingDeleteIds((prev) => new Set(prev).add(peId));
    setExercises((prev) => prev.filter((e) => e.id !== peId));
  }

  return (
    <div className="h-[100dvh] pb-16 bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 shrink-0">
        {isEditing ? (
          <button
            type="button"
            onClick={cancelEditing}
            disabled={saving}
            className="text-muted-foreground text-sm font-medium disabled:opacity-40 shrink-0"
          >
            Cancel
          </button>
        ) : (
          <Link href="/programs" className="text-primary text-sm font-medium whitespace-nowrap shrink-0">
            &lt; Back
          </Link>
        )}
        <h1 className="text-xl font-bold truncate px-2">{programName}</h1>
        {isEditing ? (
          <button
            type="button"
            onClick={saveEditing}
            disabled={saving}
            className="text-primary text-sm font-semibold disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        ) : (
          <button
            type="button"
            onClick={startEditing}
            className="text-primary text-sm font-medium"
          >
            Edit
          </button>
        )}
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


      </div>

      {/* Add exercise button in edit mode */}
      {isEditing && (
        <div className="shrink-0 px-4 pb-4 pt-2 border-t border-border">
          <Link
            href={`/programs/${programId}/add-exercise`}
            className="flex items-center gap-2 text-primary text-sm font-medium"
          >
            <div className="w-7 h-7 rounded-full border-2 border-primary flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            Add exercise
          </Link>
        </div>
      )}
    </div>
  );
}
