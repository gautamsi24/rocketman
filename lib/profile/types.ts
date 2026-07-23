import type {
  ActiveMisconception,
  MasteryTrendSeries,
  RecentInsight,
} from "@/lib/memory/types";

export const MASTERY_COMPLETE_THRESHOLD = 0.85;

export interface ProfileMasteryEntry {
  conceptId: string;
  unitLabel: string | null;
  bigIdeaLabel: string | null;
  label: string;
  scope: "content" | "practice";
  masteryProb: number;
  confidence: number;
  attempts: number;
  lastPracticedAt: string | null;
  isComplete: boolean;
}

export interface ProfileResponse {
  learnerId: string;
  mastery: ProfileMasteryEntry[];
  misconceptions: ActiveMisconception[];
  insights: RecentInsight[];
  trend: MasteryTrendSeries[];
}
