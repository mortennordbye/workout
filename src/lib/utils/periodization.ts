/**
 * Triathlon periodization curve — pure, fully testable (no DB access).
 *
 * A triathlon cycle is peak-anchored: the swim/bike/run distances on each
 * exercise represent the *peak* (race-prep) week. `periodizedLoad` returns the
 * multiplier to apply to those peak distances for a given week of the block, so
 * volume ramps Base → Build → Peak, then tapers into race week, with a lighter
 * deload week every ~4th week. Strength is never periodized (always maintenance).
 *
 *  - goal "maintain": flat 1.0 every week (hold fitness, no race peak/taper).
 *  - goal "build":    the curve described above.
 *
 * The function degrades gracefully for short blocks (min supported is 4 weeks).
 */

export type TrainingGoal = "build" | "maintain";

/** Ironman experience tier — drives peak volumes (see triathlon-plan) and deload cadence. */
export type AthleteLevel = "novice" | "intermediate" | "advanced";

export type TrainingPhase = "base" | "build" | "peak" | "taper" | "maintain";

export type WeekLoad = {
  /** 1-indexed week within the block. */
  week: number;
  phase: TrainingPhase;
  /** Multiplier applied to the peak distances (0–1). */
  multiplier: number;
  /** True on a recovery/deload week. */
  isDeload: boolean;
};

// ── Tunables ────────────────────────────────────────────────────────────────
// Values follow the Ironman-specific curve in the research brief: a gentle ramp
// floor, ~25% deload dips, and an exponential taper to ~0.35 of peak on race
// week. The ramp start is held at 0.60 (not the brief's 0.50): on the steepest
// supported block (12 wk) a 0.50 start makes the post-deload week rebound to an
// uncoupled ACWR of ~1.37 — above the brief's own 1.30 lowest-risk ceiling. At
// 0.60 the worst case across all block lengths/cadences is ~1.28 (asserted in
// periodization.test.ts), so the safety invariant wins over the exact floor.
/** Multiplier at the very first ramp week. */
const RAMP_START = 0.6;
/** Recovery-week volume relative to that week's ramp value (~25% reduction). */
const DELOAD_FACTOR = 0.75;
/** Default deload cadence (every Nth ramp week) — see deloadCadenceForLevel. */
const DELOAD_EVERY = 4;
/** Taper volume on the first vs final (race) taper week. */
const TAPER_START = 0.6;
const TAPER_END = 0.35;
/** Never prescribe below this fraction of peak. */
const MIN_MULTIPLIER = 0.3;

/**
 * Deload cadence for an athlete tier. Novices (and the over-50 cohort the brief
 * groups with them) recover every 3rd ramp week; intermediate/advanced sustain a
 * 4-week mesocycle. Null (non-triathlon cycle, or legacy row) → the 4-week default.
 */
