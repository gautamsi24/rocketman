import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { generateCheckQuestion } from "@/lib/agents/qna/generate";
import { serverErrorResponse } from "@/lib/api/error-response";
import { forbidden, requireLearnerId } from "@/lib/api/guards";
import { getConceptSummary } from "@/lib/curriculum/concepts";
import { getGroundingContent } from "@/lib/curriculum/content";
import { conceptLabel } from "@/lib/curriculum/labels";
import { getLearner } from "@/lib/learners/learner";
import {
  getActiveMisconceptions,
  getMasteryForConcepts,
} from "@/lib/memory/profile-read";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const maxDuration = 30;

function questionKey(question: string): string {
  return createHash("sha256")
    .update(question.trim().toLowerCase())
    .digest("hex");
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/concepts/[id]/check-question">
) {
  const learnerId = await requireLearnerId();
  if (learnerId instanceof NextResponse) return learnerId;

  const { id: conceptId } = await ctx.params;
  const supabase = createServiceRoleClient();
  const learner = await getLearner(supabase, learnerId);

  // Persist every question we hand out and return only its id -- check-answer
  // accepts that id, never client-supplied text, so the server always knows
  // exactly what it asked. A null question issues nothing.
  async function issue(question: string | null) {
    if (!question) {
      return NextResponse.json({ question: null, questionId: null });
    }
    const { data, error } = await supabase
      .from("qna_attempts")
      .insert({
        tenant_id: learner.tenantId,
        learner_id: learnerId as string,
        concept_id: conceptId,
        question_text: question,
        question_hash: questionKey(question),
      })
      .select("id")
      .single();
    if (error || !data) {
      return serverErrorResponse(error ?? new Error("Failed to issue question"));
    }
    return NextResponse.json({ question, questionId: data.id });
  }

  // Never read another tenant's curriculum content.
  const { data: conceptRow, error: conceptError } = await supabase
    .from("concepts")
    .select("tenant_id")
    .eq("id", conceptId)
    .maybeSingle();
  if (conceptError || !conceptRow) {
    return issue(null);
  }
  if (conceptRow.tenant_id !== learner.tenantId) {
    return forbidden();
  }

  const concept = await getConceptSummary(supabase, conceptId);
  const items = await getGroundingContent(supabase, conceptId);
  const reference = items.map((item) => item.teachingContent).join("\n\n");
  const authored =
    items.map((item) => item.promptText).find((text) => text?.trim()) ?? null;

  // Without reference material there's nothing to ground a generated question
  // in -- fall back to an authored one (or null).
  if (!concept || !reference.trim()) {
    return issue(authored);
  }

  try {
    const [mastery] = await getMasteryForConcepts(supabase, learnerId, [conceptId]);
    const misconceptions = await getActiveMisconceptions(
      supabase,
      learnerId,
      conceptId
    );
    const { data: recent } = await supabase
      .from("qna_attempts")
      .select("question_text")
      .eq("learner_id", learnerId)
      .eq("concept_id", conceptId)
      .order("created_at", { ascending: false })
      .limit(5);

    const generated = await generateCheckQuestion({
      topic: conceptLabel(concept, "this topic"),
      reference,
      masteryProb: mastery?.masteryProb ?? 0.3,
      misconceptions: misconceptions.map((m) => m.label),
      recentQuestions: (recent ?? []).map((row) => row.question_text),
    });

    // A blank generation is a failure -- fall back to an authored question
    // rather than telling the learner the topic has no questions.
    return issue(generated.trim() ? generated : authored);
  } catch {
    // Generation failed -- fall back to an authored question so Quick check
    // still works.
    return issue(authored);
  }
}
