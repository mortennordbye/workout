import { CyclesListClient } from "@/components/features/CyclesListClient";
import { getTrainingCycles } from "@/lib/actions/training-cycles";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = 1;

export default async function CyclesPage() {
  const result = await getTrainingCycles(DEMO_USER_ID);
  const cycles = result.success ? result.data : [];
  return <CyclesListClient cycles={cycles} />;
}
