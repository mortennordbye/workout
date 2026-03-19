"use client";

import { updateTrainingCycle } from "@/lib/actions/training-cycles";
import { WheelPicker } from "@/components/ui/WheelPicker";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const WEEK_OPTIONS = Array.from({ length: 24 }, (_, i) => i + 1);

type Props = {
  cycleId: number;
  durationWeeks: number;
};

export function CycleDurationEditor({ cycleId, durationWeeks }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(durationWeeks);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce save: fire 800ms after the user stops scrolling
  useEffect(() => {
    if (value === durationWeeks) return; // no change on mount
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await updateTrainingCycle({ id: cycleId, durationWeeks: value });
      router.refresh();
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Duration
      </p>
      <WheelPicker
        options={WEEK_OPTIONS}
        value={value}
        onChange={setValue}
        renderLabel={(w) => `${w} week${w === 1 ? "" : "s"}`}
      />
    </div>
  );
}
