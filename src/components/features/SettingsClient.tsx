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

export function SettingsClient() {
  const { accentColor, setAccentColor } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 pt-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Settings</h1>

      {/* Settings sections */}
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
                    onClick={() => setAccentColor(color.value as any)}
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

        {/* Future settings sections can be added here */}
      </div>
    </div>
  );
}
