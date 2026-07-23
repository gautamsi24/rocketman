"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { masteryToSequentialColor } from "@/lib/client/palette";

interface MasteryHeatmapEntry {
  conceptId: string;
  label: string;
  unitLabel: string | null;
  bigIdeaLabel: string | null;
  scope: "content" | "practice";
  masteryProb: number;
  confidence: number;
  attempts: number;
  lastPracticedAt: string | null;
  isComplete: boolean;
}

type GroupBy = "unit" | "bigIdea";

function textColorFor(masteryProb: number): string {
  return masteryProb >= 0.55 ? "#ffffff" : "#0b0b0b";
}

function groupKeyFor(entry: MasteryHeatmapEntry, groupBy: GroupBy): string {
  const label = groupBy === "unit" ? entry.unitLabel : entry.bigIdeaLabel;
  return label ?? "Practice skills";
}

function Tile({ entry }: { entry: MasteryHeatmapEntry }) {
  const bg = masteryToSequentialColor(entry.masteryProb);
  const fg = textColorFor(entry.masteryProb);
  const pct = Math.round(entry.masteryProb * 100);

  return (
    <Tooltip key={entry.conceptId}>
      <TooltipTrigger
        render={
          <div
            className="flex flex-col gap-1 rounded-lg border p-3"
            style={{ backgroundColor: bg, color: fg }}
          />
        }
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide opacity-80">
            {entry.scope === "practice" ? "Practice skill" : entry.unitLabel ?? "Content"}
          </span>
          <span className="text-lg font-semibold tabular-nums">{pct}%</span>
        </div>
        <p className="text-sm leading-snug">{entry.label}</p>
        {entry.isComplete && (
          <span className="w-fit rounded-full border border-current px-2 py-0.5 text-xs font-medium">
            Completed
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent>
        <p>Confidence: {Math.round(entry.confidence * 100)}%</p>
        <p>Attempts: {entry.attempts}</p>
        <p>
          Last practiced:{" "}
          {entry.lastPracticedAt
            ? new Date(entry.lastPracticedAt).toLocaleDateString()
            : "never"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export function MasteryHeatmap({ mastery }: { mastery: MasteryHeatmapEntry[] }) {
  const [groupBy, setGroupBy] = useState<GroupBy>("unit");

  const groups = new Map<string, MasteryHeatmapEntry[]>();
  for (const entry of mastery) {
    const key = groupKeyFor(entry, groupBy);
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }
  // "Practice skills" (entries with no unit/Big Idea) reads best last, not
  // wherever it happened to first appear in the input order.
  const practiceEntries = groups.get("Practice skills");
  if (practiceEntries) {
    groups.delete("Practice skills");
    groups.set("Practice skills", practiceEntries);
  }

  return (
    <div className="flex flex-col gap-4">
      <ButtonGroup>
        <Button
          variant={groupBy === "unit" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setGroupBy("unit")}
        >
          By Unit
        </Button>
        <Button
          variant={groupBy === "bigIdea" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setGroupBy("bigIdea")}
        >
          By Big Idea
        </Button>
      </ButtonGroup>

      {Array.from(groups.entries()).map(([groupLabel, entries]) => (
        <div key={groupLabel} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">{groupLabel}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {entries.map((entry) => (
              <Tile key={entry.conceptId} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
