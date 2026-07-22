"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { getCategoricalColor } from "@/lib/client/palette";

interface TrendSeries {
  conceptId: string;
  label: string;
  points: { masteryProb: number; recordedAt: string }[];
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

  const config: ChartConfig = {};
  withData.forEach((s, i) => {
    const color = getCategoricalColor(i);
    config[s.conceptId] = { label: s.label, theme: color };
  });

  return (
    <ChartContainer config={config} className="max-h-64 w-full">
      <LineChart>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="recordedAt"
          type="category"
          allowDuplicatedCategory={false}
          tickFormatter={(value: string) => new Date(value).toLocaleDateString()}
        />
        <YAxis
          domain={[0, 1]}
          tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => new Date(value as string).toLocaleString()}
              formatter={(value) => `${Math.round(Number(value) * 100)}%`}
            />
          }
        />
        {withData.length > 1 && (
          <ChartLegend content={<ChartLegendContent />} />
        )}
        {withData.map((s) => (
          <Line
            key={s.conceptId}
            data={s.points}
            dataKey="masteryProb"
            name={s.conceptId}
            stroke={`var(--color-${s.conceptId})`}
            strokeWidth={2}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
