"use client";

/**
 * Workout Logger Component
 *
 * The main UI for logging workout sets during an active workout session.
 *
 * Core features:
 * - Exercise selection from categorized list
 * - Set logging with weight (kg), reps, RPE (1-10), and rest time
 * - Auto-starting rest timer after each set
 * - Live display of completed sets in current session
 * - Auto-incrementing set numbers
 *
 * Workflow:
 * 1. User selects exercise
 * 2. Enters weight, reps, RPE, rest time
 * 3. Clicks "Log Set"
 * 4. Set is saved to database
 * 5. Rest timer automatically starts
 * 6. Set appears in history table below
 *
 * Future enhancement injection points (marked with TODOs):
 * - PR Detection: After logging a set, check if it's a personal record
 * - Auto-Deload: Analyze RPE trends and suggest when to reduce weight
 * - Volume Tracking: Calculate total volume (weight × reps × sets)
 * - Estimated 1RM: Show calculated 1-rep max based on current performance
 * - Progressive Overload: Suggest incremental weight increases
 *
 * Usage:
 * ```typescript
 * <WorkoutLogger
 *   sessionId={session.id}
 *   userId={user.id}
 *   exercises={exercises}
 *   initialSets={existingSets}
 * />
 * ```
 */

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logWorkoutSet } from "@/lib/actions/workout-sets";
import { Exercise, WorkoutSet } from "@/types/workout";
import { DumbbellIcon, TrendingUpIcon } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { ExerciseSelector } from "./ExerciseSelector";
import { RestTimer } from "./RestTimer";

interface WorkoutLoggerProps {
  sessionId: number;
  userId: number;
  exercises: Exercise[];
  initialSets?: WorkoutSet[];
}

export function WorkoutLogger({
  sessionId,
  userId,
  exercises,
  initialSets = [],
}: WorkoutLoggerProps) {
  // Form state
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [reps, setReps] = useState<string>("");
  const [rpe, setRpe] = useState<string>("8"); // Default RPE of 8
  const [restTimeSeconds, setRestTimeSeconds] = useState<string>("90"); // Default 90s rest

  // UI state
  const [sets, setSets] = useState<WorkoutSet[]>(initialSets);
  const [isResting, setIsResting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  // Get current set number for selected exercise
  const getCurrentSetNumber = () => {
    if (!selectedExerciseId) return 1;
    const exerciseSets = sets.filter(
      (set) => set.exerciseId === parseInt(selectedExerciseId),
    );
    return exerciseSets.length + 1;
  };

  // Handle form submission
  const handleLogSet = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      // Validate inputs
      if (!selectedExerciseId) {
        setError("Please select an exercise");
        return;
      }

      const setData = {
        sessionId,
        exerciseId: parseInt(selectedExerciseId),
        setNumber: getCurrentSetNumber(),
        actualReps: parseInt(reps),
        weightKg: parseFloat(weightKg),
        rpe: parseInt(rpe),
        restTimeSeconds: parseInt(restTimeSeconds),
        isCompleted: true,
      };

      startTransition(async () => {
        const result = await logWorkoutSet(setData);

        if (result.success) {
          // Add set to local state for immediate UI update
          setSets((prev) => [result.data, ...prev]);

          // Start rest timer
          setIsResting(true);

          // Reset some form fields (keep exercise and rest time)
          // This allows quick logging of multiple sets of same exercise

          // TODO: PR Detection Logic
          // Check if this set is a personal record:
          // const isPR = checkIfPR(result.data, historicalData);
          // if (isPR) {
          //   showCelebrationAnimation();
          //   savePersonalRecord(result.data);
          // }

          // TODO: Auto-Deload Suggestion
          // Analyze recent RPE trends:
          // if (averageRPELast3Sets >= 9.5) {
          //   suggestDeload("Consider reducing weight by 10% next session");
          // }

          // TODO: Volume Tracking
          // Calculate and display session volume:
          // const sessionVolume = calculateTotalVolume(sets);
          // updateVolumeDisplay(sessionVolume);
        } else {
          setError(result.error);
        }
      });
    },
    [sessionId, selectedExerciseId, weightKg, reps, rpe, restTimeSeconds, sets],
  );

  // Format set for display
  const getExerciseName = (exerciseId: number) => {
    return exercises.find((ex) => ex.id === exerciseId)?.name || "Unknown";
  };

  return (
    <div className="space-y-6">
      {/* Logger Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DumbbellIcon className="h-5 w-5" />
            Log Your Set
          </CardTitle>
          <CardDescription>
            Track your weight, reps, and perceived effort for each set
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogSet} className="space-y-4">
            {/* Exercise Selection */}
            <div className="space-y-2">
              <Label htmlFor="exercise">Exercise</Label>
              <ExerciseSelector
                exercises={exercises}
                value={selectedExerciseId}
                onChange={setSelectedExerciseId}
                disabled={isPending}
              />
            </div>

            {/* Weight and Reps (side by side on mobile, full width on desktop) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.5"
                  min="0"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="0.0"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reps">Reps</Label>
                <Input
                  id="reps"
                  type="number"
                  min="0"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder="0"
                  required
                  disabled={isPending}
                />
              </div>
            </div>

            {/* RPE and Rest Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rpe">
                  RPE (1-10)
                  <span className="text-xs text-muted-foreground ml-2">
                    10 = max effort
                  </span>
                </Label>
                <Input
                  id="rpe"
                  type="number"
                  min="1"
                  max="10"
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rest">Rest Time (seconds)</Label>
                <Input
                  id="rest"
                  type="number"
                  min="0"
                  value={restTimeSeconds}
                  onChange={(e) => setRestTimeSeconds(e.target.value)}
                  placeholder="90"
                  required
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isPending || isResting}
            >
              {isPending ? "Logging..." : "Log Set"}
            </Button>

            {/* Set Number Indicator */}
            {selectedExerciseId && (
              <p className="text-center text-sm text-muted-foreground">
                Set #{getCurrentSetNumber()} for{" "}
                {getExerciseName(parseInt(selectedExerciseId))}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Rest Timer (shown after logging a set) */}
      {isResting && (
        <RestTimer
          durationSeconds={parseInt(restTimeSeconds) || 90}
          onComplete={() => {
            // Timer finished - user can log next set
            console.log("Rest period complete!");
          }}
          onDismiss={() => setIsResting(false)}
        />
      )}

      {/* Set History */}
      {sets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5" />
              Today's Sets
            </CardTitle>
            <CardDescription>
              Sets logged in this workout session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sets.map((set, index) => (
                <div
                  key={set.id || index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {getExerciseName(set.exerciseId)} - Set #{set.setNumber}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {set.weightKg}kg × {set.actualReps} reps @ RPE {set.rpe}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {new Date(set.createdAt!).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* TODO: Add volume calculation display */}
            {/* <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium">Session Volume: {totalVolume}kg</p>
            </div> */}
          </CardContent>
        </Card>
      )}

      {/* Helper Text (when no sets logged yet) */}
      {sets.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <DumbbellIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              No sets logged yet. Start your workout by logging your first set!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
