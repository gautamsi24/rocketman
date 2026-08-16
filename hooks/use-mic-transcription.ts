"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

export type MicState = "idle" | "recording" | "transcribing";

function pickMimeType(): string {
  const candidates = ["audio/webm", "audio/mp4", "audio/ogg"];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

const emptySubscribe = () => () => {};

/**
 * Record -> transcribe -> hand the text to the caller. Extracted from
 * MicButton so the same mic capability can be wired into an input that isn't
 * inside a PromptInputProvider (e.g. Quick Check's plain textarea) -- the
 * caller decides where the transcript goes, this hook only owns the
 * MediaRecorder lifecycle and the /api/transcribe call.
 */
export function useMicTranscription(onTranscript: (transcript: string) => void) {
  const [state, setState] = useState<MicState>("idle");
  const supported = useSyncExternalStore(emptySubscribe, isSupported, () => false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const transcribe = useCallback(
    async (blob: Blob) => {
      setState("transcribing");
      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Transcription failed");
        const { transcript } = (await res.json()) as { transcript: string };
        if (transcript) onTranscript(transcript);
      } catch {
        // Non-fatal: user can retry or type instead.
      } finally {
        setState("idle");
      }
    },
    [onTranscript]
  );

  const startRecording = useCallback(async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return;
    }

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined
    );
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      for (const track of stream.getTracks()) track.stop();
      const blob = new Blob(chunksRef.current, {
        type: mimeType || "audio/webm",
      });
      if (blob.size > 0) void transcribe(blob);
      else setState("idle");
    };

    recorderRef.current = recorder;
    recorder.start();
    setState("recording");
  }, [transcribe]);

  const toggle = useCallback(() => {
    if (state === "recording") {
      recorderRef.current?.stop();
      return;
    }
    if (state === "idle") void startRecording();
  }, [state, startRecording]);

  return { state, supported, toggle };
}
