"use client";

import { useEffect, useRef } from "react";

const ITEM_H = 44;
const PEEK = 2; // items visible above and below center

type Props<T extends number | string> = {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  renderLabel?: (v: T) => string;
};

export function WheelPicker<T extends number | string>({
  options,
  value,
  onChange,
  renderLabel,
}: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const containerH = (PEEK * 2 + 1) * ITEM_H;

  // Set initial scroll position instantly on mount
  useEffect(() => {
    if (!ref.current) return;
    const idx = options.indexOf(value);
    if (idx >= 0) ref.current.scrollTop = idx * ITEM_H;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleScroll() {
    if (!ref.current) return;
    const idx = Math.round(ref.current.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, options.length - 1));
    if (options[clamped] !== value) onChange(options[clamped]);
  }

  return (
    <div className="relative rounded-xl overflow-hidden bg-muted" style={{ height: containerH }}>
      {/* Top fade */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none z-10"
        style={{
          height: PEEK * ITEM_H,
          background: "linear-gradient(to bottom, hsl(var(--muted)) 0%, transparent 100%)",
        }}
      />

      {/* Selection highlight */}
      <div
        className="absolute inset-x-0 bg-background border-y border-border pointer-events-none z-10"
        style={{ top: PEEK * ITEM_H, height: ITEM_H }}
      />

      {/* Bottom fade */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none z-10"
        style={{
          height: PEEK * ITEM_H,
          background: "linear-gradient(to top, hsl(var(--muted)) 0%, transparent 100%)",
        }}
      />

      {/* Scrollable list */}
      <div
        ref={ref}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-scroll"
        style={{
          scrollSnapType: "y mandatory",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* Top spacer so first item can be centered */}
        <div style={{ height: PEEK * ITEM_H }} aria-hidden="true" />

        {options.map((opt) => (
          <div
            key={String(opt)}
            style={{ height: ITEM_H, scrollSnapAlign: "center" }}
            className="flex items-center justify-center text-base font-medium relative z-20"
          >
            {renderLabel ? renderLabel(opt) : String(opt)}
          </div>
        ))}

        {/* Bottom spacer */}
        <div style={{ height: PEEK * ITEM_H }} aria-hidden="true" />
      </div>
    </div>
  );
}
