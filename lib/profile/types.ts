import type {
  ActiveMisconception,
  MasteryTrendSeries,
  RecentInsight,
} from "@/lib/memory/types";

export const MASTERY_COMPLETE_THRESHOLD = 0.85;

// A concept isn't "complete" until there's enough graded evidence behind the
// estimate, not just a high probability. Without this, ~2 lucky chat turns (or
// a single high p_init) could flip a topic to complete. Since incorrect graded
// answers push mastery down, crossing the threshold requires real correct
// answers -- this floor just ensures there were enough of them.
export const MIN_ATTEMPTS_FOR_COMPLETION = 3;

// Compare on the rounded percentage the UI displays, not the raw float --
// read-time decay can shave a negligible sliver off an exact 0.85 floor bump
// (e.g. 0.8499998), which would otherwise fail a strict >= 0.85 check. Shared
// so every view (profile, journey) applies the identical completion rule.
export function isConceptComplete(masteryProb: number, attempts: number): boolean {
  return (
    attempts >= MIN_ATTEMPTS_FOR_COMPLETION &&
    Math.round(masteryProb * 100) >= MASTERY_COMPLETE_THRESHOLD * 100
  );
}

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
