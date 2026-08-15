import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FrqKind,
  FrqScoredPoint,
  FrqTutorNote,
} from "@/lib/curriculum/frq";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export interface TutorFrqAnswer {
  id: string;
  position: number;
  kind: FrqKind;
  taskWord: string;
  prompt: string;
  stimulus: string | null;
  maxPoints: number;
  answerText: string | null;
  awardedPoints: number | null;
  correct: boolean | null;
  pointsDetail: FrqScoredPoint[];
  feedback: string | null;
  answeredAt: string;
  notes: FrqTutorNote[];
}

/**
 * A learner's full answered-FRQ history (all sets, most recent first) for
 * the tutor drill-down page -- unlike the learner's own Practice view (which
 * only ever reads the most recent set), a tutor reviewing past work
 * reasonably wants to see everything, not just the current set.
 */
export async function getLearnerFrqHistory(
  supabase: Client,
  learnerId: string
): Promise<TutorFrqAnswer[]> {
  const { data: rows, error } = await supabase
    .from("frq_questions")
    .select("*")
    .eq("learner_id", learnerId)
    .not("answered_at", "is", null)
    .order("answered_at", { ascending: false });
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const { data: notes, error: notesError } = await supabase
    .from("frq_tutor_notes")
    .select("id, frq_question_id, note_text, created_at")
    .in(
      "frq_question_id",
      rows.map((row) => row.id)
    )
    .order("created_at", { ascending: true });
  if (notesError) throw notesError;

  const notesByQuestionId = new Map<string, FrqTutorNote[]>();
  for (const note of notes ?? []) {
    const list = notesByQuestionId.get(note.frq_question_id) ?? [];
    list.push({
      id: note.id,
      noteText: note.note_text,
      createdAt: note.created_at,
    });
    notesByQuestionId.set(note.frq_question_id, list);
  }

  return rows.map((row) => ({
    id: row.id,
    position: row.position,
    kind: row.kind,
    taskWord: row.task_word,
    prompt: row.prompt,
    stimulus: row.stimulus,
    maxPoints: row.max_points,
    answerText: row.answer_text,
    awardedPoints: row.awarded_points,
    correct: row.correct,
    pointsDetail: row.points_detail ?? [],
    feedback: row.feedback,
    // Guaranteed non-null by the `.not("answered_at", "is", null)` filter above.
    answeredAt: row.answered_at as string,
    notes: notesByQuestionId.get(row.id) ?? [],
  }));
}
