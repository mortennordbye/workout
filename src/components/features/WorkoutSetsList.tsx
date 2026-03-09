"use client";

import { updateProgramSet } from "@/lib/actions/programs";
import type { ProgramSet } from "@/types/workout";
import { Check, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  sets: ProgramSet[];
  programId: number;
  programExerciseId: number;
};

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const sec = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export function WorkoutSetsList({ sets, programId, programExerciseId }: Props) {
  const router = useRouter();
  const [completedSets, setCompletedSets] = useState<Set<number>>(new Set());
  const [restTimers, setRestTimers] = useState<Map<number, number>>(new Map());

  const toggleSet = async (setId: number, index: number) => {
    setCompletedSets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(setId)) {
        newSet.delete(setId);
        // Stop timer if unchecking
        setRestTimers((timers) => {
          const newTimers = new Map(timers);
          newTimers.delete(setId);
          return newTimers;
        });
      } else {
        newSet.add(setId);
        // Start rest timer
        const set = sets[index];
        if (set) {
          setRestTimers((timers) => {
            const newTimers = new Map(timers);
            newTimers.set(setId, Number(set.restTimeSeconds));
            return newTimers;
          });

          // Auto-carry weight to next set
          if (index < sets.length - 1 && set.weightKg != null) {
            const nextSet = sets[index + 1];
            if (nextSet && !completedSets.has(nextSet.id)) {
              updateProgramSet({
                id: nextSet.id,
                weightKg: Number(set.weightKg),
              });
              router.refresh();
            }
          }
        }
      }
      return newSet;
    });
  };

  // Handle rest timers countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setRestTimers((timers) => {
        const newTimers = new Map(timers);
        let changed = false;
        timers.forEach((remaining, setId) => {
          if (remaining > 0) {
            newTimers.set(setId, remaining - 1);
            changed = true;
          }
        });
        return changed ? newTimers : timers;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {sets.map((set, index) => {
        const isCompleted = completedSets.has(set.id);
        const restRemaining = restTimers.get(set.id);
        const restTotal = Number(set.restTimeSeconds);
        const restProgress =
          restRemaining !== undefined && restTotal > 0
            ? ((restTotal - restRemaining) / restTotal) * 100
            : 0;

        return (
          <div key={set.id}>
            {/* Set row */}
            <div className="flex items-center gap-4 py-4">
              {/* Completion checkbox */}
              <button
                onClick={() => toggleSet(set.id, index)}
                className={`
                    w-10 h-10 rounded-full flex items-center justify-center shrink-0
                    transition-colors
                    ${
                      isCompleted
                        ? "bg-primary"
                        : "border-2 border-muted-foreground hover:border-primary"
                    }
                  `}
              >
                {isCompleted && (
                  <Check className="w-6 h-6 text-primary-foreground" />
                )}
              </button>

              {/* Set number badge */}
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <span className="text-sm font-bold">{index + 1}</span>
              </div>

              {/* Set details */}
              <div className="flex-1">
                {set.durationSeconds != null ? (
                  <p className="text-lg font-medium">
                    {formatTime(Number(set.durationSeconds))}
                  </p>
                ) : (
                  <p className="text-lg font-medium">
                    {set.targetReps ?? "?"} x {Number(set.weightKg ?? 0)}kg
                  </p>
                )}
              </div>

              {/* Edit button */}
              <Link
                href={`/programs/${programId}/workout/exercises/${programExerciseId}/sets/${set.id}`}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>

            {/* Rest time */}
            {index < sets.length - 1 && (
              <div className="pl-24 pb-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  REST{" "}
                  {restRemaining !== undefined
                    ? formatTime(restRemaining)
                    : formatTime(Number(set.restTimeSeconds))}
                </div>
                <div className="mt-1 h-1 bg-primary/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-1000"
                    style={{ width: `${restProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
