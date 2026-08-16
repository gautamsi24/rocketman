"use client";

import { Loader2Icon, MicIcon, SquareIcon } from "lucide-react";
import {
  PromptInputButton,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { useMicTranscription } from "@/hooks/use-mic-transcription";

function MicIndicator({
  state,
}: {
  state: "idle" | "recording" | "transcribing";
}) {
  if (state === "recording") return <SquareIcon className="size-4" />;
  if (state === "transcribing")
    return <Loader2Icon className="size-4 animate-spin" />;
  return <MicIcon className="size-4" />;
}

function micLabel(state: "idle" | "recording" | "transcribing"): string {
  if (state === "recording") return "Stop recording";
  if (state === "transcribing") return "Transcribing";
  return "Speak";
}

export function MicButton({ disabled }: { disabled?: boolean }) {
  const controller = usePromptInputController();
  const { state, supported, toggle } = useMicTranscription((transcript) => {
    const current = controller.textInput.value.trim();
    controller.textInput.setInput(
      current ? `${current} ${transcript}` : transcript
    );
  });

  if (!supported) return null;

  const label = micLabel(state);

  return (
    <PromptInputButton
      aria-label={label}
      disabled={disabled || state === "transcribing"}
      onClick={toggle}
      tooltip={label}
      variant={state === "recording" ? "default" : "ghost"}
    >
      <MicIndicator state={state} />
    </PromptInputButton>
  );
}

/**
 * Same mic capability as MicButton, but for an input that isn't inside a
 * PromptInputProvider (e.g. Quick Check's plain textarea) -- the caller
 * supplies onTranscript directly instead of this button reaching into
 * shared prompt-input context.
 */
export function StandaloneMicButton({
  disabled,
  onTranscript,
}: {
  disabled?: boolean;
  onTranscript: (transcript: string) => void;
}) {
  const { state, supported, toggle } = useMicTranscription(onTranscript);

  if (!supported) return null;

  const label = micLabel(state);

  return (
    <PromptInputButton
      aria-label={label}
      disabled={disabled || state === "transcribing"}
      onClick={toggle}
      tooltip={label}
      variant={state === "recording" ? "default" : "ghost"}
    >
      <MicIndicator state={state} />
    </PromptInputButton>
  );
}
