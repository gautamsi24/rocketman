import type { SupabaseClient } from "@supabase/supabase-js";
import { listConcepts } from "@/lib/curriculum/concepts";
import { conceptLabel } from "@/lib/curriculum/labels";
import { getMasteryForConcepts } from "@/lib/memory/profile-read";
import { isConceptComplete } from "@/lib/profile/types";
import type { Database } from "@/lib/supabase/types";
import type {
  JourneyNode,
  JourneyNodeStatus,
  JourneyResponse,
  JourneyUnit,
} from "./types";

type Client = SupabaseClient<Database>;

export async function buildJourney(
  supabase: Client,
  params: { tenantId: string; learnerId: string }
): Promise<JourneyResponse> {
  const concepts = await listConcepts(supabase, params.tenantId);
  const conceptIds = concepts.map((c) => c.id);

  const [masteryEntries, prerequisites] = await Promise.all([
    getMasteryForConcepts(supabase, params.learnerId, conceptIds),
    supabase
      .from("concept_prerequisites")
      .select("concept_id, prerequisite_concept_id")
      .eq("tenant_id", params.tenantId),
  ]);
  if (prerequisites.error) throw prerequisites.error;

  const masteryByConceptId = new Map(
    masteryEntries.map((entry) => [entry.conceptId, entry])
  );
  const labelByConceptId = new Map(
    concepts.map((c) => [c.id, conceptLabel(c, "Untitled concept")])
  );

  const prerequisiteIdsByConceptId = new Map<string, string[]>();
  for (const row of prerequisites.data ?? []) {
    const list = prerequisiteIdsByConceptId.get(row.concept_id) ?? [];
    list.push(row.prerequisite_concept_id);
    prerequisiteIdsByConceptId.set(row.concept_id, list);
  }

  const conceptIsComplete = (conceptId: string): boolean => {
    const entry = masteryByConceptId.get(conceptId);
    return entry ? isConceptComplete(entry.masteryProb, entry.attempts) : false;
  };

  const unitByKey = new Map<string, JourneyUnit>();
  let contentMastered = 0;
  let contentTotal = 0;

  // Cross-cutting science practices (scope: practice) are excluded from the
  // mission map entirely -- they read as confusing pseudo-topics next to real
  // AP Bio units, and students actually exercise them under Practice FRQs,
  // not by "completing" a map node.
  for (const concept of concepts) {
    if (!concept.contentLoCode) continue;

    const mastery = masteryByConceptId.get(concept.id);
    const masteryProb = mastery?.masteryProb ?? 0;
    const attempts = mastery?.attempts ?? 0;
    const done = isConceptComplete(masteryProb, attempts);

    const blockedBy = (prerequisiteIdsByConceptId.get(concept.id) ?? [])
      .filter((id) => !conceptIsComplete(id))
      .map((id) => labelByConceptId.get(id) ?? "a prerequisite");

    let status: JourneyNodeStatus;
    if (done) status = "mastered";
    else if (blockedBy.length > 0) status = "locked";
    else if (attempts > 0) status = "in_progress";
    else status = "available";

    contentTotal++;
    if (done) contentMastered++;

    const node: JourneyNode = {
      conceptId: concept.id,
      label: labelByConceptId.get(concept.id) ?? "Untitled concept",
      scope: "content",
      masteryProb,
      attempts,
      status,
      blockedBy,
    };

    // The DB only guarantees content_lo_code OR science_practice_code is set
    // (concept_has_an_axis), never that unit_code accompanies content_lo_code
    // -- a content concept with no unit is legal, so this can't be a bare
    // non-null assertion.
    const unitKey = concept.unitCode ?? "Untitled unit";
    const unit = unitByKey.get(unitKey) ?? {
      unitCode: concept.unitCode,
      unitLabel: concept.unitLabel ?? unitKey,
      nodes: [],
      masteredCount: 0,
      totalCount: 0,
    };
    unit.nodes.push(node);
    unit.totalCount++;
    if (done) unit.masteredCount++;
    unitByKey.set(unitKey, unit);
  }

  // listConcepts already orders by unit_code, so insertion order is unit order.
  const units = Array.from(unitByKey.values());

  return {
    units,
    contentMastered,
    contentTotal,
  };
}
