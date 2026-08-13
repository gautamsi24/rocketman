"use client";

import { useCallback, useEffect, useState } from "react";

export interface Resource<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

/**
 * Fetches JSON from `url` on mount and on `reload()`. Pass `null` to defer
 * fetching (e.g. until the learner is known) -- it stays in the loading state
 * until a real url is provided. Always catches, so a network failure surfaces
 * as `error` rather than a hung loading state.
 */
export function useResource<T>(url: string | null): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Only async (post-fetch) setState here, so the mount effect below never
  // sets state synchronously in its body (react-hooks/set-state-in-effect).
  const runFetch = useCallback(() => {
    if (!url) return;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${url}`);
        return res.json();
      })
      .then((value: T) => {
        setData(value);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [url]);

  // Manual retry runs from an event handler, so resetting state here is fine.
  const reload = useCallback(() => {
    setError(false);
    setLoading(true);
    runFetch();
  }, [runFetch]);

  useEffect(() => {
    runFetch();
  }, [runFetch]);

  return { data, loading, error, reload };
}
