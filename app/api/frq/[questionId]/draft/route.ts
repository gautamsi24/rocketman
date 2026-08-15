import { NextResponse } from "next/server";
import { serverErrorResponse } from "@/lib/api/error-response";
import { forbidden, requireLearnerContext } from "@/lib/api/guards";
import { getFrqQuestion } from "@/lib/curriculum/frq";

// Saves an in-progress answer so it survives a reload/navigation before the
// learner clicks "Submit all" -- exam-style batch submit (see
// /api/frq/sets/[setId]/submit) means grading no longer happens per
// question, so there needs to be somewhere for a draft to live in the
// meantime. A no-op once the question is graded (the .is("answered_at",
// null) guard below), so a late/racing draft-save can never clobber a real
// verdict.
export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/frq/[questionId]/draft">
) {
  const auth = await requireLearnerContext();
  if (auth instanceof NextResponse) return auth;
  const { learnerId, learner, supabase } = auth;

  const { questionId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { answerText?: string }
    | null;
  const answerText = body?.answerText?.trim() ?? "";

  const question = await getFrqQuestion(supabase, questionId);
  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (
    question.learnerId !== learnerId ||
    question.tenantId !== learner.tenantId
  ) {
    return forbidden();
  }

  const { error } = await supabase
    .from("frq_questions")
    .update({ answer_text: answerText || null })
    .eq("id", questionId)
    .is("answered_at", null);
  if (error) return serverErrorResponse(error);

  return NextResponse.json({ saved: true });
}
