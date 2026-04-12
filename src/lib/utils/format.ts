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

/**
 * Format pace as "M:SS /km". distanceMeters must be > 0.
 */
export function formatPace(durationSeconds: number, distanceMeters: number): string {
  const km = distanceMeters / 1000;
  const secsPerKm = durationSeconds / km;
  const m = Math.floor(secsPerKm / 60);
  const s = Math.round(secsPerKm % 60).toString().padStart(2, "0");
  return `${m}:${s} /km`;
}

/**
 * Format a distance in meters as a human-readable km string.
 * < 1km → "0.8 km", whole km → "5 km", fractional → "5.3 km"
 */
export function formatDistanceKm(meters: number): string {
  const km = meters / 1000;
  if (km < 1) return `${km.toFixed(1)} km`;
  if (km % 1 === 0) return `${km} km`;
  return `${km.toFixed(1)} km`;
}

/**
 * Build a run set summary for the exercise list row.
 * e.g. "5 km · 25:00 · 5:00 /km" or "1 km; 1 km; 1 km; ..." for intervals
 */
export function buildRunSetSummary(sets: ProgramSet[]): string {
  if (sets.length === 0) return "";
  const tokens = sets.map((s) => {
    const parts: string[] = [];
    if (s.distanceMeters) parts.push(formatDistanceKm(s.distanceMeters));
    if (s.durationSeconds) parts.push(formatTime(s.durationSeconds));
    if (s.distanceMeters && s.durationSeconds) {
      parts.push(formatPace(s.durationSeconds, s.distanceMeters));
    }
    return parts.join(" · ") || "Run";
  });
  return tokens.length > 3
    ? tokens.slice(0, 3).join("; ") + "; ..."
    : tokens.join("; ");
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
