"use client";

import { CheckIcon, LockIcon, PlayIcon, RocketIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { masteryToSequentialColor } from "@/lib/client/palette";
import type { JourneyNode, JourneyResponse } from "@/lib/journey/types";
import { cn } from "@/lib/utils";

function ringFraction(node: JourneyNode): number {
  return node.attempts > 0 ? node.masteryProb : 0;
}

function MasteryRing({ node }: { node: JourneyNode }) {
  const fraction = ringFraction(node);
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - fraction);
  const color =
    node.status === "locked"
      ? "currentColor"
      : masteryToSequentialColor(node.masteryProb);

  return (
    <div
      className={cn(
        "relative flex size-11 shrink-0 items-center justify-center",
        node.status === "locked" && "text-muted-foreground"
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
      ) : node.status === "locked" ? (
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
}: {
  node: JourneyNode;
  selected: boolean;
  onSelect: (node: JourneyNode) => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent",
        node.status === "locked" && "opacity-70",
        selected && "border-primary bg-accent ring-1 ring-primary"
      )}
      onClick={() => onSelect(node)}
      type="button"
    >
      <MasteryRing node={node} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            node.status === "locked" && "text-muted-foreground"
          )}
        >
          {node.label}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {statusText(node)}
        </p>
      </div>
    </button>
  );
}

export function MissionMap({
  journey,
  selectedConceptId,
  onSelectConcept,
}: {
  journey: JourneyResponse;
  selectedConceptId: string | null;
  onSelectConcept: (conceptId: string) => void;
}) {
  const [pending, setPending] = useState<JourneyNode | null>(null);

  const handleNode = (node: JourneyNode) => {
    if (node.status === "locked") {
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
        {journey.practiceTotal > 0 ? (
          <p className="text-xs text-muted-foreground">
            Practice skills:{" "}
            <span className="tabular-nums">
              {journey.practiceMastered}/{journey.practiceTotal}
            </span>{" "}
            · tracked separately from unit completion
          </p>
        ) : null}
      </header>

      <div className="flex flex-col gap-6">
        {journey.units.map((unit) => (
          <section key={unit.unitLabel} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {unit.unitLabel}
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {unit.masteredCount}/{unit.totalCount}
              </span>
            </div>
            <div className="flex flex-col gap-2 border-l-2 border-dashed border-muted pl-4">
              {unit.nodes.map((node) => (
                <MapNode
                  key={node.conceptId}
                  node={node}
                  onSelect={handleNode}
                  selected={node.conceptId === selectedConceptId}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jump ahead?</DialogTitle>
            <DialogDescription>
              {pending
                ? `"${pending.label}" builds on ${pending.blockedBy.join(
                    ", "
                  )}. You can ask about it now, but it'll be easier once you've mastered those.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Not yet
            </Button>
            <Button
              onClick={() => {
                if (pending) onSelectConcept(pending.conceptId);
                setPending(null);
              }}
            >
              Ask anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
