"use client";

/**
 * CycleDetailClient
 *
 * Client-side actions for the cycle detail page:
 * - Start cycle button
 * - Delete cycle
 */

import {
  deleteTrainingCycle,
  startTrainingCycle,
} from "@/lib/actions/training-cycles";
import type { TrainingCycle } from "@/types/workout";
import { PlayIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DEMO_USER_ID = 1;

export function StartCycleButton({ cycle }: { cycle: TrainingCycle }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    const result = await startTrainingCycle(cycle.id, DEMO_USER_ID);
    setLoading(false);
    if (result.success) {
      router.refresh();
    }
  }

  if (cycle.status !== "draft") return null;

  return (
    <button
      onClick={handleStart}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 active:scale-[0.98] transition-transform"
    >
      <PlayIcon className="w-4 h-4" />
      {loading ? "Starting…" : "Start Cycle"}
    </button>
  );
}

export function DeleteCycleButton({ cycleId }: { cycleId: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await deleteTrainingCycle(cycleId);
    router.push("/cycles");
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-destructive font-medium">Delete this cycle?</span>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-sm text-muted-foreground min-h-[44px] px-1"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="text-sm text-destructive font-semibold min-h-[44px] px-1 disabled:opacity-50"
        >
          {loading ? "Deleting…" : "Delete"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="flex items-center gap-2 px-4 py-3 text-sm text-destructive active:opacity-70"
    >
      <Trash2Icon className="w-4 h-4" />
      Delete cycle
    </button>
  );
}
