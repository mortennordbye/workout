"use client";

import type { TrainingCycleWithSlots } from "@/types/workout";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";

// Full Tailwind class strings — must not be generated dynamically
const PALETTE = [
  { dot: "bg-blue-500", light: "bg-blue-500/15" },
  { dot: "bg-violet-500", light: "bg-violet-500/15" },
  { dot: "bg-emerald-500", light: "bg-emerald-500/15" },
  { dot: "bg-orange-500", light: "bg-orange-500/15" },
  { dot: "bg-rose-500", light: "bg-rose-500/15" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  cycles: TrainingCycleWithSlots[];
  completedDates: string[]; // "YYYY-MM-DD"
};

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonthGrid(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const startPad = (firstDay.getDay() + 6) % 7; // shift so Mon=0
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(toDateStr(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

type DayInfo = {
  cycleIndex: number | null;
  programName: string | null;
  isScheduled: boolean;
};

function getDayInfo(dateStr: string, cycles: TrainingCycleWithSlots[]): DayInfo {
  const [y, m, d] = dateStr.split("-").map(Number);
  const jsDay = new Date(y, m - 1, d).getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay; // 1=Mon…7=Sun

  for (let i = 0; i < cycles.length; i++) {
    const cycle = cycles[i];
    if (!cycle.startDate) continue;

    const [sy, sm, sd] = cycle.startDate.split("-").map(Number);
    const endDate = new Date(sy, sm - 1, sd);
    endDate.setDate(endDate.getDate() + cycle.durationWeeks * 7);
    const endStr = toDateStr(endDate);

    if (dateStr < cycle.startDate || dateStr >= endStr) continue;

    if (cycle.scheduleType === "day_of_week") {
      const slot = cycle.slots.find((s) => s.dayOfWeek === dayOfWeek);
      if (slot) {
        return { cycleIndex: i, programName: slot.program?.name ?? null, isScheduled: true };
      }
    } else {
      // rotation — we know the cycle is active but can't project exact slot
      return { cycleIndex: i, programName: null, isScheduled: true };
    }
  }
  return { cycleIndex: null, programName: null, isScheduled: false };
}

export function CycleCalendarClient({ cycles, completedDates }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const todayStr = toDateStr(today);
  const completedSet = new Set(completedDates);

  // Assign colors only to cycles that have a startDate (can appear on calendar)
  const visibleCycles = cycles.filter((c) => c.startDate);
  const colorMap = new Map<number, (typeof PALETTE)[number]>();
  visibleCycles.forEach((c) => {
    const idx = cycles.indexOf(c);
    colorMap.set(idx, PALETTE[colorMap.size % PALETTE.length]);
  });

  const grid = getMonthGrid(year, month);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  return (
    <div className="flex-1 overflow-hidden px-4 pb-2 flex flex-col">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center active:opacity-60">
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <span className="text-base font-semibold">{MONTH_NAMES[month]} {year}</span>
        <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center active:opacity-60">
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7">
        {DAY_LABELS.map((label) => (
          <div key={label} className="text-center text-xs font-medium text-muted-foreground py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1">
        {grid.map((dateStr, idx) => {
          if (!dateStr) return <div key={`pad-${idx}`} />;

          const info = getDayInfo(dateStr, cycles);
          const isToday = dateStr === todayStr;
          const isCompleted = completedSet.has(dateStr);
          const isPast = dateStr < todayStr;
          const colors = info.cycleIndex !== null ? colorMap.get(info.cycleIndex) : null;
          const dayNum = parseInt(dateStr.split("-")[2], 10);

          return (
            <div
              key={dateStr}
              className={`flex flex-col items-center justify-center rounded-lg ${colors && info.isScheduled ? colors.light : ""}`}
            >
              <span
                className={`
                  w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium
                  ${isToday ? "bg-primary text-primary-foreground" : ""}
                  ${!isToday && isPast && !info.isScheduled ? "text-muted-foreground/50" : ""}
                `}
              >
                {dayNum}
              </span>
              {info.isScheduled && colors ? (
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${colors.dot} ${isCompleted ? "opacity-100" : "opacity-30"}`} />
              ) : isCompleted ? (
                <span className="w-1.5 h-1.5 rounded-full mt-0.5 bg-primary" />
              ) : (
                <span className="w-1.5 h-1.5 mt-0.5" />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {visibleCycles.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5 shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cycles
          </p>
          {visibleCycles.map((cycle) => {
            const idx = cycles.indexOf(cycle);
            const colors = colorMap.get(idx);
            return (
              <div key={cycle.id} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors?.dot}`} />
                <span className="text-sm font-medium">{cycle.name}</span>
                <span className="text-xs text-muted-foreground capitalize">· {cycle.status}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-5 mt-2 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-foreground opacity-20" />
              <span className="text-xs text-muted-foreground">Scheduled</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-foreground opacity-80" />
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
          </div>
        </div>
      )}

      {visibleCycles.length === 0 && (
        <p className="text-sm text-muted-foreground text-center mt-4">
          No cycles with a start date yet.
        </p>
      )}
    </div>
  );
}
