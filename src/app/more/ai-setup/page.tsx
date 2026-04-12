import { AiSetupClient } from "@/components/features/AiSetupClient";
import { getAllExercises } from "@/lib/actions/exercises";
import { parseUserGoals } from "@/lib/utils/goals";
import { requireSession } from "@/lib/utils/session";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AiSetupPage() {
  const session = await requireSession();
  const [exerciseResult, user] = await Promise.all([
    getAllExercises(),
    db.query.users.findFirst({ where: eq(users.id, session.user.id) }),
  ]);

  const exercises = exerciseResult.success ? exerciseResult.data : [];
  const userProfile = {
    gender: user?.gender ?? null,
    birthYear: user?.birthYear ?? null,
    heightCm: user?.heightCm ?? null,
    weightKg: user?.weightKg ?? null,
    goals: parseUserGoals(user?.goals, user?.goal),
    experienceLevel: user?.experienceLevel ?? null,
  };

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-y-auto pb-nav-safe">
      <div className="flex items-center px-4 pt-6 pb-2 shrink-0">
        <Link href="/more" className="flex items-center gap-0.5 text-primary active:opacity-70 -ml-1 min-h-[44px]">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">More</span>
        </Link>
      </div>
      <div className="px-4 pt-2 pb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">AI Setup</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate your programs and training schedule in seconds.</p>
      </div>
      <AiSetupClient exercises={exercises} userProfile={userProfile} />
    </div>
  );
}
