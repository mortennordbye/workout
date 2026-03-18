"use client";
import { createContext, useContext, useState } from "react";

type SetOverride = { targetReps: number; weightKg: number };

type WorkoutSessionContextValue = {
  sessionId: number | null;
  setSessionId: (id: number) => void;
  overrides: Record<number, SetOverride>;
  setOverride: (setId: number, data: SetOverride) => void;
  clearOverrides: () => void;
  hasOverrides: boolean;
  completedSetIds: Set<number>;
  addCompletedSet: (id: number) => void;
  removeCompletedSet: (id: number) => void;
};

const WorkoutSessionContext = createContext<WorkoutSessionContextValue | null>(null);

export function WorkoutSessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [overrides, setOverrides] = useState<Record<number, SetOverride>>({});
  const [completedSetIds, setCompletedSetIds] = useState<Set<number>>(new Set());

  const setOverride = (setId: number, data: SetOverride) =>
    setOverrides((prev) => ({ ...prev, [setId]: data }));
  const clearOverrides = () => {
    setOverrides({});
    setCompletedSetIds(new Set());
  };
  const addCompletedSet = (id: number) =>
    setCompletedSetIds((prev) => new Set(prev).add(id));
  const removeCompletedSet = (id: number) =>
    setCompletedSetIds((prev) => { const s = new Set(prev); s.delete(id); return s; });

  return (
    <WorkoutSessionContext.Provider
      value={{
        sessionId, setSessionId,
        overrides, setOverride, clearOverrides, hasOverrides: Object.keys(overrides).length > 0,
        completedSetIds, addCompletedSet, removeCompletedSet,
      }}
    >
      {children}
    </WorkoutSessionContext.Provider>
  );
}

// Returns null if used outside of a workout context (safe for shared components)
export function useWorkoutSession() {
  return useContext(WorkoutSessionContext);
}
