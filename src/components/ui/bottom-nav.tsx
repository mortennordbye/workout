"use client";

import { Dumbbell, Library, ListChecks, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Workout",
    href: "/",
    icon: Dumbbell,
  },
  {
    label: "Programs",
    href: "/programs",
    icon: ListChecks,
  },
  {
    label: "Exercises",
    href: "/exercises",
    icon: Library,
  },
  {
    label: "More",
    href: "/more",
    icon: MoreHorizontal,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  const isWorkoutRoute = pathname.includes("/workout");

  const isActive = (href: string) => {
    if (isWorkoutRoute) {
      return href === "/";
    }
    if (href === "/") {
      return pathname === "/";
    }
    if (href === "/more") {
      return pathname.startsWith("/more") || pathname.startsWith("/settings");
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
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
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
