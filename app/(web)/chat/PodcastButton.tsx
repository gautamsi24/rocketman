"use client";

import { Loader2Icon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchPodcastAudioUrl } from "@/lib/client/podcast-audio";
import { usePodcastPlayback } from "../PodcastPlaybackProvider";

type Status = "idle" | "loading" | "playing";

export function PodcastButton({
  conceptId,
  onStart,
  onCompleted,
  size,
}: {
  conceptId: string | null;
  // Fired once, right when playback actually begins (not on the
  // stop-toggle path) -- lets a caller outside the panel (e.g. a topic card
  // in the mission map) select/open the topic at the moment it starts
  // playing, without the button needing to know anything about selection.
  onStart?: () => void;
  onCompleted?: () => void;
  size?: "default" | "sm";
}) {
  const [status, setStatus] = useState<Status>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const { setActive } = usePodcastPlayback();

  // Pause + release the audio without touching React state, so it's safe to
  // call from unmount cleanup.
  const teardownAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    teardownAudio();
    setActive(null);
    setStatus("idle");
  }, [teardownAudio, setActive]);

  // Stop any playing audio when the button leaves the screen (route change,
  // topic switch) so a podcast never keeps playing after you've moved on.
  useEffect(
    () => () => {
      teardownAudio();
      setActive(null);
    },
    [teardownAudio, setActive]
  );

  const play = async () => {
    if (!conceptId) return;
    if (status === "playing" || status === "loading") {
      stop();
      return;
    }

    onStart?.();
    setStatus("loading");
    try {
      const url = await fetchPodcastAudioUrl(conceptId);
      urlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      // Fires only on natural completion (not on manual stop), so we can prompt
      // the learner to answer a check question right after they've listened.
      audio.onended = () => {
        stop();
        onCompleted?.();
      };

      await audio.play();
      setStatus("playing");
      setActive(stop);
    } catch {
      stop();
    }
  };

  return (
    <Button
      variant="outline"
      size={size}
      onClick={play}
      disabled={!conceptId}
      aria-label={
        status === "loading"
          ? "Generating podcast"
          : status === "playing"
            ? "Stop podcast"
            : "Podcast"
      }
    >
      {status === "loading" ? (
        <Loader2Icon className="animate-spin" size={16} />
      ) : status === "playing" ? (
        <VolumeXIcon size={16} />
      ) : (
        <Volume2Icon size={16} />
      )}
      Podcast
    </Button>
  );
}
