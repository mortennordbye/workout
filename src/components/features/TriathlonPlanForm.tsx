"use client";

import { generateTriathlonPlan } from "@/lib/actions/triathlon-plan";
import { ChevronLeftIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const WEEK_PRESETS = [8, 12, 16];
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
  const [weeks, setWeeks] = useState(12);
  const [restDay, setRestDay] = useState<number | null>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setSaving(true);
    setError(null);
    const result = await generateTriathlonPlan({
      weeks,
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
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
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
          Generates a weekly swim/bike/run template with two strength days to keep muscle. Volume ramps each
          week via progression. You can edit every session afterward.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-6 pb-nav-safe">
        {/* Duration */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Duration</p>
          <div className="flex gap-2">
            {WEEK_PRESETS.map((w) => (
              <button
                key={w}
                onClick={() => setWeeks(w)}
                className={`flex-1 h-12 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                  weeks === w ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {w} weeks
              </button>
            ))}
          </div>
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
