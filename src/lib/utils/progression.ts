/**
 * Progressive Overload Utilities
 *
 * Pure functions for calculating progressive overload suggestions.
 * No database calls — receives pre-fetched data and returns suggestions.
 *
 * Extracted from getProgressiveSuggestions for testability and reuse.
 */

import type { SetSuggestion } from "@/types/workout";

// ─── Constants ─────────────────────────────────────────────────────────────

/**
 * Number of recent sessions to consider when evaluating progression readiness.
 * The "window" we look back through for each exercise+setNumber combo.
 */
export const CONSENSUS_WINDOW = 5;

/**
 * Minimum number of confident hits required within CONSENSUS_WINDOW to trigger
 * a weight/rep progression. Prevents one-lucky-session advances.
 */
export const REQUIRED_HITS = 2;

/**
 * Number of consecutive session failures required to trigger a deload suggestion.
 * All DELOAD_THRESHOLD most-recent sessions must have missed the target.
 */
export const DELOAD_THRESHOLD = 3;

/**
 * Fraction to reduce weight by when a deload is detected (10% reduction).
 */
export const DELOAD_FACTOR = 0.9;

// ─── Input types ────────────────────────────────────────────────────────────

/**
 * A single logged set from workout history, shaped for progression analysis.
 * Matches what the DB returns from workoutSets joined with workoutSessions.
 */
export type HistoryRow = {
  exerciseId: number;
  setNumber: number;
  actualReps: number;
  targetReps: number | null;
  weightKg: string; // decimal returned as string from Drizzle
  durationSeconds: number | null;
  feeling: string | null;
  date: string;
  rpe: number;
};

/**
 * Program set data merged with its parent program exercise settings.
 * Shaped for buildSuggestion input.
 */
export type ProgramSetData = {
  programSetId: number;
  setNumber: number;
  targetReps: number | null;
  durationSeconds: number | null;
  exerciseId: number;
  overloadIncrementKg: string | null;
  overloadIncrementReps: number | null;
  progressionMode: string | null;
};

/**
 * Relevant user profile fields for default increment calculation.
 * Null values mean the user has not set a profile.
 */
export type UserProfile = {
  experienceLevel: string | null;
  goal: string | null;
};

// ─── Pure helpers ───────────────────────────────────────────────────────────

/**
 * Epley 1RM estimation formula.
 * Accurate for 2–12 reps; unreliable above 12. Caller must guard weight > 0.
 */
