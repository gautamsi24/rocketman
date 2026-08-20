import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export type InteractionSource = "chat" | "qna" | "frq" | "assertion";

export async function recordInteraction(
  supabase: Client,
  params: {
    tenantId: string;
    learnerId: string;
    conceptId: string;
    correct: boolean;
    source: InteractionSource;
    labelRationale?: string | null;
    turnEventId?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("kt_interactions").insert({
    tenant_id: params.tenantId,
    learner_id: params.learnerId,
    concept_id: params.conceptId,
    correct: params.correct,
    source: params.source,
    label_rationale: params.labelRationale ?? null,
    turn_event_id: params.turnEventId ?? null,
  });

  // A missing corpus row is recoverable; a lost grade is not. The mastery
  // update is the user-visible effect and has already happened by the time
  // this runs, so a ledger failure logs rather than failing the request.
  if (error) console.error("kt_interactions insert failed", error);
}
