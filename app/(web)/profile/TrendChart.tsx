"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { masteryToSequentialColor } from "@/lib/client/palette";

interface TrendPoint {
  masteryProb: number;
  recordedAt: string;
}

interface TrendSeries {
  conceptId: string;
  label: string;
  points: TrendPoint[];
  /** Decayed, current-as-of-now mastery -- the same number the Mastery tab
   * shows for this concept. Always the source of truth for "mastery right
   * now"; the last raw history point is only ever "mastery as of whenever it
   * was last graded," which drifts from this the longer a topic sits idle. */
  currentMasteryProb: number;
}

function SparkTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as TrendPoint;

  return (
    <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">
        {new Date(point.recordedAt).toLocaleDateString()}
      </div>
      <div className="font-mono text-foreground tabular-nums">
        {Math.round(point.masteryProb * 100)}%
      </div>
    </div>
  );
}

// Each topic gets its own tile -- a shared multi-line chart stops being
// readable well before 28 series (this app's own categorical palette only has
// 8 hues, so past that point series start silently repeating colors). A
// sparkline per topic, colored by its own current mastery, scales cleanly to
// any number of topics and never asks two different topics to share a color.
function TrendTile({ series }: { series: TrendSeries }) {
  const { points, currentMasteryProb } = series;
  const lastRecorded = points[points.length - 1];
  const first = points[0].masteryProb;
  const delta = currentMasteryProb - first;
  const showDelta = points.length > 1 && Math.round(Math.abs(delta) * 100) > 0;
  const color = masteryToSequentialColor(currentMasteryProb);

  // If decay has visibly moved mastery since the last graded event, draw that
  // drift as a real tail ending "now" -- otherwise the line's own end and the
  // % badge beside it would show two different numbers for the same topic.
  const decayed =
    Math.round(currentMasteryProb * 100) !== Math.round(lastRecorded.masteryProb * 100);
  const chartPoints = decayed
    ? [...points, { masteryProb: currentMasteryProb, recordedAt: new Date().toISOString() }]
    : points;

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{series.label}</p>
        <span className="shrink-0 text-lg font-semibold tabular-nums">
          {Math.round(currentMasteryProb * 100)}%
        </span>
      </div>

      {showDelta && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {delta > 0 ? "↑" : "↓"} {Math.round(Math.abs(delta) * 100)}%
          since you started
        </span>
      )}

      <div className="h-14 w-full">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart
            data={chartPoints}
            margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
          >
            <Tooltip
              content={SparkTooltip}
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            />
            <Line
              activeDot={{ r: 4, stroke: "var(--background)", strokeWidth: 2 }}
              dataKey="masteryProb"
              dot={false}
              isAnimationActive={false}
              stroke={color}
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TrendChart({ series }: { series: TrendSeries[] }) {
  const withData = series.filter((s) => s.points.length > 0);

  if (withData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No history yet -- trends appear after your first few chat turns.
      </p>
    );
  }

  // Weakest-first: whatever needs attention most surfaces at the top of the
  // grid instead of wherever it happened to fall in concept order.
  const sorted = [...withData].sort(
    (a, b) => a.currentMasteryProb - b.currentMasteryProb
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((s) => (
        <TrendTile key={s.conceptId} series={s} />
      ))}
    </div>
  );
}
