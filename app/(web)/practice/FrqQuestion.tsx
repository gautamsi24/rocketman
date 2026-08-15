"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Streamdown } from "streamdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FrqSetQuestion, FrqScoredPoint } from "@/lib/curriculum/frq";
import { cn } from "@/lib/utils";

export interface DraftAnswer {
  text: string;
  image: File | null;
}

interface Verdict {
  awardedPoints: number;
  maxPoints: number;
  correct: boolean;
  points: FrqScoredPoint[];
  feedback: string | null;
}

function attemptToVerdict(question: FrqSetQuestion): Verdict | null {
  if (!question.attempt) return null;
  return {
    awardedPoints: question.attempt.awardedPoints,
    maxPoints: question.attempt.maxPoints,
    correct: question.attempt.correct,
    points: question.attempt.points,
    feedback: question.attempt.feedback,
  };
}

export function FrqQuestion({
  question,
  value,
  onChange,
  disabled,
  failed,
}: {
  question: FrqSetQuestion;
  // Controlled from PracticeExperience -- all 6 questions' drafts are held
  // together so a single "Submit all" can send them in one request.
  value: DraftAnswer;
  onChange: (value: DraftAnswer) => void;
  // True while the batch grade request is in flight.
  disabled: boolean;
  // True if this question came back in the last batch response's
  // failedQuestionIds -- still ungraded, but not because it was left blank.
  failed: boolean;
}) {
  const verdict = attemptToVerdict(question);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The picked-image preview is a blob: URL, derived from the (parent-owned)
  // File -- recomputed whenever the File changes. Revocation is a pure side
  // effect (no state to set), so it lives in its own cleanup-only effect:
  // fires on the next url change and on unmount (e.g. "New set" remounts
  // every question via key={question.id}).
  const imageUrl = useMemo(
    () => (value.image ? URL.createObjectURL(value.image) : null),
    [value.image]
  );
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const saveDraft = (text: string) => {
    fetch(`/api/frq/${question.id}/draft`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerText: text }),
    }).catch(() => {
      // Best-effort: the learner's still-visible local text is the source of
      // truth for this session; a failed autosave just means a reload would
      // lose it, not that anything already submitted is at risk.
    });
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Question {question.position}</span>
        <Badge variant="secondary">
          {question.kind === "long" ? "Long response" : "Short response"}
        </Badge>
        <Badge variant="outline" className="capitalize">
          {question.taskWord}
        </Badge>
        {question.requiresDiagram ? (
          <Badge variant="outline">Diagram / graph</Badge>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {question.maxPoints} pt{question.maxPoints === 1 ? "" : "s"}
        </span>
      </div>

      {question.stimulus ? (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <Streamdown>{question.stimulus}</Streamdown>
        </div>
      ) : null}

      <p className="text-sm font-medium">{question.prompt}</p>

      {verdict ? (
        <GradedView
          verdict={verdict}
          showedImage={question.attempt?.hasImage}
          tutorNotes={question.tutorNotes}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <textarea
            className="min-h-32 w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
            placeholder="Write your response..."
            value={value.text}
            onChange={(event) => onChange({ ...value, text: event.target.value })}
            onBlur={(event) => saveDraft(event.target.value)}
            disabled={disabled}
          />

          {question.requiresDiagram ? (
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  onChange({ ...value, image: event.target.files?.[0] ?? null })
                }
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                >
                  {value.image ? "Change photo" : "Upload photo of your graph/diagram"}
                </Button>
                {value.image ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {value.image.name}
                  </span>
                ) : null}
              </div>
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Your uploaded diagram"
                  className="max-h-56 w-fit rounded-lg border object-contain"
                />
              ) : null}
            </div>
          ) : null}

          {question.requiresDiagram && !value.image ? (
            <p className="text-xs text-muted-foreground">
              A photo of your graph or diagram helps but isn&apos;t required --
              describing it in words works too.
            </p>
          ) : null}

          {failed ? (
            <p className="text-sm text-destructive">
              Couldn&apos;t grade this one -- your answer is still here, try
              submitting again.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function GradedView({
  verdict,
  showedImage,
  tutorNotes,
}: {
  verdict: Verdict;
  showedImage?: boolean;
  tutorNotes: FrqSetQuestion["tutorNotes"];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Badge variant={verdict.correct ? "default" : "destructive"}>
          {verdict.awardedPoints}/{verdict.maxPoints} points
        </Badge>
        {showedImage ? (
          <span className="text-xs text-muted-foreground">Diagram submitted</span>
        ) : null}
      </div>

      <ul className="flex flex-col gap-2">
        {verdict.points.map((point) => (
          <li key={point.code} className="flex gap-2 text-sm">
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                point.awarded
                  ? "bg-emerald-500/15 text-emerald-600"
                  : "bg-amber-500/15 text-amber-600"
              )}
            >
              {point.awarded ? (
                <CheckIcon className="size-3" />
              ) : (
                <XIcon className="size-3" />
              )}
            </span>
            <span className="flex flex-1 flex-col">
              <span>
                {point.text}
                <span className="ml-1 whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                  ({point.awarded ? point.points : 0}/{point.points} pt
                  {point.points === 1 ? "" : "s"})
                </span>
              </span>
              {point.note ? (
                <span className="text-xs text-muted-foreground">{point.note}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {verdict.feedback ? (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          {verdict.feedback}
        </p>
      ) : null}

      {tutorNotes.length > 0 ? (
        <div className="flex flex-col gap-2">
          {tutorNotes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                From your tutor
              </p>
              <p className="mt-1 text-muted-foreground">{note.noteText}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
