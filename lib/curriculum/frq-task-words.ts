export interface TaskWordGuide {
  /** The task word as it appears at the start of an FRQ prompt. */
  word: string;
  /** Earns the point when you... (the "hit"). */
  hit: string;
  /** The common miss that costs the point. */
  miss: string;
}

/**
 * The AP-style FRQ task-word rubric. Every free-response prompt opens with a
 * task word that sets the *minimum* answer type required for the point --
 * writing the wrong kind costs the point outright. This single source is used
 * both to set the bar in the grader prompt and to render the learner-facing
 * "Hits & Misses" reference. Exam-format knowledge, so it lives in the
 * Curriculum Service (not the Memory Engine).
 */
export const TASK_WORDS: Record<string, TaskWordGuide> = {
  identify: {
    word: "Identify",
    hit: "Name the term, concept, or value. No explanation required.",
    miss: "Writing a paragraph when one phrase is asked.",
  },
  define: {
    word: "Define",
    hit: "Give the textbook meaning in one sentence.",
    miss: "Defining with an example instead of the concept itself.",
  },
  describe: {
    word: "Describe",
    hit: "Give 2-3 sentences of specific detail -- names, numbers, mechanisms.",
    miss: "Staying vague or abstract when specifics are required.",
  },
  explain: {
    word: "Explain",
    hit: "Show cause -> effect with a real mechanism.",
    miss: "Describing instead of explaining -- no causal verb.",
  },
  compare: {
    word: "Compare",
    hit: "Mention both sides in the same sentence with a linking word.",
    miss: "Describing each separately, never connecting them.",
  },
  justify: {
    word: "Justify",
    hit: "State your claim and back it with evidence or reasoning.",
    miss: "Offering the claim without the 'because' that supports it.",
  },
};

/** Ordered list for rendering the reference table. */
export const TASK_WORD_LIST: TaskWordGuide[] = [
  TASK_WORDS.identify,
  TASK_WORDS.define,
  TASK_WORDS.describe,
  TASK_WORDS.explain,
  TASK_WORDS.compare,
  TASK_WORDS.justify,
];

/** Case-insensitive lookup; returns null for an unknown task word. */
export function taskWordGuide(taskWord: string): TaskWordGuide | null {
  return TASK_WORDS[taskWord.trim().toLowerCase()] ?? null;
}
