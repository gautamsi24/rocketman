import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateFrqQuestion } from "@/lib/agents/frq/generate";
import type { Database } from "@/lib/supabase/types";
import { getGroundingContent } from "./content";
import { conceptLabel } from "./labels";
import { listConcepts } from "./concepts";
import { questionHash } from "./question-hash";
import { getMasteryForConcepts } from "@/lib/memory/profile-read";

type Client = SupabaseClient<Database>;

export type FrqKind = "long" | "short";

export interface FrqScoredPoint {
  code: string;
  text: string;
  points: number;
  awarded: boolean;
  note: string;
}

export interface FrqAttemptResult {
  awardedPoints: number;
  maxPoints: number;
  correct: boolean;
  points: FrqScoredPoint[];
  answerText: string | null;
  hasImage: boolean;
  feedback: string | null;
}

export interface FrqTutorNote {
  id: string;
  noteText: string;
  createdAt: string;
}

export interface FrqSetQuestion {
  id: string;
  position: number;
  kind: FrqKind;
  requiresDiagram: boolean;
  taskWord: string;
  stimulus: string | null;
  prompt: string;
  maxPoints: number;
  attempt: FrqAttemptResult | null;
  // Saved answer text while the question is still unanswered -- lets a
  // reload/navigation restore what the learner already typed. Always null
  // once attempt is set.
  draftAnswerText: string | null;
  tutorNotes: FrqTutorNote[];
}

export interface FrqSet {
  setId: string;
  questions: FrqSetQuestion[];
  summary: {
    answered: number;
    total: number;
    pointsAwarded: number;
    pointsPossible: number;
  };
}

// Full row incl. the rubric answer key -- server-only, for grading.
export interface FrqQuestionFull {
  id: string;
  tenantId: string;
  learnerId: string;
  conceptId: string;
  requiresDiagram: boolean;
  taskWord: string;
  stimulus: string | null;
  prompt: string;
  rubric: { code: string; text: string; points: number }[];
  maxPoints: number;
  answeredAt: string | null;
  awardedPoints: number | null;
  correct: boolean | null;
  pointsDetail: FrqScoredPoint[] | null;
}

// The paper shape: 2 long (diagram) then 4 short. Positions 1-based.
const SET_SLOTS: { kind: FrqKind; requiresDiagram: boolean }[] = [
  { kind: "long", requiresDiagram: true },
  { kind: "long", requiresDiagram: true },
  { kind: "short", requiresDiagram: false },
  { kind: "short", requiresDiagram: false },
  { kind: "short", requiresDiagram: false },
  { kind: "short", requiresDiagram: false },
];

function toAttempt(
  row: Database["public"]["Tables"]["frq_questions"]["Row"]
): FrqAttemptResult | null {
  if (!row.answered_at) return null;
  return {
    awardedPoints: row.awarded_points ?? 0,
    maxPoints: row.max_points,
    correct: row.correct ?? false,
    points: row.points_detail ?? [],
    answerText: row.answer_text,
    hasImage: row.image_path !== null,
    feedback: row.feedback,
  };
}

function toSet(
  rows: Database["public"]["Tables"]["frq_questions"]["Row"][],
  notesByQuestionId: Map<string, FrqTutorNote[]> = new Map()
): FrqSet {
  const questions: FrqSetQuestion[] = rows.map((row) => ({
    id: row.id,
    position: row.position,
    kind: row.kind,
    requiresDiagram: row.requires_diagram,
    taskWord: row.task_word,
    stimulus: row.stimulus,
    prompt: row.prompt,
    maxPoints: row.max_points,
    attempt: toAttempt(row),
    draftAnswerText: row.answered_at ? null : row.answer_text,
    tutorNotes: notesByQuestionId.get(row.id) ?? [],
  }));
  const answered = questions.filter((q) => q.attempt !== null);
  return {
    setId: rows[0]?.set_id ?? "",
    questions,
    summary: {
      answered: answered.length,
      total: questions.length,
      pointsAwarded: answered.reduce(
        (sum, q) => sum + (q.attempt?.awardedPoints ?? 0),
        0
      ),
      pointsPossible: answered.reduce((sum, q) => sum + q.maxPoints, 0),
    },
  };
}

/**
 * Tutor notes for a batch of questions, grouped by question id and ordered
 * oldest-first within each group (a simple append-only thread, not editable).
 */
async function getTutorNotesByQuestionIds(
  supabase: Client,
  questionIds: string[]
): Promise<Map<string, FrqTutorNote[]>> {
  const notesByQuestionId = new Map<string, FrqTutorNote[]>();
  if (questionIds.length === 0) return notesByQuestionId;

  const { data, error } = await supabase
    .from("frq_tutor_notes")
    .select("id, frq_question_id, note_text, created_at")
    .in("frq_question_id", questionIds)
    .order("created_at", { ascending: true });
  if (error) throw error;

  for (const row of data ?? []) {
    const list = notesByQuestionId.get(row.frq_question_id) ?? [];
    list.push({ id: row.id, noteText: row.note_text, createdAt: row.created_at });
    notesByQuestionId.set(row.frq_question_id, list);
  }
  return notesByQuestionId;
}

/**
 * The learner's most recent practice set, joined with their answers. Returns
 * null when they have none yet -- the caller decides whether to generate one.
 */
