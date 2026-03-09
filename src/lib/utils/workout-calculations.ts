/**
 * Workout Calculation Utilities
 *
 * Helper functions for analyzing workout performance and calculating metrics.
 * These functions will power advanced features like PR detection, auto-deload
 * suggestions, and progressive overload tracking.
 *
 * Current status: Placeholder implementations with TODO comments
 * These functions provide the foundation for future intelligent features.
 */

import { WorkoutSet } from "@/types/workout";

/**
 * Calculate Estimated 1-Rep Max (1RM)
 *
 * Uses the Epley formula: 1RM = weight × (1 + reps / 30)
 *
 * This is a standard strength training formula for estimating the maximum
 * weight a person could lift for a single repetition based on their
 * performance at lighter weights for multiple reps.
 *
 * Alternative formulas:
 * - Brzycki: 1RM = weight × (36 / (37 - reps))
 * - Lander: 1RM = (100 × weight) / (101.3 - 2.67123 × reps)
 * - Lombardi: 1RM = weight × reps^0.10
 *
 * @param weight - Weight lifted in kg
 * @param reps - Number of reps completed
 * @returns Estimated 1RM in kg
 *
 * @example
 * calculateEstimated1RM(100, 5) // Returns ~116.67 kg
 */
export function calculateEstimated1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps === 0 || weight === 0) return 0;

  // Epley formula
  return weight * (1 + reps / 30);
}

/**
 * Detect if a set is a Personal Record (PR)
 *
 * Compares a set against historical performance to determine if it's a PR.
 *
 * PR types:
 * 1. Weight PR: Heaviest weight lifted for any rep count
 * 2. Volume PR: Highest weight × reps product
 * 3. 1RM PR: Highest estimated max based on formula
 *
 * TODO: Implementation needed
 * - Query historical sets for this exercise
 * - Calculate estimated 1RM for all sets
 * - Compare current set to historical maxes
 * - Return PR type if detected
 *
 * @param currentSet - The set just completed
 * @param historicalSets - All previous sets for this exercise
 * @returns PR detection result
 *
 * @example
 * const isPR = detectPR(newSet, historyData);
 * if (isPR.isRecord) {
 *   showCelebration(isPR.type); // "weight" | "volume" | "estimated1rm"
 * }
 */
export function detectPR(
  currentSet: WorkoutSet,
  historicalSets: WorkoutSet[],
): {
  isRecord: boolean;
  type?: "weight" | "volume" | "estimated1rm";
  previousBest?: number;
  improvement?: number;
} {
  // TODO: Implement PR detection logic
  // 1. Calculate current set metrics
  // 2. Find historical maxes
  // 3. Compare and determine if PR

  // Placeholder implementation
  return {
    isRecord: false,
  };
}

/**
 * Analyze if deload is needed based on RPE trends
 *
 * Detects overtraining by analyzing Rate of Perceived Exertion (RPE) over time.
 *
 * Deload indicators:
 * - Average RPE > 9 for multiple consecutive sessions
 * - RPE consistently increasing for the same weight
 * - Performance plateau or decline despite high effort
 *
 * Deload recommendation:
 * - Reduce weight by 10-15% for 1-2 weeks
 * - Maintain or reduce volume
 * - Allow nervous system recovery
 *
 * TODO: Implementation needed
 * - Calculate rolling average RPE over last 3-5 sessions
 * - Detect upward RPE trend for same weight/exercise
 * - Check for performance stagnation
 * - Return deload suggestion with percentage
 *
 * @param recentSets - Sets from the last 2-4 weeks for this exercise
 * @returns Deload recommendation
 *
 * @example
 * const analysis = shouldDeload(last12Sets);
 * if (analysis.shouldDeload) {
 *   notifyUser(`Consider reducing weight by ${analysis.reduction}%`);
 * }
 */
export function shouldDeload(recentSets: WorkoutSet[]): {
  shouldDeload: boolean;
  reason?: string;
  reduction?: number; // Percentage to reduce weight
  averageRPE?: number;
} {
  // TODO: Implement deload detection
  // 1. Calculate average RPE over recent sets
  // 2. Detect trends in RPE for same weights
  // 3. Check for performance decline
  // 4. Return recommendation

  // Placeholder implementation
  if (recentSets.length === 0) {
    return { shouldDeload: false };
  }

  // Basic calculation: average RPE
  const totalRPE = recentSets.reduce((sum, set) => sum + set.rpe, 0);
  const averageRPE = totalRPE / recentSets.length;

  // Simple threshold: deload if average RPE > 9.5
  if (averageRPE >= 9.5) {
    return {
      shouldDeload: true,
      reason:
        "High average RPE detected (≥9.5) - nervous system fatigue likely",
      reduction: 10,
      averageRPE,
    };
  }

  return {
    shouldDeload: false,
    averageRPE,
  };
}

/**
 * Calculate total workout volume
 *
 * Volume = sum of (weight × reps) for all sets
 *
 * Volume is a key metric for tracking training load and progress.
 * Increasing volume over time (progressive overload) is essential for growth.
 *
 * @param sets - All sets in a workout or time period
 * @returns Total volume in kg
 *
 * @example
 * const volume = calculateTotalVolume(todaysSets); // 5,250 kg
 */
export function calculateTotalVolume(sets: WorkoutSet[]): number {
  return sets.reduce((total, set) => {
    const weight =
      typeof set.weightKg === "string"
        ? parseFloat(set.weightKg)
        : set.weightKg;
    return total + weight * set.actualReps;
  }, 0);
}

/**
 * Suggest progressive overload for next workout
 *
 * Analyzes recent performance to recommend weight/rep increases.
 *
 * Progressive overload strategies:
 * 1. Add weight: Increase by smallest available increment (2.5kg)
 * 2. Add reps: Aim for 1-2 more reps at same weight
 * 3. Add sets: Include an additional working set
 * 4. Reduce rest: Decrease rest periods by 10-15 seconds
 *
 * TODO: Implementation needed
 * - Check if performance has been consistent for 2-3 workouts
 * - Recommend appropriate overload strategy
 * - Consider RPE to ensure sustainable progression
 *
 * @param recentSets - Last 3-5 workouts for this exercise
 * @returns Progressive overload suggestion
 */
export function suggestProgressiveOverload(recentSets: WorkoutSet[]): {
  strategy: "weight" | "reps" | "sets" | "rest" | "maintain";
  suggestion: string;
  newWeight?: number;
  newReps?: number;
} {
  // TODO: Implement progressive overload suggestions

  // Placeholder implementation
  return {
    strategy: "maintain",
    suggestion: "Continue at current weight and reps to build consistency",
  };
}
