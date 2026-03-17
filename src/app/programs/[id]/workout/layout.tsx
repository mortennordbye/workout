"use client";
import { WorkoutSessionProvider } from "@/contexts/workout-session-context";

export default function WorkoutLayout({ children }: { children: React.ReactNode }) {
  return <WorkoutSessionProvider>{children}</WorkoutSessionProvider>;
}
