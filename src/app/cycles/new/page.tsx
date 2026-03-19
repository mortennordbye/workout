/**
 * New Cycle Page
 *
 * Form to create a new training cycle (name, duration, schedule type, end action).
 */

import { CreateCycleForm } from "@/components/features/CreateCycleForm";
import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";

export default function NewCyclePage() {
  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-y-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-8 pb-4">
        <Link
          href="/cycles"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-muted active:opacity-80"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight">New Cycle</h1>
      </div>

      <div className="px-4">
        <CreateCycleForm />
      </div>
    </div>
  );
}
