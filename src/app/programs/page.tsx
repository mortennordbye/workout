/**
 * Programs Page
 *
 * Lists all of the user's workout programs.
 * Programs can be tapped to see their exercises, or a new one can be created.
 * In edit mode, programs can be deleted from the list.
 */

import { ProgramListClient } from "@/components/features/ProgramListClient";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { getAllExercises } from "@/lib/actions/exercises";
import { getPrograms } from "@/lib/actions/programs";
import { requireSession } from "@/lib/utils/session";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const session = await requireSession();
  const [programResult, exerciseResult, user] = await Promise.all([
    getPrograms(session.user.id),
    getAllExercises(),
    db.query.users.findFirst({ where: eq(users.id, session.user.id) }),
  ]);
  const programList = programResult.success ? programResult.data : [];
  const exerciseList = exerciseResult.success ? exerciseResult.data : [];

  return (
    <div className="h-[100dvh] bg-background overflow-y-auto pb-nav-safe">
      <ProgramListClient
        programs={programList}
        exercises={exerciseList}
        userProfile={{
          gender: user?.gender ?? null,
          birthYear: user?.birthYear ?? null,
          heightCm: user?.heightCm ?? null,
          weightKg: user?.weightKg ?? null,
          goal: user?.goal ?? null,
          experienceLevel: user?.experienceLevel ?? null,
        }}
      />
    </div>
  );
}
