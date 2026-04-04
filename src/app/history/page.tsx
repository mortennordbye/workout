import { HistoryClient } from "@/components/features/HistoryClient";
import { getCompletedSessions } from "@/lib/actions/workout-sets";
import { requireSession } from "@/lib/utils/session";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await requireSession();
  const result = await getCompletedSessions(session.user.id);
  const sessions = result.success ? result.data : [];
  return <HistoryClient sessions={sessions} />;
}
