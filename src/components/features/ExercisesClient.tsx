"use client";

import { createCustomExercise } from "@/lib/actions/exercises";
import type { Exercise } from "@/types/workout";
import {
  Activity,
  ArrowLeft,
  ChevronRight,
  Dumbbell,
  PersonStanding,
  Plus,
  Timer,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Category = "strength" | "cardio" | "flexibility";
type BodyArea = "upper_body" | "lower_body" | "core" | "full_body" | "cardio";
type MuscleGroup = "chest" | "back" | "shoulders" | "biceps" | "triceps" | "forearms" | "quads" | "hamstrings" | "glutes" | "calves" | "abs" | "lower_back" | "full_body" | "cardio";
type Equipment = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "kettlebell" | "bands" | "other";
type MovementPattern = "push" | "pull" | "hinge" | "squat" | "carry" | "rotation" | "isometric" | "cardio";
type ViewId = "all" | "bodyArea" | "muscles" | "equipment" | "timed" | "function" | "custom";

const BODY_AREA_ORDER: BodyArea[] = ["upper_body", "lower_body", "core", "full_body", "cardio"];
const BODY_AREA_LABELS: Record<BodyArea, string> = {
  upper_body: "Upper Body", lower_body: "Lower Body", core: "Core",
  full_body: "Full Body", cardio: "Cardio",
};

const MUSCLE_ORDER: MuscleGroup[] = ["chest", "back", "shoulders", "biceps", "triceps", "forearms", "quads", "hamstrings", "glutes", "calves", "abs", "lower_back", "full_body", "cardio"];
const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest", back: "Back", shoulders: "Shoulders", biceps: "Biceps",
  triceps: "Triceps", forearms: "Forearms", quads: "Quads", hamstrings: "Hamstrings",
  glutes: "Glutes", calves: "Calves", abs: "Abs", lower_back: "Lower Back",
  full_body: "Full Body", cardio: "Cardio",
};

const EQUIPMENT_ORDER: Equipment[] = ["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "bands", "other"];
const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Barbell", dumbbell: "Dumbbell", machine: "Machine", cable: "Cable",
  bodyweight: "Bodyweight", kettlebell: "Kettlebell", bands: "Bands", other: "Other",
};

const MOVEMENT_ORDER: MovementPattern[] = ["push", "pull", "hinge", "squat", "carry", "rotation", "isometric", "cardio"];
const MOVEMENT_LABELS: Record<MovementPattern, string> = {
  push: "Push", pull: "Pull", hinge: "Hinge", squat: "Squat",
  carry: "Carry", rotation: "Rotation", isometric: "Isometric", cardio: "Cardio",
};

const MENU_ITEMS: { id: ViewId; label: string; Icon: React.ElementType }[] = [
  { id: "all", label: "All Exercises", Icon: Dumbbell },
  { id: "bodyArea", label: "Body Area", Icon: PersonStanding },
  { id: "muscles", label: "Muscles", Icon: Zap },
  { id: "equipment", label: "Equipment", Icon: Wrench },
  { id: "timed", label: "Timed", Icon: Timer },
  { id: "function", label: "Function", Icon: Activity },
];

