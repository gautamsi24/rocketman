import type { SupabaseClient } from "@supabase/supabase-js";
import { bktUpdate } from "@/lib/bkt/engine";
import type { BktParams, Evidence, MasteryState } from "@/lib/bkt/types";
import { getTransferTargets } from "@/lib/curriculum/transfer";
import {
  recordInteraction,
  type InteractionSource,
} from "@/lib/memory/interactions";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

async function getBktParams(supabase: Client, conceptId: string): Promise<BktParams> {
  const { data, error } = await supabase
    .from("bkt_concept_params")
    .select("p_init, p_learn, p_guess, p_slip")
    .eq("concept_id", conceptId)
    .single();
  if (error) throw error;
  return {
    pInit: data.p_init,
    pLearn: data.p_learn,
    pGuess: data.p_guess,
    pSlip: data.p_slip,
  };
}

async function getPriorState(
  supabase: Client,
  learnerId: string,
  conceptId: string,
  pInit: number
): Promise<MasteryState> {
  const { data, error } = await supabase
    .from("concept_mastery")
    .select("mastery_prob, confidence, attempts")
    .eq("learner_id", learnerId)
    .eq("concept_id", conceptId)
    .maybeSingle();
  if (error) throw error;
  if (data) {
    return {
      masteryProb: data.mastery_prob,
      confidence: data.confidence,
      attempts: data.attempts,
    };
  }
  return { masteryProb: pInit, confidence: 0, attempts: 0 };
}

async function persistMasteryUpdate(
  supabase: Client,
  params: {
    tenantId: string;
    learnerId: string;
    conceptId: string;
    state: MasteryState;
  }
): Promise<void> {
  const { tenantId, learnerId, conceptId, state } = params;
  const now = new Date().toISOString();

  const { error: upsertError } = await supabase.from("concept_mastery").upsert(
    {
      tenant_id: tenantId,
      learner_id: learnerId,
      concept_id: conceptId,
      mastery_prob: state.masteryProb,
      confidence: state.confidence,
      attempts: state.attempts,
      last_practiced_at: now,
      updated_at: now,
    },
    { onConflict: "learner_id,concept_id" }
  );
  if (upsertError) throw upsertError;

  const { error: historyError } = await supabase
    .from("concept_mastery_history")
    .insert({
      tenant_id: tenantId,
      learner_id: learnerId,
      concept_id: conceptId,
      mastery_prob: state.masteryProb,
    });
  if (historyError) throw historyError;
}

async function applyEvidence(
  supabase: Client,
  params: {
    tenantId: string;
    learnerId: string;
    conceptId: string;
    evidence: Evidence;
  }
): Promise<MasteryState> {
  const bktParams = await getBktParams(supabase, params.conceptId);
  const prior = await getPriorState(
    supabase,
    params.learnerId,
    params.conceptId,
    bktParams.pInit
  );

  const nextState = bktUpdate(prior, bktParams, params.evidence);

  await persistMasteryUpdate(supabase, {
    tenantId: params.tenantId,
    learnerId: params.learnerId,
    conceptId: params.conceptId,
    state: nextState,
  });

  return nextState;
}

/**
 * Applies a damped version of the same graded evidence to a related concept.
 *
 * Two constraints shape the write, and both are load-bearing:
 *
 * It UPDATEs rather than upserts, and the payload carries only mastery_prob.
 * An upsert that echoed back `attempts` and `confidence` read moments earlier
 * would roll them back whenever a direct grade for the same concept committed
 * in between -- and FRQ set submission grades up to six questions under
 * Promise.all, weakest-first, so same-unit collisions are routine. Losing an
 * `attempts` increment silently un-completes a concept the learner did answer.
 *
 * It skips concepts with no existing row. Creating one would leave
 * last_practiced_at NULL, and applyDecay returns the probability untouched in
 * that case -- so transfer-inflated mastery on a never-practised concept would
 * never decay, and FRQ targeting (which picks the weakest concepts) would
 * deprioritise it forever. Transfer refines an estimate the learner has
 * actually generated; it does not invent one.
 */
