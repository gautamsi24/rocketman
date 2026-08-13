import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { gradeFrqAnswer } from "@/lib/agents/frq/grade";
import { serverErrorResponse } from "@/lib/api/error-response";
import { forbidden, requireLearnerContext } from "@/lib/api/guards";
import { getGroundingContent } from "@/lib/curriculum/content";
import { getFrqQuestion } from "@/lib/curriculum/frq";
import { getCandidateMisconceptions } from "@/lib/curriculum/misconceptions";
import {
  applyGradedUpdate,
  recordMisconceptionEvidence,
} from "@/lib/memory/profile-write";

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
    // Unique per submission attempt, not just per question -- two concurrent
    // submissions (double-click, flaky-network retry) must never write to the
    // same path, or whichever upload finishes last silently overwrites the
    // other regardless of which one actually wins the answered_at claim below.
    imagePath = `${learner.tenantId}/${learnerId}/${questionId}-${randomUUID()}.${extension(mediaType)}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(imagePath, bytes, { contentType: mediaType });
    if (uploadError) {
      return serverErrorResponse(uploadError);
    }
    image = { data: bytes, mediaType };
  }

  const [items, candidateMisconceptions] = await Promise.all([
    getGroundingContent(supabase, question.conceptId),
    getCandidateMisconceptions(supabase, learner.tenantId, question.conceptId),
  ]);
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
      candidateMisconceptions,
    });
  } catch (err) {
    return serverErrorResponse(err);
  }

  const correct =
    question.maxPoints > 0 &&
    grade.awardedPoints / question.maxPoints >= CORRECT_THRESHOLD;

  // Claim the question atomically -- answered_at is null-guarded so a
  // genuinely concurrent double-submit only ever lets one request through to
  // the memory write below, same as before.
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

  if (counted) {
    try {
      await applyGradedUpdate(supabase, {
        tenantId: learner.tenantId,
        learnerId,
        conceptId: question.conceptId,
        correct,
      });

      // Same misconception-evidence path chat turns feed (Signal-Extraction)
      // -- an FRQ answer is just another source of graded evidence, not a
      // separate signal the profile has to reconcile on its own.
      const candidateByCode = new Map(candidateMisconceptions.map((m) => [m.code, m]));
      for (const code of grade.matchedMisconceptionCodes) {
        const misconception = candidateByCode.get(code);
        if (!misconception) continue;
        await recordMisconceptionEvidence(supabase, {
          tenantId: learner.tenantId,
          learnerId,
          misconceptionId: misconception.id,
        });
      }
    } catch (err) {
      // The claim above already stamped the question, but the memory write
      // it was supposed to produce didn't happen -- unlike check-answer
      // (which applies the memory write before stamping and can just leave
      // the row untouched on failure), FRQ's claim step and memory write
      // can't be one atomic operation without a DB transaction the current
      // Supabase client setup doesn't have. Compensate instead: unstamp the
      // row so the learner sees a real error and a retry re-grades cleanly,
      // rather than a permanently "answered" question with a silently lost
      // mastery/misconception update.
      await supabase
        .from("frq_questions")
        .update({
          answered_at: null,
          answer_text: null,
          image_path: null,
          awarded_points: null,
          correct: null,
          points_detail: null,
        })
        .eq("id", questionId);
      return serverErrorResponse(err);
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
