"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface CurrentLearner {
  id: string;
  displayName: string;
}

export function useCurrentLearner({
  redirectToLogin = true,
}: { redirectToLogin?: boolean } = {}): {
  learner: CurrentLearner | null;
  loading: boolean;
} {
  const router = useRouter();
  const [learner, setLearner] = useState<CurrentLearner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) {
          if (redirectToLogin) router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data: { id: string; displayName: string } | null) => {
        if (data) setLearner(data);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { learner, loading };
}
