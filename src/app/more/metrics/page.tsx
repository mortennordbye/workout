import { MetricsClient } from "@/components/features/MetricsClient";
import {
  getExerciseProgress,
  getMetricsData,
  getSummaryStats,
  getTopProgressingExercises,
} from "@/lib/actions/metrics";
import { requireSession } from "@/lib/utils/session";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
  const session = await requireSession();
  const userId = session.user.id;

  const [metricsResult, summaryResult, topProgressResult] = await Promise.all([
    getMetricsData(userId),
    getSummaryStats(userId),
    getTopProgressingExercises(userId),
  ]);

  const metrics = metricsResult.success
    ? metricsResult.data
    : { weekly: [], personalRecords: [], muscleBalance: [], moodDistribution: [] };

  // Pre-fetch progress for the top PR so the chart is ready on load
  const topExercise = metrics.personalRecords[0] ?? null;
  const progressResult = topExercise
    ? await getExerciseProgress(userId, topExercise.exerciseId)
    : null;

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
    />
  );
}
