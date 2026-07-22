"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Header() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
      <span className="text-lg font-semibold">RocketMan</span>
      <Button variant="ghost" onClick={logout} disabled={loggingOut}>
        Log out
      </Button>
    </header>
  );
}
