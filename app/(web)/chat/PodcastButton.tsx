"use client";

import { Loader2Icon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchPodcastAudioUrl } from "@/lib/client/podcast-audio";

type Status = "idle" | "loading" | "playing";

export function PodcastButton({ conceptId }: { conceptId: string | null }) {
  const [status, setStatus] = useState<Status>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const stop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setStatus("idle");
  };

  const play = async () => {
    if (!conceptId) return;
    if (status === "playing" || status === "loading") {
      stop();
      return;
    }

    setStatus("loading");
    try {
      const url = await fetchPodcastAudioUrl(conceptId);
      urlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = stop;

      await audio.play();
      setStatus("playing");
    } catch {
      stop();
    }
  };

  return (
    <Button variant="outline" onClick={play} disabled={!conceptId}>
      {status === "loading" ? (
        <Loader2Icon className="animate-spin" size={16} />
      ) : status === "playing" ? (
        <VolumeXIcon size={16} />
      ) : (
        <Volume2Icon size={16} />
      )}
      {status === "loading"
        ? "Generating podcast..."
        : status === "playing"
          ? "Stop podcast"
          : "Listen to podcast"}
    </Button>
  );
}
