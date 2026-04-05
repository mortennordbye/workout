"use client";

import { useWorkoutSession } from "@/contexts/workout-session-context";
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
import { Check, ChevronRightIcon, GripVertical, Minus } from "lucide-react";
import Link from "next/link";

type Exercise = {
  id: number;
  name: string;
  sets: ProgramSet[];
};

type Props = {
  programId: number;
  exercises: Exercise[];
  isEditing?: boolean;
  onDeleteExercise?: (id: number) => void;
  onReorderExercises?: (orderedIds: number[]) => void;
};


export function WorkoutExerciseList({
  programId,
  exercises,
  isEditing = false,
  onDeleteExercise,
  onReorderExercises,
}: Props) {
  const workoutSession = useWorkoutSession();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = exercises.findIndex((e) => e.id === active.id);
    const newIndex = exercises.findIndex((e) => e.id === over.id);
    const reordered = arrayMove(exercises, oldIndex, newIndex);
    onReorderExercises?.(reordered.map((e) => e.id));
  }

  function isExerciseCompleted(exercise: Exercise): boolean {
    if (!workoutSession || exercise.sets.length === 0) return false;
    return exercise.sets.every((s) => workoutSession.completedSetIds.has(s.id));
  }

  function toggleExercise(exercise: Exercise) {
    if (!workoutSession) return;
    if (isExerciseCompleted(exercise)) {
      exercise.sets.forEach((s) => workoutSession.removeCompletedSet(s.id));
    } else {
      exercise.sets.forEach((s) => workoutSession.addCompletedSet(s.id));
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={exercises.map((e) => e.id)}
        strategy={verticalListSortingStrategy}
      >
        {exercises.map((exercise) => (
          <SortableExerciseRow
            key={exercise.id}
            exercise={exercise}
            programId={programId}
            isEditing={isEditing}
            isCompleted={isExerciseCompleted(exercise)}
            summary={buildSetSummary(exercise.sets)}
            onToggle={() => toggleExercise(exercise)}
            onDelete={() => onDeleteExercise?.(exercise.id)}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableExerciseRow({
  exercise,
  programId,
  isEditing,
  isCompleted,
  summary,
  onToggle,
  onDelete,
}: {
  exercise: Exercise;
  programId: number;
  isEditing: boolean;
  isCompleted: boolean;
  summary: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id, disabled: !isEditing });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center gap-3 py-3.5 border-b border-border"
    >
      {isEditing && (
        <button
          type="button"
          onClick={onDelete}
          className="w-7 h-7 rounded-full bg-destructive flex items-center justify-center shrink-0"
        >
          <Minus className="w-4 h-4 text-white" />
        </button>
      )}

      {isEditing ? (
        <div className="w-7 h-7 rounded-full border-2 border-muted-foreground/30 shrink-0" />
      ) : (
        <button
          onClick={onToggle}
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
            isCompleted ? "bg-primary" : "border-2 border-muted-foreground/30"
          }`}
        >
          {isCompleted && <Check className="w-4 h-4 text-primary-foreground" />}
        </button>
      )}

      {isEditing ? (
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium">{exercise.name}</p>
          {summary && (
            <p className="text-xs text-muted-foreground truncate mt-1">
              {summary}
            </p>
          )}
        </div>
      ) : (
        <Link
          href={`/programs/${programId}/workout/exercises/${exercise.id}`}
          className="flex-1 min-w-0"
        >
          <p className="text-base font-medium">{exercise.name}</p>
          {summary && (
            <p className="text-xs text-muted-foreground truncate mt-1">
              {summary}
            </p>
          )}
        </Link>
      )}

      {isEditing ? (
        <button
          {...attributes}
          {...listeners}
          className="w-10 h-10 flex items-center justify-center shrink-0 text-muted-foreground touch-none"
        >
          <GripVertical className="h-5 w-5" />
        </button>
      ) : (
        <ChevronRightIcon className="h-5 w-5 text-muted-foreground shrink-0" />
      )}
    </div>
  );
}
