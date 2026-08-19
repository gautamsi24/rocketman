import type { SupabaseClient } from "@supabase/supabase-js";
import { embed } from "ai";
import { queryEmbeddingModel } from "@/lib/agents/shared/embedding";
import { applyDecay } from "@/lib/bkt/decay";
import type { Database } from "@/lib/supabase/types";
import type {
  ActiveMisconception,
  MasteryEntry,
  MasteryTrendSeries,
  MemoryContext,
  RecentInsight,
  RelevantInsight,
} from "./types";

type Client = SupabaseClient<Database>;

export async function getMasteryForConcepts(
  supabase: Client,
  learnerId: string,
  conceptIds: string[]
): Promise<MasteryEntry[]> {
  if (conceptIds.length === 0) return [];

  const [{ data: existingRows, error: existingError }, { data: paramRows, error: paramError }] =
    await Promise.all([
      supabase
        .from("concept_mastery")
        .select("concept_id, mastery_prob, confidence, attempts, last_practiced_at")
        .eq("learner_id", learnerId)
        .in("concept_id", conceptIds),
      supabase
        .from("bkt_concept_params")
        .select("concept_id, p_init")
        .in("concept_id", conceptIds),
    ]);

  if (existingError) throw existingError;
  if (paramError) throw paramError;

  const existingByConceptId = new Map(
    (existingRows ?? []).map((row) => [row.concept_id, row])
  );
  const pInitByConceptId = new Map(
    (paramRows ?? []).map((row) => [row.concept_id, row.p_init])
  );
  const now = new Date();

  return conceptIds.map((conceptId) => {
    const existing = existingByConceptId.get(conceptId);
    if (!existing) {
      return {
        conceptId,
        masteryProb: pInitByConceptId.get(conceptId) ?? 0.3,
        confidence: 0,
        attempts: 0,
        lastPracticedAt: null,
      };
    }
    return {
      conceptId,
      masteryProb: applyDecay(
        existing.mastery_prob,
        existing.last_practiced_at ? new Date(existing.last_practiced_at) : null,
        now
      ),
      confidence: existing.confidence,
      attempts: existing.attempts,
      lastPracticedAt: existing.last_practiced_at,
    };
  });
}

export async function getRelevantInsights(
  supabase: Client,
  learnerId: string,
  queryText: string,
  matchCount = 3
): Promise<RelevantInsight[]> {
  const { embedding } = await embed({ model: queryEmbeddingModel, value: queryText });

  const { data, error } = await supabase.rpc("match_learner_insights", {
    query_embedding: embedding,
    match_learner_id: learnerId,
    match_count: matchCount,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    summaryText: row.summary_text,
    similarity: row.similarity,
  }));
}

export async function getRecentInsights(
  supabase: Client,
  learnerId: string,
  limit = 10
): Promise<RecentInsight[]> {
  const { data, error } = await supabase
    .from("learner_insights")
    .select("id, summary_text, created_at")
    .eq("learner_id", learnerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    summaryText: row.summary_text,
    createdAt: row.created_at,
  }));
}

interface RawMisconceptionRow {
  id: string;
  code: string;
  label: string;
  scope: "content" | "practice";
  related_concept_id: string | null;
}

async function fetchActiveMisconceptionRows(
  supabase: Client,
  learnerId: string
): Promise<{
  catalogRows: RawMisconceptionRow[];
  detailByMisconceptionId: Map<string, { evidenceCount: number; lastObservedAt: string }>;
}> {
  const { data: learnerRows, error: learnerError } = await supabase
    .from("learner_misconceptions")
    .select("misconception_id, evidence_count, last_observed_at")
    .eq("learner_id", learnerId)
    .eq("status", "active");
  if (learnerError) throw learnerError;
  if (!learnerRows || learnerRows.length === 0) {
    return { catalogRows: [], detailByMisconceptionId: new Map() };
  }

  const misconceptionIds = learnerRows.map((row) => row.misconception_id);
  const { data: catalogRows, error: catalogError } = await supabase
    .from("misconceptions")
    .select("id, code, label, scope, related_concept_id")
    .in("id", misconceptionIds);
  if (catalogError) throw catalogError;

  const detailByMisconceptionId = new Map(
    learnerRows.map((row) => [
      row.misconception_id,
      { evidenceCount: row.evidence_count, lastObservedAt: row.last_observed_at },
    ])
  );

  return { catalogRows: catalogRows ?? [], detailByMisconceptionId };
}

function toActiveMisconception(
  row: RawMisconceptionRow,
  detailByMisconceptionId: Map<string, { evidenceCount: number; lastObservedAt: string }>
): ActiveMisconception {
  const detail = detailByMisconceptionId.get(row.id);
  return {
    code: row.code,
    label: row.label,
    scope: row.scope,
    evidenceCount: detail?.evidenceCount ?? 1,
    lastObservedAt: detail?.lastObservedAt ?? new Date().toISOString(),
  };
}

export async function getActiveMisconceptions(
  supabase: Client,
  learnerId: string,
  conceptId: string
): Promise<ActiveMisconception[]> {
  const { catalogRows, detailByMisconceptionId } = await fetchActiveMisconceptionRows(
    supabase,
    learnerId
  );

  return catalogRows
    .filter((row) => row.related_concept_id === conceptId || row.scope === "practice")
    .map((row) => toActiveMisconception(row, detailByMisconceptionId));
}

export async function getAllActiveMisconceptions(
  supabase: Client,
  learnerId: string
): Promise<ActiveMisconception[]> {
  const { catalogRows, detailByMisconceptionId } = await fetchActiveMisconceptionRows(
    supabase,
    learnerId
  );

  return catalogRows.map((row) => toActiveMisconception(row, detailByMisconceptionId));
}

export async function getMasteryTrend(
  supabase: Client,
  learnerId: string
): Promise<MasteryTrendSeries[]> {
  // Bounded deliberately. This previously selected a learner's entire history
  // with no window and no cap, which was survivable when one graded answer
  // wrote one row. It no longer is: a batch FRQ submission grades six
  // questions, and the trend view only ever renders recent movement anyway.
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("concept_mastery_history")
    .select("concept_id, mastery_prob, recorded_at")
    .eq("learner_id", learnerId)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true })
    .limit(2000);
  if (error) throw error;

  const pointsByConceptId = new Map<string, MasteryTrendSeries["points"]>();
  for (const row of data ?? []) {
    const points = pointsByConceptId.get(row.concept_id) ?? [];
    points.push({ masteryProb: row.mastery_prob, recordedAt: row.recorded_at });
    pointsByConceptId.set(row.concept_id, points);
  }

  return Array.from(pointsByConceptId.entries()).map(([conceptId, points]) => ({
    conceptId,
    points,
  }));
}

export async function readMemoryContext(
  supabase: Client,
  params: {
    learnerId: string;
    conceptIds: string[];
    currentConceptId: string;
    queryText: string;
  }
): Promise<MemoryContext> {
  const [mastery, insights, misconceptions] = await Promise.all([
    getMasteryForConcepts(supabase, params.learnerId, params.conceptIds),
    getRelevantInsights(supabase, params.learnerId, params.queryText),
    getActiveMisconceptions(supabase, params.learnerId, params.currentConceptId),
  ]);
  return { mastery, insights, misconceptions };
}
