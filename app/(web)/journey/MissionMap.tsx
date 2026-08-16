"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LockIcon,
  PlayIcon,
  RocketIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PodcastButton } from "../chat/PodcastButton";
import { Button } from "@/components/ui/button";
import { masteryToSequentialColor } from "@/lib/client/palette";
import type { JourneyNode, JourneyResponse } from "@/lib/journey/types";
import { cn } from "@/lib/utils";

function ringFraction(node: JourneyNode): number {
  return node.attempts > 0 ? node.masteryProb : 0;
}

function MasteryRing({ node, locked }: { node: JourneyNode; locked: boolean }) {
  const fraction = ringFraction(node);
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - fraction);
  const color = locked ? "currentColor" : masteryToSequentialColor(node.masteryProb);

  return (
    <div
      className={cn(
        "relative flex size-11 shrink-0 items-center justify-center",
        locked && "text-muted-foreground"
      )}
    >
      <svg className="absolute inset-0" viewBox="0 0 44 44">
        <circle
          className="text-muted-foreground/20"
          cx="22"
          cy="22"
          fill="none"
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
        />
        {fraction > 0 && (
          <circle
            cx="22"
            cy="22"
            fill="none"
            r={radius}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth="4"
            transform="rotate(-90 22 22)"
          />
        )}
      </svg>
      {node.status === "mastered" ? (
        <CheckIcon className="size-5" style={{ color }} />
      ) : locked ? (
        <LockIcon className="size-4" />
      ) : node.status === "in_progress" ? (
        <RocketIcon className="size-4 text-foreground" />
      ) : (
        <PlayIcon className="size-4 text-muted-foreground" />
      )}
    </div>
  );
}

function statusText(node: JourneyNode): string {
  switch (node.status) {
    case "mastered":
      return "Mastered";
    case "in_progress":
      return `${Math.round(node.masteryProb * 100)}% · keep going`;
    case "locked":
      return `Builds on ${node.blockedBy.join(", ")}`;
    default:
      return "Start";
  }
}

function MapNode({
  node,
  selected,
  onSelect,
  onPodcastCompleted,
}: {
  node: JourneyNode;
  selected: boolean;
  onSelect: (node: JourneyNode) => void;
  onPodcastCompleted?: () => void;
}) {
  // Once actively open (selected), a locked topic reads as enabled -- a
  // learner who "Continue anyway"-ed into it gets the full topic (podcast,
  // normal ring/text color), not something that still looks disabled. Only
  // the display treats it this way; the underlying mastery-based lock (what
  // actually gates auto-unlock) is untouched.
  const effectiveLocked = node.status === "locked" && !selected;

  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 rounded-xl border bg-card p-3 transition-colors",
        effectiveLocked && "opacity-70",
        selected && "border-primary bg-accent ring-1 ring-primary"
      )}
    >
      <button
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={() => onSelect(node)}
        type="button"
      >
        <MasteryRing node={node} locked={effectiveLocked} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-medium",
              effectiveLocked && "text-muted-foreground"
            )}
          >
            {node.label}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {statusText(node)}
          </p>
        </div>
      </button>
      {/* Starting the podcast also opens this topic, so "finish listening ->
          jump to a check question" still works even though the button lives
          on the map, not the panel. */}
      {!effectiveLocked ? (
        <PodcastButton
          conceptId={node.conceptId}
          size="sm"
          onStart={() => onSelect(node)}
          onCompleted={onPodcastCompleted}
        />
      ) : null}
    </div>
  );
}

