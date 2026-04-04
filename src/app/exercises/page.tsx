import { getAllExercises } from "@/lib/actions/exercises";
import { ExercisesClient } from "@/components/features/ExercisesClient";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ExercisesPage() {
  const result = await getAllExercises();
  const exerciseList = result.success ? result.data : [];

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <div className="flex items-center px-4 pt-6 pb-2 shrink-0">
        <Link href="/more" className="flex items-center gap-0.5 text-primary active:opacity-70 -ml-1">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">More</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32">
        <ExercisesClient exercises={exerciseList} />
      </div>
    </div>
  );
}
