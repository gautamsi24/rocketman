import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText, Output } from "ai";
import { classificationModel } from "@/lib/agents/shared/model";
import { SESSION_HISTORY_WINDOW_TURNS } from "@/lib/agents/tutor/history-window";
import { getConceptSummaries } from "@/lib/curriculum/concepts";
import type { Database } from "@/lib/supabase/types";
import { historyCompactionSchema } from "./schema";

type Client = SupabaseClient<Database>;

interface TurnForCompaction {
  learnerMessage: string;
  tutorMessage: string;
  conceptLabel: string;
}

function buildCompactionPrompt(params: {
  previousSummary: string | null;
  turns: TurnForCompaction[];
}): string {
  const transcript = params.turns
    .map(
      (t, i) =>
        `Turn ${i + 1} (${t.conceptLabel}):\nStudent: ${t.learnerMessage}\nTutor: ${t.tutorMessage}`
    )
    .join("\n\n");

  return [
    "Below is the running summary of an ongoing AP Biology tutoring session so far, plus the next block of turns that just fell outside the conversation window sent to the tutor model.",
    "Write an updated 1-2 sentence rolling summary that folds the new turns into the existing one -- this is a compact memory aid the tutor reads on later turns, not a transcript. Focus on what topics/subtopics were covered and any notable back-and-forth (e.g. a misconception that came up and how it was resolved), not verbatim dialogue.",
    "Keep it to 1-2 sentences even as more turns get folded in over time -- summarize the whole conversation's arc, don't just append a new sentence per call.",
    "",
    `Existing summary: ${params.previousSummary ?? "(none yet -- this is the first compaction for this session)"}`,
    "",
    "New turns to fold in:",
    transcript,
  ].join("\n");
}

/**
 * Compacts a session's older turns (SYSTEM_DESIGN.md §4.A, Tactic C) into a
 * rolling 1-2 sentence summary once they fall outside the sliding window the
 * chat route sends raw (lib/agents/tutor/history-window.ts). Reads
 * turn_events the same way consolidateSession does -- both need the same
 * durable, ordered per-session transcript, just for different purposes.
 * A no-op on most turns; only does real work once the window has actually
 * advanced since the last compaction.
 */
export async function compactSessionHistory(
  supabase: Client,
  sessionId: string
): Promise<void> {
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("history_summary, history_summary_turn_count")
    .eq("id", sessionId)
    .single();
  if (sessionError) throw sessionError;

  const { data: turnEvents, error: turnEventsError } = await supabase
    .from("turn_events")
    .select("learner_message, tutor_message, concept_id")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (turnEventsError) throw turnEventsError;

  const total = turnEvents?.length ?? 0;
  const compactableCount = Math.max(0, total - SESSION_HISTORY_WINDOW_TURNS);
  const previousCount = session.history_summary_turn_count;

  // Nothing new has fallen out of the window since the last compaction.
  if (compactableCount <= previousCount) return;

  const newlyOutOfWindow = (turnEvents ?? []).slice(previousCount, compactableCount);

  const conceptIds = Array.from(
    new Set(
      newlyOutOfWindow
        .map((t) => t.concept_id)
        .filter((id): id is string => id !== null)
    )
  );
  const concepts = await getConceptSummaries(supabase, conceptIds);
  const conceptById = new Map(concepts.map((c) => [c.id, c]));

  const turnsForPrompt: TurnForCompaction[] = newlyOutOfWindow.map((t) => ({
    learnerMessage: t.learner_message,
    tutorMessage: t.tutor_message,
    conceptLabel:
      (t.concept_id && conceptById.get(t.concept_id)?.contentLoLabel) ??
      (t.concept_id && conceptById.get(t.concept_id)?.practiceLabel) ??
      "unknown concept",
  }));

  const { output } = await generateText({
    model: classificationModel,
    output: Output.object({ schema: historyCompactionSchema }),
    prompt: buildCompactionPrompt({
      previousSummary: session.history_summary,
      turns: turnsForPrompt,
    }),
  });

  // Optimistic-concurrency guard: if another compaction run for this session
  // already advanced the count since we read it, this update affects 0 rows
  // and we just no-op rather than clobbering or double-summarizing.
  await supabase
    .from("sessions")
    .update({
      history_summary: output.summary,
      history_summary_turn_count: compactableCount,
    })
    .eq("id", sessionId)
    .eq("history_summary_turn_count", previousCount);
}
