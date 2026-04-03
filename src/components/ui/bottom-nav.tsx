"use client";

import { useWorkoutSession } from "@/contexts/workout-session-context";
import { Dumbbell, MoreHorizontal, RefreshCw, LayoutList } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const staticNavItems = [
  {
    label: "Workout",
    defaultHref: "/",
    icon: Dumbbell,
  },
  {
    label: "Cycles",
    href: "/cycles",
    icon: RefreshCw,
  },
  {
    label: "Programs",
    href: "/programs",
    icon: LayoutList,
  },
  {
    label: "More",
    href: "/more",
    icon: MoreHorizontal,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const workoutSession = useWorkoutSession();
  const workoutPath = workoutSession?.workoutPath ?? null;
  const lastWorkoutPath = workoutSession?.lastWorkoutPath ?? null;

  const isWorkoutRoute = pathname.includes("/workout");

  // Keep lastWorkoutPath in context up to date as the user navigates deeper
  useEffect(() => {
    if (isWorkoutRoute && workoutSession) {
      workoutSession.updateLastWorkoutPath(pathname);
    }
  }, [pathname, isWorkoutRoute, workoutSession]);

  const isActive = (label: string, href: string) => {
    if (label === "Workout") {
      return isWorkoutRoute || pathname === "/" || pathname.startsWith("/new-workout");
    }
    if (isWorkoutRoute) {
      return false; // on workout routes only the Workout tab is active
    }
    if (href === "/more") {
      return (
        pathname.startsWith("/more") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/history") ||
        pathname.startsWith("/exercises")
      );
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {staticNavItems.map((item) => {
          const Icon = item.icon;
          const href = item.label === "Workout"
            ? (lastWorkoutPath ?? workoutPath ?? "/")
            : (item.href ?? "/");
          const active = isActive(item.label, href);
          const showDot = item.label === "Workout" && workoutPath !== null;

          return (
            <Link
              key={item.label}
              href={href}
              suppressHydrationWarning
              className={`
                flex flex-col items-center justify-center gap-1 flex-1 h-full
                transition-colors
                ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {showDot && (
                  <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 bg-primary rounded-full" />
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
