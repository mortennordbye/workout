"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { formatDistanceKm, formatPace } from "@/lib/utils/format";
import { useState, useEffect } from "react";

const DISTANCE_PRESETS_M = [500, 1000, 2000, 3000, 5000, 10000, 15000, 21097, 42195];
const DISTANCE_LABELS = ["0.5km", "1km", "2km", "3km", "5km", "10km", "15km", "21km", "42km"];
const RPE_OPTIONS = [6, 7, 8, 9, 10];

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (distanceMeters: number, durationSeconds: number, rpe: number) => void;
  targetDistanceMeters?: number | null;
  targetDurationSeconds?: number | null;
  setNumber: number;
  totalSets: number;
};

export function LogRunModal({
  open,
  onClose,
  onConfirm,
  targetDistanceMeters,
  targetDurationSeconds,
  setNumber,
  totalSets,
}: Props) {
  const [distanceMeters, setDistanceMeters] = useState(
    targetDistanceMeters ?? 5000,
  );
  const [durationSeconds, setDurationSeconds] = useState(
    targetDurationSeconds ?? 0,
  );
  const [rpe, setRpe] = useState(7);
  const [minStr, setMinStr] = useState(
    String(Math.floor((targetDurationSeconds ?? 0) / 60)),
  );
  const [secStr, setSecStr] = useState(
    String((targetDurationSeconds ?? 0) % 60),
  );
  const [distanceStr, setDistanceStr] = useState(
    String((targetDistanceMeters ?? 5000) / 1000),
  );

  // Reset when opened with new target values
  useEffect(() => {
    if (!open) return;
    const dist = targetDistanceMeters ?? 5000;
    const dur = targetDurationSeconds ?? 0;
    setDistanceMeters(dist);
    setDurationSeconds(dur);
    setDistanceStr(String(dist / 1000));
    setMinStr(String(Math.floor(dur / 60)));
    setSecStr(String(dur % 60));
    setRpe(7);
  }, [open, targetDistanceMeters, targetDurationSeconds]);

  const pace =
    distanceMeters > 0 && durationSeconds > 0
      ? formatPace(durationSeconds, distanceMeters)
      : null;

  const title =
    totalSets > 1
      ? `Log Interval ${setNumber} of ${totalSets}`
      : "Log Run";

  const handleConfirm = () => {
    onConfirm(distanceMeters, durationSeconds, rpe);
  };

  return (
    <BottomSheet open={open} onClose={onClose} blur>
      <div className="w-full bg-card rounded-t-3xl pb-10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-2">
          <span className="text-base font-semibold">{title}</span>
          <button
            onClick={onClose}
            className="text-muted-foreground text-sm font-medium"
          >
            Cancel
          </button>
        </div>

        <div className="px-5 space-y-5 pt-2">
          {/* Distance */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Distance
            </p>
            {/* Preset bubbles */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {DISTANCE_PRESETS_M.map((m, i) => (
                <button
                  key={m}
                  onClick={() => {
                    setDistanceMeters(m);
                    setDistanceStr(String(m / 1000));
                  }}
                  className={`flex-shrink-0 px-4 h-11 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                    distanceMeters === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {DISTANCE_LABELS[i]}
                </button>
              ))}
            </div>
            {/* Custom input */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                inputMode="decimal"
                value={distanceStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d.]/g, "");
                  setDistanceStr(val);
                  const km = parseFloat(val);
                  if (!isNaN(km) && km > 0) setDistanceMeters(Math.round(km * 1000));
                }}
                onBlur={() => {
                  const km = parseFloat(distanceStr) || distanceMeters / 1000;
                  const m = Math.round(km * 1000);
                  setDistanceMeters(m);
                  setDistanceStr(String(m / 1000));
                }}
                className="flex-1 rounded-xl bg-background border border-border px-4 py-3 text-center text-2xl font-bold outline-none focus:ring-2 ring-primary"
              />
              <span className="text-base font-medium text-muted-foreground w-8">km</span>
            </div>
          </div>

          {/* Duration */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Duration
            </p>
            <div className="flex items-end gap-2">
              <div className="flex flex-col items-center gap-1 flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={minStr}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setMinStr(val);
                    const mins = Math.max(0, parseInt(val) || 0);
                    setDurationSeconds(mins * 60 + (durationSeconds % 60));
                  }}
                  onBlur={() => setMinStr(String(Math.floor(durationSeconds / 60)))}
                  className="w-full rounded-xl bg-background border border-border px-2 py-3 text-center text-3xl font-bold outline-none focus:ring-2 ring-primary"
                />
                <span className="text-xs text-muted-foreground">min</span>
              </div>
              <span className="text-3xl font-bold pb-6">:</span>
              <div className="flex flex-col items-center gap-1 flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={secStr}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setSecStr(val);
                    const secs = Math.max(0, Math.min(59, parseInt(val) || 0));
                    setDurationSeconds(Math.floor(durationSeconds / 60) * 60 + secs);
                  }}
                  onBlur={() => setSecStr(String(durationSeconds % 60))}
                  className="w-full rounded-xl bg-background border border-border px-2 py-3 text-center text-3xl font-bold outline-none focus:ring-2 ring-primary"
                />
                <span className="text-xs text-muted-foreground">sec</span>
              </div>
            </div>
          </div>

          {/* Live pace */}
          {pace && (
            <div className="flex items-center justify-center">
              <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {pace}
              </span>
            </div>
          )}

          {/* RPE */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Effort (RPE)
            </p>
            <div className="flex gap-2">
              {RPE_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRpe(r)}
                  className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                    rpe === r
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1.5">
              {rpe <= 6 ? "Easy" : rpe === 7 ? "Moderate" : rpe === 8 ? "Hard" : rpe === 9 ? "Very hard" : "Max effort"}
            </p>
          </div>
        </div>

        {/* Confirm */}
        <div className="px-5 pt-6">
          <button
            onClick={handleConfirm}
            className="w-full rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground transition-all active:scale-95"
          >
            {pace
              ? `Log Run — ${formatDistanceKm(distanceMeters)} at ${pace}`
              : `Log Run — ${formatDistanceKm(distanceMeters)}`}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
