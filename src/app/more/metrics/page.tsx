import { MetricsClient } from "@/components/features/MetricsClient";
import { getExerciseProgress, getMetricsData } from "@/lib/actions/metrics";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = 1;

export default async function MetricsPage() {
  const metricsResult = await getMetricsData(DEMO_USER_ID);

  const metrics = metricsResult.success
    ? metricsResult.data
    : { weekly: [], personalRecords: [], muscleBalance: [] };

  // Pre-fetch progress for the top PR so the chart is ready on load
  const topExercise = metrics.personalRecords[0] ?? null;
  const progressResult = topExercise
    ? await getExerciseProgress(DEMO_USER_ID, topExercise.exerciseId)
    : null;

  return (
    <MetricsClient
      userId={DEMO_USER_ID}
      weekly={metrics.weekly}
      personalRecords={metrics.personalRecords}
      muscleBalance={metrics.muscleBalance}
      initialProgress={progressResult?.success ? progressResult.data : []}
      initialExerciseId={topExercise?.exerciseId ?? null}
    />
  );
}
