"use client";
import { createContext, useContext, useEffect, useState } from "react";

type SetOverride = { targetReps: number; weightKg: number };

const STORAGE_KEY = "activeWorkout";

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
  programId: number | null;
  startTime: string | null;
  workoutPath: string | null;
  setActiveWorkout: (programId: number, startTime: string, sessionId?: number) => void;
  clearActiveWorkout: () => void;
};

const WorkoutSessionContext = createContext<WorkoutSessionContextValue | null>(null);

export function WorkoutSessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [overrides, setOverrides] = useState<Record<number, SetOverride>>({});
  const [completedSetIds, setCompletedSetIds] = useState<Set<number>>(new Set());
  const [programId, setProgramId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [workoutPath, setWorkoutPath] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const { programId: pid, startTime: st, sessionId: sid } = JSON.parse(raw) as {
          programId: number;
          startTime: string;
          sessionId: number | null;
        };
        setProgramId(pid);
        setStartTime(st);
        setWorkoutPath(`/programs/${pid}/workout`);
        if (sid != null) setSessionId(sid);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const setOverride = (setId: number, data: SetOverride) =>
    setOverrides((prev) => ({ ...prev, [setId]: data }));

  const clearOverrides = () => {
    setOverrides({});
    setCompletedSetIds(new Set());
  };

  const addCompletedSet = (id: number) =>
    setCompletedSetIds((prev) => new Set(prev).add(id));

  const removeCompletedSet = (id: number) =>
    setCompletedSetIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });

  const setActiveWorkout = (pid: number, st: string, sid?: number) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ programId: pid, startTime: st, sessionId: sid ?? null }));
    setProgramId(pid);
    setStartTime(st);
    setWorkoutPath(`/programs/${pid}/workout`);
    if (sid != null) setSessionId(sid);
  };

  const clearActiveWorkout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProgramId(null);
    setStartTime(null);
    setWorkoutPath(null);
    setSessionId(null);
    clearOverrides();
  };

  return (
    <WorkoutSessionContext.Provider
      value={{
        sessionId,
        setSessionId,
        overrides,
        setOverride,
        clearOverrides,
        hasOverrides: Object.keys(overrides).length > 0,
        completedSetIds,
        addCompletedSet,
        removeCompletedSet,
        programId,
        startTime,
        workoutPath,
        setActiveWorkout,
        clearActiveWorkout,
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
