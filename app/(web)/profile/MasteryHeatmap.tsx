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
  scope: "content" | "practice";
  masteryProb: number;
  confidence: number;
  attempts: number;
  lastPracticedAt: string | null;
  isComplete: boolean;
}

function textColorFor(masteryProb: number): string {
  return masteryProb >= 0.55 ? "#ffffff" : "#0b0b0b";
}

export function MasteryHeatmap({ mastery }: { mastery: MasteryHeatmapEntry[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {mastery.map((entry) => {
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
      })}
    </div>
  );
}
