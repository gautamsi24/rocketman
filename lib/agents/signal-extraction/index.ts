import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText, Output } from "ai";
import { classificationModel } from "@/lib/agents/shared/model";
import { getCandidateMisconceptions } from "@/lib/curriculum/misconceptions";
import type { MisconceptionCatalogEntry } from "@/lib/curriculum/types";
import {
  applyGradedUpdate,
  recordMisconceptionEvidence,
} from "@/lib/memory/profile-write";
import type { Database } from "@/lib/supabase/types";
import { buildSignalExtractionSchema } from "./schema";

type Client = SupabaseClient<Database>;

function buildClassificationPrompt(params: {
  learnerMessage: string;
  tutorMessage: string;
  candidates: MisconceptionCatalogEntry[];
}): string {
  const candidateList = params.candidates
    .map(
      (c) => `- ${c.code}: ${c.label}${c.description ? ` (${c.description})` : ""}`
    )
    .join("\n");

  return [
    "You are classifying one turn of a tutoring conversation for a student learning AP Biology.",
    "",
    `Student's message: "${params.learnerMessage}"`,
    `Tutor's response: "${params.tutorMessage}"`,
    "",
    "Determine:",
    "- correctness: 'correct' if the student's message shows a correct understanding of the concept being discussed, 'incorrect' if it shows a wrong understanding, or 'not_gradable' if the message is a question, acknowledgment, or otherwise not an attempt at demonstrating understanding.",
    "- matchedMisconceptionCodes: any of the misconceptions below that the student's message exhibits, even if correctness is not_gradable overall.",
    "",
    "Candidate misconceptions:",
    candidateList || "(none)",
  ].join("\n");
}

export async function processTurnEvent(
  supabase: Client,
  turnEventId: string
): Promise<void> {
  const { data: turnEvent, error: turnEventError } = await supabase
    .from("turn_events")
    .select("*")
    .eq("id", turnEventId)
    .single();
  if (turnEventError) throw turnEventError;

  // Idempotency guard: a row already marked processed (e.g. reprocessed via
  // the sweep backstop after already succeeding) is a no-op, not an error.
  if (turnEvent.status === "processed") return;

  if (!turnEvent.concept_id) {
    await supabase
      .from("turn_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("id", turnEventId);
    return;
  }

  const conceptId = turnEvent.concept_id;

  // Let failures throw -- Inngest's retry/backoff wraps this call and its
  // onFailure handler is the one place that marks status: 'error', only
  // once retries are exhausted (see lib/inngest/functions.ts).
  const candidates = await getCandidateMisconceptions(
    supabase,
    turnEvent.tenant_id,
    conceptId
  );

  const { output } = await generateText({
    model: classificationModel,
    output: Output.object({
      schema: buildSignalExtractionSchema(candidates.map((c) => c.code)),
    }),
    prompt: buildClassificationPrompt({
      learnerMessage: turnEvent.learner_message,
      tutorMessage: turnEvent.tutor_message,
      candidates,
    }),
  });

  const candidateByCode = new Map(candidates.map((c) => [c.code, c]));
  const matchedMisconceptions = output.matchedMisconceptionCodes
    .map((code) => candidateByCode.get(code))
    .filter((c): c is MisconceptionCatalogEntry => c !== undefined);

  if (output.correctness !== "not_gradable") {
    await applyGradedUpdate(supabase, {
      tenantId: turnEvent.tenant_id,
      learnerId: turnEvent.learner_id,
      conceptId,
      correct: output.correctness === "correct",
    });
  }

  for (const misconception of matchedMisconceptions) {
    await recordMisconceptionEvidence(supabase, {
      tenantId: turnEvent.tenant_id,
      learnerId: turnEvent.learner_id,
      misconceptionId: misconception.id,
    });
  }

  await supabase
    .from("turn_events")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("id", turnEventId);
}