export function MissionMap({
  journey,
  selectedConceptId,
  onSelectConcept,
  onPodcastCompleted,
}: {
  journey: JourneyResponse;
  selectedConceptId: string | null;
  onSelectConcept: (conceptId: string) => void;
  onPodcastCompleted?: () => void;
}) {
  const [pending, setPending] = useState<JourneyNode | null>(null);

  // Escape-to-close parity with the shared Dialog primitive this replaced.
  useEffect(() => {
    if (!pending) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPending(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pending]);

  const [toggledUnits, setToggledUnits] = useState<Set<string>>(
    () => new Set(journey.units[0] ? [journey.units[0].unitLabel] : [])
  );

  // Whichever unit holds the current selection is always visible -- so
  // switching topics (e.g. via the tutor's switch_concept tool) never leaves
  // the selection hidden inside a collapsed unit. This is a derived check
  // (unit label === the selected node's unit), not stored state, so the
  // selected unit can't be toggled closed while it's the active selection --
  // a deliberate constraint, not a bug: your current topic is always visible.
  const selectedUnitLabel = journey.units.find((u) =>
    u.nodes.some((n) => n.conceptId === selectedConceptId)
  )?.unitLabel;

  const isExpanded = (unitLabel: string) =>
    toggledUnits.has(unitLabel) || unitLabel === selectedUnitLabel;

  const toggleUnit = (unitLabel: string) => {
    setToggledUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitLabel)) next.delete(unitLabel);
      else next.add(unitLabel);
      return next;
    });
  };

  const handleNode = (node: JourneyNode) => {
    // Once a locked topic is already open (via "Continue anyway"), treat it
    // as enabled -- re-clicking it (or its now-visible Podcast button)
    // shouldn't re-prompt the same dialog every time.
    if (node.status === "locked" && node.conceptId !== selectedConceptId) {
      setPending(node);
      return;
    }
    onSelectConcept(node.conceptId);
  };

  const overall =
    journey.contentTotal > 0
      ? Math.round((journey.contentMastered / journey.contentTotal) * 100)
      : 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <RocketIcon className="size-6 text-primary" />
          <h1 className="text-xl font-semibold">Your mission</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${overall}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">
            {journey.contentMastered}/{journey.contentTotal} topics
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {journey.units.map((unit) => {
          const expanded = isExpanded(unit.unitLabel);
          return (
            <section key={unit.unitLabel} className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => toggleUnit(unit.unitLabel)}
                className="flex items-center justify-between gap-2 text-left"
                aria-expanded={expanded}
              >
                <span className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {expanded ? (
                    <ChevronDownIcon className="size-4" />
                  ) : (
                    <ChevronRightIcon className="size-4" />
                  )}
                  {unit.unitLabel}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {unit.masteredCount}/{unit.totalCount}
                </span>
              </button>
              {expanded ? (
                <div className="flex flex-col gap-2 border-l-2 border-dashed border-muted pl-4">
                  {unit.nodes.map((node) => (
                    <MapNode
                      key={node.conceptId}
                      node={node}
                      onSelect={handleNode}
                      selected={node.conceptId === selectedConceptId}
                      onPodcastCompleted={onPodcastCompleted}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {/* A plain, self-contained overlay rather than the shared Dialog
          primitive -- this is the only dialog in the app opened purely
          programmatically (no DialogTrigger element), and Base UI's Dialog
          did not reliably register clicks inside it in that configuration.
          Every other dialog in the app (e.g. AssertMasteryDialog) renders a
          real DialogTrigger, which this confirmation has no natural
          equivalent for. */}
      {pending ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4 supports-backdrop-filter:backdrop-blur-xs"
          onClick={() => setPending(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10"
            onClick={(event) => event.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="jump-ahead-title"
            aria-describedby="jump-ahead-description"
          >
            <p id="jump-ahead-title" className="font-heading text-base font-medium">
              Jump ahead?
            </p>
            <p id="jump-ahead-description" className="mt-2 text-muted-foreground">
              {`"${pending.label}" builds on ${pending.blockedBy.join(
                ", "
              )}. Continue to the topic now, or wait until you've mastered those first -- it'll be easier then.`}
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setPending(null)}>
                Not yet
              </Button>
              <Button
                onClick={() => {
                  onSelectConcept(pending.conceptId);
                  setPending(null);
                }}
              >
                Continue anyway
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
