/**
 * Exercises Page
 *
 * Lists all available exercises (system and user-created).
 * Allows users to browse and potentially add new custom exercises.
 */

import { getAllExercises } from "@/lib/actions/exercises";

export const dynamic = "force-dynamic";

export default async function ExercisesPage() {
  const result = await getAllExercises();
  const exerciseList = result.success ? result.data : [];

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 pt-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Exercises</h1>

      {/* Exercise list */}
      {exerciseList.length > 0 ? (
        <div className="flex flex-col gap-2 mb-4">
          {exerciseList.map((exercise) => (
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
    </div>
  );
}
