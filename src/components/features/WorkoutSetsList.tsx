"use client";

import { reorderProgramSets, updateProgramSet } from "@/lib/actions/programs";
import { logWorkoutSet } from "@/lib/actions/workout-sets";
import type { SetSuggestionDisplay } from "@/components/features/WorkoutSetsClient";
import { useWorkoutSession } from "@/contexts/workout-session-context";
import { formatTime } from "@/lib/utils/format";
import { computeMapping, toFlatItems } from "@/lib/utils/set-mapping";
import type { FlatItem, RestFlatItem, SetFlatItem } from "@/lib/utils/set-mapping";
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
import { Check, GripVertical, Minus, Play, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkoutSetsListProps = {
  sets: ProgramSet[];
  programId: number;
  programExerciseId: number;
  isEditing?: boolean;
  isWorkout?: boolean;
  isTimed?: boolean;
  exerciseId?: number;
  sessionId?: number;
  onDeleteSet?: (setId: number) => void;
  suggestions?: Record<number, SetSuggestionDisplay>;
  onApplySuggestion?: (setId: number, weightKg: number) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240, 300];

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkoutSetsList({
  sets,
  programId,
  programExerciseId,
  isEditing = false,
  isWorkout = false,
  isTimed = false,
  exerciseId,
  sessionId,
  onDeleteSet,
  suggestions,
  onApplySuggestion,
}: WorkoutSetsListProps) {
  const router = useRouter();
  const workoutSession = useWorkoutSession();
  const [flatItems, setFlatItems] = useState<FlatItem[]>(() =>
    toFlatItems(sets),
  );
  // In workout mode, completedSets is backed by the session context so it
  // survives navigation away and back within the workout layout.
  const completedSets = isWorkout && workoutSession
    ? workoutSession.completedSetIds
    : undefined;
  const [localCompletedSets, setLocalCompletedSets] = useState<Set<number>>(new Set());
  const activeCompletedSets = completedSets ?? localCompletedSets;
  const [restTimers, setRestTimers] = useState<Map<number, number>>(new Map());
  const [exerciseTimer, setExerciseTimer] = useState<{
    setId: number;
    remaining: number;
    total: number;
  } | null>(null);
  const [editingRestItemId, setEditingRestItemId] = useState<string | null>(null);
  const [restDraft, setRestDraft] = useState(60);

  useEffect(() => {
    setFlatItems(toFlatItems(sets));
  }, [sets]);

  // When sets are pre-completed (e.g. marked via exercise checkmark), show their
  // rest timers as already finished (0) rather than showing the configured duration.
  useEffect(() => {
    if (!isWorkout) return;
    setRestTimers((prev) => {
      const next = new Map(prev);
      let changed = false;
      flatItems.forEach((item, i) => {
        if (
          item.type === "set" &&
          activeCompletedSets.has(item.set.id) &&
          flatItems[i + 1]?.type === "rest" &&
          !next.has(item.set.id)
        ) {
          next.set(item.set.id, 0);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompletedSets, flatItems]);

  // ── Persist helpers ─────────────────────────────────────────────────────────

  async function saveCurrentState(items: FlatItem[]) {
    const { orderedSetIds, restAssignments } = computeMapping(items);
    if (orderedSetIds.length > 0) {
      await reorderProgramSets(programExerciseId, orderedSetIds);
    }
    await Promise.all(
      Array.from(restAssignments.entries()).map(([setId, seconds]) =>
        updateProgramSet({ id: setId, restTimeSeconds: seconds }),
      ),
    );
    router.refresh();
  }

  // ── Set completion ──────────────────────────────────────────────────────────

  const toggleSet = async (setId: number) => {
    const flatIndex = flatItems.findIndex((i) => i.id === `set-${setId}`);
    const setItems = flatItems.filter(
      (i): i is SetFlatItem => i.type === "set",
    );
    const setIndex = setItems.findIndex((s) => s.set.id === setId);

    if (activeCompletedSets.has(setId)) {
      if (completedSets) {
        workoutSession!.removeCompletedSet(setId);
      } else {
        setLocalCompletedSets((prev) => { const s = new Set(prev); s.delete(setId); return s; });
      }
      setRestTimers((timers) => {
        const t = new Map(timers);
        t.delete(setId);
        return t;
      });
    } else {
      if (completedSets) {
        workoutSession!.addCompletedSet(setId);
      } else {
        setLocalCompletedSets((prev) => new Set(prev).add(setId));
      }
      const newCompleted = new Set(activeCompletedSets).add(setId);

      // Start timer from the rest item immediately after this set in the flat list
      const nextFlatItem = flatIndex >= 0 ? flatItems[flatIndex + 1] : undefined;
      const restSeconds =
        nextFlatItem?.type === "rest" ? nextFlatItem.seconds : 0;

      // Auto-complete rest timers for all preceding sets (catch-up scenario)
      setRestTimers((timers) => {
        const t = new Map(timers);
        for (let i = 0; i < flatIndex; i++) {
          const item = flatItems[i];
          if (item.type === "set" && (t.get(item.set.id) ?? 0) > 0) {
            t.set(item.set.id, 0);
          }
        }
        if (restSeconds > 0) {
          t.set(setId, restSeconds);
        }
        return t;
      });

      // Log the completed set to the database
      if (isWorkout && sessionId != null && exerciseId != null) {
        const setData = setItems[setIndex]?.set;
        if (setData) {
          void logWorkoutSet({
            sessionId,
            exerciseId,
            setNumber: setIndex + 1,
            targetReps: setData.targetReps ?? undefined,
            actualReps: setData.targetReps ?? 0,
            weightKg: Number(setData.weightKg ?? 0),
            rpe: 7,
            restTimeSeconds: restSeconds,
            isCompleted: true,
          });
        }
      }

      // Auto-carry weight to next set
      const currentSet = setItems[setIndex]?.set;
      const nextSet = setItems[setIndex + 1]?.set;
      if (
        currentSet &&
        nextSet &&
        currentSet.weightKg != null &&
        !activeCompletedSets.has(nextSet.id)
      ) {
        await updateProgramSet({
          id: nextSet.id,
          weightKg: Number(currentSet.weightKg),
        });
        router.refresh();
      }
    }
  };

  // ── Rest timer countdown ────────────────────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      setRestTimers((timers) => {
        const newTimers = new Map(timers);
        let changed = false;
        timers.forEach((remaining, id) => {
          if (remaining > 0) {
            newTimers.set(id, remaining - 1);
            changed = true;
          }
        });
        return changed ? newTimers : timers;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Exercise timer countdown ─────────────────────────────────────────────────

  useEffect(() => {
    if (!exerciseTimer) return;
    if (exerciseTimer.remaining === 0) {
      void toggleSet(exerciseTimer.setId);
      setExerciseTimer(null);
      return;
    }
    const id = setTimeout(() => {
      setExerciseTimer((prev) =>
        prev ? { ...prev, remaining: prev.remaining - 1 } : null,
      );
    }, 1000);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseTimer?.remaining, exerciseTimer?.setId]);

  function startExerciseTimer(setId: number, durationSeconds: number) {
    setExerciseTimer({ setId, remaining: durationSeconds, total: durationSeconds });
  }

  // ── Rest editing ────────────────────────────────────────────────────────────

  function insertRest(insertIndex: number) {
    const newId = `rest-new-${Date.now()}`;
    const newItem: RestFlatItem = { type: "rest", id: newId, seconds: 60 };
    const newItems = [
      ...flatItems.slice(0, insertIndex),
      newItem,
      ...flatItems.slice(insertIndex),
    ];
    setFlatItems(newItems);
    setRestDraft(60);
    setEditingRestItemId(newId);
  }

  async function handleSaveRest() {
    if (!editingRestItemId) return;
    const newItems = flatItems.map((i) =>
      i.id === editingRestItemId ? { ...i, seconds: restDraft } : i,
    );
    setFlatItems(newItems);
    setEditingRestItemId(null);
    await saveCurrentState(newItems);
  }

  async function handleDeleteRest(restItemId: string) {
    const newItems = flatItems.filter((i) => i.id !== restItemId);
    setFlatItems(newItems);
    await saveCurrentState(newItems);
  }

  // ── Drag and drop ───────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = flatItems.findIndex((i) => i.id === active.id);
    const newIndex = flatItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(flatItems, oldIndex, newIndex);
    setFlatItems(reordered);
    await saveCurrentState(reordered);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={flatItems.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {/* Top insert button — always visible in edit mode */}
          {isEditing && flatItems.length > 0 && (
            <InsertRestButton onClick={() => insertRest(0)} />
          )}

          {flatItems.map((item, index) => {
            if (item.type === "set") {
              const setNumber =
                flatItems.slice(0, index).filter((i) => i.type === "set")
                  .length + 1;
              return (
                <div key={item.id}>
                  <SortableSetRow
                    id={item.id}
                    set={item.set}
                    setNumber={setNumber}
                    isEditing={isEditing}
                    isWorkout={isWorkout}
                    isTimed={isTimed}
                    isCompleted={activeCompletedSets.has(item.set.id)}
                    programId={programId}
                    programExerciseId={programExerciseId}
                    onToggle={() => toggleSet(item.set.id)}
                    onDelete={() => onDeleteSet?.(item.set.id)}
                    onStartTimer={startExerciseTimer}
                    suggestion={suggestions?.[item.set.id]}
                    onApplySuggestion={onApplySuggestion}
                  />
                  {isEditing && flatItems[index + 1]?.type !== "rest" && (
                    <InsertRestButton onClick={() => insertRest(index + 1)} />
                  )}
                </div>
              );
            } else {
              // Find preceding set for the rest timer
              const precedingSet = flatItems
                .slice(0, index)
                .reverse()
                .find((i): i is SetFlatItem => i.type === "set");
              const restRemaining = precedingSet
                ? restTimers.get(precedingSet.set.id)
                : undefined;
              const restProgress =
                restRemaining !== undefined && item.seconds > 0
                  ? ((item.seconds - restRemaining) / item.seconds) * 100
                  : 0;
              return (
                <div key={item.id}>
                  <SortableRestRow
                    id={item.id}
                    seconds={item.seconds}
                    isEditing={isEditing}
                    restRemaining={restRemaining}
                    restProgress={restProgress}
                    onDelete={() => handleDeleteRest(item.id)}
                    onEdit={() => {
                      setRestDraft(item.seconds);
                      setEditingRestItemId(item.id);
                    }}
                  />
                </div>
              );
            }
          })}
        </SortableContext>
      </DndContext>

      {/* Exercise timer overlay */}
      {exerciseTimer !== null && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-6">
            {/* Circular progress ring */}
            <div className="relative w-56 h-56">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-primary/20"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="text-primary transition-all duration-1000"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - exerciseTimer.remaining / exerciseTimer.total)}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-7xl font-bold tabular-nums">
                  {formatTime(exerciseTimer.remaining)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            <button
              onClick={() => setExerciseTimer(null)}
              className="px-8 py-4 rounded-2xl bg-muted text-foreground text-base font-semibold active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                void toggleSet(exerciseTimer.setId);
                setExerciseTimer(null);
              }}
              className="px-8 py-4 rounded-2xl bg-primary text-primary-foreground text-base font-semibold active:scale-95 transition-all flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              Done
            </button>
          </div>
        </div>
      )}

      {/* Rest duration picker */}
      {editingRestItemId !== null && (
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
                      <span className="text-lg">
                        {Math.floor(seconds / 60)}:
                        {String(seconds % 60).padStart(2, "0")}
                      </span>
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
    </>
  );
}

// ─── Insert rest button ───────────────────────────────────────────────────────

function InsertRestButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 py-1 text-muted-foreground/50 hover:text-primary transition-colors group"
    >
      <div className="flex-1 border-t border-dashed border-border group-hover:border-primary/40 transition-colors" />
      <span className="flex items-center gap-0.5 text-xs font-medium shrink-0">
        <Plus className="w-3 h-3" />
        REST
      </span>
      <div className="flex-1 border-t border-dashed border-border group-hover:border-primary/40 transition-colors" />
    </button>
  );
}

// ─── Sortable set row ─────────────────────────────────────────────────────────

function SortableSetRow({
  id,
  set,
  setNumber,
  isEditing,
  isWorkout,
  isTimed,
  isCompleted,
  programId,
  programExerciseId,
  onToggle,
  onDelete,
  onStartTimer,
  suggestion,
  onApplySuggestion,
}: {
  id: string;
  set: ProgramSet;
  setNumber: number;
  isEditing: boolean;
  isWorkout: boolean;
  isTimed: boolean;
  isCompleted: boolean;
  programId: number;
  programExerciseId: number;
  onToggle: () => void;
  onDelete: () => void;
  onStartTimer?: (setId: number, duration: number) => void;
  suggestion?: SetSuggestionDisplay;
  onApplySuggestion?: (setId: number, weightKg: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditing });

  const router = useRouter();

  const setEditHref = isWorkout
    ? `/programs/${programId}/workout/exercises/${programExerciseId}/sets/${set.id}`
    : `/programs/${programId}/exercises/${programExerciseId}/sets/${set.id}`;

  const handleRowClick = () => {
    if (isEditing) return;
    router.push(setEditHref);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) return;
    if (isTimed && isWorkout && !isCompleted) {
      onStartTimer?.(set.id, set.durationSeconds ?? 60);
    } else {
      onToggle();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`flex items-center gap-3 py-4 border-t border-b border-border${!isEditing ? " cursor-pointer" : ""}`}
      onClick={handleRowClick}
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

      {isTimed && isWorkout && !isCompleted ? (
        /* Timed incomplete: play starts timer, check circle marks complete directly */
        <>
          <button
            onClick={handlePlayClick}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors border-2 border-primary bg-transparent"
          >
            <Play className="w-3 h-3 text-primary fill-primary" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors border-2 border-primary/40 bg-transparent"
          >
            <Check className="w-4 h-4 text-primary/40" />
          </button>
        </>
      ) : (
        <button
          onClick={handlePlayClick}
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors border-2 ${
            isCompleted
              ? "bg-primary border-primary"
              : "border-primary bg-transparent"
          }`}
        >
          {isCompleted ? (
            <Check className="w-4 h-4 text-primary-foreground" />
          ) : (
            <Play className="w-3 h-3 text-primary fill-primary" />
          )}
        </button>
      )}

      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
        <span className="text-xs font-bold">{setNumber}</span>
      </div>

      <div className="flex-1">
        {isTimed || set.durationSeconds != null ? (
          <p className="text-lg font-medium">
            {formatTime(Number(set.durationSeconds ?? 60))}
          </p>
        ) : (
          <p className="text-lg font-medium">
            {set.targetReps ?? "?"} x {Number(set.weightKg ?? 0)}kg
          </p>
        )}
        {isWorkout && suggestion && (() => {
          const currentWeight = Number(set.weightKg ?? 0);
          const isPending = suggestion.reason !== "manual" && currentWeight !== suggestion.suggestedWeightKg;
          return (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">
                Last: {suggestion.basedOnWeightKg}kg ({suggestion.basedOnFeeling})
              </span>
              {isPending && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApplySuggestion?.(set.id, suggestion.suggestedWeightKg);
                  }}
                  className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold active:opacity-60 transition-opacity"
                >
                  {suggestion.reason === "progressed" ? "↑" : "="} {suggestion.suggestedWeightKg}kg
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {isEditing && (
        <button
          {...attributes}
          {...listeners}
          className="w-8 h-8 flex items-center justify-center shrink-0 touch-none"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// ─── Sortable rest row ────────────────────────────────────────────────────────

function SortableRestRow({
  id,
  seconds,
  isEditing,
  restRemaining,
  restProgress,
  onDelete,
  onEdit,
}: {
  id: string;
  seconds: number;
  isEditing: boolean;
  restRemaining: number | undefined;
  restProgress: number;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditing });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="pb-2 border-b border-border"
    >
      {isEditing ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDelete}
            className="w-7 h-7 rounded-full bg-destructive flex items-center justify-center shrink-0"
          >
            <Minus className="w-4 h-4 text-white" />
          </button>
          <div className="w-7 shrink-0" />
          <div className="w-7 shrink-0" />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              REST {formatTime(seconds)}
            </div>
          </div>
          <button
            {...attributes}
            {...listeners}
            className="w-8 h-8 flex items-center justify-center shrink-0 touch-none"
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <div onClick={onEdit} className="cursor-pointer active:opacity-60 transition-opacity">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            REST{" "}
            {restRemaining !== undefined
              ? formatTime(restRemaining)
              : formatTime(seconds)}
          </div>
          <div className="mt-1 h-1 bg-primary/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000"
              style={{ width: `${restProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

