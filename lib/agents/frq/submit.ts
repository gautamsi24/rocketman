import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gradeFrqAnswer } from "@/lib/agents/frq/grade";
import { getGroundingContent } from "@/lib/curriculum/content";
import { getFrqQuestion, type FrqScoredPoint } from "@/lib/curriculum/frq";
import { getCandidateMisconceptions } from "@/lib/curriculum/misconceptions";
import {
  applyGradedUpdate,
  recordMisconceptionEvidence,
} from "@/lib/memory/profile-write";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

const BUCKET = "frq-uploads";
// A rubric fraction at or above this counts as "correct" for the BKT signal.
const CORRECT_THRESHOLD = 0.5;

function extension(mediaType: string): string {
  if (mediaType.includes("png")) return "png";
  if (mediaType.includes("webp")) return "webp";
  return "jpg";
}

export type SubmitFrqAnswerResult =
  | { status: "not_found" }
  | { status: "forbidden" }
  | { status: "invalid"; error: string }
  | {
      status: "already_answered" | "graded";
      awardedPoints: number;
      maxPoints: number;
      correct: boolean;
      points: FrqScoredPoint[];
      feedback: string;
      counted: boolean;
    }
  | { status: "error"; error: unknown };

/**
 * Grades one FRQ answer end to end: ownership check, atomic claim
 * (answered_at is null-guarded so a genuinely concurrent double-submit only
 * ever lets one request through), LLM grading, BKT + misconception writes,
 * and compensate-on-failure (unstamp the row if the memory write fails --
 * there's no DB transaction available to make the claim and the write one
 * atomic operation). Shared by the single-question submit route and the
 * exam-style batch submit route so this logic only exists once.
 */
export async function submitFrqAnswer(
  supabase: Client,
  params: {
    questionId: string;
    learnerId: string;
    tenantId: string;
    answerText: string;
    image?: { data: Uint8Array; mediaType: string };
  }
): Promise<SubmitFrqAnswerResult> {
  const question = await getFrqQuestion(supabase, params.questionId);
  if (!question) return { status: "not_found" };
  if (
    question.learnerId !== params.learnerId ||
    question.tenantId !== params.tenantId
  ) {
    return { status: "forbidden" };
  }

  // Already answered: return the stored verdict, never re-grade or re-count.
  if (question.answeredAt) {
    return {
      status: "already_answered",
      awardedPoints: question.awardedPoints ?? 0,
      maxPoints: question.maxPoints,
      correct: question.correct ?? false,
      points: question.pointsDetail ?? [],
      feedback: "You've already answered this question.",
      counted: false,
    };
  }

  const answerText = params.answerText.trim();
  if (!answerText && !params.image) {
    return { status: "invalid", error: "An answer is required" };
  }

  // Store the uploaded diagram in the private bucket, then hand its bytes to
  // the vision grader. requiresDiagram is a grading expectation the rubric
  // itself enforces, not a submission gate -- a text-only answer is valid.
  let imagePath: string | null = null;
  if (params.image) {
    // Unique per submission attempt, not just per question -- two concurrent
    // submissions (double-click, flaky-network retry) must never write to the
    // same path, or whichever upload finishes last silently overwrites the
    // other regardless of which one actually wins the answered_at claim below.
    imagePath = `${params.tenantId}/${params.learnerId}/${params.questionId}-${randomUUID()}.${extension(params.image.mediaType)}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(imagePath, params.image.data, {
        contentType: params.image.mediaType,
      });
    if (uploadError) return { status: "error", error: uploadError };
  }

  const [items, candidateMisconceptions] = await Promise.all([
    getGroundingContent(supabase, question.conceptId),
    getCandidateMisconceptions(supabase, params.tenantId, question.conceptId),
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
      image: params.image,
      candidateMisconceptions,
    });
  } catch (err) {
    return { status: "error", error: err };
  }

  const correct =
    question.maxPoints > 0 &&
    grade.awardedPoints / question.maxPoints >= CORRECT_THRESHOLD;

  // Claim the question atomically -- answered_at is null-guarded so a
  // genuinely concurrent double-submit only ever lets one request through to
  // the memory write below.
  const { data: stamped, error: stampError } = await supabase
    .from("frq_questions")
    .update({
      answered_at: new Date().toISOString(),
      answer_text: answerText || null,
      image_path: imagePath,
      awarded_points: grade.awardedPoints,
      correct,
      points_detail: grade.points,
      feedback: grade.feedback,
    })
    .eq("id", params.questionId)
    .is("answered_at", null)
    .select("id");
  if (stampError) return { status: "error", error: stampError };
  const counted = (stamped?.length ?? 0) > 0;

  if (counted) {
    try {
      await applyGradedUpdate(supabase, {
        tenantId: params.tenantId,
        learnerId: params.learnerId,
        conceptId: question.conceptId,
        correct,
        source: "frq",
      });

      // Same misconception-evidence path chat turns feed (Signal-Extraction)
      // -- an FRQ answer is just another source of graded evidence, not a
      // separate signal the profile has to reconcile on its own.
      const candidateByCode = new Map(
        candidateMisconceptions.map((m) => [m.code, m])
      );
      for (const code of grade.matchedMisconceptionCodes) {
        const misconception = candidateByCode.get(code);
        if (!misconception) continue;
        await recordMisconceptionEvidence(supabase, {
          tenantId: params.tenantId,
          learnerId: params.learnerId,
          misconceptionId: misconception.id,
        });
      }
    } catch (err) {
      // The claim above already stamped the question, but the memory write
      // it was supposed to produce didn't happen. Compensate: unstamp the
      // row so the caller sees a real error and a retry re-grades cleanly,
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
          feedback: null,
        })
        .eq("id", params.questionId);
      return { status: "error", error: err };
    }
  }

  return {
    status: "graded",
    awardedPoints: grade.awardedPoints,
    maxPoints: question.maxPoints,
    correct,
    points: grade.points,
    feedback: grade.feedback,
    counted,
  };
}
