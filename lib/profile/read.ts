import type { SupabaseClient } from "@supabase/supabase-js";
import { listConcepts } from "@/lib/curriculum/concepts";
import { conceptLabel } from "@/lib/curriculum/labels";
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
  isConceptComplete,
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
    label: conceptLabel(concept, "Untitled concept"),
    scope: concept.contentLoCode ? "content" : "practice",
    masteryProb: mastery.masteryProb,
    confidence: mastery.confidence,
    attempts: mastery.attempts,
    lastPracticedAt: mastery.lastPracticedAt,
    isComplete: isConceptComplete(mastery.masteryProb, mastery.attempts),
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
