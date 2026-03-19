/**
 * Programs Page
 *
 * Lists all of the user's workout programs.
 * Programs can be tapped to see their exercises, or a new one can be created.
 * In edit mode, programs can be deleted from the list.
 */

import { ProgramListClient } from "@/components/features/ProgramListClient";
import { getPrograms } from "@/lib/actions/programs";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = 1;

export default async function ProgramsPage() {
  const result = await getPrograms(DEMO_USER_ID);
  const programList = result.success ? result.data : [];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      <ProgramListClient programs={programList} />
    </div>
  );
}
