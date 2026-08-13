import type { BktParams, Evidence, MasteryState } from "./types";

// A learner saying "I know this" is a strong prior boost but must NOT be enough
// to auto-complete a concept on its own. Kept deliberately below the completion
// threshold (0.85 in lib/profile) so a self-assertion helps but still requires
// graded correct answers to cross into "complete".
const LEARNER_ASSERTION_MASTERY = 0.7;

export function bktUpdate(
  prior: MasteryState,
  params: BktParams,
  evidence: Evidence
): MasteryState {
  if (evidence.kind === "learner_assertion") {
    return {
      masteryProb: Math.max(prior.masteryProb, LEARNER_ASSERTION_MASTERY),
      confidence: Math.max(prior.confidence, 0.6),
      attempts: prior.attempts + 1,
    };
  }

  const { pLearn, pGuess, pSlip } = params;
  const priorMastered = prior.masteryProb;

  const pObsGivenMastered = evidence.correct ? 1 - pSlip : pSlip;
  const pObsGivenNotMastered = evidence.correct ? pGuess : 1 - pGuess;

  const numerator = priorMastered * pObsGivenMastered;
  const denominator =
    numerator + (1 - priorMastered) * pObsGivenNotMastered;
  const posteriorMastered =
    denominator === 0 ? priorMastered : numerator / denominator;

  const masteryAfterLearning =
    posteriorMastered + (1 - posteriorMastered) * pLearn;

  const attempts = prior.attempts + 1;
  const confidence = 1 - Math.exp(-attempts / 5);

  return { masteryProb: masteryAfterLearning, confidence, attempts };
}