export async function getCurrentFrqSet(
  supabase: Client,
  params: { tenantId: string; learnerId: string }
): Promise<FrqSet | null> {
  const { data: latest, error: latestError } = await supabase
    .from("frq_questions")
    .select("set_id")
    .eq("tenant_id", params.tenantId)
    .eq("learner_id", params.learnerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw latestError;
  if (!latest) return null;

  const { data: rows, error: rowsError } = await supabase
    .from("frq_questions")
    .select("*")
    .eq("set_id", latest.set_id)
    .order("position", { ascending: true });
  if (rowsError) throw rowsError;

  const notesByQuestionId = await getTutorNotesByQuestionIds(
    supabase,
    (rows ?? []).map((row) => row.id)
  );
  return toSet(rows ?? [], notesByQuestionId);
}

/**
 * A specific set by id, joined with answers and tutor notes -- same shape as
 * getCurrentFrqSet but keyed by set_id instead of "most recent for this
 * learner", used by the batch submit route to return the post-grade state.
 */
export async function getFrqSetById(
  supabase: Client,
  setId: string
): Promise<FrqSet | null> {
  const { data: rows, error } = await supabase
    .from("frq_questions")
    .select("*")
    .eq("set_id", setId)
    .order("position", { ascending: true });
  if (error) throw error;
  if (!rows || rows.length === 0) return null;

  const notesByQuestionId = await getTutorNotesByQuestionIds(
    supabase,
    rows.map((row) => row.id)
  );
  return toSet(rows, notesByQuestionId);
}

/**
 * Generates a fresh practice set for the learner: 6 questions (2 long/diagram,
 * 4 short) grounded in curriculum content, targeting the learner's weakest
 * concepts, and never repeating a question they've already answered. Persists
 * the set and returns it.
 */
export async function generateFrqSet(
  supabase: Client,
  params: { tenantId: string; learnerId: string }
): Promise<FrqSet> {
  const concepts = await listConcepts(supabase, params.tenantId);
  // Content topics only -- the FRQ exam tests content Learning Objectives; the
  // cross-cutting practice skills are exercised inside those, not standalone.
  const contentConcepts = concepts.filter((c) => c.contentLoCode !== null);

  const mastery = await getMasteryForConcepts(
    supabase,
    params.learnerId,
    contentConcepts.map((c) => c.id)
  );
  const masteryById = new Map(mastery.map((m) => [m.conceptId, m]));

  // Weakest first: lowest mastery, then least practiced -- that's where the
  // student most needs FRQ reps.
  const ranked = [...contentConcepts].sort((a, b) => {
    const ma = masteryById.get(a.id);
    const mb = masteryById.get(b.id);
    const probDiff = (ma?.masteryProb ?? 0.3) - (mb?.masteryProb ?? 0.3);
    if (probDiff !== 0) return probDiff;
    return (ma?.attempts ?? 0) - (mb?.attempts ?? 0);
  });

  // Take the weakest concepts that actually have grounding content, up to the
  // number of slots. Fetch a few extra candidates so a concept without content
  // doesn't leave a slot empty.
  const candidates = ranked.slice(0, SET_SLOTS.length + 4);
  const references = await Promise.all(
    candidates.map(async (concept) => {
      const items = await getGroundingContent(supabase, concept.id);
      return {
        concept,
        reference: items.map((item) => item.teachingContent).join("\n\n"),
      };
    })
  );
  const grounded = references.filter((r) => r.reference.trim().length > 0);
  const chosen = (grounded.length >= SET_SLOTS.length ? grounded : references).slice(
    0,
    SET_SLOTS.length
  );

  if (chosen.length === 0) {
    throw new Error("No content concepts available to generate a practice set");
  }

  // Prior answered prompts -- so a new set never repeats what they've done.
  const { data: answered, error: answeredError } = await supabase
    .from("frq_questions")
    .select("prompt")
    .eq("learner_id", params.learnerId)
    .not("answered_at", "is", null)
    .order("answered_at", { ascending: false })
    .limit(20);
  if (answeredError) throw answeredError;
  const avoidPrompts = (answered ?? []).map((row) => row.prompt);

  const setId = randomUUID();
  const generated = await Promise.all(
    SET_SLOTS.map(async (slot, index) => {
      // Cycle candidates if a tenant has fewer grounded concepts than slots.
      const { concept, reference } = chosen[index % chosen.length];
      const entry = masteryById.get(concept.id);
      const q = await generateFrqQuestion({
        topic: conceptLabel(concept, "this topic"),
        reference,
        kind: slot.kind,
        requiresDiagram: slot.requiresDiagram,
        masteryPct: Math.round((entry?.masteryProb ?? 0.3) * 100),
        avoidPrompts,
      });
      return {
        tenant_id: params.tenantId,
        learner_id: params.learnerId,
        concept_id: concept.id,
        set_id: setId,
        position: index + 1,
        kind: slot.kind,
        requires_diagram: slot.requiresDiagram,
        task_word: q.taskWord,
        stimulus: q.stimulus,
        prompt: q.prompt,
        prompt_hash: questionHash(q.prompt),
        rubric: q.rubric,
        max_points: q.maxPoints,
      };
    })
  );

  const { data: inserted, error: insertError } = await supabase
    .from("frq_questions")
    .insert(generated)
    .select("*");
  if (insertError) throw insertError;

  const rows = (inserted ?? []).sort((a, b) => a.position - b.position);
  return toSet(rows);
}

/** Full question incl. rubric + answer state, for grading. Server-only. */
export async function getFrqQuestion(
  supabase: Client,
  questionId: string
): Promise<FrqQuestionFull | null> {
  const { data, error } = await supabase
    .from("frq_questions")
    .select("*")
    .eq("id", questionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    tenantId: data.tenant_id,
    learnerId: data.learner_id,
    conceptId: data.concept_id,
    requiresDiagram: data.requires_diagram,
    taskWord: data.task_word,
    stimulus: data.stimulus,
    prompt: data.prompt,
    rubric: data.rubric,
    maxPoints: data.max_points,
    answeredAt: data.answered_at,
    awardedPoints: data.awarded_points,
    correct: data.correct,
    pointsDetail: data.points_detail,
  };
}
