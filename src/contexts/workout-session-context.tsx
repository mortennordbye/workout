"use client";
import { createContext, useContext, useState } from "react";

type SetOverride = { targetReps: number; weightKg: number };

type WorkoutSessionContextValue = {
  overrides: Record<number, SetOverride>;
  setOverride: (setId: number, data: SetOverride) => void;
  clearOverrides: () => void;
  hasOverrides: boolean;
};

const WorkoutSessionContext = createContext<WorkoutSessionContextValue | null>(null);

export function WorkoutSessionProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Record<number, SetOverride>>({});
  const setOverride = (setId: number, data: SetOverride) =>
    setOverrides((prev) => ({ ...prev, [setId]: data }));
  const clearOverrides = () => setOverrides({});
  return (
    <WorkoutSessionContext.Provider
      value={{ overrides, setOverride, clearOverrides, hasOverrides: Object.keys(overrides).length > 0 }}
    >
      {children}
    </WorkoutSessionContext.Provider>
  );
}

// Returns null if used outside of a workout context (safe for shared components)
export function useWorkoutSession() {
  return useContext(WorkoutSessionContext);
}
