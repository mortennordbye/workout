import { HistoryClient } from "@/components/features/HistoryClient";
import { getCompletedSessions } from "@/lib/actions/workout-sets";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = 1;

export default async function HistoryPage() {
  const result = await getCompletedSessions(DEMO_USER_ID);
  const sessions = result.success ? result.data : [];
  return <HistoryClient sessions={sessions} />;
}
