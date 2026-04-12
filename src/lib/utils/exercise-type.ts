/**
 * Exercise type helpers.
 *
 * Single source of truth for "is this a running/cardio exercise?"
 * Running and timed are mutually exclusive:
 *   - isRunning = category === "cardio"  (distance + duration tracking)
 *   - isTimed   = isTimed flag, but NOT cardio  (duration-only, e.g. planks)
 */

export function isRunningExercise(
  category: string | null | undefined,
): boolean {
  return category === "cardio";
}

export function isTimedExercise(
  category: string | null | undefined,
  isTimed: boolean,
): boolean {
  if (isRunningExercise(category)) return false;
  return isTimed;
}
