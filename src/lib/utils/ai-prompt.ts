export type PrData = {
  exerciseName: string;
  estimated1rm?: number;
  maxWeight?: number;
};

export type PromptOptions = {
  daysPerWeek?: number;
  equipment?: "full_gym" | "barbell" | "dumbbells" | "bodyweight";
};

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

const EQUIPMENT_LABELS: Record<string, string> = {
  full_gym: "Full gym (barbells, dumbbells, cables, machines — all equipment available)",
  barbell: "Barbell + rack only (barbell and bodyweight exercises only — no dumbbells, cables, or machines)",
  dumbbells: "Dumbbells only (dumbbells and bodyweight exercises only — no barbell, cables, or machines)",
  bodyweight: "Bodyweight only (no equipment whatsoever — bands allowed)",
};

/** Shared instruction block used by both manual and automatic flows. */
export function buildAiSystemPrompt(userProfile: UserProfile, exercises: Exercise[], prs: PrData[] = [], existingProgramNames: string[] = [], options: PromptOptions = {}): string {
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
  if (options.daysPerWeek) profileLines.push(`Training frequency: ${options.daysPerWeek} days/week`);
  if (options.equipment) profileLines.push(`Available equipment: ${EQUIPMENT_LABELS[options.equipment] ?? options.equipment}`);
  const profileBlock =
    profileLines.length > 0
      ? `\nAbout me:\n${profileLines.map((l) => `- ${l}`).join("\n")}\n`
      : "";

  const prLines = prs
    .map((pr) => {
      if (pr.estimated1rm) return `- ${pr.exerciseName}: ~${pr.estimated1rm}kg estimated 1RM`;
      if (pr.maxWeight) return `- ${pr.exerciseName}: ${pr.maxWeight}kg max weight lifted`;
      return null;
    })
    .filter(Boolean);
  const prBlock =
    prLines.length > 0
      ? `\nMy current performance (use these to set realistic starting weights):\n${prLines.join("\n")}\n`
      : "";

  const existingProgramsBlock =
    existingProgramNames.length > 0
      ? `\nI already have these programs (do NOT duplicate them — create complementary work instead):\n${existingProgramNames.map((n) => `- ${n}`).join("\n")}\n`
      : "";

  const equipmentRule =
    options.equipment && options.equipment !== "full_gym"
      ? "\n- Equipment constraint: ONLY include exercises that use the available equipment listed above. Do not suggest any exercises requiring equipment not available."
      : "";
  const frequencyRule = options.daysPerWeek
    ? `\n- Frequency constraint: the cycle must schedule EXACTLY ${options.daysPerWeek} training day${options.daysPerWeek !== 1 ? "s" : ""} per week — no more, no less.`
    : "";

  return `Set up my workout app with the right programs and training schedule.${profileBlock}${prBlock}${existingProgramsBlock}
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
- Exercise order: always list compound/multi-joint exercises before isolation exercises within a program
- Starting weights: use ~75% of 1RM for 3–5 rep sets, ~70% for 6–8 reps, ~65% for 8–12 reps, ~60% for 12–15 reps. Estimate for exercises without PR data using body weight as reference where appropriate.
- Periodization: for beginner/novice experience levels use linear progression (same weight each session, add weight only when top of rep range is hit consistently). For intermediate/advanced use undulating periodization (vary rep ranges across sessions or programs, e.g. heavy/medium/light days).
- Weekly volume: aim for 10–20 working sets per muscle group per week across all programs in the cycle combined. Avoid both under-training (< 10 sets) and junk volume (> 20 sets).${equipmentRule}${frequencyRule}
${exerciseListText}
IMPORTANT: The list above contains exercises already in my library. Use those exact names whenever possible — only invent a new exercise name if the exercise genuinely does not exist in the list.
IMPORTANT: Keep programs focused — max 8 exercises per program, max 4 sets per exercise. Prioritise quality over quantity.`;
}

/** Full prompt for the manual clipboard flow (adds the interactive "ask one question" tail). */
export function buildManualClipboardPrompt(userProfile: UserProfile, exercises: Exercise[], prs: PrData[] = [], existingProgramNames: string[] = [], options: PromptOptions = {}): string {
  return `${buildAiSystemPrompt(userProfile, exercises, prs, existingProgramNames, options)}

First ask me one question: "What kind of training are you looking for? Tell me your goals, how many days a week you can train, and whether you want a structured weekly schedule or just standalone programs." Use my answer to generate everything. Then output only the raw JSON — no explanation, no markdown, no code block.`;
}
