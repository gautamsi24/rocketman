"use client";

import { useRouter } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AssertMasteryDialog } from "./AssertMasteryDialog";
import { InsightList } from "./InsightList";
import { MasteryHeatmap } from "./MasteryHeatmap";
import { MisconceptionList } from "./MisconceptionList";
import { TransparencyFooter } from "./TransparencyFooter";
import { TrendChart } from "./TrendChart";
import type { ProfileResponse } from "@/lib/profile/types";

export function ProfileView({
  learnerId,
  profile,
}: {
  learnerId: string;
  profile: ProfileResponse;
}) {
  const router = useRouter();

  // Unit topics drive completion. Science practices (cross-cutting reasoning
  // skills) are excluded from this page entirely -- students exercise those
  // under Practice FRQs, not by tracking a "practice skills" mastery bar here.
  const contentMastery = profile.mastery.filter((m) => m.scope === "content");
  const contentCompleted = contentMastery.filter((m) => m.isComplete).length;
  const contentConceptIds = new Set(contentMastery.map((m) => m.conceptId));

  // currentMasteryProb is the same decayed value the Mastery tab shows for
  // this concept -- the trend's own last history point is the raw, undecayed
  // value as of whenever it was last graded, which drifts from the Mastery
  // tab's number the longer a topic goes unpracticed. Carrying the decayed
  // value through here is what keeps the two tabs from ever disagreeing.
  const trendWithLabels = profile.trend
    .filter((series) => contentConceptIds.has(series.conceptId))
    .map((series) => {
      const entry = contentMastery.find((m) => m.conceptId === series.conceptId);
      return {
        ...series,
        label: entry?.label ?? series.conceptId,
        currentMasteryProb:
          entry?.masteryProb ??
          series.points[series.points.length - 1].masteryProb,
      };
    });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">What RocketMan knows about you</h1>
        <p className="text-sm text-muted-foreground">
          {contentCompleted} of {contentMastery.length} topics completed
        </p>
      </div>

      <Tabs defaultValue="mastery">
        <TabsList>
          <TabsTrigger value="mastery">Mastery</TabsTrigger>
          <TabsTrigger value="misconceptions">Misconceptions</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="trend">Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="mastery" className="flex flex-col gap-3">
          <MasteryHeatmap mastery={contentMastery} />
          <AssertMasteryDialog
            learnerId={learnerId}
            concepts={contentMastery.map((m) => ({
              conceptId: m.conceptId,
              label: m.label,
            }))}
            onAsserted={() => router.refresh()}
          />
        </TabsContent>

        <TabsContent value="misconceptions">
          <MisconceptionList misconceptions={profile.misconceptions} />
        </TabsContent>

        <TabsContent value="insights">
          <InsightList insights={profile.insights} />
        </TabsContent>

        <TabsContent value="trend">
          <TrendChart series={trendWithLabels} />
        </TabsContent>
      </Tabs>

      <TransparencyFooter mastery={contentMastery} />
    </div>
  );
}
