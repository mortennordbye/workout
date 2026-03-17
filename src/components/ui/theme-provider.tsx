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
  const [theme, setTheme] = useState<Theme>("light");
  const [accentColor, setAccentColorState] = useState<AccentColor>("blue");
  const [autoSaveToProgram, setAutoSaveToProgramState] = useState(false);

  // On mount, read persisted preferences
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    const preferredTheme =
      storedTheme ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    setTheme(preferredTheme);
    document.documentElement.classList.toggle(
      "dark",
      preferredTheme === "dark",
    );

    const storedColor =
      (localStorage.getItem("accentColor") as AccentColor | null) ?? "blue";
    setAccentColorState(storedColor);
    applyAccentColor(storedColor, preferredTheme);

    setAutoSaveToProgramState(
      localStorage.getItem("autoSaveToProgram") === "true",
    );
  }, []);

  const applyAccentColor = (color: AccentColor, currentTheme: Theme) => {
    if (typeof document === "undefined") return;
    const colorValue =
      currentTheme === "dark"
        ? accentColors[color].dark
        : accentColors[color].light;
    const foreground =
      currentTheme === "dark" ? "oklch(0.205 0 0)" : "oklch(0.985 0 0)";

    document.documentElement.style.setProperty("--primary", colorValue);
    document.documentElement.style.setProperty(
      "--primary-foreground",
      foreground,
    );
  };

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

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, accentColor, setAccentColor, autoSaveToProgram, setAutoSaveToProgram }}
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
