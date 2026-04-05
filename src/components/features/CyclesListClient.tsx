"use client";

import { deleteTrainingCycle } from "@/lib/actions/training-cycles";
import type { TrainingCycle } from "@/types/workout";
import { Minus, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatEndDate(cycle: TrainingCycle): string {
  if (!cycle.startDate) return "";
  const start = new Date(cycle.startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + cycle.durationWeeks * 7);
  return end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getWeekProgress(cycle: TrainingCycle): { currentWeek: number; progressPct: number } {
  if (!cycle.startDate) return { currentWeek: 0, progressPct: 0 };
  const start = new Date(cycle.startDate);
  const today = new Date();
  const days = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const currentWeek = Math.min(Math.floor(days / 7) + 1, cycle.durationWeeks);
  const progressPct = Math.min((days / (cycle.durationWeeks * 7)) * 100, 100);
  return { currentWeek, progressPct };
}

// ─── card / row components ────────────────────────────────────────────────────

function ActiveCycleCard({ cycle }: { cycle: TrainingCycle }) {
  const { currentWeek, progressPct } = getWeekProgress(cycle);
  const endDate = formatEndDate(cycle);
  return (
    <Link href={`/cycles/${cycle.id}`}>
      <div className="rounded-2xl bg-muted p-4 active:opacity-80 transition-opacity">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-base">{cycle.name}</h3>
          <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground">
            Week {currentWeek} of {cycle.durationWeeks}
          </span>
        </div>
        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden mb-2">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        {endDate && <p className="text-xs text-muted-foreground">Ends {endDate}</p>}
      </div>
    </Link>
  );
}

function DraftCycleRow({ cycle }: { cycle: TrainingCycle }) {
  return (
    <Link
      href={`/cycles/${cycle.id}`}
      className="flex items-center justify-between px-4 py-3 active:opacity-80 transition-opacity"
    >
      <div>
        <span className="text-sm font-medium">{cycle.name}</span>
        <span className="text-xs text-muted-foreground ml-2">· {cycle.durationWeeks} weeks</span>
      </div>
      <span className="text-xs text-muted-foreground capitalize">
        {cycle.scheduleType === "day_of_week" ? "Day of week" : "Rotation"}
      </span>
    </Link>
  );
}

function PastCycleRow({ cycle }: { cycle: TrainingCycle }) {
  return (
    <Link
      href={`/cycles/${cycle.id}`}
      className="flex items-center justify-between px-4 py-3 active:opacity-80 transition-opacity"
    >
      <div>
        <span className="text-sm font-medium text-muted-foreground">{cycle.name}</span>
        <span className="text-xs text-muted-foreground ml-2">· {cycle.durationWeeks} weeks</span>
      </div>
      <span className="text-xs text-muted-foreground">Completed</span>
    </Link>
  );
}

// ─── main export ──────────────────────────────────────────────────────────────

type Props = { cycles: TrainingCycle[] };

export function CyclesListClient({ cycles: initial }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [cycles, setCycles] = useState(initial);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { setCycles(initial); }, [initial]);

  async function handleDelete(cycleId: number) {
    setDeleting(true);
    setCycles((prev) => prev.filter((c) => c.id !== cycleId));
    await deleteTrainingCycle(cycleId);
    setPendingDeleteId(null);
    setDeleting(false);
    router.refresh();
  }

  function stopEditing() {
    setIsEditing(false);
    setPendingDeleteId(null);
  }

  const active = cycles.filter((c) => c.status === "active");
  const drafts = cycles.filter((c) => c.status === "draft");
  const past = cycles.filter((c) => c.status === "completed");

  // Wraps each cycle with optional delete controls
  function EditableItem({
    cycle,
    children,
    alignTop = false,
  }: {
    cycle: TrainingCycle;
    children: React.ReactNode;
    alignTop?: boolean;
  }) {
    if (pendingDeleteId === cycle.id) {
      return (
        <div className="flex items-center justify-between px-4 py-4 rounded-xl bg-destructive/10">
          <span className="text-sm font-medium text-destructive">
            Delete &ldquo;{cycle.name}&rdquo;?
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPendingDeleteId(null)}
              className="text-sm text-muted-foreground font-medium min-h-[44px] px-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleDelete(cycle.id)}
              disabled={deleting}
              className="text-sm text-destructive font-semibold min-h-[44px] px-1 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex gap-3 ${alignTop ? "items-start" : "items-center"}`}>
        {isEditing && (
          <button
            type="button"
            onClick={() => setPendingDeleteId(cycle.id)}
            className={`w-7 h-7 rounded-full bg-destructive flex items-center justify-center shrink-0 ${alignTop ? "mt-3" : ""}`}
            aria-label={`Delete ${cycle.name}`}
          >
            <Minus className="w-4 h-4 text-white" />
          </button>
        )}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-nav-safe-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <h1 className="text-3xl font-bold tracking-tight">Cycles</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={isEditing ? stopEditing : () => setIsEditing(true)}
            className="text-primary text-sm font-medium min-h-[44px] px-1"
          >
            {isEditing ? "Done" : "Edit"}
          </button>
          {!isEditing && (
            <Link
              href="/cycles/new"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground active:opacity-80 transition-opacity"
            >
              <PlusIcon className="w-5 h-5" />
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 px-4 pt-4">
        {/* Active */}
        {active.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
              Active
            </p>
            <div className="flex flex-col gap-2">
              {active.map((c) => (
                <EditableItem key={c.id} cycle={c} alignTop>
                  <ActiveCycleCard cycle={c} />
                </EditableItem>
              ))}
            </div>
          </div>
        )}

        {/* Draft */}
        {drafts.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
              Draft
            </p>
            <div className="flex flex-col divide-y divide-border rounded-2xl bg-muted overflow-hidden">
              {drafts.map((c) => (
                <EditableItem key={c.id} cycle={c}>
                  <DraftCycleRow cycle={c} />
                </EditableItem>
              ))}
            </div>
          </div>
        )}

        {/* Past */}
        {past.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
              Past
            </p>
            <div className="flex flex-col divide-y divide-border rounded-2xl bg-muted overflow-hidden">
              {past.map((c) => (
                <EditableItem key={c.id} cycle={c}>
                  <PastCycleRow cycle={c} />
                </EditableItem>
              ))}
            </div>
          </div>
        )}

        {cycles.length === 0 && (
          <div className="flex flex-col items-center gap-4 pt-16 text-center">
            <p className="text-muted-foreground text-sm">
              No cycles yet. Create your first training block.
            </p>
            <Link
              href="/cycles/new"
              className="flex items-center gap-2 rounded-full border-2 border-primary px-6 py-3 text-primary font-semibold text-sm active:bg-primary/20 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              New Cycle
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
