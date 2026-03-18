import { getAllExercises } from "@/lib/actions/exercises";
import { ExercisesClient } from "@/components/features/ExercisesClient";

export const dynamic = "force-dynamic";

export default async function ExercisesPage() {
  const result = await getAllExercises();
  const exerciseList = result.success ? result.data : [];

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 pt-8 pb-24">
        <ExercisesClient exercises={exerciseList} />
      </div>
    </div>
  );
}
