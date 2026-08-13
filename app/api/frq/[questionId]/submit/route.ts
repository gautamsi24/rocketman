import { NextResponse } from "next/server";
import { gradeFrqAnswer } from "@/lib/agents/frq/grade";
import { serverErrorResponse } from "@/lib/api/error-response";
import { forbidden, requireLearnerContext } from "@/lib/api/guards";
import { getGroundingContent } from "@/lib/curriculum/content";
import { getFrqQuestion } from "@/lib/curriculum/frq";
import { applyGradedUpdate } from "@/lib/memory/profile-write";

export const maxDuration = 60;

const BUCKET = "frq-uploads";
// A rubric fraction at or above this counts as "correct" for the BKT signal.
const CORRECT_THRESHOLD = 0.5;

function extension(mediaType: string): string {
  if (mediaType.includes("png")) return "png";
  if (mediaType.includes("webp")) return "webp";
  return "jpg";
}

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

  // Load the question -- prompt and rubric come only from the DB, never the
  // client. It's server-issued and learner-scoped: a question that isn't this
  // learner's (or tenant's) is a 403.
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

  // Already answered: return the stored verdict, never re-grade or re-count.
  if (question.answeredAt) {
    return NextResponse.json({
      awardedPoints: question.awardedPoints ?? 0,
      maxPoints: question.maxPoints,
      correct: question.correct ?? false,
      points: question.pointsDetail ?? [],
      feedback: "You've already answered this question.",
      counted: false,
    });
  }

  if (!answerText && !hasImage) {
    return NextResponse.json({ error: "An answer is required" }, { status: 400 });
  }
  if (question.requiresDiagram && !hasImage) {
    return NextResponse.json(
      { error: "This question needs an uploaded diagram or graph" },
      { status: 400 }
    );
  }

  // Store the uploaded diagram in the private bucket, then hand its bytes to the
  // vision grader.
  let imagePath: string | null = null;
  let image: { data: Uint8Array; mediaType: string } | undefined;
  if (hasImage) {
    const file = imageFile as File;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mediaType = file.type || "image/jpeg";
    imagePath = `${learner.tenantId}/${learnerId}/${questionId}.${extension(mediaType)}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(imagePath, bytes, { contentType: mediaType, upsert: true });
    if (uploadError) {
      return serverErrorResponse(uploadError);
    }
    image = { data: bytes, mediaType };
  }

  const items = await getGroundingContent(supabase, question.conceptId);
  const reference = items.map((item) => item.teachingContent).join("\n\n");

  let grade;
  try {
    grade = await gradeFrqAnswer({
      prompt: question.prompt,
      stimulus: question.stimulus,
      taskWord: question.taskWord,
      rubric: question.rubric,
      reference,
      answerText,
      image,
    });
  } catch (err) {
    return serverErrorResponse(err);
  }

  const correct =
    question.maxPoints > 0 &&
    grade.awardedPoints / question.maxPoints >= CORRECT_THRESHOLD;

  // Stamp the answer onto the question row (server-issued question answered in
  // place). answered_at is null-guarded so a concurrent double-submit can't
  // grade twice.
  const { data: stamped, error: stampError } = await supabase
    .from("frq_questions")
    .update({
      answered_at: new Date().toISOString(),
      answer_text: answerText || null,
      image_path: imagePath,
      awarded_points: grade.awardedPoints,
      correct,
      points_detail: grade.points,
    })
    .eq("id", questionId)
    .is("answered_at", null)
    .select("id");
  if (stampError) {
    return serverErrorResponse(stampError);
  }
  const counted = (stamped?.length ?? 0) > 0;

  // Feed the deterministic BKT engine only on the first grade. A failure here
  // shouldn't lose the score already stamped above, so it doesn't fail the
  // request.
  if (counted) {
    try {
      await applyGradedUpdate(supabase, {
        tenantId: learner.tenantId,
        learnerId,
        conceptId: question.conceptId,
        correct,
      });
    } catch (err) {
      console.error("FRQ mastery update failed", err);
    }
  }

  return NextResponse.json({
    awardedPoints: grade.awardedPoints,
    maxPoints: question.maxPoints,
    correct,
    points: grade.points,
    feedback: grade.feedback,
    counted,
  });
}
