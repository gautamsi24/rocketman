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

const PRACTICE_UNIT_LABEL = "Practice skills";

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
  // Content topics and cross-cutting practice skills are separate axes -- track
  // them apart so unit completion isn't diluted by (or waiting on) practice.
  let contentMastered = 0;
  let contentTotal = 0;
  let practiceMastered = 0;
  let practiceTotal = 0;

  for (const concept of concepts) {
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

    const scope: JourneyNode["scope"] = concept.contentLoCode
      ? "content"
      : "practice";
    if (scope === "content") {
      contentTotal++;
      if (done) contentMastered++;
    } else {
      practiceTotal++;
      if (done) practiceMastered++;
    }

    const node: JourneyNode = {
      conceptId: concept.id,
      label: labelByConceptId.get(concept.id) ?? "Untitled concept",
      scope,
      masteryProb,
      attempts,
      status,
      blockedBy,
    };

    const unitKey = concept.unitCode ?? PRACTICE_UNIT_LABEL;
    const unit = unitByKey.get(unitKey) ?? {
      unitCode: concept.unitCode,
      unitLabel: concept.unitLabel ?? PRACTICE_UNIT_LABEL,
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
  // Cross-cutting practice skills (no unit) read best as the final leg.
  const units = Array.from(unitByKey.values());
  const ordered = [
    ...units.filter((u) => u.unitCode !== null),
    ...units.filter((u) => u.unitCode === null),
  ];

  return {
    units: ordered,
    contentMastered,
    contentTotal,
    practiceMastered,
    practiceTotal,
  };
}
