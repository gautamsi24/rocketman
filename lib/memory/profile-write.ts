import type { SupabaseClient } from "@supabase/supabase-js";
import { bktUpdate } from "@/lib/bkt/engine";
import type { BktParams, Evidence, MasteryState } from "@/lib/bkt/types";
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

export async function applyGradedUpdate(
  supabase: Client,
  params: {
    tenantId: string;
    learnerId: string;
    conceptId: string;
    correct: boolean;
  }
): Promise<MasteryState> {
  return applyEvidence(supabase, {
    tenantId: params.tenantId,
    learnerId: params.learnerId,
    conceptId: params.conceptId,
    evidence: { kind: "graded", correct: params.correct },
  });
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
