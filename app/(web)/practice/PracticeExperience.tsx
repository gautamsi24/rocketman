"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FrqQuestion, type DraftAnswer } from "./FrqQuestion";
import { Button } from "@/components/ui/button";
import { TASK_WORD_LIST } from "@/lib/curriculum/frq-task-words";
import type { FrqSet } from "@/lib/curriculum/frq";

function seedAnswers(set: FrqSet | null): Record<string, DraftAnswer> {
  const seed: Record<string, DraftAnswer> = {};
  if (!set) return seed;
  for (const q of set.questions) {
    if (!q.attempt) seed[q.id] = { text: q.draftAnswerText ?? "", image: null };
  }
  return seed;
}

export function PracticeExperience({ initialSet }: { initialSet: FrqSet | null }) {
  const [set, setSet] = useState<FrqSet | null>(initialSet);
  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>(() =>
    seedAnswers(initialSet)
  );
  const [failedQuestionIds, setFailedQuestionIds] = useState<Set<string>>(
    new Set()
  );
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoGenRef = useRef(false);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/frq/new", { method: "POST" });
      if (!res.ok) throw new Error("Could not generate a practice set");
      const { set: next } = (await res.json()) as { set: FrqSet };
      setSet(next);
      setAnswers(seedAnswers(next));
      setFailedQuestionIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a set");
    } finally {
      setGenerating(false);
    }
  }, []);

  // Auto-generate the first set when the learner has none, or their latest set
  // is fully answered (no pending questions left to do). Guarded so it fires
  // once, not on every render.
  const noPending = !set || set.questions.every((q) => q.attempt !== null);
  useEffect(() => {
    if (noPending && !generating && !autoGenRef.current) {
      autoGenRef.current = true;
      void generate();
    }
  }, [noPending, generating, generate]);

  const updateAnswer = useCallback((questionId: string, value: DraftAnswer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const hasAnyDraft = useMemo(
    () =>
      Object.values(answers).some(
        (a) => a.text.trim().length > 0 || a.image !== null
      ),
    [answers]
  );

  const submitAll = useCallback(async () => {
    if (!set || submitting || !hasAnyDraft) return;
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      for (const question of set.questions) {
        if (question.attempt) continue;
        const draft = answers[question.id];
        if (!draft) continue;
        if (draft.text.trim()) form.set(`answerText_${question.id}`, draft.text);
        if (draft.image) form.set(`image_${question.id}`, draft.image);
      }

      const res = await fetch(`/api/frq/sets/${set.setId}/submit`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("Could not grade your answers");
      const { set: nextSet, failedQuestionIds: failed } = (await res.json()) as {
        set: FrqSet;
        failedQuestionIds: string[];
      };
      setSet(nextSet);
      setAnswers(seedAnswers(nextSet));
      setFailedQuestionIds(new Set(failed));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not grade your answers");
    } finally {
      setSubmitting(false);
    }
  }, [set, answers, submitting, hasAnyDraft]);

  const pct =
    set && set.summary.total > 0
      ? Math.round((set.summary.answered / set.summary.total) * 100)
      : 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Practice FRQs</h1>
            <p className="text-sm text-muted-foreground">
              Fresh free-response questions targeting your weaker topics --
              answer as many as you can, then submit the whole set to be
              graded at once, the way the real exam works.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generate}
            disabled={generating || submitting}
          >
            {generating ? "Generating..." : "New set"}
          </Button>
        </div>

        {set ? (
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">
              {set.summary.answered}/{set.summary.total} graded
              {set.summary.answered > 0
                ? ` · ${set.summary.pointsAwarded}/${set.summary.pointsPossible} pts`
                : ""}
            </span>
          </div>
        ) : null}

        <details className="rounded-lg border bg-card p-3 text-sm">
          <summary className="cursor-pointer font-medium">
            Task words — Hits &amp; Misses
          </summary>
          <p className="mt-2 text-muted-foreground">
            Every prompt opens with a task word. It sets the minimum kind of
            answer the point requires — writing the wrong kind costs the point.
          </p>
          <div className="mt-3 flex flex-col divide-y">
            {TASK_WORD_LIST.map((guide) => (
              <div key={guide.word} className="grid grid-cols-[5rem_1fr] gap-2 py-2">
                <span className="font-medium">{guide.word}</span>
                <span className="flex flex-col gap-1">
                  <span>
                    <span className="text-emerald-600">Hit — </span>
                    {guide.hit}
                  </span>
                  <span className="text-muted-foreground">
                    <span className="text-amber-600">Miss — </span>
                    {guide.miss}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </details>
      </header>

      {error ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="text-destructive">{error}</p>
          <Button size="sm" variant="outline" onClick={generate}>
            Try again
          </Button>
        </div>
      ) : null}

      {generating && !set ? (
        <p className="text-sm text-muted-foreground">
          Generating your practice set — grounding questions in your weaker
          topics...
        </p>
      ) : null}

      {set ? (
        <div className="flex flex-col gap-6">
          {set.questions.map((question) => (
            <FrqQuestion
              key={question.id}
              question={question}
              value={answers[question.id] ?? { text: "", image: null }}
              onChange={(value) => updateAnswer(question.id, value)}
              disabled={submitting}
              failed={failedQuestionIds.has(question.id)}
            />
          ))}

          {!noPending ? (
            <div className="flex flex-col items-start gap-2">
              <Button onClick={submitAll} disabled={submitting || !hasAnyDraft}>
                {submitting ? "Grading your answers..." : "Submit all answers"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Only the questions you&apos;ve answered get graded -- leave the
                rest for later and submit again when you&apos;re ready.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
