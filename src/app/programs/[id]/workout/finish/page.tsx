"use client";

import {
  completeWorkoutSession,
  createWorkoutSession,
} from "@/lib/actions/workout-sessions";
import { updateProgramSet } from "@/lib/actions/programs";
import { useWorkoutSession } from "@/contexts/workout-session-context";
import { WORKOUT_FEELINGS, type WorkoutFeeling } from "@/lib/validators/workout";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, use, useMemo, useState } from "react";

type Feeling = WorkoutFeeling;
const FEELINGS: Feeling[] = [...WORKOUT_FEELINGS];

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
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

function FinishContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mountTime] = useState<number>(() => Date.now());
  const workoutSession = useWorkoutSession();

  const startTime = useMemo(() => {
    const contextStart = workoutSession?.startTime;
    if (contextStart) return new Date(contextStart);
    const raw = searchParams.get("start");
    return raw ? new Date(raw) : new Date();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const durationMinutes = useMemo(
    () => Math.max(1, Math.round((mountTime - startTime.getTime()) / 60000)),
    [mountTime, startTime],
  );

  const [feeling, setFeeling] = useState<Feeling>("Good");
  const [saving, setSaving] = useState(false);

  const saveSession = async () => {
    const existingSessionId = workoutSession?.sessionId;
    if (existingSessionId) {
      await completeWorkoutSession({ sessionId: existingSessionId, feeling });
    } else {
      // Fallback if session wasn't pre-created (e.g. direct navigation)
      const created = await createWorkoutSession({
        date: toDateString(startTime),
        startTime: startTime.toISOString(),
      });
      if (!created.success) return false;
      await completeWorkoutSession({ sessionId: created.data.id, feeling });
    }
    workoutSession?.clearActiveWorkout();
    router.push("/new-workout");
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    await saveSession();
    setSaving(false);
  };

  const handleSaveAndUpdateProgram = async () => {
    setSaving(true);
    if (workoutSession) {
      for (const [setIdStr, override] of Object.entries(workoutSession.overrides)) {
        await updateProgramSet({
          id: Number(setIdStr),
          targetReps: override.targetReps,
          weightKg: override.weightKg,
        });
      }
    }
    await saveSession();
    setSaving(false);
  };

  return (
    <div className="h-[100dvh] bg-background flex flex-col pb-nav-safe">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 shrink-0 text-center">
        <div className="text-lg font-bold">Workout Complete</div>
      </div>

      <div className="flex-1 px-4 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-4">
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
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
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

        </div>

        {/* Save buttons */}
        <div className="pt-6 pb-2 space-y-3">
          <button
            onClick={handleSaveAndUpdateProgram}
            disabled={saving}
            className="w-full rounded-xl bg-card py-4 text-base font-semibold text-foreground disabled:opacity-50 transition-all active:scale-95"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </span>
            ) : (
              "Save & Update Program"
            )}
          </button>
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
    </div>
  );
}

export default function WorkoutFinishPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  void use(params); // params resolved for future use; FinishContent reads from URL search params
  return (
    <Suspense>
      <FinishContent />
    </Suspense>
  );
}
