"use client";

import { useWorkoutSession } from "@/contexts/workout-session-context";
import type { SetSuggestion } from "@/types/workout";
import { useEffect } from "react";

type Props = {
  suggestions: Record<number, SetSuggestion>;
  programSetReps: Record<number, number>;
};

/**
 * Seeds the WorkoutSessionContext with progressive overload suggestions on
 * mount. Renders nothing — purely a context side-effect component.
 *
 * Each suggestion pre-fills the override for a program set so the user sees
 * the suggested weight immediately without any manual action.
 * Already-overridden sets are left unchanged (handles navigate-away-and-back).
 */
export function SuggestionsInitializer({ suggestions, programSetReps }: Props) {
  const workoutSession = useWorkoutSession();

  useEffect(() => {
    if (!workoutSession) return;

    for (const [programSetIdStr, suggestion] of Object.entries(suggestions)) {
      const programSetId = Number(programSetIdStr);
      if (workoutSession.overrides[programSetId]) continue;

      workoutSession.setOverride(programSetId, {
        weightKg: suggestion.suggestedWeightKg,
        targetReps: programSetReps[programSetId] ?? suggestion.basedOnReps,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  return null;
}