async function applyTransferredEvidence(
  supabase: Client,
  params: {
    tenantId: string;
    learnerId: string;
    conceptId: string;
    weight: number;
    correct: boolean;
  }
): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from("concept_mastery")
    .select("mastery_prob, confidence, attempts")
    .eq("learner_id", params.learnerId)
    .eq("concept_id", params.conceptId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) return;

  const bktParams = await getBktParams(supabase, params.conceptId);
  const prior: MasteryState = {
    masteryProb: existing.mastery_prob,
    confidence: existing.confidence,
    attempts: existing.attempts,
  };

  const direct = bktUpdate(prior, bktParams, {
    kind: "graded",
    correct: params.correct,
  });
  const masteryProb =
    prior.masteryProb + params.weight * (direct.masteryProb - prior.masteryProb);

  const { error } = await supabase
    .from("concept_mastery")
    .update({ mastery_prob: masteryProb, updated_at: new Date().toISOString() })
    .eq("learner_id", params.learnerId)
    .eq("concept_id", params.conceptId);
  if (error) throw error;
}

export async function applyGradedUpdate(
  supabase: Client,
  params: {
    tenantId: string;
    learnerId: string;
    conceptId: string;
    correct: boolean;
    source?: InteractionSource;
    labelRationale?: string | null;
    turnEventId?: string | null;
  }
): Promise<MasteryState> {
  const state = await applyEvidence(supabase, {
    tenantId: params.tenantId,
    learnerId: params.learnerId,
    conceptId: params.conceptId,
    evidence: { kind: "graded", correct: params.correct },
  });

  await recordInteraction(supabase, {
    tenantId: params.tenantId,
    learnerId: params.learnerId,
    conceptId: params.conceptId,
    correct: params.correct,
    source: params.source ?? "chat",
    labelRationale: params.labelRationale,
    turnEventId: params.turnEventId,
  });

  // Everything below is secondary evidence, and the direct grade above is
  // already committed. The whole block is guarded -- including the target
  // lookup, which would otherwise throw on a deploy where the code shipped
  // before the migration ran, after the mastery upsert had landed. Callers
  // treat that throw as a failed submission and compensate by unstamping the
  // question, so the learner retries and the direct update is applied twice.
  //
  // One hop only: applyTransferredEvidence calls bktUpdate directly and never
  // re-enters this function, so transfer never cascades.
  try {
    const targets = await getTransferTargets(
      supabase,
      params.tenantId,
      params.conceptId
    );
    await Promise.all(
      targets.map((target) =>
        applyTransferredEvidence(supabase, {
          tenantId: params.tenantId,
          learnerId: params.learnerId,
          conceptId: target.relatedConceptId,
          weight: target.weight,
          correct: params.correct,
        }).catch((err) =>
          console.error("transfer propagation failed", target.relatedConceptId, err)
        )
      )
    );
  } catch (err) {
    console.error("transfer target lookup failed", params.conceptId, err);
  }

  return state;
}

export async function applyLearnerAssertion(
  supabase: Client,
  params: {
    tenantId: string;
    learnerId: string;
    conceptId: string;
    assertionType: "knows_now" | "misconception_resolved";
    note?: string;
  }
): Promise<MasteryState> {
  const nextState = await applyEvidence(supabase, {
    tenantId: params.tenantId,
    learnerId: params.learnerId,
    conceptId: params.conceptId,
    evidence: { kind: "learner_assertion" },
  });

  const { error } = await supabase.from("learner_assertions").insert({
    tenant_id: params.tenantId,
    learner_id: params.learnerId,
    concept_id: params.conceptId,
    assertion_type: params.assertionType,
    note: params.note ?? null,
  });
  if (error) throw error;

  // Assertions move concept_mastery, so they must appear in the ledger too --
  // otherwise concept_mastery is not a derived aggregate over kt_interactions
  // and a replay would not reproduce it. Tagged 'assertion' so training can
  // exclude self-reported evidence, which is the reason that source exists.
  await recordInteraction(supabase, {
    tenantId: params.tenantId,
    learnerId: params.learnerId,
    conceptId: params.conceptId,
    correct: true,
    source: "assertion",
  });

  return nextState;
}

export async function recordMisconceptionEvidence(
  supabase: Client,
  params: { tenantId: string; learnerId: string; misconceptionId: string }
): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from("learner_misconceptions")
    .select("id, evidence_count")
    .eq("learner_id", params.learnerId)
    .eq("misconception_id", params.misconceptionId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const { error } = await supabase
      .from("learner_misconceptions")
      .update({
        evidence_count: existing.evidence_count + 1,
        last_observed_at: new Date().toISOString(),
        status: "active",
      })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("learner_misconceptions").insert({
    tenant_id: params.tenantId,
    learner_id: params.learnerId,
    misconception_id: params.misconceptionId,
  });
  if (error) throw error;
}
