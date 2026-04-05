"use client";

import { createProgram, deleteProgram, importProgram, updateProgram } from "@/lib/actions/programs";
import type { Exercise, Program } from "@/types/workout";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Check, ChevronRightIcon, Copy, Minus, PlusIcon, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  programs: Program[];
  exercises: Exercise[];
};

export function ProgramListClient({ programs: initial, exercises }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [programs, setPrograms] = useState(initial);

  useEffect(() => {
    setPrograms(initial);
  }, [initial]);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renamingValue, setRenamingValue] = useState("");

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  // AI tip state
  const [aiTipOpen, setAiTipOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pasteJson, setPasteJson] = useState("");
  const [pasteStatus, setPasteStatus] = useState<"idle" | "importing" | "error">("idle");
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Import state
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "reading" | "uploading" | "error">("idle");
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleDelete(programId: number) {
    setDeleting(true);
    setPrograms((prev) => prev.filter((p) => p.id !== programId));
    await deleteProgram(programId);
    setPendingDeleteId(null);
    setDeleting(false);
    router.refresh();
  }

  function startRenaming(program: Program) {
    setRenamingId(program.id);
    setRenamingValue(program.name);
  }

  async function commitRename(program: Program) {
    const trimmed = renamingValue.trim();
    setRenamingId(null);
    if (!trimmed || trimmed === program.name) return;
    setPrograms((prev) => prev.map((p) => p.id === program.id ? { ...p, name: trimmed } : p));
    await updateProgram({ id: program.id, name: trimmed });
    router.refresh();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const result = await createProgram({ name: newName.trim() });
    setCreating(false);
    if (result.success) {
      setNewName("");
      setShowCreate(false);
      router.refresh();
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus("reading");
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setImportStatus("error");
      setImportError("Invalid JSON file.");
      return;
    }
    setImportStatus("uploading");
    const result = await importProgram(parsed);
    if (!result.success) {
      setImportStatus("error");
      setImportError(result.error);
      return;
    }
    setImportSheetOpen(false);
    setImportStatus("idle");
    router.refresh();
  }

  function closeImportSheet() {
    setImportSheetOpen(false);
    setImportStatus("idle");
    setImportError(null);
  }

  const exerciseListText = exercises.length > 0
    ? `\nAvailable exercises in my library (use these names exactly when possible):\n${exercises
        .map((e) => `- ${e.name} (${[e.muscleGroup, e.equipment, e.movementPattern].filter(Boolean).join(", ")})`)
        .join("\n")}`
    : "";

  const aiPrompt = `Create a workout program in JSON format that I can import into my workout tracking app.

Use this exact structure:

{
  "version": 1,
  "program": {
    "name": "Program Name",
    "exercises": [
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
          { "setNumber": 1, "targetReps": 8, "weightKg": 60, "restTimeSeconds": 90 },
          { "setNumber": 2, "targetReps": 8, "weightKg": 60, "restTimeSeconds": 90 },
          { "setNumber": 3, "targetReps": 8, "weightKg": 60, "restTimeSeconds": 90 }
        ]
      }
    ]
  }
}

Rules:
- category: "strength", "cardio", or "flexibility"
- bodyArea: "upper_body", "lower_body", "core", "full_body", or "cardio"
- muscleGroup: "chest", "back", "shoulders", "biceps", "triceps", "forearms", "quads", "hamstrings", "glutes", "calves", "abs", "lower_back", "full_body", or "cardio"
- equipment: "barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "bands", or "other"
- movementPattern: "push", "pull", "hinge", "squat", "carry", "rotation", "isometric", or "cardio"
- progressionMode: "manual", "weight", "smart", or "reps"
- weightKg: use 0 for bodyweight, null if unknown
- restTimeSeconds: rest between sets in seconds (e.g. 90)
- orderIndex: 0-based index for exercise order in the program
${exerciseListText}
Now create: [DESCRIBE YOUR PROGRAM HERE — e.g. "a 3-day push/pull/legs split for intermediate lifters, hypertrophy focus, 4 sets per exercise"]`;

  function handleCopyPrompt() {
    navigator.clipboard.writeText(aiPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handlePasteImport() {
    if (!pasteJson.trim()) return;
    setPasteStatus("importing");
    setPasteError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(pasteJson.trim());
    } catch {
      setPasteStatus("error");
      setPasteError("Invalid JSON — make sure you copied the full response from the AI.");
      return;
    }
    const result = await importProgram(parsed);
    if (!result.success) {
      setPasteStatus("error");
      setPasteError(result.error);
      return;
    }
    setPasteJson("");
    setPasteStatus("idle");
    setAiTipOpen(false);
    router.refresh();
  }

  function closeAiSheet() {
    setAiTipOpen(false);
    setPasteJson("");
    setPasteStatus("idle");
    setPasteError(null);
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <h1 className="text-3xl font-bold tracking-tight">Programs</h1>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <button
              type="button"
              onClick={() => { setIsEditing(false); setPendingDeleteId(null); setRenamingId(null); }}
              className="text-primary text-sm font-medium min-h-[44px] px-1"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-primary text-sm font-medium min-h-[44px] px-1"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setImportSheetOpen(true)}
                className="flex items-center justify-center w-10 h-10 text-muted-foreground active:opacity-60"
                aria-label="Import program"
              >
                <Upload className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground active:opacity-80 transition-opacity"
                aria-label="New program"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        {programs.length > 0 && (
          <div className="flex flex-col divide-y divide-border rounded-2xl bg-card overflow-hidden mb-4">
            {programs.map((program) => {
              const isPending = pendingDeleteId === program.id;

              if (isPending) {
                return (
                  <div key={program.id} className="flex items-center justify-between px-4 py-4 bg-destructive/10">
                    <span className="text-sm font-medium text-destructive">
                      Delete &ldquo;{program.name}&rdquo;?
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(null)}
                        className="text-sm text-muted-foreground font-medium min-h-[44px] px-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(program.id)}
                        disabled={deleting}
                        className="text-sm text-destructive font-semibold min-h-[44px] px-1 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={program.id} className="flex items-center gap-3 px-4">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(program.id)}
                      className="w-7 h-7 rounded-full bg-destructive flex items-center justify-center shrink-0"
                      aria-label={`Delete ${program.name}`}
                    >
                      <Minus className="w-4 h-4 text-white" />
                    </button>
                  )}
                  {isEditing ? (
                    renamingId === program.id ? (
                      <input
                        autoFocus
                        value={renamingValue}
                        onChange={(e) => setRenamingValue(e.target.value)}
                        onBlur={() => commitRename(program)}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                        className="flex-1 py-3.5 text-base font-medium bg-transparent outline-none border-b border-primary"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startRenaming(program)}
                        className="flex-1 py-3.5 text-left text-base font-medium"
                      >
                        {program.name}
                      </button>
                    )
                  ) : (
                    <Link
                      href={`/programs/${program.id}`}
                      className="flex-1 flex items-center justify-between py-3.5 active:opacity-70 transition-opacity"
                    >
                      <span className="text-base font-medium">{program.name}</span>
                      <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {programs.length === 0 && !showCreate && (
          <p className="text-muted-foreground text-sm mb-6">
            No programs yet. Tap + to create one.
          </p>
        )}

        {/* Inline create form */}
        {showCreate && (
          <form onSubmit={handleCreate} className="flex gap-2 mb-4">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Program name…"
              className="flex-1 rounded-xl bg-muted px-4 py-3 text-base outline-none focus:ring-2 ring-primary"
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {creating ? "…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setNewName(""); }}
              className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* AI tip card */}
      {!isEditing && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => setAiTipOpen(true)}
            className="w-full flex items-center gap-3 rounded-2xl bg-primary/10 px-4 py-3.5 active:opacity-70 transition-opacity text-left"
          >
            <Sparkles className="w-5 h-5 text-primary flex-none" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary">Create programs with AI</p>
              <p className="text-xs text-primary/70 mt-0.5">Get a prompt to generate ready-to-import programs</p>
            </div>
          </button>
        </div>
      )}

      {/* AI tip sheet */}
      <BottomSheet open={aiTipOpen} onClose={closeAiSheet} blur>
        <div className="bg-background rounded-t-2xl px-4 pt-5 pb-10 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary flex-none" />
            <h2 className="text-lg font-semibold">Create programs with AI</h2>
          </div>

          {/* Step 1 — copy prompt */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Step 1 — Copy the prompt</p>
            <div className="rounded-xl bg-muted px-3 py-3 max-h-36 overflow-y-auto mb-2">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{aiPrompt}</pre>
            </div>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3.5 text-sm font-semibold active:opacity-80"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Prompt"}
            </button>
          </div>

          {/* Step 2 — paste response */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Step 2 — Paste the JSON response</p>
            <textarea
              value={pasteJson}
              onChange={(e) => { setPasteJson(e.target.value); setPasteStatus("idle"); setPasteError(null); }}
              placeholder='Paste the JSON from your AI here…'
              rows={5}
              className="w-full rounded-xl bg-muted px-3 py-3 text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            {pasteError && (
              <p className="text-xs text-destructive mt-1">{pasteError}</p>
            )}
            <button
              type="button"
              onClick={handlePasteImport}
              disabled={!pasteJson.trim() || pasteStatus === "importing"}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3.5 text-sm font-semibold active:opacity-80 disabled:opacity-50"
            >
              {pasteStatus === "importing" ? "Importing…" : "Import Program"}
            </button>
          </div>

          <button
            type="button"
            onClick={closeAiSheet}
            className="w-full py-2 text-sm text-muted-foreground"
          >
            Close
          </button>
        </div>
      </BottomSheet>

      {/* Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={handleFileChange}
      />
      <BottomSheet open={importSheetOpen} onClose={closeImportSheet}>
        <div className="bg-background rounded-t-2xl px-4 pt-5 pb-10">
          <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />
          <h2 className="text-xl font-bold mb-1">Import Program</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Select a .json file exported from this app.
          </p>
          {importStatus === "idle" && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground active:opacity-80"
            >
              Choose File
            </button>
          )}
          {(importStatus === "reading" || importStatus === "uploading") && (
            <p className="text-center text-sm text-muted-foreground py-4">
              {importStatus === "reading" ? "Reading file…" : "Importing…"}
            </p>
          )}
          {importStatus === "error" && (
            <>
              <p className="text-sm text-destructive mb-4">{importError}</p>
              <button
                type="button"
                onClick={() => {
                  setImportStatus("idle");
                  setImportError(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="w-full rounded-2xl bg-muted py-4 text-sm font-medium active:opacity-70"
              >
                Try Again
              </button>
            </>
          )}
          <button
            type="button"
            onClick={closeImportSheet}
            className="w-full mt-3 py-3 text-sm text-muted-foreground"
          >
            Cancel
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
