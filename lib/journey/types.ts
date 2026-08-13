export type JourneyNodeStatus =
  | "mastered"
  | "in_progress"
  | "available"
  | "locked";

export interface JourneyNode {
  conceptId: string;
  label: string;
  scope: "content" | "practice";
  masteryProb: number;
  attempts: number;
  status: JourneyNodeStatus;
  /** Labels of not-yet-mastered prerequisites, for the soft-lock warning. */
  blockedBy: string[];
}

export interface JourneyUnit {
  unitCode: string | null;
  unitLabel: string;
  nodes: JourneyNode[];
  masteredCount: number;
  totalCount: number;
}

export interface JourneyResponse {
  units: JourneyUnit[];
  /** Unit topics (scope: content) -- these drive completion. Cross-cutting
   * science practices (scope: practice) are excluded from the mission map
   * entirely; students exercise those under Practice FRQs instead. */
  contentMastered: number;
  contentTotal: number;
}
