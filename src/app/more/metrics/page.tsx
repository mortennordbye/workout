import { MetricsClient } from "@/components/features/MetricsClient";
import {
  getExerciseProgress,
  getMetricsData,
  getSummaryStats,
  getTopProgressingExercises,
} from "@/lib/actions/metrics";
import { getWeightHistory } from "@/lib/actions/profile";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { requireSession } from "@/lib/utils/session";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
  const session = await requireSession();
  const userId = session.user.id;

  // Fetch metrics first to discover the top exercise for the progress chart
  const metricsResult = await getMetricsData(userId);
  const metrics = metricsResult.success
    ? metricsResult.data
    : { weekly: [], personalRecords: [], muscleBalance: [], moodDistribution: [] };

  const topExercise = metrics.personalRecords[0] ?? null;

  // Batch remaining queries in parallel, including progress chart now that we know the exercise
  const [summaryResult, topProgressResult, weightHistoryResult, userRow, progressResult] = await Promise.all([
    getSummaryStats(userId),
    getTopProgressingExercises(userId),
    getWeightHistory(),
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    topExercise ? getExerciseProgress(userId, topExercise.exerciseId) : Promise.resolve(null),
  ]);

  return (
    <MetricsClient
      userId={userId}
      weekly={metrics.weekly}
      personalRecords={metrics.personalRecords}
      muscleBalance={metrics.muscleBalance}
      moodDistribution={metrics.moodDistribution}
      summaryStats={summaryResult.success ? summaryResult.data : null}
      topProgressing={topProgressResult.success ? topProgressResult.data : []}
      initialProgress={progressResult?.success ? progressResult.data : []}
      initialExerciseId={topExercise?.exerciseId ?? null}
      weightHistory={weightHistoryResult.success ? weightHistoryResult.data : []}
      profileWeightKg={userRow?.weightKg ?? null}
    />
  );
}
