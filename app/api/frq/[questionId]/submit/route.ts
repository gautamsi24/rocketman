import { NextResponse } from "next/server";
import { submitFrqAnswer } from "@/lib/agents/frq/submit";
import { serverErrorResponse } from "@/lib/api/error-response";
import { forbidden, requireLearnerContext } from "@/lib/api/guards";

export const maxDuration = 60;

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/frq/[questionId]/submit">
) {
  const auth = await requireLearnerContext();
  if (auth instanceof NextResponse) return auth;
  const { learnerId, learner, supabase } = auth;

  const { questionId } = await ctx.params;
  const form = await req.formData();
  const answerText = (form.get("answerText") as string | null)?.trim() ?? "";
  const imageFile = form.get("image");
  const hasImage = imageFile instanceof File && imageFile.size > 0;

  let image: { data: Uint8Array; mediaType: string } | undefined;
  if (hasImage) {
    const file = imageFile as File;
    image = {
      data: new Uint8Array(await file.arrayBuffer()),
      mediaType: file.type || "image/jpeg",
    };
  }

  const result = await submitFrqAnswer(supabase, {
    questionId,
    learnerId,
    tenantId: learner.tenantId,
    answerText,
    image,
  });

  switch (result.status) {
    case "not_found":
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    case "forbidden":
      return forbidden();
    case "invalid":
      return NextResponse.json({ error: result.error }, { status: 400 });
    case "error":
      return serverErrorResponse(result.error);
    case "already_answered":
    case "graded":
      return NextResponse.json({
        awardedPoints: result.awardedPoints,
        maxPoints: result.maxPoints,
        correct: result.correct,
        points: result.points,
        feedback: result.feedback,
        counted: result.counted,
      });
  }
}
