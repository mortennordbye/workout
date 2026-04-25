"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useToast } from "@/contexts/toast-context";
import { logWorkoutSet } from "@/lib/actions/workout-sets";
import { completeWorkoutSession } from "@/lib/actions/workout-sessions";

/**
 * Offline mutation queue.
 *
 * When a Server Action fails (no signal, server hiccup, transient 5xx),
 * the calling code can hand the mutation to this queue instead of dropping
 * it. The queue:
 *
 *   - persists to localStorage so a refresh during the offline window
 *     doesn't lose anything,
 *   - replays automatically on the next `online` event,
 *   - exposes a count so the UI can surface "you have N pending writes".
 *
 * Scope is deliberately narrow — only `logWorkoutSet` and
 * `completeWorkoutSession` participate. Profile / program edits etc. fail
 * loudly via the existing toast and are extremely unlikely to be done
 * while offline.
 *
 * Limitation: if the user closes the app while offline, in-memory replay
 * doesn't fire. localStorage still holds the queue, so reopening the app
 * (still offline or online) replays. If the user clears storage / goes to
 * a fresh device while still offline, queued mutations are lost. Toast
 * messaging makes this risk visible.
 */

type LogPayload = Parameters<typeof logWorkoutSet>[0];
type CompletePayload = Parameters<typeof completeWorkoutSession>[0];

type QueuedMutation =
  | { id: string; kind: "logWorkoutSet"; payload: LogPayload; queuedAt: number }
  | { id: string; kind: "completeWorkoutSession"; payload: CompletePayload; queuedAt: number };

const STORAGE_KEY = "pendingMutationQueue";

type PendingQueueContextValue = {
  count: number;
  enqueue: (mutation: Omit<QueuedMutation, "id" | "queuedAt">) => void;
  replayAll: () => Promise<void>;
};

const PendingQueueContext = createContext<PendingQueueContextValue | null>(null);

export function PendingQueueProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<QueuedMutation[]>([]);
  const replayingRef = useRef(false);
  const { showToast } = useToast();

  // Hydrate from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setQueue(JSON.parse(raw) as QueuedMutation[]);
      }
    } catch {
      // Corrupt storage — clear it and move on.
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Persist on every change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (queue.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }
  }, [queue]);

  const enqueue = useCallback(
    (mutation: Omit<QueuedMutation, "id" | "queuedAt">) => {
      const next: QueuedMutation = {
        ...(mutation as Omit<QueuedMutation, "id" | "queuedAt">),
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        queuedAt: Date.now(),
      } as QueuedMutation;
      setQueue((prev) => [...prev, next]);
    },
    [],
  );

  const replayAll = useCallback(async () => {
    if (replayingRef.current) return;
    replayingRef.current = true;
    try {
      // Snapshot the queue at start; new enqueues during replay stay for next pass.
      const snapshot = queue;
      if (snapshot.length === 0) return;

      const failed: QueuedMutation[] = [];
      for (const m of snapshot) {
        try {
          const result =
            m.kind === "logWorkoutSet"
              ? await logWorkoutSet(m.payload)
              : await completeWorkoutSession(m.payload);
          if (!result.success) failed.push(m);
        } catch {
          failed.push(m);
        }
      }

      // Drop the snapshot, keep failed ones + anything enqueued during replay.
      setQueue((prev) => {
        const stillFailing = new Set(failed.map((m) => m.id));
        const replayedIds = new Set(snapshot.map((m) => m.id));
        const carryForward = prev.filter(
          (m) => !replayedIds.has(m.id) || stillFailing.has(m.id),
        );
        return carryForward;
      });

      const succeeded = snapshot.length - failed.length;
      if (succeeded > 0) {
        showToast({
          message:
            succeeded === 1
              ? "Synced 1 pending set"
              : `Synced ${succeeded} pending sets`,
        });
      }
    } finally {
      replayingRef.current = false;
    }
  }, [queue, showToast]);

  // Replay on `online` and on mount if the network is up.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => void replayAll();
    window.addEventListener("online", handler);
    if (navigator.onLine) void replayAll();
    return () => {
      window.removeEventListener("online", handler);
    };
  }, [replayAll]);

  return (
    <PendingQueueContext.Provider value={{ count: queue.length, enqueue, replayAll }}>
      {children}
    </PendingQueueContext.Provider>
  );
}

export function usePendingQueue(): PendingQueueContextValue {
  const ctx = useContext(PendingQueueContext);
  if (!ctx) throw new Error("usePendingQueue must be used within PendingQueueProvider");
  return ctx;
}
