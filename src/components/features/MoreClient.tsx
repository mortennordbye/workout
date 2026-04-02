"use client";

import { CalendarDays, ChevronRight, Clock, Library, Settings, Terminal } from "lucide-react";
import Link from "next/link";

const moreItems = [
  {
    label: "Calendar",
    href: "/more/calendar",
    icon: CalendarDays,
    description: "Visualise your training cycles",
  },
  {
    label: "Exercises",
    href: "/exercises",
    icon: Library,
    description: "Browse and manage exercises",
  },
  {
    label: "History",
    href: "/history",
    icon: Clock,
    description: "All your workouts",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Appearance and preferences",
  },
  {
    label: "Developer Tools",
    href: "/more/admin",
    icon: Terminal,
    description: "Seed and reset test data",
  },
];

export function MoreClient() {
  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      <header className="flex-none px-4 py-4 border-b border-border">
        <h1 className="text-xl font-semibold">More</h1>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="divide-y divide-border">
          {moreItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-4 px-4 min-h-[56px] active:bg-muted/50 transition-colors"
              >
                <Icon className="w-5 h-5 text-muted-foreground flex-none" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.label}</div>
                  {item.description && (
                    <div className="text-sm text-muted-foreground">
                      {item.description}
                    </div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-none" />
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
