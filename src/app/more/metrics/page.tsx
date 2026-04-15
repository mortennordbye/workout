import { MetricsClient } from "@/components/features/MetricsClient";
import {
  getExerciseProgress,
  getMetricsData,
  getMetricsCycles,
  getSummaryStats,
  getTopProgressingExercises,
  getCardioMetrics,
  getHeatmapData,
  getMovementPatternBalance,
  getReadinessPerformance,
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
  const [
    summaryResult,
    topProgressResult,
    weightHistoryResult,
    userRow,
    progressResult,
    cyclesResult,
    cardioResult,
    heatmapResult,
    movementResult,
    readinessResult,
  ] = await Promise.all([
    getSummaryStats(userId),
    getTopProgressingExercises(userId),
    getWeightHistory(),
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    topExercise ? getExerciseProgress(userId, topExercise.exerciseId) : Promise.resolve(null),
    getMetricsCycles(userId),
    getCardioMetrics(userId),
    getHeatmapData(userId),
    getMovementPatternBalance(userId),
    getReadinessPerformance(userId),
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
      cycles={cyclesResult.success ? cyclesResult.data : []}
      cardioMetrics={cardioResult.success ? cardioResult.data : null}
      heatmapData={heatmapResult.success ? heatmapResult.data : []}
      movementPatternData={movementResult.success ? movementResult.data : []}
      readinessData={readinessResult.success ? readinessResult.data : []}
    />
  );
}
