export interface BktParams {
  pInit: number;
  pLearn: number;
  pGuess: number;
  pSlip: number;
}

export interface MasteryState {
  masteryProb: number;
  confidence: number;
  attempts: number;
}

export type Evidence =
  | { kind: "graded"; correct: boolean }
  | { kind: "learner_assertion" };
