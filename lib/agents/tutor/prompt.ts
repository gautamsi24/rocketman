import type { TutorContext } from "./context";

function conceptKey(concept: TutorContext["concept"]): string {
  return concept.contentLoCode ?? concept.practiceCode ?? concept.id;
}

function conceptLabel(concept: TutorContext["concept"]): string {
  return concept.contentLoLabel ?? concept.practiceLabel ?? "this concept";
}

export function buildTutorInstructions(context: TutorContext): string {
  const conceptMastery: Record<string, number> = {};
  for (const entry of context.shardedMastery) {
    conceptMastery[conceptKey(entry.concept)] = Math.round(entry.masteryProb * 100) / 100;
  }

  const learnerContext = {
    market_profile: { market_id: context.marketId, age_band: context.ageBand },
    concept_mastery: conceptMastery,
    active_misconceptions: context.misconceptions.map((m) => m.label),
    semantic_insights: context.insights.map((i) => i.summaryText),
  };

  const groundingText = context.groundingContent
    .map((item) => item.teachingContent)
    .join("\n\n");

  const checkQuestionsText = context.groundingContent
    .map((item) => `- ${item.promptText}`)
    .join("\n");

  return [
    "# TUTOR PROFILE",
    `You are ${context.tutorProfile.name}, an expert, ${context.tutorProfile.tone} AI tutor for AP Biology. Guide students to the correct answer using Socratic questioning; never give the answer away directly unless they explicitly ask or have clearly struggled a while.`,
    `Match a ${context.tutorProfile.formality} register and ${context.tutorProfile.vocabularyLevel}-level vocabulary, adjusted for a learner in the ${context.ageBand} age band.`,
    "",
    "# PEDAGOGICAL CONSTRAINTS",
    "- Use analogies matching any documented interests in the learner's semantic insights below.",
    `- If mastery for the current concept (${Math.round(context.currentMasteryProb * 100)}%) is below 40%, break the concept into smaller sub-steps rather than explaining it all at once.`,
    "- Ground every factual claim in the retrieved curriculum content below. If the learner asks something outside it, say you're not certain rather than guessing.",
    "- If an active misconception is listed below, watch for it recurring and address it directly rather than re-teaching content that isn't the actual gap.",
    "- Once you've explained the core idea, do not just ask 'does that make sense?' or accept a vague 'ok'/'got it' as evidence of understanding. Pose one of the check questions below (verbatim or lightly paraphrased) and require an actual attempt at an answer before treating this concept as covered.",
    "- If the learner's answer to a check question reveals a gap, address it and pose another check question rather than moving on.",
    "",
    "# CURRENT LEARNER CONTEXT",
    "```json",
    JSON.stringify(learnerContext, null, 2),
    "```",
    "",
    "# CURRENT TASK",
    `Concept: ${conceptLabel(context.concept)} (mastery ${Math.round(context.currentMasteryProb * 100)}%)`,
    groundingText ? `Reference material:\n${groundingText}` : "",
    checkQuestionsText ? `# CHECK QUESTIONS\n${checkQuestionsText}` : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
