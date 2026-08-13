"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface PodcastPlaybackContextValue {
  isPlaying: boolean;
  /** Register the currently-playing player's stop fn, or null when it stops. */
  setActive: (stop: (() => void) | null) => void;
  /** Stop whatever is playing right now. */
  stopActive: () => void;
  /**
   * Guard for navigation: returns true if it's OK to leave. If a podcast is
   * playing, warns first and stops it on confirm; returns false to cancel.
   */
  confirmNavigation: () => boolean;
}

const PodcastPlaybackContext =
  createContext<PodcastPlaybackContextValue | null>(null);

export function usePodcastPlayback(): PodcastPlaybackContextValue {
  const ctx = useContext(PodcastPlaybackContext);
  if (!ctx) {
    throw new Error(
      "usePodcastPlayback must be used within a PodcastPlaybackProvider"
    );
  }
  return ctx;
}

export function PodcastPlaybackProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  const setActive = useCallback((stop: (() => void) | null) => {
    stopRef.current = stop;
    setIsPlaying(stop !== null);
  }, []);

  const stopActive = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setIsPlaying(false);
  }, []);

  const confirmNavigation = useCallback(() => {
    if (!stopRef.current) return true;
    const leave = window.confirm(
      "A podcast is still playing. Leave this page and stop it?"
    );
    if (leave) stopActive();
    return leave;
  }, [stopActive]);

  // Warn on hard navigation (refresh, tab close, external link) while playing.
  useEffect(() => {
    if (!isPlaying) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isPlaying]);

  return (
    <PodcastPlaybackContext.Provider
      value={{ isPlaying, setActive, stopActive, confirmNavigation }}
    >
      {children}
    </PodcastPlaybackContext.Provider>
  );
}
