import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAdjacentConceptIds,
  getConceptSummaries,
  getConceptSummary,
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
  const [concept, adjacentConceptIds, learner, groundingContent] =
    await Promise.all([
      getConceptSummary(supabase, params.conceptId),
      getAdjacentConceptIds(supabase, params.conceptId),
      getLearner(supabase, params.learnerId),
      getGroundingContent(supabase, params.conceptId),
    ]);

  if (!concept) {
    throw new Error(`Concept ${params.conceptId} not found`);
  }

  const [memory, adjacentConceptSummaries, tutorProfile] = await Promise.all([
    readMemoryContext(supabase, {
      learnerId: params.learnerId,
      conceptIds: adjacentConceptIds,
      currentConceptId: params.conceptId,
      queryText: params.learnerMessage,
    }),
    getConceptSummaries(supabase, adjacentConceptIds),
    getTutorProfile(supabase, learner.tenantId),
  ]);

  const conceptById = new Map(
    adjacentConceptSummaries.map((summary) => [summary.id, summary])
  );

  const shardedMastery: ShardedMasteryEntry[] = memory.mastery
    .map((entry) => {
      const summary = conceptById.get(entry.conceptId);
      return summary ? { concept: summary, masteryProb: entry.masteryProb } : null;
    })
    .filter((entry): entry is ShardedMasteryEntry => entry !== null);

  const currentMasteryProb =
    shardedMastery.find((entry) => entry.concept.id === params.conceptId)
      ?.masteryProb ?? 0.3;

  return {
    tenantId: learner.tenantId,
    concept,
    currentMasteryProb,
    shardedMastery,
    insights: memory.insights,
    misconceptions: memory.misconceptions,
    groundingContent,
    tutorProfile,
    marketId: learner.marketId,
    ageBand: learner.ageBand,
  };
}