export function deloadCadenceForLevel(level: AthleteLevel | null | undefined): number {
  return level === "novice" ? 3 : DELOAD_EVERY;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * How many of the final weeks are taper, and how many peak weeks sit before it.
 * Exposed so the UI can describe the plan ("taper in N weeks").
 */
export function phaseLayout(totalWeeks: number): {
  taperWeeks: number;
  peakWeeks: number;
  /** Number of leading ramp (base+build) weeks. */
  rampWeeks: number;
} {
  const weeks = Math.max(1, Math.floor(totalWeeks));
  const taperWeeks = clamp(Math.ceil(weeks * 0.1), 1, 3);
  const peakWeeks = weeks >= 8 ? 2 : 1;
  const rampWeeks = Math.max(1, weeks - taperWeeks - peakWeeks);
  return { taperWeeks, peakWeeks, rampWeeks };
}

/** Load prescription for one week of a periodized block. */
export function periodizedLoad(
  week: number,
  totalWeeks: number,
  goal: TrainingGoal,
  deloadEvery: number = DELOAD_EVERY,
): WeekLoad {
  const weeks = Math.max(1, Math.floor(totalWeeks));
  const w = clamp(Math.floor(week), 1, weeks);

  if (goal === "maintain") {
    return { week: w, phase: "maintain", multiplier: 1, isDeload: false };
  }

  const { taperWeeks, peakWeeks, rampWeeks } = phaseLayout(weeks);
  const peakStart = rampWeeks + 1; // first peak week
  const taperStart = rampWeeks + peakWeeks + 1; // first taper week

  // ── Taper (final weeks → race week) ──────────────────────────────────────
  if (w >= taperStart) {
    const i = w - taperStart; // 0 = first taper week
    const t = taperWeeks > 1 ? i / (taperWeeks - 1) : 1;
    return {
      week: w,
      phase: "taper",
      multiplier: round2(clamp(lerp(TAPER_START, TAPER_END, t), MIN_MULTIPLIER, 1)),
      isDeload: false,
    };
  }

  // ── Peak (race-prep weeks at full volume) ────────────────────────────────
  if (w >= peakStart) {
    return { week: w, phase: "peak", multiplier: 1, isDeload: false };
  }

  // ── Base / Build ramp (linear RAMP_START → 1.0) ──────────────────────────
  const frac = rampWeeks > 1 ? (w - 1) / (rampWeeks - 1) : 1;
  let multiplier = lerp(RAMP_START, 1, frac);
  // First ~half of the ramp is "base", the rest "build".
  const phase: TrainingPhase = w <= Math.ceil(rampWeeks / 2) ? "base" : "build";

  // Deload every Nth ramp week (never week 1, never the final ramp week before peak).
  const isDeload = w % deloadEvery === 0 && w !== rampWeeks;
  if (isDeload) multiplier *= DELOAD_FACTOR;

  return {
    week: w,
    phase,
    multiplier: round2(clamp(multiplier, MIN_MULTIPLIER, 1)),
    isDeload,
  };
}

/**
 * Apply a week's load multiplier to a peak distance, rounded to a clean 100 m
 * step (min 100 m). Shared by the generator (week 1) and the weekly sync.
 */
export function scaledDistance(peakMeters: number, multiplier: number): number {
  return Math.max(100, Math.round((peakMeters * multiplier) / 100) * 100);
}

/**
 * Uncoupled acute:chronic workload ratio for a sequence of weekly loads. Each
 * week's acute load is divided by the mean of the *preceding* (up to 3) weeks —
 * the current week is deliberately excluded from the denominator to avoid the
 * mathematical coupling that dampens real spikes in the conventional formula.
 * Week 1 (no history) returns 1. Used to verify a generated ramp never spikes
 * load past the ~1.30 injury-risk ceiling, including coming out of a deload.
 */
export function uncoupledAcwr(weeklyLoads: number[]): number[] {
  return weeklyLoads.map((load, i) => {
    const priors = weeklyLoads.slice(Math.max(0, i - 3), i);
    if (priors.length === 0) return 1;
    const chronic = priors.reduce((a, b) => a + b, 0) / priors.length;
    return chronic > 0 ? load / chronic : 0;
  });
}

/**
 * Apply a week's load multiplier to a peak duration, rounded to a clean 30 s
 * step (min 30 s). The time-mode analogue of scaledDistance, used by the weekly
 * sync when an endurance set is periodized by duration instead of distance.
 */
export function scaledDuration(peakSeconds: number, multiplier: number): number {
  return Math.max(30, Math.round((peakSeconds * multiplier) / 30) * 30);
}

const PHASE_LABELS: Record<TrainingPhase, string> = {
  base: "Base",
  build: "Build",
  peak: "Peak",
  taper: "Taper",
  maintain: "Maintain",
};

export function phaseLabel(phase: TrainingPhase): string {
  return PHASE_LABELS[phase];
}

/** Fields needed to phrase a periodization summary (subset of CyclePeriodization). */
export type PeriodizationSummaryInput = {
  goal: TrainingGoal;
  phase: TrainingPhase;
  phaseLabel: string;
  currentWeek: number;
  totalWeeks: number;
  multiplier: number;
  isDeload: boolean;
  weeksUntilPeak: number;
  weeksUntilTaper: number;
};

/**
 * Human phrasing for a periodization state — shared by the cycle detail page and
 * the in-workout header so both read identically. Pure (no DB, no JSX).
 */
export function formatPeriodizationSummary(
  p: PeriodizationSummaryInput,
): { headline: string; note: string } {
  const pct = Math.round(p.multiplier * 100);
  const deload = p.isDeload && p.goal === "build" ? " · deload" : "";
  const headline = `${p.phaseLabel}${deload} · Week ${p.currentWeek} of ${p.totalWeeks}`;

  let note: string;
  if (p.goal === "maintain") {
    note = "Endurance held steady; strength at maintenance.";
  } else if (p.weeksUntilPeak > 0) {
    const wk = p.weeksUntilPeak === 1 ? "wk" : "wks";
    note = `Peak in ${p.weeksUntilPeak} ${wk} · this week ~${pct}% of peak volume.`;
  } else if (p.weeksUntilTaper > 0) {
    const wk = p.weeksUntilTaper === 1 ? "wk" : "wks";
    note = `At peak · taper in ${p.weeksUntilTaper} ${wk}.`;
  } else if (p.phase === "taper") {
    note = "Tapering into race week - easing volume to arrive fresh.";
  } else {
    note = "Peak block - race-prep volume.";
  }
  return { headline, note };
}
