"use client";

import { useTheme } from "@/components/ui/theme-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CheckIcon } from "lucide-react";

const accentColors = [
  { value: "blue", label: "Blue", color: "#5B8FFF" },
  { value: "white", label: "White", color: "#EBEBEB" },
  { value: "green", label: "Green", color: "#5BC27A" },
  { value: "purple", label: "Purple", color: "#A45DFF" },
  { value: "orange", label: "Orange", color: "#FF8C42" },
] as const;

const KG_INCREMENT_PRESETS = [0, 1, 2.5, 5, 10] as const;
const REP_INCREMENT_PRESETS = [0, 1, 2, 3] as const;

export function SettingsClient() {
  const { accentColor, setAccentColor, weeklyGoal, setWeeklyGoal, defaultIncrementKg, setDefaultIncrementKg, defaultIncrementReps, setDefaultIncrementReps } = useTheme();

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <h1 className="text-3xl font-bold tracking-tight px-4 pt-8 pb-0 shrink-0">Settings</h1>

      {/* Settings sections */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 pt-8 pb-8">
        <div className="flex flex-col gap-4">
        {/* Appearance section */}
        <div className="rounded-xl bg-muted overflow-hidden">
          <div className="p-4">
            <h2 className="font-semibold mb-1">Appearance</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Customize how the app looks
            </p>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">
                  Toggle between light and dark theme
                </p>
              </div>
              <ThemeToggle />
            </div>

            {/* Accent Color Picker */}
            <div>
              <p className="font-medium mb-3">Accent Color</p>
              <div className="flex gap-3 flex-wrap">
                {accentColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setAccentColor(color.value)}
                    className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    style={{ backgroundColor: color.color }}
                  >
                    {accentColor === color.value && (
                      <CheckIcon
                        className="h-6 w-6 text-black"
                        strokeWidth={3}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Workout section */}
        <div className="rounded-xl bg-muted overflow-hidden">
          <div className="p-4">
            <h2 className="font-semibold mb-1">Workout</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Workout defaults and goals
            </p>

            {/* Weekly goal */}
            <div className="mb-6">
              <p className="font-medium mb-1">Weekly goal</p>
              <p className="text-sm text-muted-foreground mb-3">
                How many workouts you aim to do per week
              </p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    onClick={() => setWeeklyGoal(n)}
                    className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-colors active:scale-95 ${
                      weeklyGoal === n
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Default weight increment */}
            <div className="mb-6">
              <p className="font-medium mb-1">Default weight increment</p>
              <p className="text-sm text-muted-foreground mb-3">
                How much to increase weight when you hit your target reps
              </p>
              <div className="flex gap-2">
                {KG_INCREMENT_PRESETS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setDefaultIncrementKg(n)}
                    className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-colors active:scale-95 ${
                      defaultIncrementKg === n
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground"
                    }`}
                  >
                    {n === 0 ? "—" : `+${n}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Default rep increment */}
            <div className="mb-6">
              <p className="font-medium mb-1">Default rep increment</p>
              <p className="text-sm text-muted-foreground mb-3">
                How many reps to add when weight increment is set to manual
              </p>
              <div className="flex gap-2">
                {REP_INCREMENT_PRESETS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setDefaultIncrementReps(n)}
                    className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-colors active:scale-95 ${
                      defaultIncrementReps === n
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground"
                    }`}
                  >
                    {n === 0 ? "—" : `+${n}`}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