function capitalize(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function exerciseType(category: string) {
  if (category === "cardio") return "Timed";
  if (category === "flexibility") return "Flexibility";
  return "Reps Based";
}

// ─── Detail View ─────────────────────────────────────────────────────────────

function DetailView({
  exercise,
  backLabel,
  onBack,
}: {
  exercise: Exercise;
  backLabel: string;
  onBack: () => void;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Title", value: exercise.name },
    { label: "Exercise Type", value: exerciseType(exercise.category) },
    ...(exercise.bodyArea ? [{ label: "Body Area", value: capitalize(exercise.bodyArea) }] : []),
    ...(exercise.muscleGroup ? [{ label: "Muscle Group", value: capitalize(exercise.muscleGroup) }] : []),
    ...(exercise.equipment ? [{ label: "Equipment", value: capitalize(exercise.equipment) }] : []),
    ...(exercise.movementPattern ? [{ label: "Movement", value: capitalize(exercise.movementPattern) }] : []),
  ];

  return (
    <>
      {/* Nav bar */}
      <div className="flex items-center justify-between mb-4 -mx-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1 min-h-[44px] px-1 text-primary active:opacity-70"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">{backLabel}</span>
        </button>
        <span className="text-sm font-medium text-primary">Add to…</span>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold tracking-tight mb-6">
        {exercise.name}
        {exercise.isCustom && (
          <span className="ml-2 text-sm font-medium text-primary bg-primary/10 px-2 py-0.5 rounded align-middle">
            Custom
          </span>
        )}
      </h1>

      {/* Metadata table */}
      <div className="bg-card rounded-2xl overflow-hidden">
        {rows.map(({ label, value }, i) => (
          <div
            key={label}
            className={`flex items-center justify-between px-4 py-3.5 ${i < rows.length - 1 ? "border-b border-border/50" : ""}`}
          >
            <span className="text-foreground">{label}</span>
            <span className="text-muted-foreground text-right">{value}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Exercise Row ─────────────────────────────────────────────────────────────

function ExerciseRow({
  exercise,
  onOpen,
}: {
  exercise: Exercise;
  onOpen: (exercise: Exercise) => void;
}) {
  const sub = [
    exercise.muscleGroup ? capitalize(exercise.muscleGroup) : null,
    exercise.equipment ? capitalize(exercise.equipment) : null,
  ].filter(Boolean).join(" · ");

  return (
    <button
      onClick={() => onOpen(exercise)}
      className="flex items-center gap-3 w-full px-4 py-3.5 border-b border-border/50 last:border-0 active:bg-muted/50 transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium">{exercise.name}</p>
        {sub && <p className="text-sm text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {exercise.isCustom ? (
        <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">
          Custom
        </span>
      ) : (
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      )}
    </button>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="px-4 pt-5 pb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {label}
    </p>
  );
}

// ─── Group builder ────────────────────────────────────────────────────────────

function buildGroups<K extends string>(
  exercises: Exercise[],
  key: keyof Exercise,
  order: K[],
  labels: Record<K, string>,
): { label: string; exercises: Exercise[] }[] {
  const map = new Map<K, Exercise[]>();
  for (const ex of exercises) {
    const val = ex[key] as K | null;
    if (!val) continue;
    if (!map.has(val)) map.set(val, []);
    map.get(val)!.push(ex);
  }
  const ungrouped = exercises.filter((ex) => !ex[key]);
  const groups = order
    .filter((k) => map.has(k))
    .map((k) => ({ label: labels[k], exercises: map.get(k)! }));
  if (ungrouped.length > 0) groups.push({ label: "Other", exercises: ungrouped });
  return groups;
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({
  view,
  exercises,
  onBack,
  onOpen,
}: {
  view: ViewId;
  exercises: Exercise[];
  onBack: () => void;
  onOpen: (exercise: Exercise) => void;
}) {
  const title = MENU_ITEMS.find((m) => m.id === view)?.label ?? "My Exercises";

  function rows(list: Exercise[]) {
    return list.map((ex) => <ExerciseRow key={ex.id} exercise={ex} onOpen={onOpen} />);
  }

  let content: React.ReactNode;

  if (view === "all") {
    content = <div className="bg-card rounded-2xl overflow-hidden">{rows(exercises)}</div>;
  } else if (view === "custom") {
    const custom = exercises.filter((ex) => ex.isCustom);
    content = custom.length === 0 ? (
      <p className="text-muted-foreground text-center mt-12">No custom exercises yet.</p>
    ) : (
      <div className="bg-card rounded-2xl overflow-hidden">{rows(custom)}</div>
    );
  } else if (view === "timed") {
    const timed = exercises.filter((ex) => ex.category === "cardio");
    content = <div className="bg-card rounded-2xl overflow-hidden">{rows(timed)}</div>;
  } else {
    const groupConfig = {
      bodyArea: { key: "bodyArea" as keyof Exercise, order: BODY_AREA_ORDER, labels: BODY_AREA_LABELS },
      muscles: { key: "muscleGroup" as keyof Exercise, order: MUSCLE_ORDER, labels: MUSCLE_LABELS },
      equipment: { key: "equipment" as keyof Exercise, order: EQUIPMENT_ORDER, labels: EQUIPMENT_LABELS },
      function: { key: "movementPattern" as keyof Exercise, order: MOVEMENT_ORDER, labels: MOVEMENT_LABELS },
    }[view as "bodyArea" | "muscles" | "equipment" | "function"];

    if (!groupConfig) return null;
    const groups = buildGroups(exercises, groupConfig.key, groupConfig.order as string[], groupConfig.labels as Record<string, string>);
    content = (
      <>
        {groups.map(({ label, exercises: grp }) => (
          <div key={label}>
            <SectionHeader label={label} />
            <div className="bg-card rounded-2xl overflow-hidden">{rows(grp)}</div>
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={onBack}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 text-primary active:opacity-70"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      </div>
      {content}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ExercisesClient({ exercises }: { exercises: Exercise[] }) {
  const router = useRouter();
  const [view, setView] = useState<ViewId | "menu">("menu");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("strength");
  const [bodyArea, setBodyArea] = useState<BodyArea | "">("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | "">("");
  const [equipment, setEquipment] = useState<Equipment | "">("");
  const [movementPattern, setMovementPattern] = useState<MovementPattern | "">("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    const result = await createCustomExercise({
      name: name.trim(),
      category,
      isCustom: true,
      bodyArea: bodyArea || undefined,
      muscleGroup: muscleGroup || undefined,
      equipment: equipment || undefined,
      movementPattern: movementPattern || undefined,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Failed to create exercise");
      return;
    }
    setName(""); setCategory("strength"); setBodyArea("");
    setMuscleGroup(""); setEquipment(""); setMovementPattern("");
    setShowForm(false);
    router.refresh();
  }

  // Detail view — shown over the list
  if (selectedExercise) {
    const backLabel = view === "menu"
      ? "Exercises"
      : (MENU_ITEMS.find((m) => m.id === view)?.label ?? "My Exercises");
    return (
      <DetailView
        exercise={selectedExercise}
        backLabel={backLabel}
        onBack={() => setSelectedExercise(null)}
      />
    );
  }

  // List view
  if (view !== "menu") {
    return (
      <ListView
        view={view}
        exercises={exercises}
        onBack={() => setView("menu")}
        onOpen={setSelectedExercise}
      />
    );
  }

  // Menu view
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Exercises</h1>
        <button
          onClick={() => { setShowForm(true); setError(""); }}
          className="flex items-center justify-center w-10 h-10 rounded-full border border-border text-foreground active:opacity-70"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">New Exercise</p>
            <button
              onClick={() => setShowForm(false)}
              className="text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exercise name"
              className="w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 ring-primary"
            />
            <div className="grid grid-cols-3 gap-2">
              {(["strength", "cardio", "flexibility"] as Category[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2.5 rounded-xl text-sm font-semibold capitalize transition-colors ${
                    category === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground active:opacity-70"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <select
              value={bodyArea}
              onChange={(e) => setBodyArea(e.target.value as BodyArea | "")}
              className="w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 ring-primary"
            >
              <option value="">Body area (optional)</option>
              {BODY_AREA_ORDER.map((val) => (
                <option key={val} value={val}>{BODY_AREA_LABELS[val]}</option>
              ))}
            </select>
            <select
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup | "")}
              className="w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 ring-primary"
            >
              <option value="">Muscle group (optional)</option>
              {MUSCLE_ORDER.map((val) => (
                <option key={val} value={val}>{MUSCLE_LABELS[val]}</option>
              ))}
            </select>
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value as Equipment | "")}
              className="w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 ring-primary"
            >
              <option value="">Equipment (optional)</option>
              {EQUIPMENT_ORDER.map((val) => (
                <option key={val} value={val}>{EQUIPMENT_LABELS[val]}</option>
              ))}
            </select>
            <select
              value={movementPattern}
              onChange={(e) => setMovementPattern(e.target.value as MovementPattern | "")}
              className="w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 ring-primary"
            >
              <option value="">Movement pattern (optional)</option>
              {MOVEMENT_ORDER.map((val) => (
                <option key={val} value={val}>{MOVEMENT_LABELS[val]}</option>
              ))}
            </select>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create Exercise"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-card rounded-2xl overflow-hidden mb-4">
        {MENU_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className="flex items-center gap-3 w-full px-4 py-3.5 min-h-[56px] border-b border-border/50 last:border-0 active:bg-muted/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <span className="flex-1 text-left font-medium">{label}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <div className="bg-card rounded-2xl overflow-hidden">
        <button
          onClick={() => setView("custom")}
          className="flex items-center w-full px-4 py-4 min-h-[56px] active:bg-muted/50 transition-colors"
        >
          <span className="text-primary font-medium">My Exercises</span>
        </button>
      </div>
    </>
  );
}
