import { generateText, Output } from "ai";
import { z } from "zod";
import { classificationModel } from "@/lib/agents/shared/model";

export interface GeneratedRubricPoint {
  code: string;
  text: string;
  points: number;
}

export interface GeneratedFrq {
  taskWord: string;
  stimulus: string | null;
  prompt: string;
  rubric: GeneratedRubricPoint[];
  maxPoints: number;
}

// Fixed exam-style totals: a long free-response is worth 10 points, a short one
// 4 -- the same weighting AP FRQs use. The generated rubric's discrete points
// are weighted to sum to this total.
export const FRQ_TOTAL_POINTS: Record<"long" | "short", number> = {
  long: 10,
  short: 4,
};

// The task words a generated prompt may open with -- the same closed set the
// learner-facing "Hits & Misses" reference documents.
const TASK_WORD_ENUM = [
  "identify",
  "define",
  "describe",
  "explain",
  "compare",
  "justify",
] as const;

/**
 * Splits a point total across n rubric points as evenly as possible with whole
 * numbers -- e.g. 10 over 4 -> [3,3,2,2], 4 over 3 -> [2,1,1]. The system, not
 * the model, assigns the weights, so scoring stays deterministic.
 */
function distributePoints(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const remainder = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Generates one exam-style free-response question grounded strictly in the
 * concept's reference material -- never inventing content outside it, mirroring
 * the Quick-check generator's grounding guarantee. Produces the prompt, an
 * optional data/scenario stimulus, and a point-by-point scoring rubric together,
 * so grading later has an answer key. Subject-neutral: it names no subject.
 */
export async function generateFrqQuestion(params: {
  topic: string;
  reference: string;
  kind: "long" | "short";
  requiresDiagram: boolean;
  masteryPct: number;
  avoidPrompts: string[];
}): Promise<GeneratedFrq> {
  const total = FRQ_TOTAL_POINTS[params.kind];
  // Long questions (worth more) get more discrete scoring points than short.
  const minPoints = params.kind === "long" ? 3 : 2;
  const maxPointsCount = params.kind === "long" ? 5 : 3;

  const shape =
    params.kind === "long"
      ? "a LONG free-response question: give a short data table or scenario as the stimulus, and ask the student to analyze it. It must require the student to draw a graph or a labeled diagram on paper."
      : "a SHORT free-response question: a focused investigation, conceptual, or calculation prompt. No diagram required; leave the stimulus null unless a one-line scenario is needed.";

  const generatedSchema = z.object({
    taskWord: z.enum(TASK_WORD_ENUM),
    stimulus: z.string().nullable(),
    prompt: z.string(),
    rubric: z
      .array(z.object({ code: z.string(), text: z.string() }))
      .min(minPoints)
      .max(maxPointsCount),
  });

  const { output } = await generateText({
    model: classificationModel,
    output: Output.object({ schema: generatedSchema }),
    prompt: [
      `Write one exam-style free-response question to test a student's understanding of the topic "${params.topic}".`,
      `Produce ${shape}`,
      "Ground it STRICTLY in the reference material below -- never ask about anything outside it.",
      `Tune the difficulty to the student's current mastery of about ${params.masteryPct}% (lower -> more foundational; higher -> applied reasoning or 'justify why').`,
      "Open the prompt with a single task word (identify, define, describe, explain, compare, or justify) and set taskWord to that word.",
      `This question is worth ${total} points total. Write a scoring rubric of ${minPoints}-${maxPointsCount} discrete points that together cover a full-credit answer. Each point: a short unique 'code' slug (e.g. 'axes', 'mechanism') and 'text' stating exactly what earns that point. One point = one gradable idea.`,
      params.avoidPrompts.length > 0
        ? `Do NOT repeat or closely paraphrase any of these questions the student has already answered:\n${params.avoidPrompts
            .map((p) => `- ${p}`)
            .join("\n")}`
        : "",
      "",
      "Reference material:",
      params.reference,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  // The system weights each rubric point so they sum to the fixed total -- the
  // model decides the rubric content, never the arithmetic.
  const weights = distributePoints(total, output.rubric.length);
  const rubric: GeneratedRubricPoint[] = output.rubric.map((point, i) => ({
    code: point.code,
    text: point.text,
    points: weights[i],
  }));

  return {
    taskWord: output.taskWord,
    stimulus: output.stimulus?.trim() ? output.stimulus : null,
    prompt: output.prompt.trim(),
    rubric,
    maxPoints: total,
  };
}
