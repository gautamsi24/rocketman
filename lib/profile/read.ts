import type { SupabaseClient } from "@supabase/supabase-js";
import { listConcepts } from "@/lib/curriculum/concepts";
import type { ConceptSummary } from "@/lib/curriculum/types";
import {
  getAllActiveMisconceptions,
  getMasteryForConcepts,
  getMasteryTrend,
  getRecentInsights,
} from "@/lib/memory/profile-read";
import type { MasteryEntry } from "@/lib/memory/types";
import type { Database } from "@/lib/supabase/types";
import {
  MASTERY_COMPLETE_THRESHOLD,
  type ProfileMasteryEntry,
  type ProfileResponse,
} from "./types";

type Client = SupabaseClient<Database>;

function toProfileMasteryEntry(
  concept: ConceptSummary,
  mastery: MasteryEntry
): ProfileMasteryEntry {
  return {
    conceptId: concept.id,
    unitLabel: concept.unitLabel,
    bigIdeaLabel: concept.bigIdeaLabel,
    label: concept.contentLoLabel ?? concept.practiceLabel ?? "Untitled concept",
    scope: concept.contentLoCode ? "content" : "practice",
    masteryProb: mastery.masteryProb,
    confidence: mastery.confidence,
    attempts: mastery.attempts,
    lastPracticedAt: mastery.lastPracticedAt,
    // Compare on the rounded percentage the UI displays, not the raw float --
    // read-time decay can shave a negligible sliver off an exact 0.85 floor
    // bump (e.g. 0.8499998), which would otherwise fail a strict >= 0.85 check.
    isComplete: Math.round(mastery.masteryProb * 100) >= MASTERY_COMPLETE_THRESHOLD * 100,
  };
}

export async function buildLearnerProfile(
  supabase: Client,
  params: { tenantId: string; learnerId: string }
): Promise<ProfileResponse> {
  const concepts = await listConcepts(supabase, params.tenantId);
  const conceptIds = concepts.map((c) => c.id);

  const [masteryEntries, misconceptions, insights, trend] = await Promise.all([
    getMasteryForConcepts(supabase, params.learnerId, conceptIds),
    getAllActiveMisconceptions(supabase, params.learnerId),
    getRecentInsights(supabase, params.learnerId),
    getMasteryTrend(supabase, params.learnerId),
  ]);

  const conceptById = new Map(concepts.map((c) => [c.id, c]));
  const mastery = masteryEntries
    .map((entry) => {
      const concept = conceptById.get(entry.conceptId);
      return concept ? toProfileMasteryEntry(concept, entry) : null;
    })
    .filter((entry): entry is ProfileMasteryEntry => entry !== null);

  return {
    learnerId: params.learnerId,
    mastery,
    misconceptions,
    insights,
    trend,
  };
}
