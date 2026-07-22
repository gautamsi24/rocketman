"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentLearner } from "@/hooks/use-current-learner";

export default function Home() {
  const router = useRouter();
  const { learner, loading } = useCurrentLearner();

  useEffect(() => {
    if (!loading && learner) {
      router.replace("/chat");
    }
  }, [loading, learner, router]);

  return null;
}
