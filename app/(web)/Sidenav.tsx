"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePodcastPlayback } from "./PodcastPlaybackProvider";
import { cn } from "@/lib/utils";

type Role = "learner" | "tutor" | "evaluator";

const LEARNER_NAV = [
  { href: "/journey", label: "Mission map" },
  { href: "/profile", label: "My progress" },
];

const TUTOR_NAV = [{ href: "/tutor", label: "Students" }];

export function Sidenav({ role }: { role: Role }) {
  const pathname = usePathname();
  const { confirmNavigation } = usePodcastPlayback();
  const navItems = role === "tutor" ? TUTOR_NAV : LEARNER_NAV;

  return (
    <nav className="flex w-48 shrink-0 flex-col gap-1 border-r p-3">
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onNavigate={(event) => {
              if (!confirmNavigation()) event.preventDefault();
            }}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-secondary font-medium text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
