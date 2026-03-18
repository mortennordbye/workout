"use client";

import {
  completeWorkoutSession,
  createWorkoutSession,
} from "@/lib/actions/workout-sessions";
import { updateProgramSet } from "@/lib/actions/programs";
import { useWorkoutSession } from "@/contexts/workout-session-context";
import { useTheme } from "@/components/ui/theme-provider";
import { Check, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, use, useMemo, useState } from "react";

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
  const workoutSession = useWorkoutSession();
  const { autoSaveToProgram } = useTheme();
  const showSaveToProgram = !autoSaveToProgram && (workoutSession?.hasOverrides ?? false);
  const [saveToProgram, setSaveToProgram] = useState(true);

  const handleSave = async () => {
    setSaving(true);
    if (showSaveToProgram && saveToProgram && workoutSession) {
      for (const [setIdStr, override] of Object.entries(workoutSession.overrides)) {
        await updateProgramSet({
          id: Number(setIdStr),
          targetReps: override.targetReps,
          weightKg: override.weightKg,
        });
      }
    }
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
    workoutSession?.clearOverrides();
    router.push("/new-workout");
  };

  return (
    <div className="h-[100dvh] bg-background flex flex-col pb-16">
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

          {/* Save to program card — only shown when there are pending overrides */}
          {showSaveToProgram && (
            <button
              onClick={() => setSaveToProgram((v) => !v)}
              className="w-full bg-card rounded-2xl p-5 flex items-start gap-3 text-left active:bg-muted/50 transition-colors"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  saveToProgram ? "bg-primary" : "bg-muted"
                }`}
              >
                {saveToProgram && <Check className="w-4 h-4 text-primary-foreground" />}
              </div>
              <div>
                <p className="text-sm font-semibold">Save changes to program</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your weights and reps have been modified — save them for next time?
                </p>
              </div>
            </button>
          )}
        </div>

        {/* Save button */}
        <div className="pt-6 pb-2">
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
  const { id } = use(params);
  return (
    <Suspense>
      <FinishContent programId={id} />
    </Suspense>
  );
}
