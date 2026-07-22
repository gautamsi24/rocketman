export interface MasteryEntry {
  conceptId: string;
  masteryProb: number;
  confidence: number;
  attempts: number;
  lastPracticedAt: string | null;
}

export interface RelevantInsight {
  id: string;
  summaryText: string;
  similarity: number;
}

export interface RecentInsight {
  id: string;
  summaryText: string;
  createdAt: string;
}

export interface ActiveMisconception {
  code: string;
  label: string;
  scope: "content" | "practice";
  evidenceCount: number;
  lastObservedAt: string;
}

export interface MasteryTrendPoint {
  masteryProb: number;
  recordedAt: string;
}

export interface MasteryTrendSeries {
  conceptId: string;
  points: MasteryTrendPoint[];
}

export interface MemoryContext {
  mastery: MasteryEntry[];
  insights: RelevantInsight[];
  misconceptions: ActiveMisconception[];
}
