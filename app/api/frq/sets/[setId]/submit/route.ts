import { NextResponse } from "next/server";
import { submitFrqAnswer } from "@/lib/agents/frq/submit";
import { serverErrorResponse } from "@/lib/api/error-response";
import { forbidden, requireLearnerContext } from "@/lib/api/guards";
import { getFrqSetById } from "@/lib/curriculum/frq";

// Grading a full set of up to 6 questions, several with vision calls, is
// several sequential-feeling LLM calls even run in parallel.
export const maxDuration = 120;

// Exam-style batch submit: grades every question in the set that has a
// draft answer (text or image) and isn't already graded, all at once,
// instead of one at a time. Blank questions are silently skipped -- a
// learner can answer a subset and submit again later for the rest, same
// "answer what you can" flexibility as a real exam.
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/frq/sets/[setId]/submit">
) {
  const auth = await requireLearnerContext();
  if (auth instanceof NextResponse) return auth;
  const { learnerId, learner, supabase } = auth;

  const { setId } = await ctx.params;

  const { data: rows, error: rowsError } = await supabase
    .from("frq_questions")
    .select("id, learner_id, tenant_id, answered_at")
    .eq("set_id", setId);
  if (rowsError) return serverErrorResponse(rowsError);
  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const owned = rows.every(
    (row) => row.learner_id === learnerId && row.tenant_id === learner.tenantId
  );
  if (!owned) return forbidden();

  const form = await req.formData();

  const failedQuestionIds: string[] = [];
  await Promise.all(
    rows
      .filter((row) => !row.answered_at)
      .map(async (row) => {
        const answerText =
          (form.get(`answerText_${row.id}`) as string | null)?.trim() ?? "";
        const imageFile = form.get(`image_${row.id}`);
        const hasImage = imageFile instanceof File && imageFile.size > 0;
        if (!answerText && !hasImage) return; // untouched -- skip, not an error

        let image: { data: Uint8Array; mediaType: string } | undefined;
        if (hasImage) {
          const file = imageFile as File;
          image = {
            data: new Uint8Array(await file.arrayBuffer()),
            mediaType: file.type || "image/jpeg",
          };
        }

        const result = await submitFrqAnswer(supabase, {
          questionId: row.id,
          learnerId,
          tenantId: learner.tenantId,
          answerText,
          image,
        });
        if (result.status === "error") failedQuestionIds.push(row.id);
      })
  );

  const set = await getFrqSetById(supabase, setId);
  return NextResponse.json({ set, failedQuestionIds });
}
