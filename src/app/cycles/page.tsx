import { CyclesListClient } from "@/components/features/CyclesListClient";
import { getTrainingCycles } from "@/lib/actions/training-cycles";
import { requireSession } from "@/lib/utils/session";

export const dynamic = "force-dynamic";

export default async function CyclesPage() {
  const session = await requireSession();
  const result = await getTrainingCycles(session.user.id);
  const cycles = result.success ? result.data : [];
  return <CyclesListClient cycles={cycles} />;
}
