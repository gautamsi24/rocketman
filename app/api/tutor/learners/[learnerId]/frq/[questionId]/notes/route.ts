import { NextResponse } from "next/server";
import { serverErrorResponse } from "@/lib/api/error-response";
import { forbidden, requireTutorContext } from "@/lib/api/guards";
import { getFrqQuestion } from "@/lib/curriculum/frq";

// A tutor leaving a suggestion on a specific learner's FRQ answer -- the one
// mutation the otherwise read-only tutor console has.
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/tutor/learners/[learnerId]/frq/[questionId]/notes">
) {
  const auth = await requireTutorContext();
  if (auth instanceof NextResponse) return auth;
  const { session, supabase } = auth;

  const { learnerId, questionId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { noteText?: string }
    | null;
  const noteText = body?.noteText?.trim() ?? "";
  if (!noteText) {
    return NextResponse.json({ error: "A note is required" }, { status: 400 });
  }

  const question = await getFrqQuestion(supabase, questionId);
  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (question.learnerId !== learnerId) {
    return forbidden();
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!tenant || question.tenantId !== tenant.id) {
    return forbidden();
  }

  const { data: note, error } = await supabase
    .from("frq_tutor_notes")
    .insert({
      tenant_id: question.tenantId,
      frq_question_id: questionId,
      learner_id: learnerId,
      tutor_user_id: session.userId,
      note_text: noteText,
    })
    .select("id, note_text, created_at")
    .single();
  if (error) return serverErrorResponse(error);

  return NextResponse.json({
    id: note.id,
    noteText: note.note_text,
    createdAt: note.created_at,
  });
}
