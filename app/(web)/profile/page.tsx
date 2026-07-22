"use client";

import { useCallback, useEffect, useState } from "react";
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
import { useCurrentLearner } from "@/hooks/use-current-learner";

interface ProfileMasteryEntry {
  conceptId: string;
  unitLabel: string | null;
  label: string;
  scope: "content" | "practice";
  masteryProb: number;
  confidence: number;
  attempts: number;
  lastPracticedAt: string | null;
  isComplete: boolean;
}

interface ProfileResponse {
  learnerId: string;
  mastery: ProfileMasteryEntry[];
  misconceptions: {
    code: string;
    label: string;
    scope: "content" | "practice";
    evidenceCount: number;
    lastObservedAt: string;
  }[];
  insights: { id: string; summaryText: string; createdAt: string }[];
  trend: {
    conceptId: string;
    points: { masteryProb: number; recordedAt: string }[];
  }[];
}

export default function ProfilePage() {
  const { learner } = useCurrentLearner();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);

  const loadProfile = useCallback(() => {
    if (!learner) return;
    fetch(`/api/learners/${learner.id}/profile`)
      .then((res) => res.json())
      .then(setProfile);
  }, [learner]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (!learner || !profile) {
    return <div className="flex flex-1 items-center justify-center p-8">Loading...</div>;
  }

  const trendWithLabels = profile.trend.map((series) => ({
    ...series,
    label:
      profile.mastery.find((m) => m.conceptId === series.conceptId)?.label ??
      series.conceptId,
  }));

  const completedCount = profile.mastery.filter((m) => m.isComplete).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">What RocketMan knows about you</h1>
        <p className="text-sm text-muted-foreground">
          {completedCount} of {profile.mastery.length} topics completed
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
            learnerId={learner.id}
            concepts={profile.mastery.map((m) => ({ conceptId: m.conceptId, label: m.label }))}
            onAsserted={loadProfile}
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
