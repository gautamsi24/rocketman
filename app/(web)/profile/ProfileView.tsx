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

  const trendWithLabels = profile.trend.map((series) => ({
    ...series,
    label:
      profile.mastery.find((m) => m.conceptId === series.conceptId)?.label ??
      series.conceptId,
  }));

  // Unit topics drive completion; science practices are a separate track.
  const contentMastery = profile.mastery.filter((m) => m.scope === "content");
  const practiceMastery = profile.mastery.filter((m) => m.scope === "practice");
  const contentCompleted = contentMastery.filter((m) => m.isComplete).length;
  const practiceCompleted = practiceMastery.filter((m) => m.isComplete).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">What RocketMan knows about you</h1>
        <p className="text-sm text-muted-foreground">
          {contentCompleted} of {contentMastery.length} topics completed
          {practiceMastery.length > 0
            ? ` · ${practiceCompleted}/${practiceMastery.length} practice skills`
            : ""}
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
          <MasteryHeatmap mastery={profile.mastery} />
          <AssertMasteryDialog
            learnerId={learnerId}
            concepts={profile.mastery.map((m) => ({
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

      <TransparencyFooter mastery={profile.mastery} />
    </div>
  );
}
