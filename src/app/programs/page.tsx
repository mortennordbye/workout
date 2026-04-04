/**
 * Programs Page
 *
 * Lists all of the user's workout programs.
 * Programs can be tapped to see their exercises, or a new one can be created.
 * In edit mode, programs can be deleted from the list.
 */

import { ProgramListClient } from "@/components/features/ProgramListClient";
import { getPrograms } from "@/lib/actions/programs";
import { requireSession } from "@/lib/utils/session";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const session = await requireSession();
  const result = await getPrograms(session.user.id);
  const programList = result.success ? result.data : [];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-nav-safe-lg">
      <ProgramListClient programs={programList} />
    </div>
  );
}
