"use client";

import { generateWorkoutPlan } from "@/lib/actions/ai-generate";
import { importProgram } from "@/lib/actions/programs";
import { importCycle } from "@/lib/actions/training-cycles";
import { buildManualClipboardPrompt, type PrData } from "@/lib/utils/ai-prompt";
import type { Exercise } from "@/types/workout";
import { Check, ChevronDown, Copy, Dumbbell, RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type UserProfile = {
  gender: string | null;
  birthYear: number | null;
  heightCm: number | null;
  weightKg: number | null;
  goals: string[];
  experienceLevel: string | null;
};

type PreviewProgram = { name: string; exercises: unknown[] };
type PreviewCycle = { name: string; durationWeeks: number; scheduleType: string };

function PreviewCard({
  parsed,
  onConfirm,
  onDiscard,
  importing,
}: {
  parsed: Record<string, unknown>;
  onConfirm: () => void;
  onDiscard: () => void;
  importing: boolean;
}) {
  const programs = (
    Array.isArray(parsed.programs) ? parsed.programs :
    parsed.program ? [parsed.program] : []
  ) as PreviewProgram[];

  const cycle = parsed.cycle as PreviewCycle | undefined;
  const totalExercises = programs.reduce((sum, p) => sum + (Array.isArray(p.exercises) ? p.exercises.length : 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Review before importing
      </p>
      <div className="rounded-xl bg-muted p-4 flex flex-col gap-3">
        {/* Summary line */}
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {programs.length} program{programs.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Dumbbell className="w-3.5 h-3.5 text-primary" />
            {totalExercises} exercise{totalExercises !== 1 ? "s" : ""}
          </span>
          {cycle && (
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <RefreshCw className="w-3.5 h-3.5 text-primary" />
              {cycle.durationWeeks}-week cycle
            </span>
          )}
        </div>

        {/* Program list */}
        <div className="flex flex-col gap-1">
          {programs.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{p.name}</span>
              <span className="text-muted-foreground text-xs">
                {Array.isArray(p.exercises) ? p.exercises.length : 0} exercises
              </span>
            </div>
          ))}
          {cycle && (
            <div className="flex items-center justify-between text-sm mt-1 pt-1 border-t border-border">
              <span className="text-foreground">{cycle.name}</span>
              <span className="text-muted-foreground text-xs">{cycle.durationWeeks} weeks</span>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={importing}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3.5 text-sm font-semibold active:opacity-80 disabled:opacity-50"
      >
        <Check className="w-4 h-4" />
        {importing ? "Importing…" : "Import"}
      </button>
      <button
        type="button"
        onClick={onDiscard}
        disabled={importing}
        className="text-sm text-muted-foreground active:opacity-70 text-center py-1"
      >
        Discard and start over
      </button>
    </div>
  );
}

type Props = {
  exercises: Exercise[];
  userProfile: UserProfile;
  generationsToday: number;
  dailyLimit: number;
  prs: PrData[];
  existingProgramNames: string[];
};

export function AiSetupClient({ exercises, userProfile, generationsToday, dailyLimit, prs, existingProgramNames }: Props) {
  const router = useRouter();

  // Manual flow state
  const [copied, setCopied] = useState(false);
  const [pasteJson, setPasteJson] = useState("");
  const [status, setStatus] = useState<"idle" | "importing" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cycleCreated, setCycleCreated] = useState(false);

  // Automatic flow state
  const [autoDescription, setAutoDescription] = useState("");
  const [autoStatus, setAutoStatus] = useState<"idle" | "asking" | "preview" | "importing" | "error">("idle");
  const [autoError, setAutoError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(dailyLimit - generationsToday);
  const [pendingJson, setPendingJson] = useState<Record<string, unknown> | null>(null);

  const AUTO_BUSY = autoStatus === "asking" || autoStatus === "importing";
  const AUTO_STATUS_LABEL: Record<string, string> = {
    asking: "Asking the AI…",
    importing: "Importing programs…",
  };
  const [showManual, setShowManual] = useState(false);

  function handleCopyPrompt() {
    navigator.clipboard.writeText(buildManualClipboardPrompt(userProfile, exercises, prs, existingProgramNames));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleImportParsed(raw: Record<string, unknown>) {
    const hasProgramData = raw.program !== undefined || raw.programs !== undefined;
    const hasCycle = raw.cycle !== undefined;

    if (!hasProgramData && !hasCycle) {
      setStatus("error");
      setError('The JSON doesn\'t contain any programs or a cycle. Make sure you pasted the full AI response and that it includes a "programs" or "cycle" key.');
      return;
    }

    let programCount = 0;
    let cycleName: string | null = null;
    const warnings: string[] = [];

    if (hasProgramData) {
      const result = await importProgram(raw);
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
        warnings.push(`Cycle couldn't be created: ${result.error ?? "unknown error"}`);
      } else {
        cycleName = result.data.cycleName;
        if (result.data.unresolvedPrograms.length > 0) {
          warnings.push(
            `Some cycle slots couldn't be linked: "${result.data.unresolvedPrograms.join('", "')}". You can assign them manually in the cycle editor.`,
          );
        }
      }
    }

    const parts: string[] = [];
    if (programCount > 0) parts.push(`${programCount} program${programCount > 1 ? "s" : ""}`);
    if (cycleName) parts.push(`cycle "${cycleName}"`);

    const base =
      parts.length > 0
        ? `Created ${parts.join(" and ")}.`
        : "Nothing was created — the response may have been empty.";
    const suffix = cycleName
      ? " Go to your cycles and start it when you're ready."
      : programCount > 0
        ? " You can find your programs in the Programs tab."
        : "";

    setSuccessMsg(
      warnings.length > 0 ? `${base}${suffix}\n\n⚠️ ${warnings.join(" ")}` : `${base}${suffix}`,
    );
    setCycleCreated(!!cycleName);
    setStatus("success");
    setPasteJson("");
    router.refresh();
  }

  async function handleImport() {
    if (!pasteJson.trim()) return;
    setStatus("importing");
    setError(null);

    let text = pasteJson.trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace > 0 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setStatus("error");
      setError("Couldn't read the JSON — make sure you copied the full response from the AI, with no extra text before or after.");
      return;
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      setStatus("error");
      setError("Unexpected response format — the AI should return a single JSON object, not an array or plain value.");
      return;
    }

    await handleImportParsed(parsed as Record<string, unknown>);
  }

  async function handleGenerate() {
    if (!autoDescription.trim() || AUTO_BUSY) return;
    setAutoStatus("asking");
    setAutoError(null);

    const result = await generateWorkoutPlan(autoDescription);
    if (!result.success) {
      setAutoStatus("error");
      setAutoError(result.error);
      return;
    }

    setRemaining(result.data.dailyLimit - result.data.generationsToday);
    const parsed = result.data.json;

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      setAutoStatus("error");
      setAutoError("The AI returned an unexpected format. Please try again.");
      return;
    }

    setPendingJson(parsed as Record<string, unknown>);
    setAutoStatus("preview");
  }

  async function handleConfirmImport() {
    if (!pendingJson) return;
    const json = pendingJson;
    setAutoStatus("importing");
    await handleImportParsed(json);
    setPendingJson(null);
    setAutoStatus("idle");
  }

  function handleDiscard() {
    setPendingJson(null);
    setAutoStatus("idle");
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
          onClick={() => router.push(cycleCreated ? "/cycles" : "/programs")}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground active:opacity-80"
        >
          {cycleCreated ? "Go to Cycles" : "Go to Programs"}
        </button>
        <button
          type="button"
          onClick={() => { setStatus("idle"); setSuccessMsg(null); setCycleCreated(false); }}
          className="text-sm text-muted-foreground active:opacity-70"
        >
          Import more
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 px-4 pb-8">
      {/* Auto-generate section */}
      {(autoStatus === "preview" || autoStatus === "importing") && pendingJson ? (
        <PreviewCard
          parsed={pendingJson}
          onConfirm={handleConfirmImport}
          onDiscard={handleDiscard}
          importing={autoStatus === "importing"}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Auto-generate with AI
          </p>
          <p className="text-sm text-muted-foreground">
            Describe what you&apos;re looking for and the app will build your programs automatically.
          </p>
          <textarea
            value={autoDescription}
            onChange={(e) => {
              setAutoDescription(e.target.value);
              setAutoError(null);
            }}
            placeholder="e.g. 3-day push/pull/legs, intermediate lifter, progressive overload on the big lifts…"
            rows={4}
            className="w-full rounded-xl bg-muted px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          {autoError && <p className="text-xs text-destructive">{autoError}</p>}
          <p className="text-xs text-muted-foreground">
            {remaining} of {dailyLimit} generations remaining today
          </p>
          {AUTO_BUSY && (
            <div className="flex items-center gap-3 py-0.5">
              {(["asking", "importing"] as const).map((phase, i) => (
                <div key={phase} className="flex items-center gap-2">
                  {i > 0 && <div className="h-px w-4 bg-border" />}
                  <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${autoStatus === phase ? "text-primary" : autoStatus === "importing" && phase === "asking" ? "text-muted-foreground/50" : "text-muted-foreground/30"}`}>
                    {autoStatus === phase && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                    {AUTO_STATUS_LABEL[phase]}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!autoDescription.trim() || AUTO_BUSY || remaining <= 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3.5 text-sm font-semibold active:opacity-80 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {AUTO_BUSY ? AUTO_STATUS_LABEL[autoStatus] : "Generate"}
          </button>
        </div>
      )}

      {/* Manual toggle */}
      <button
        type="button"
        onClick={() => setShowManual((v) => !v)}
        className="flex items-center justify-center gap-2 text-xs text-muted-foreground active:opacity-70 py-1"
      >
        <span>or do it manually</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${showManual ? "rotate-180" : ""}`}
        />
      </button>

      {showManual && (
        <>
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
        </>
      )}
    </div>
  );
}
