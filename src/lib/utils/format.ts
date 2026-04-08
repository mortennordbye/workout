import type { ProgramSet } from "@/types/workout";

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function formatTimeOfDay(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatDateLong(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
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
  const tokens = sets.map((s) => {
    const rest = Number(s.restTimeSeconds ?? 0);
    return rest > 0
      ? `${setToken(s, isTimed)}; ${restToken(s)}`
      : setToken(s, isTimed);
  });
  return tokens.length > 3
    ? tokens.slice(0, 3).join("; ") + "; ..."
    : tokens.join("; ");
}
