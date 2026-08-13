import type { SupabaseClient } from "@supabase/supabase-js";
import { applyDecay } from "@/lib/bkt/decay";
import { listConcepts } from "@/lib/curriculum/concepts";
import { isConceptComplete } from "@/lib/profile/types";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

interface MasteryRow {
  learner_id: string;
  concept_id: string;
  mastery_prob: number;
  attempts: number;
  last_practiced_at: string | null;
}

export interface LearnerProgress {
  id: string;
  displayName: string;
  masteredCount: number;
  totalConcepts: number;
  /** Average decayed mastery across content topics (missing topics count as 0). */
  avgMastery: number;
  activeMisconceptions: number;
  lastActiveAt: string | null;
}

export async function listLearnersWithProgress(
  supabase: Client,
  tenantId: string
): Promise<LearnerProgress[]> {
  const [learnersRes, concepts, masteryRes, misconceptionRes] = await Promise.all([
    supabase.from("learners").select("id, display_name").eq("tenant_id", tenantId),
    listConcepts(supabase, tenantId),
    supabase
      .from("concept_mastery")
      .select("learner_id, concept_id, mastery_prob, attempts, last_practiced_at")
      .eq("tenant_id", tenantId),
    supabase
      .from("learner_misconceptions")
      .select("learner_id")
      .eq("tenant_id", tenantId)
      .eq("status", "active"),
  ]);
  if (learnersRes.error) throw learnersRes.error;
  if (masteryRes.error) throw masteryRes.error;
  if (misconceptionRes.error) throw misconceptionRes.error;

  const contentConceptIds = new Set(
    concepts.filter((concept) => concept.contentLoCode).map((concept) => concept.id)
  );
  const totalConcepts = contentConceptIds.size;
  const now = new Date();

  const masteryByLearner = new Map<string, MasteryRow[]>();
  for (const row of (masteryRes.data ?? []) as MasteryRow[]) {
    const list = masteryByLearner.get(row.learner_id) ?? [];
    list.push(row);
    masteryByLearner.set(row.learner_id, list);
  }

  const misconceptionCountByLearner = new Map<string, number>();
  for (const row of misconceptionRes.data ?? []) {
    misconceptionCountByLearner.set(
      row.learner_id,
      (misconceptionCountByLearner.get(row.learner_id) ?? 0) + 1
    );
  }

  return (learnersRes.data ?? []).map((learner) => {
    const rows = (masteryByLearner.get(learner.id) ?? []).filter((row) =>
      contentConceptIds.has(row.concept_id)
    );

    let masteredCount = 0;
    let masterySum = 0;
    let lastActiveAt: string | null = null;
    for (const row of rows) {
      const decayed = applyDecay(
        row.mastery_prob,
        row.last_practiced_at ? new Date(row.last_practiced_at) : null,
        now
      );
      masterySum += decayed;
      if (isConceptComplete(decayed, row.attempts)) masteredCount++;
      if (
        row.last_practiced_at &&
        (!lastActiveAt || row.last_practiced_at > lastActiveAt)
      ) {
        lastActiveAt = row.last_practiced_at;
      }
    }

    return {
      id: learner.id,
      displayName: learner.display_name,
      masteredCount,
      totalConcepts,
      avgMastery: totalConcepts > 0 ? masterySum / totalConcepts : 0,
      activeMisconceptions: misconceptionCountByLearner.get(learner.id) ?? 0,
      lastActiveAt,
    };
  });
}