export function estimate1RM(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

/**
 * Estimate reps achievable at a given weight from a known 1RM.
 * Returns at least 1 (never negative).
 */
export function estimateRepsAt(oneRepMax: number, weightKg: number): number {
  return Math.max(1, Math.floor(30 * (oneRepMax / weightKg - 1)));
}

/**
 * Round a value to the nearest multiple of increment.
 * Returns value unchanged when increment is 0.
 */
export function roundToNearest(value: number, increment: number): number {
  if (increment <= 0) return value;
  return Math.round(value / increment) * increment;
}

/**
 * Choose the effective kg increment for a program exercise.
 * The stored increment takes precedence; the user profile only adjusts
 * when the increment equals the schema default (2.5), meaning the user
 * has never customised it.
 */
export function defaultIncrementKg(
  storedIncrement: number,
  experienceLevel: string | null,
  goal: string | null,
): number {
  // User has a custom value — respect it unconditionally
  if (storedIncrement !== 2.5) return storedIncrement;
  // Profile-based defaults only when the schema default is still in place
  if (experienceLevel === "beginner") return 5.0;
  if (experienceLevel === "advanced") return 1.25;
  if (goal === "endurance") return 1.0;
  return 2.5;
}

// ─── RPE confidence gate ────────────────────────────────────────────────────

/**
 * Returns true when a logged set qualifies as a "confident hit" —
 * the lifter both hit the target rep count AND had sufficient reserve.
 *
 * Gate:
 *   RPE null → treated as 7 (neutral; old sessions without RPE data)
 *   RPE ≤ 7  → confident if target reps met
 *   RPE 8    → confident only if actual > target (had at least one rep in reserve)
 *   RPE 9-10 → not confident regardless (near max effort; no reserve)
 */
export function isConfidentHit(row: HistoryRow, programTargetReps: number | null): boolean {
  const target = row.targetReps ?? programTargetReps;
  if (target == null) return false;
  if (row.actualReps < target) return false;

  const rpe = row.rpe ?? 7;
  if (rpe <= 7) return true;
  if (rpe === 8) return row.actualReps > target; // needed at least one extra rep
  return false; // rpe 9-10
}

// ─── Core suggestion builder ────────────────────────────────────────────────

/**
 * Build a progressive overload suggestion for one program set.
 *
 * @param rows     Recent history rows for this exerciseId+setNumber, sorted
 *                 by date DESC (most-recent first). Pass up to CONSENSUS_WINDOW.
 * @param ps       Program set + exercise settings.
 * @param profile  User profile for default increment fallback. May be null.
 * @returns        A SetSuggestion, or null if there is no history to base one on.
 */
export function buildSuggestion(
  rows: HistoryRow[],
  ps: ProgramSetData,
  profile: UserProfile | null,
): SetSuggestion | null {
  if (rows.length === 0) return null;

  const latest = rows[0]; // most recent session — used for "Last: 75kg" display
  const baseWeight = Number(latest.weightKg); // raw, no rounding

  const incrementKg = defaultIncrementKg(
    Number(ps.overloadIncrementKg ?? 2.5),
    profile?.experienceLevel ?? null,
    profile?.goal ?? null,
  );
  // For "time" mode, overloadIncrementReps encodes seconds increment.
  // (overloadIncrementReps is unused for timed exercises in all other modes.)
  const incrementReps = Number(ps.overloadIncrementReps ?? 0);
  const mode = ps.progressionMode ?? "weight";

  const roundToInc = (kg: number) => roundToNearest(kg, incrementKg);

  // ── Consensus: count confident hits across the window ──
  const hitsWithConfidence = mode === "time"
    ? rows.filter((r) => {
        const target = ps.durationSeconds ?? r.durationSeconds;
        return target != null && (r.durationSeconds ?? 0) >= target;
      })
    : rows.filter((r) => isConfidentHit(r, ps.targetReps));

  const shouldProgress = hitsWithConfidence.length >= REQUIRED_HITS;

  // ── Deload detection: last DELOAD_THRESHOLD sessions all missed ──
  // Only applies to weight-bearing modes (not manual, not time).
  const canDeload = mode === "weight" || mode === "smart" || mode === "reps";
  const recentSlice = rows.slice(0, DELOAD_THRESHOLD);
  const allRecentFailed =
    recentSlice.length >= DELOAD_THRESHOLD &&
    recentSlice.every((r) => {
      const target = r.targetReps ?? ps.targetReps;
      return target != null && r.actualReps < target;
    });
  const isStuck = canDeload && allRecentFailed && hitsWithConfidence.length === 0;

  // ── Shared "basedOn" fields ──
  const basedOn = {
    basedOnWeightKg: baseWeight,
    basedOnReps: latest.actualReps ?? 0,
    basedOnFeeling: latest.feeling ?? "OK",
    basedOnDate: latest.date,
    basedOnRpe: latest.rpe ?? undefined,
    basedOnHitCount: hitsWithConfidence.length,
  };

  // ── Deload takes priority over all mode-specific logic ──
  if (isStuck) {
    return {
      suggestedWeightKg: roundToInc(baseWeight * DELOAD_FACTOR),
      ...basedOn,
      reason: "deload",
    };
  }

  switch (mode) {
    case "manual":
      return { suggestedWeightKg: baseWeight, ...basedOn, reason: "manual" };

    case "weight":
      if (shouldProgress && incrementKg > 0) {
        return {
          suggestedWeightKg: roundToInc(baseWeight + incrementKg),
          ...basedOn,
          reason: "progressed",
        };
      }
      return { suggestedWeightKg: baseWeight, ...basedOn, reason: "held" };

    case "smart": {
      if (shouldProgress && incrementKg > 0) {
        const newWeight = roundToInc(baseWeight + incrementKg);
        let adjustedRepsForWeight: number | undefined;
        // 1RM estimation: only valid for weight > 0 and 2–12 reps
        const canComputeRM =
          baseWeight > 0 &&
          latest.actualReps != null &&
          latest.actualReps >= 2 &&
          latest.actualReps <= 12;
        if (canComputeRM && newWeight > baseWeight) {
          const oneRM = estimate1RM(baseWeight, latest.actualReps);
          const adj = estimateRepsAt(oneRM, newWeight);
          const currentTarget = ps.targetReps ?? latest.targetReps ?? latest.actualReps;
          if (currentTarget != null && adj < currentTarget) {
            adjustedRepsForWeight = adj;
          }
        }
        return {
          suggestedWeightKg: newWeight,
          adjustedRepsForWeight,
          ...basedOn,
          reason: "progressed",
        };
      }
      return { suggestedWeightKg: baseWeight, ...basedOn, reason: "held" };
    }

    case "reps": {
      const targetReps = ps.targetReps ?? latest.targetReps;
      if (shouldProgress && incrementReps > 0 && targetReps != null) {
        return {
          suggestedWeightKg: baseWeight,
          suggestedReps: targetReps + incrementReps,
          ...basedOn,
          reason: "progressed-reps",
        };
      }
      return { suggestedWeightKg: baseWeight, ...basedOn, reason: "held" };
    }

    case "time": {
      const targetDuration = ps.durationSeconds ?? latest.durationSeconds;
      const actualDuration = latest.durationSeconds ?? 0;
      // overloadIncrementReps doubles as seconds increment for time mode;
      // fall back to 10s if not configured.
      const incrementSecs = incrementReps > 0 ? incrementReps : 10;
      const basedOnWithDuration = {
        ...basedOn,
        basedOnDurationSeconds: actualDuration > 0 ? actualDuration : undefined,
      };
      if (targetDuration != null && actualDuration >= targetDuration && shouldProgress) {
        return {
          suggestedWeightKg: baseWeight,
          suggestedDurationSeconds: actualDuration + incrementSecs,
          ...basedOnWithDuration,
          reason: "progressed-time",
        };
      }
      return { suggestedWeightKg: baseWeight, ...basedOnWithDuration, reason: "held" };
    }

    default:
      return { suggestedWeightKg: baseWeight, ...basedOn, reason: "manual" };
  }
}
