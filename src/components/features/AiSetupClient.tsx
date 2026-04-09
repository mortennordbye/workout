"use client";

import { importProgram } from "@/lib/actions/programs";
import { importCycle } from "@/lib/actions/training-cycles";
import type { Exercise } from "@/types/workout";
import { Check, Copy, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type UserProfile = {
  gender: string | null;
  birthYear: number | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: string | null;
  experienceLevel: string | null;
};

const GOAL_LABELS: Record<string, string> = {
  strength: "Strength",
  muscle_gain: "Muscle Gain",
  weight_loss: "Weight Loss",
  endurance: "Endurance",
  general_fitness: "General Fitness",
};

type Props = {
  exercises: Exercise[];
  userProfile: UserProfile;
};

export function AiSetupClient({ exercises, userProfile }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pasteJson, setPasteJson] = useState("");
  const [status, setStatus] = useState<"idle" | "importing" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
  if (userProfile.goal)
    profileLines.push(`Goal: ${GOAL_LABELS[userProfile.goal] ?? userProfile.goal}`);
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

  const aiPrompt = `Set up my workout app with the right programs and training schedule.${profileBlock}
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

First ask me one question: "What kind of training are you looking for? Tell me your goals, how many days a week you can train, and whether you want a structured weekly schedule or just standalone programs." Use my answer to generate everything. Then output only the raw JSON — no explanation, no markdown, no code block.`;

  function handleCopyPrompt() {
    navigator.clipboard.writeText(aiPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleImport() {
    if (!pasteJson.trim()) return;
    setStatus("importing");
    setError(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(pasteJson.trim());
    } catch {
      setStatus("error");
      setError("Invalid JSON — make sure you copied the full response from the AI.");
      return;
    }

    const raw = parsed as Record<string, unknown>;
    const hasProgramData = raw.program !== undefined || raw.programs !== undefined;
    const hasCycle = raw.cycle !== undefined;

    if (!hasProgramData && !hasCycle) {
      setStatus("error");
      setError("Invalid JSON — make sure you copied the full response from the AI.");
      return;
    }

    let programCount = 0;
    let cycleName: string | null = null;

    if (hasProgramData) {
      const result = await importProgram(parsed);
      if (!result.success) {
        setStatus("error");
        setError(result.error ?? "Failed to import programs.");
        return;
      }
      programCount = result.data.count;
    }

    if (hasCycle) {
      const result = await importCycle(raw.cycle);
      if (!result.success) {
        setStatus("error");
        setError(result.error ?? "Failed to import cycle.");
        return;
      }
      cycleName = result.data.cycleName;
    }

    const parts: string[] = [];
    if (programCount > 0) parts.push(`${programCount} program${programCount > 1 ? "s" : ""}`);
    if (cycleName) parts.push(`cycle "${cycleName}"`);
    setSuccessMsg(`Created ${parts.join(" and ")}. Head to the home screen to activate your cycle.`);
    setStatus("success");
    setPasteJson("");
    router.refresh();
  }

  if (status === "success") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <Check className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <p className="text-lg font-semibold mb-1">All done!</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{successMsg}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground active:opacity-80"
        >
          Go to Home
        </button>
        <button
          type="button"
          onClick={() => { setStatus("idle"); setSuccessMsg(null); }}
          className="text-sm text-muted-foreground active:opacity-70"
        >
          Import more
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 px-4 pb-8">
      {/* Step 1 */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Step 1 — Copy the prompt
        </p>
        <p className="text-sm text-muted-foreground">
          Tap the button below to copy a ready-made prompt to your clipboard.
        </p>
        <button
          type="button"
          onClick={handleCopyPrompt}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3.5 text-sm font-semibold active:opacity-80"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied!" : "Copy Prompt"}
        </button>
      </div>

      {/* Step 2 */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Step 2 — Open ChatGPT, Gemini, or Claude
        </p>
        <p className="text-sm text-muted-foreground">
          Paste the prompt and send it. The AI will ask what you&apos;re looking for — describe your
          goals, how many days a week you can train, and whether you want a weekly schedule or just
          programs. You can ask for a full training block (e.g. &quot;12-week PPL, 4 days a
          week&quot;) or just standalone programs. When it&apos;s done, copy the entire response.
        </p>
      </div>

      {/* Step 3 */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Step 3 — Paste the response here
        </p>
        <textarea
          value={pasteJson}
          onChange={(e) => {
            setPasteJson(e.target.value);
            setStatus("idle");
            setError(null);
          }}
          placeholder="Paste the AI's response here…"
          rows={5}
          className="w-full rounded-xl bg-muted px-3 py-3 text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="button"
          onClick={handleImport}
          disabled={!pasteJson.trim() || status === "importing"}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3.5 text-sm font-semibold active:opacity-80 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {status === "importing" ? "Importing…" : "Import"}
        </button>
      </div>
    </div>
  );
}
