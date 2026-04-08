"use client";
import { requestNotificationPermission, sendNotification } from "@/lib/notifications";
import { createContext, useContext, useEffect, useRef, useState } from "react";

type SetOverride = { targetReps: number; weightKg: number; durationSeconds?: number };

const STORAGE_KEY = "activeWorkout";
const REST_TIMERS_KEY = "restTimerEnds";

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
  restTimerEnds: Record<number, number>;
  setRestTimerEnd: (setId: number, endMs: number) => void;
  clearRestTimerEnd: (setId: number) => void;
  lastWorkoutPath: string | null;
  updateLastWorkoutPath: (path: string) => void;
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
  const [restTimerEnds, setRestTimerEnds] = useState<Record<number, number>>({});
  const [lastWorkoutPath, setLastWorkoutPath] = useState<string | null>(null);
  const restTimeoutRefs = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
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
    const rawTimers = localStorage.getItem(REST_TIMERS_KEY);
    if (rawTimers) {
      try {
        setRestTimerEnds(JSON.parse(rawTimers) as Record<number, number>);
      } catch {
        localStorage.removeItem(REST_TIMERS_KEY);
      }
    }
  }, []);

  // Schedule/cancel notification timeouts whenever restTimerEnds changes
  useEffect(() => {
    const refs = restTimeoutRefs.current;

    // Schedule new timers
    Object.entries(restTimerEnds).forEach(([id, endMs]) => {
      const setId = Number(id);
      if (refs[setId] !== undefined) return; // already scheduled
      const delay = endMs - Date.now();
      if (delay <= 0) return;
      refs[setId] = setTimeout(() => {
        sendNotification("Rest complete!", "Time to get back to work 💪");
        delete refs[setId];
      }, delay);
    });

    // Cancel timeouts for removed entries
    Object.keys(refs).forEach((id) => {
      const setId = Number(id);
      if (restTimerEnds[setId] === undefined) {
        clearTimeout(refs[setId]);
        delete refs[setId];
      }
    });
  }, [restTimerEnds]);

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

  const setRestTimerEnd = (setId: number, endMs: number) => {
    setRestTimerEnds((prev) => {
      const next = { ...prev, [setId]: endMs };
      localStorage.setItem(REST_TIMERS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const clearRestTimerEnd = (setId: number) => {
    setRestTimerEnds((prev) => {
      const next = { ...prev };
      delete next[setId];
      localStorage.setItem(REST_TIMERS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const setActiveWorkout = (pid: number, st: string, sid?: number) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ programId: pid, startTime: st, sessionId: sid ?? null }));
    setProgramId(pid);
    setStartTime(st);
    setWorkoutPath(`/programs/${pid}/workout`);
    if (sid != null) setSessionId(sid);
    void requestNotificationPermission();
  };

  const updateLastWorkoutPath = (path: string) => setLastWorkoutPath(path);

  const clearActiveWorkout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(REST_TIMERS_KEY);
    // Cancel all pending notification timeouts
    Object.values(restTimeoutRefs.current).forEach(clearTimeout);
    restTimeoutRefs.current = {};
    setProgramId(null);
    setStartTime(null);
    setWorkoutPath(null);
    setSessionId(null);
    setRestTimerEnds({});
    setLastWorkoutPath(null);
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
        restTimerEnds,
        setRestTimerEnd,
        clearRestTimerEnd,
        lastWorkoutPath,
        updateLastWorkoutPath,
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
