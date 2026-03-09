"use client";

/**
 * Exercise Selector Component
 *
 * A dropdown for selecting exercises, grouped by category.
 * Displays system exercises and user-created custom exercises.
 *
 * Categories:
 * - Strength: Barbell, dumbbell, machine exercises
 * - Cardio: Running, cycling, rowing, etc.
 * - Flexibility: Stretching, yoga, mobility work
 *
 * Future enhancements:
 * - Add search/filter functionality
 * - Show recent exercises first
 * - Display exercise instructions on select
 * - Add custom exercise creation inline
 *
 * Usage:
 * ```typescript
 * <ExerciseSelector
 *   exercises={exercises}
 *   value={selectedExerciseId}
 *   onChange={setSelectedExerciseId}
 * />
 * ```
 */

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Exercise } from "@/types/workout";

interface ExerciseSelectorProps {
  exercises: Exercise[];
  value?: string;
  onChange: (exerciseId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ExerciseSelector({
  exercises,
  value,
  onChange,
  placeholder = "Select an exercise",
  disabled = false,
}: ExerciseSelectorProps) {
  // Group exercises by category
  const exercisesByCategory = exercises.reduce<Record<string, Exercise[]>>(
    (acc, exercise) => {
      const category = exercise.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(exercise);
      return acc;
    },
    {},
  );

  // Sort exercises within each category alphabetically
  Object.keys(exercisesByCategory).forEach((category) => {
    exercisesByCategory[category].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Category display names
  const categoryNames: Record<string, string> = {
    strength: "Strength",
    cardio: "Cardio",
    flexibility: "Flexibility",
  };

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(exercisesByCategory).map(
          ([category, categoryExercises]) => (
            <SelectGroup key={category}>
              <SelectLabel className="text-sm font-semibold">
                {categoryNames[category] || category}
              </SelectLabel>
              {categoryExercises.map((exercise) => (
                <SelectItem key={exercise.id} value={exercise.id.toString()}>
                  <div className="flex items-center gap-2">
                    <span>{exercise.name}</span>
                    {exercise.isCustom && (
                      <span className="text-xs text-muted-foreground">
                        (Custom)
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ),
        )}

        {/* Show message if no exercises */}
        {exercises.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No exercises available
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
