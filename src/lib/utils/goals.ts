export const GOAL_VALUES = [
  "strength",
  "muscle_gain",
  "weight_loss",
  "endurance",
  "general_fitness",
] as const;

export type Goal = (typeof GOAL_VALUES)[number];

/** Parse the goals JSON string from the DB, falling back to the legacy single `goal` field. */
export function parseUserGoals(
  goalsJson: string | null | undefined,
  legacyGoal?: string | null,
): Goal[] {
  if (goalsJson) {
    try {
      const parsed = JSON.parse(goalsJson);
      if (Array.isArray(parsed)) {
        return parsed.filter((g): g is Goal => GOAL_VALUES.includes(g as Goal));
      }
    } catch {
      // fall through
    }
  }
  if (legacyGoal && GOAL_VALUES.includes(legacyGoal as Goal)) {
    return [legacyGoal as Goal];
  }
  return [];
}
