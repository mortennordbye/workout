"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type AccentColor = "blue" | "white" | "green" | "purple" | "orange";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  autoSaveToProgram: boolean;
  setAutoSaveToProgram: (v: boolean) => void;
  weeklyGoal: number;
  setWeeklyGoal: (n: number) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const accentColors: Record<AccentColor, { light: string; dark: string }> = {
  blue: {
    light: "oklch(0.55 0.22 264.36)",
    dark: "oklch(0.70 0.19 264.36)",
  },
  white: {
    light: "oklch(0.205 0 0)",
    dark: "oklch(0.922 0 0)",
  },
  green: {
    light: "oklch(0.55 0.15 145)",
    dark: "oklch(0.70 0.18 145)",
  },
  purple: {
    light: "oklch(0.55 0.20 300)",
    dark: "oklch(0.70 0.22 300)",
  },
  orange: {
    light: "oklch(0.60 0.18 45)",
    dark: "oklch(0.75 0.20 45)",
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with server-safe defaults — localStorage is loaded after hydration in useEffect
  const [theme, setTheme] = useState<Theme>("light");
  const [accentColor, setAccentColorState] = useState<AccentColor>("blue");
  const [autoSaveToProgram, setAutoSaveToProgramState] = useState(false);
  const [weeklyGoal, setWeeklyGoalState] = useState(4);

  const applyAccentColor = (color: AccentColor, currentTheme: Theme) => {
    const colorValue =
      currentTheme === "dark"
        ? accentColors[color].dark
        : accentColors[color].light;
    const foreground =
      currentTheme === "dark" ? "oklch(0.205 0 0)" : "oklch(0.985 0 0)";
    document.documentElement.style.setProperty("--primary", colorValue);
    document.documentElement.style.setProperty("--primary-foreground", foreground);
  };

  // Load persisted preferences and apply to DOM after hydration
  useEffect(() => {
    const storedTheme = (localStorage.getItem("theme") as Theme | null) ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const storedAccent = (localStorage.getItem("accentColor") as AccentColor | null) ?? "blue";
    const storedAutoSave = localStorage.getItem("autoSaveToProgram") === "true";
    const storedGoal = localStorage.getItem("weeklyGoal");

    setTheme(storedTheme);
    setAccentColorState(storedAccent);
    setAutoSaveToProgramState(storedAutoSave);
    setWeeklyGoalState(storedGoal ? Number(storedGoal) : 4);

    document.documentElement.classList.toggle("dark", storedTheme === "dark");
    applyAccentColor(storedAccent, storedTheme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
        applyAccentColor(accentColor, next);
      }
      return next;
    });
  };

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color);
    if (typeof window !== "undefined") {
      localStorage.setItem("accentColor", color);
      applyAccentColor(color, theme);
    }
  };

  const setAutoSaveToProgram = (v: boolean) => {
    setAutoSaveToProgramState(v);
    if (typeof window !== "undefined") {
      localStorage.setItem("autoSaveToProgram", String(v));
    }
  };

  const setWeeklyGoal = (n: number) => {
    setWeeklyGoalState(n);
    if (typeof window !== "undefined") {
      localStorage.setItem("weeklyGoal", String(n));
    }
  };

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, accentColor, setAccentColor, autoSaveToProgram, setAutoSaveToProgram, weeklyGoal, setWeeklyGoal }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
