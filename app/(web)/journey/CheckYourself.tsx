"use client";

import { useCallback, useState } from "react";
import { StandaloneMicButton } from "../chat/MicButton";
import { usePromptInputController } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { useResource } from "@/hooks/use-resource";
import { cn } from "@/lib/utils";

interface Verdict {
  correct: boolean;
  feedback: string;
  // false when this exact question was already answered before -- the verdict
  // still shows, but it did not change mastery.
  counted: boolean;
}

export function CheckYourself({
  conceptId,
  onExplore,
  onMasteryChanged,
}: {
  conceptId: string;
  // Called when the learner wants to leave the question and get help -- the
  // parent switches to the Chat tab for this topic.
  onExplore: () => void;
  // Called after a graded answer that actually counted, so the mission map can
  // refetch and reflect the moved mastery live.
  onMasteryChanged: () => void;
}) {
  const { data, loading, reload } = useResource<{
    question: string | null;
    questionId: string | null;
  }>(`/api/concepts/${conceptId}/check-question`);
  const question = data?.question ?? null;
  const questionId = data?.questionId ?? null;

  const promptInput = usePromptInputController();

  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "grading" | "done">("idle");
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  // Pull a fresh, generated question so the learner can keep practising -- each
  // distinct question is a new graded attempt toward completion.
  const nextQuestion = useCallback(() => {
    setAnswer("");
    setVerdict(null);
    setStatus("idle");
    reload();
  }, [reload]);

  const submit = useCallback(async () => {
    if (!answer.trim() || !questionId) return;
    setStatus("grading");
    try {
      const res = await fetch(`/api/concepts/${conceptId}/check-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, answer }),
      });
      if (!res.ok) throw new Error("grade failed");
      const graded = (await res.json()) as Verdict;
      setVerdict(graded);
      setStatus("done");
      // Only a counted attempt moved BKT -- a repeat answer returns counted:false
      // and leaves the map unchanged, so don't refetch for it.
      if (graded.counted) onMasteryChanged();
    } catch {
      setStatus("idle");
    }
  }, [answer, questionId, conceptId, onMasteryChanged]);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Generating a question...</p>
    );
  }

  if (!question) {
    return (
      <p className="text-sm text-muted-foreground">
        No check question is available for this topic yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border bg-card p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Check question
        </p>
        <p className="mt-1 text-sm">{question}</p>
        {status !== "done" ? (
          <div className="mt-3 flex gap-2 border-t pt-3">
            <Button
              className="flex-1"
              size="sm"
              variant="ghost"
              onClick={() => {
                promptInput.textInput.setInput(question);
                onExplore();
              }}
              disabled={status === "grading"}
            >
              Don&apos;t know — explore in chat
            </Button>
            <Button
              className="flex-1"
              size="sm"
              variant="ghost"
              onClick={nextQuestion}
              disabled={status === "grading"}
            >
              Skip
            </Button>
          </div>
        ) : null}
      </div>

      {/* Same InputGroup primitive the chat box uses, so the mic sits inside
          the same bordered box (bottom-right) instead of floating below it. */}
      <InputGroup>
        <InputGroupTextarea
          className="min-h-40 resize-y"
          placeholder="Answer in your own words..."
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          onKeyDown={(event) => {
            // Enter submits, Shift+Enter for a newline -- same contract as
            // the chat input. Respects IME composition so accepting a
            // composed character (e.g. CJK input) doesn't submit early.
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              if (answer.trim() && status === "idle") submit();
            }
          }}
          disabled={status !== "idle"}
        />
        <InputGroupAddon align="block-end" className="justify-end">
          <StandaloneMicButton
            disabled={status !== "idle"}
            onTranscript={(transcript) =>
              setAnswer((prev) => (prev.trim() ? `${prev} ${transcript}` : transcript))
            }
          />
        </InputGroupAddon>
      </InputGroup>

      {status === "done" && verdict ? (
        <div
          className={cn(
            "rounded-lg border p-3 text-sm",
            verdict.correct
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-amber-500/40 bg-amber-500/5"
          )}
        >
          <p
            className={cn(
              "font-medium",
              verdict.correct ? "text-emerald-600" : "text-amber-600"
            )}
          >
            {verdict.correct
              ? verdict.counted
                ? "Correct — that counted toward your mastery."
                : "Correct"
              : "Not quite"}
          </p>
          <p className="mt-1 text-muted-foreground">{verdict.feedback}</p>
          {!verdict.counted ? (
            <p className="mt-2 text-xs text-muted-foreground">
              You&apos;ve already answered this question before, so it didn&apos;t
              change your mastery.
            </p>
          ) : null}
        </div>
      ) : (
        <Button
          onClick={submit}
          disabled={!answer.trim() || status === "grading"}
        >
          {status === "grading" ? "Checking..." : "Submit answer"}
        </Button>
      )}

      {status === "done" ? (
        <Button variant="outline" onClick={nextQuestion}>
          Next question
        </Button>
      ) : null}
    </div>
  );
}
