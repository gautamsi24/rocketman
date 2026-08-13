import { generateText, Output } from "ai";
import { z } from "zod";
import { classificationModel } from "@/lib/agents/shared/model";

const questionSchema = z.object({ question: z.string() });

/**
 * Generates one fresh check question grounded in the concept's reference
 * material, personalised to the learner (difficulty by mastery, targeting known
 * misconceptions, avoiding recently-asked questions). Subject-neutral so it
 * works for any curriculum.
 */
export async function generateCheckQuestion(params: {
  topic: string;
  reference: string;
  masteryProb: number;
  misconceptions: string[];
  recentQuestions: string[];
}): Promise<string> {
  const masteryPct = Math.round(params.masteryProb * 100);

  const { output } = await generateText({
    model: classificationModel,
    output: Output.object({ schema: questionSchema }),
    prompt: [
      `Write ONE short check question to test a student's understanding of the topic "${params.topic}".`,
      "Ground it strictly in the reference material below -- never ask about anything outside it.",
      `Tune the difficulty to the student's current mastery of about ${masteryPct}% (lower mastery -> more foundational recall; higher -> applied reasoning or 'justify why').`,
      params.misconceptions.length > 0
        ? `The student has shown these misconceptions -- prefer a question that surfaces or tests one of them: ${params.misconceptions.join("; ")}.`
        : "",
      params.recentQuestions.length > 0
        ? `Do NOT repeat or closely paraphrase any of these recently asked questions:\n${params.recentQuestions
            .map((question) => `- ${question}`)
            .join("\n")}`
        : "",
      "",
      "Reference material:",
      params.reference,
      "",
      "Output only the question text -- no answer, no preamble.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return output.question.trim();
}
