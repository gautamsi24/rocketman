"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  FrqAttemptResult,
  FrqSetQuestion,
  FrqScoredPoint,
} from "@/lib/curriculum/frq";
import { cn } from "@/lib/utils";

interface Verdict {
  awardedPoints: number;
  maxPoints: number;
  correct: boolean;
  points: FrqScoredPoint[];
  // Overall feedback is only returned on a fresh grade; a rehydrated prior
  // attempt shows the per-point breakdown without it.
  feedback: string | null;
}

function attemptToVerdict(question: FrqSetQuestion): Verdict | null {
  if (!question.attempt) return null;
  return {
    awardedPoints: question.attempt.awardedPoints,
    maxPoints: question.attempt.maxPoints,
    correct: question.attempt.correct,
    points: question.attempt.points,
    feedback: null,
  };
}

export function FrqQuestion({
  question,
  onGraded,
}: {
  question: FrqSetQuestion;
  onGraded: (questionId: string, attempt: FrqAttemptResult) => void;
}) {
  const initialVerdict = attemptToVerdict(question);
  const [answer, setAnswer] = useState(question.attempt?.answerText ?? "");
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "graded">(
    initialVerdict ? "graded" : "idle"
  );
  const [verdict, setVerdict] = useState<Verdict | null>(initialVerdict);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Mirrors imageUrl for the unmount-cleanup effect below, which needs the
  // latest value in a stable closure without re-subscribing on every change.
  const imageUrlRef = useRef<string | null>(null);

  const onPickImage = useCallback((file: File | null) => {
    setImage(file);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      const next = file ? URL.createObjectURL(file) : null;
      imageUrlRef.current = next;
      return next;
    });
  }, []);

  // The picked-image preview is a blob: URL -- revoke it on unmount (e.g.
  // "New set" remounts every question via key={question.id}), not just when
  // replaced by a different picked image.
  useEffect(() => {
    return () => {
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    };
  }, []);

  const submit = useCallback(async () => {
    if (status === "submitting") return;
    if (!answer.trim() && !image) return;
    setStatus("submitting");
    setError(null);
    try {
      const form = new FormData();
      form.set("answerText", answer);
      if (image) form.set("image", image);
      const res = await fetch(`/api/frq/${question.id}/submit`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Grading failed");
      }
      const graded = (await res.json()) as Verdict & { counted: boolean };
      setVerdict(graded);
      setStatus("graded");
      if (graded.counted) {
        onGraded(question.id, {
          awardedPoints: graded.awardedPoints,
          maxPoints: graded.maxPoints,
          correct: graded.correct,
          points: graded.points,
          answerText: answer || null,
          hasImage: !!image,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Grading failed");
      setStatus("idle");
    }
  }, [answer, image, question.id, status, onGraded]);

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

      {status === "graded" && verdict ? (
        <GradedView verdict={verdict} showedImage={question.attempt?.hasImage} />
      ) : (
        <div className="flex flex-col gap-3">
          <textarea
            className="min-h-32 w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
            placeholder="Write your response..."
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            disabled={status === "submitting"}
          />

          {question.requiresDiagram ? (
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  onPickImage(event.target.files?.[0] ?? null)
                }
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={status === "submitting"}
                >
                  {image ? "Change photo" : "Upload photo of your graph/diagram"}
                </Button>
                {image ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {image.name}
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

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            onClick={submit}
            disabled={
              status === "submitting" ||
              (!answer.trim() && !image) ||
              (question.requiresDiagram && !image)
            }
          >
            {status === "submitting" ? "Grading..." : "Submit answer"}
          </Button>
          {question.requiresDiagram && !image ? (
            <p className="text-xs text-muted-foreground">
              This question needs a photo of your graph or diagram to grade.
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
}: {
  verdict: Verdict;
  showedImage?: boolean;
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
    </div>
  );
}
