/**
 * Programs Page
 *
 * Lists all of the user's workout programs.
 * Programs can be tapped to see their exercises, or a new one can be created.
 */

import { NewProgramButton } from "@/components/features/NewProgramButton";
import { getPrograms } from "@/lib/actions/programs";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = 1;

export default async function ProgramsPage() {
  const result = await getPrograms(DEMO_USER_ID);
  const programList = result.success ? result.data : [];

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 pt-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Programs</h1>

      {/* Program list */}
      {programList.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-xl bg-muted overflow-hidden mb-4">
          {programList.map((program) => (
            <Link
              key={program.id}
              href={`/programs/${program.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-muted/70 active:bg-muted/50 transition-colors"
            >
              <span className="text-base font-medium">{program.name}</span>
              <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}

      {programList.length === 0 && (
        <p className="text-muted-foreground text-sm mb-6">
          No programs yet. Create one below.
        </p>
      )}

      {/* Create new program */}
      <div className="flex justify-center mt-4">
        <NewProgramButton />
      </div>
    </div>
  );
}
