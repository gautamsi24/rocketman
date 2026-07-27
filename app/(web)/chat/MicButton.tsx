"use client";

import { Loader2Icon, MicIcon, SquareIcon } from "lucide-react";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import {
  PromptInputButton,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";

type RecorderState = "idle" | "recording" | "transcribing";

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

export function MicButton({ disabled }: { disabled?: boolean }) {
  const controller = usePromptInputController();
  const [state, setState] = useState<RecorderState>("idle");
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
        if (transcript) {
          const current = controller.textInput.value.trim();
          controller.textInput.setInput(
            current ? `${current} ${transcript}` : transcript
          );
        }
      } catch {
        // Non-fatal: user can retry or type instead.
      } finally {
        setState("idle");
      }
    },
    [controller]
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

  if (!supported) return null;

  const label =
    state === "recording"
      ? "Stop recording"
      : state === "transcribing"
        ? "Transcribing"
        : "Speak";

  return (
    <PromptInputButton
      aria-label={label}
      disabled={disabled || state === "transcribing"}
      onClick={toggle}
      tooltip={label}
      variant={state === "recording" ? "default" : "ghost"}
    >
      {state === "recording" ? (
        <SquareIcon className="size-4" />
      ) : state === "transcribing" ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <MicIcon className="size-4" />
      )}
    </PromptInputButton>
  );
}
