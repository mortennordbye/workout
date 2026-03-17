"use client";

import {
  completeWorkoutSession,
  createWorkoutSession,
} from "@/lib/actions/workout-sessions";
import { Check, ChevronLeft, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

const DEMO_USER_ID = 1;

type Feeling = "Tired" | "OK" | "Good" | "Awesome";
const FEELINGS: Feeling[] = ["Tired", "OK", "Good", "Awesome"];

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function FinishContent({ programId }: { programId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const startTime = useMemo(() => {
    const raw = searchParams.get("start");
    return raw ? new Date(raw) : new Date();
  }, [searchParams]);

  const durationMinutes = useMemo(
    () => Math.max(1, Math.round((Date.now() - startTime.getTime()) / 60000)),
    [startTime],
  );

  const [feeling, setFeeling] = useState<Feeling>("Good");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const created = await createWorkoutSession({
      userId: DEMO_USER_ID,
      date: toDateString(startTime),
      startTime: startTime.toISOString(),
    });
    if (!created.success) {
      setSaving(false);
      return;
    }
    await completeWorkoutSession({
      sessionId: created.data.id,
      notes: feeling,
    });
    router.push("/new-workout");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-primary"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="text-lg font-bold">Workout Complete</div>
        <div className="w-16" />
      </div>

      <div className="flex-1 px-4 space-y-6">
        {/* Summary card */}
        <div className="bg-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Date</span>
            <span className="text-sm font-medium">{formatDate(startTime)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Started</span>
            <span className="text-sm font-medium">{formatTime(startTime)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Duration</span>
            <span className="text-sm font-medium">
              {formatDuration(durationMinutes)}
            </span>
          </div>
        </div>

        {/* Feeling picker */}
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-3">
            How did it feel?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {FEELINGS.map((f) => (
              <button
                key={f}
                onClick={() => setFeeling(f)}
                className={`py-3 rounded-xl text-sm font-semibold transition-colors ${
                  feeling === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground active:bg-muted"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Update program info */}
        <div className="bg-card rounded-2xl p-5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Program updated</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your weights and reps from this workout have been saved to the
              program for next time.
            </p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="px-4 pt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground disabled:opacity-50 transition-all active:scale-95"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </span>
          ) : (
            "Save Workout"
          )}
        </button>
      </div>
    </div>
  );
}

export default function WorkoutFinishPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <Suspense>
      <FinishContent programId={params.id} />
    </Suspense>
  );
}
