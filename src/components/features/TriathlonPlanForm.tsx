"use client";

import { generateTriathlonPlan } from "@/lib/actions/triathlon-plan";
import { ChevronLeftIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Duration presets stored as whole weeks (the cycle/progression engine works in
// weeks) but labelled in months — Ironman builds commonly run 6–12 months.
const DURATION_PRESETS = [
  { weeks: 8, label: "2 mo" },
  { weeks: 12, label: "3 mo" },
  { weeks: 16, label: "4 mo" },
  { weeks: 24, label: "6 mo" },
  { weeks: 36, label: "9 mo" },
  { weeks: 52, label: "12 mo" },
];
const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

export function TriathlonPlanForm() {
  const router = useRouter();
  const [goal, setGoal] = useState<"build" | "maintain">("build");
  const [level, setLevel] = useState<"novice" | "intermediate" | "advanced">("intermediate");
  const [weeks, setWeeks] = useState(12);
  const [restDay, setRestDay] = useState<number | null>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setSaving(true);
    setError(null);
    const result = await generateTriathlonPlan({
      weeks,
      goal,
      level,
      ...(restDay != null ? { restDay } : {}),
    });
    if (result.success) {
      router.push(`/cycles/${result.data.cycleId}`);
    } else {
      setError(result.error);
      setSaving(false);
    }
  };

  return (
    <div className="h-[100dvh] pb-nav-safe bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 pt-6 pb-4 shrink-0">
        <Link href="/cycles" className="flex items-center gap-0.5 text-primary active:opacity-70 -ml-1 min-h-[44px]">
          <ChevronLeftIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Cycles</span>
        </Link>
      </div>

      <div className="px-4 pb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Triathlon plan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          A weekly swim/bike/run template with two strength days to keep muscle. Endurance volume is periodized
          across the block; strength stays at maintenance. You can edit every session afterward.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-6 pb-4">
        {/* Goal */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Goal</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "build", label: "Build to race", hint: "Ramp to a peak, then taper" },
              { value: "maintain", label: "Maintain", hint: "Hold fitness, flat load" },
            ] as const).map((g) => (
              <button
                key={g.value}
                onClick={() => setGoal(g.value)}
                className={`h-auto py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 flex flex-col items-center gap-0.5 ${
                  goal === g.value ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                <span>{g.label}</span>
                <span className={`text-[11px] font-normal ${goal === g.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{g.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Level */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Experience</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "novice", label: "Novice", hint: "First Ironman" },
              { value: "intermediate", label: "Intermediate", hint: "Done a few" },
              { value: "advanced", label: "Advanced", hint: "Competitive" },
            ] as const).map((l) => (
              <button
                key={l.value}
                onClick={() => setLevel(l.value)}
                className={`h-auto py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 flex flex-col items-center gap-0.5 ${
                  level === l.value ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                <span>{l.label}</span>
                <span className={`text-[11px] font-normal ${level === l.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{l.hint}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Scales peak swim/bike/run volumes and how often a recovery week lands.
          </p>
        </div>

        {/* Duration */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Duration</p>
          <div className="grid grid-cols-3 gap-2">
            {DURATION_PRESETS.map((d) => (
              <button
                key={d.weeks}
                onClick={() => setWeeks(d.weeks)}
                className={`h-12 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                  weeks === d.weeks ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {weeks} weeks · {goal === "maintain"
              ? "endurance held steady week to week."
              : "endurance ramps Base → Build → Peak, then tapers into race week."}
          </p>
        </div>

        {/* Rest day */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Rest day</p>
          <div className="flex gap-1.5">
            {DAYS.map((d) => (
              <button
                key={d.value}
                onClick={() => setRestDay(restDay === d.value ? null : d.value)}
                className={`flex-1 h-11 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                  restDay === d.value ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {restDay != null ? "That day's session becomes a rest day." : "No rest day — train all 7 days."}
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Generate */}
      <div className="p-4 shrink-0">
        <button
          onClick={handleGenerate}
          disabled={saving}
          className="w-full rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating...
            </span>
          ) : (
            "Generate plan"
          )}
        </button>
      </div>
    </div>
  );
}
