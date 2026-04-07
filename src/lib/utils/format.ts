import type { ProgramSet } from "@/types/workout";

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function setToken(s: ProgramSet, isTimed = false): string {
  if (isTimed || s.durationSeconds != null) {
    return formatTime(Number(s.durationSeconds ?? 60));
  }
  return `${s.targetReps ?? "?"}x${Number(s.weightKg ?? 0)}kg`;
}

export function restToken(s: ProgramSet): string {
  return formatTime(Number(s.restTimeSeconds));
}

export function buildSetSummary(sets: ProgramSet[], isTimed = false): string {
  if (sets.length === 0) return "";
  const tokens = sets.map((s) => `${setToken(s, isTimed)}; ${restToken(s)}`);
  return tokens.length > 3
    ? tokens.slice(0, 3).join("; ") + "; ..."
    : tokens.join("; ");
}
