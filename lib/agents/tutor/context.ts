import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAdjacentConceptIds,
  getConceptSummaries,
  getConceptSummary,
  getSameBigIdeaConceptIds,
} from "@/lib/curriculum/concepts";
import { getGroundingContent } from "@/lib/curriculum/content";
import type { ConceptSummary, CurriculumContentItem } from "@/lib/curriculum/types";
import { getLearner } from "@/lib/learners/learner";
import { readMemoryContext } from "@/lib/memory/profile-read";
import type { ActiveMisconception, RelevantInsight } from "@/lib/memory/types";
import type { Database } from "@/lib/supabase/types";
import {
  getTutorProfile,
  type TutorProfile,
} from "@/lib/tutor-profile/tutor-profile";

type Client = SupabaseClient<Database>;

export interface ShardedMasteryEntry {
  concept: ConceptSummary;
  masteryProb: number;
}

export interface TutorContext {
  tenantId: string;
  concept: ConceptSummary;
  currentMasteryProb: number;
  shardedMastery: ShardedMasteryEntry[];
  bigIdeaSiblingMastery: ShardedMasteryEntry[];
  insights: RelevantInsight[];
  misconceptions: ActiveMisconception[];
  groundingContent: CurriculumContentItem[];
  tutorProfile: TutorProfile;
  marketId: string;
  ageBand: string;
}

export async function buildTutorContext(
  supabase: Client,
  params: {
    learnerId: string;
    conceptId: string;
    learnerMessage: string;
  }
): Promise<TutorContext> {
  const [concept, adjacentConceptIds, bigIdeaConceptIds, learner, groundingContent] =
    await Promise.all([
      getConceptSummary(supabase, params.conceptId),
      getAdjacentConceptIds(supabase, params.conceptId),
      getSameBigIdeaConceptIds(supabase, params.conceptId),
      getLearner(supabase, params.learnerId),
      getGroundingContent(supabase, params.conceptId),
    ]);

  if (!concept) {
    throw new Error(`Concept ${params.conceptId} not found`);
  }

  const allConceptIds = Array.from(new Set([...adjacentConceptIds, ...bigIdeaConceptIds]));

  const [memory, allConceptSummaries, tutorProfile] = await Promise.all([
    readMemoryContext(supabase, {
      learnerId: params.learnerId,
      conceptIds: allConceptIds,
      currentConceptId: params.conceptId,
      queryText: params.learnerMessage,
    }),
    getConceptSummaries(supabase, allConceptIds),
    getTutorProfile(supabase, learner.tenantId),
  ]);

  const conceptById = new Map(
    allConceptSummaries.map((summary) => [summary.id, summary])
  );

  function toShardedEntries(conceptIds: string[]): ShardedMasteryEntry[] {
    const idSet = new Set(conceptIds);
    return memory.mastery
      .filter((entry) => idSet.has(entry.conceptId))
      .map((entry) => {
        const summary = conceptById.get(entry.conceptId);
        return summary ? { concept: summary, masteryProb: entry.masteryProb } : null;
      })
      .filter((entry): entry is ShardedMasteryEntry => entry !== null);
  }

  const shardedMastery = toShardedEntries(adjacentConceptIds);
  const bigIdeaSiblingMastery = toShardedEntries(bigIdeaConceptIds);

  const currentMasteryProb =
    shardedMastery.find((entry) => entry.concept.id === params.conceptId)
      ?.masteryProb ?? 0.3;

  return {
    tenantId: learner.tenantId,
    concept,
    currentMasteryProb,
    shardedMastery,
    bigIdeaSiblingMastery,
    insights: memory.insights,
    misconceptions: memory.misconceptions,
    groundingContent,
    tutorProfile,
    marketId: learner.marketId,
    ageBand: learner.ageBand,
  };
}
