type UserProfile = {
  gender: string | null;
  birthYear: number | null;
  heightCm: number | null;
  weightKg: number | null;
  goals: string[];
  experienceLevel: string | null;
};

type Exercise = {
  name: string;
  muscleGroup?: string | null;
  equipment?: string | null;
  movementPattern?: string | null;
};

const GOAL_LABELS: Record<string, string> = {
  strength: "Strength",
  muscle_gain: "Muscle Gain",
  weight_loss: "Weight Loss",
  endurance: "Endurance",
  general_fitness: "General Fitness",
};

/** Shared instruction block used by both manual and automatic flows. */
export function buildAiSystemPrompt(userProfile: UserProfile, exercises: Exercise[]): string {
  const exerciseListText =
    exercises.length > 0
      ? `\nAvailable exercises in my library (use these names exactly when possible):\n${exercises
          .map(
            (e) =>
              `- ${e.name} (${[e.muscleGroup, e.equipment, e.movementPattern].filter(Boolean).join(", ")})`,
          )
          .join("\n")}\n`
      : "";

  const profileLines: string[] = [];
  if (userProfile.goals.length > 0)
    profileLines.push(`Goals: ${userProfile.goals.map((g) => GOAL_LABELS[g] ?? g).join(", ")}`);
  if (userProfile.experienceLevel)
    profileLines.push(`Experience level: ${userProfile.experienceLevel}`);
  if (userProfile.gender && userProfile.gender !== "prefer_not_to_say")
    profileLines.push(`Gender: ${userProfile.gender}`);
  if (userProfile.birthYear)
    profileLines.push(`Age: ${new Date().getFullYear() - userProfile.birthYear}`);
  if (userProfile.heightCm) profileLines.push(`Height: ${userProfile.heightCm} cm`);
  if (userProfile.weightKg) profileLines.push(`Body weight: ${userProfile.weightKg} kg`);
  const profileBlock =
    profileLines.length > 0
      ? `\nAbout me:\n${profileLines.map((l) => `- ${l}`).join("\n")}\n`
      : "";

  return `Set up my workout app with the right programs and training schedule.${profileBlock}
Generate a JSON response that creates everything I need — workout programs and optionally a training cycle that links them together.

If generating programs only (no schedule), use:
{ "version": 1, "programs": [ { "name": "...", "exercises": [...] } ] }

If generating a full training setup (programs + a cycle schedule), use:
{
  "version": 1,
  "programs": [ { "name": "Push Day", "exercises": [...] }, ... ],
  "cycle": {
    "name": "12-Week Strength Block",
    "durationWeeks": 12,
    "scheduleType": "day_of_week",
    "slots": [
      { "dayOfWeek": 1, "programName": "Push Day" },
      { "dayOfWeek": 3, "programName": "Pull Day" },
      { "dayOfWeek": 5, "programName": "Leg Day" }
    ]
  }
}

For rotation-based cycles (programs cycle in order regardless of which day of the week):
  "cycle": {
    "name": "ABC Rotation",
    "durationWeeks": 8,
    "scheduleType": "rotation",
    "slots": [
      { "orderIndex": 1, "programName": "Push Day", "label": "A" },
      { "orderIndex": 2, "programName": "Pull Day", "label": "B" },
      { "orderIndex": 3, "programName": "Leg Day", "label": "C" }
    ]
  }

Each exercise entry:
{
  "orderIndex": 0,
  "progressionMode": "weight",
  "overloadIncrementKg": 2.5,
  "overloadIncrementReps": 0,
  "exercise": {
    "name": "Bench Press",
    "category": "strength",
    "bodyArea": "upper_body",
    "muscleGroup": "chest",
    "equipment": "barbell",
    "movementPattern": "push"
  },
  "sets": [
    { "setNumber": 1, "targetReps": 8, "weightKg": 60, "restTimeSeconds": 90 }
  ]
}

Rules:
- Do NOT generate rest day programs. Omit rest days from cycle slots entirely.
- category: "strength", "cardio", or "flexibility"
- bodyArea: "upper_body", "lower_body", "core", "full_body", or "cardio"
- muscleGroup: "chest", "back", "shoulders", "biceps", "triceps", "forearms", "quads", "hamstrings", "glutes", "calves", "abs", "lower_back", "full_body", or "cardio"
- equipment: "barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "bands", or "other"
- movementPattern: "push", "pull", "hinge", "squat", "carry", "rotation", "isometric", or "cardio"
- progressionMode: "manual", "weight", "smart", or "reps"
- weightKg: use 0 for bodyweight, null if unknown
- restTimeSeconds: rest between sets in seconds (e.g. 90)
- orderIndex: 0-based index for exercise order within each program
- durationWeeks must be one of: 4, 6, 8, 10, 12, 16
- dayOfWeek: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
- programName in cycle slots must exactly match a name in the "programs" array
${exerciseListText}
IMPORTANT: The list above contains exercises already in my library. Use those exact names whenever possible — only invent a new exercise name if the exercise genuinely does not exist in the list.
IMPORTANT: Keep programs focused — max 8 exercises per program, max 4 sets per exercise. Prioritise quality over quantity.`;
}

/** Full prompt for the manual clipboard flow (adds the interactive "ask one question" tail). */
export function buildManualClipboardPrompt(userProfile: UserProfile, exercises: Exercise[]): string {
  return `${buildAiSystemPrompt(userProfile, exercises)}

First ask me one question: "What kind of training are you looking for? Tell me your goals, how many days a week you can train, and whether you want a structured weekly schedule or just standalone programs." Use my answer to generate everything. Then output only the raw JSON — no explanation, no markdown, no code block.`;
}
