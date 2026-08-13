"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FrqQuestion } from "./FrqQuestion";
import { Button } from "@/components/ui/button";
import { TASK_WORD_LIST } from "@/lib/curriculum/frq-task-words";
import type { FrqSet } from "@/lib/curriculum/frq";

export function PracticeExperience({ initialSet }: { initialSet: FrqSet | null }) {
  const [set, setSet] = useState<FrqSet | null>(initialSet);
  // Points earned per graded question this session, seeded from the loaded set
  // and extended as the learner answers -- drives the live progress header.
  const [earned, setEarned] = useState<Record<string, number>>(() =>
    seedEarned(initialSet)
  );
  const [generating, setGenerating] = useState(false);
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
      setEarned(seedEarned(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a set");
    } finally {
      setGenerating(false);
    }
  }, []);

  // Auto-generate the first set when the learner has none, or their latest set
  // is fully answered (no pending questions left to do). Guarded so it fires
  // once, not on every render.
  const noPending =
    !set || set.questions.every((q) => q.attempt !== null);
  useEffect(() => {
    if (noPending && !generating && !autoGenRef.current) {
      autoGenRef.current = true;
      void generate();
    }
  }, [noPending, generating, generate]);

  const handleGraded = useCallback((questionId: string, awarded: number) => {
    setEarned((prev) => ({ ...prev, [questionId]: awarded }));
  }, []);

  const progress = useMemo(() => {
    if (!set) return { answered: 0, total: 0, pointsAwarded: 0, pointsPossible: 0 };
    const answeredIds = Object.keys(earned);
    return {
      answered: answeredIds.length,
      total: set.questions.length,
      pointsAwarded: answeredIds.reduce((sum, id) => sum + earned[id], 0),
      pointsPossible: set.questions
        .filter((q) => earned[q.id] !== undefined)
        .reduce((sum, q) => sum + q.maxPoints, 0),
    };
  }, [earned, set]);

  const pct =
    progress.total > 0 ? Math.round((progress.answered / progress.total) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Practice FRQs</h1>
            <p className="text-sm text-muted-foreground">
              Fresh free-response questions targeting your weaker topics, graded
              point by point against the rubric — the way the real exam is marked.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generate}
            disabled={generating}
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
              {progress.answered}/{progress.total} answered
              {progress.answered > 0
                ? ` · ${progress.pointsAwarded}/${progress.pointsPossible} pts`
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
              onGraded={handleGraded}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function seedEarned(set: FrqSet | null): Record<string, number> {
  const seed: Record<string, number> = {};
  if (!set) return seed;
  for (const q of set.questions) {
    if (q.attempt) seed[q.id] = q.attempt.awardedPoints;
  }
  return seed;
}
