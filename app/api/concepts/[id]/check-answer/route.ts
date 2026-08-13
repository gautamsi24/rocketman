import { NextResponse } from "next/server";
import { gradeCheckAnswer } from "@/lib/agents/qna/grade";
import { serverErrorResponse } from "@/lib/api/error-response";
import { forbidden, requireLearnerId } from "@/lib/api/guards";
import { getGroundingContent } from "@/lib/curriculum/content";
import { getLearner } from "@/lib/learners/learner";
import { applyGradedUpdate } from "@/lib/memory/profile-write";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const maxDuration = 30;

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/concepts/[id]/check-answer">
) {
  const learnerId = await requireLearnerId();
  if (learnerId instanceof NextResponse) return learnerId;

  const { id: conceptId } = await ctx.params;
  const { questionId, answer }: { questionId?: string; answer?: string } =
    await req.json();
  if (!questionId?.trim()) {
    return NextResponse.json(
      { error: "Question id is required" },
      { status: 400 }
    );
  }
  if (!answer?.trim()) {
    return NextResponse.json({ error: "Answer is required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const learner = await getLearner(supabase, learnerId);

  // A learner may only answer a question the server actually issued to them.
  // We grade the *stored* question text, never anything the client sends, so
  // learner input can't steer the grader or fabricate a fresh graded attempt.
  const { data: issued, error: issuedError } = await supabase
    .from("qna_attempts")
    .select(
      "id, tenant_id, learner_id, concept_id, question_text, question_hash, answered_at, correct"
    )
    .eq("id", questionId)
    .maybeSingle();
  if (issuedError) {
    return serverErrorResponse(issuedError);
  }
  if (!issued) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Ownership: the question must belong to this learner + tenant and match the
  // concept in the URL. A mismatch is a 403, not a hint about what exists.
  if (
    issued.learner_id !== learnerId ||
    issued.tenant_id !== learner.tenantId ||
    issued.concept_id !== conceptId
  ) {
    return forbidden();
  }
  // Already answered -- return the stored verdict, never re-grade or re-count.
  if (issued.answered_at) {
    return NextResponse.json({
      correct: issued.correct ?? false,
      feedback: "You've already answered this question.",
      counted: false,
    });
  }

  const items = await getGroundingContent(supabase, conceptId);
  const reference = items.map((item) => item.teachingContent).join("\n\n");

  let grade;
  try {
    grade = await gradeCheckAnswer({
      question: issued.question_text,
      answer,
      reference,
    });
  } catch (err) {
    return serverErrorResponse(err);
  }

  // Count toward mastery only if no earlier-answered question with the same text
  // already did -- stops replaying an identical (authored-fallback) question to
  // farm mastery/attempts.
  const { data: priorCounted, error: priorError } = await supabase
    .from("qna_attempts")
    .select("id")
    .eq("learner_id", learnerId)
    .eq("concept_id", conceptId)
    .eq("question_hash", issued.question_hash)
    .not("answered_at", "is", null)
    .neq("id", issued.id)
    .limit(1);
  if (priorError) {
    return serverErrorResponse(priorError);
  }
  const counted = (priorCounted?.length ?? 0) === 0;

  // Apply the mastery update *before* marking the question answered. If BKT
  // throws we return 500 and leave the question un-answered, so a retry still
  // works -- the question isn't permanently burned.
  if (counted) {
    try {
      await applyGradedUpdate(supabase, {
        tenantId: learner.tenantId,
        learnerId,
        conceptId,
        correct: grade.correct,
      });
    } catch (err) {
      return serverErrorResponse(err);
    }
  }

  const { error: markError } = await supabase
    .from("qna_attempts")
    .update({ answered_at: new Date().toISOString(), correct: grade.correct })
    .eq("id", issued.id)
    .is("answered_at", null);
  if (markError) {
    return serverErrorResponse(markError);
  }

  return NextResponse.json({ ...grade, counted });
}
