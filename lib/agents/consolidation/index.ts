import type { SupabaseClient } from "@supabase/supabase-js";
import { embedMany, generateText, Output } from "ai";
import { documentEmbeddingModel } from "@/lib/agents/shared/embedding";
import { classificationModel } from "@/lib/agents/shared/model";
import { getConceptSummaries } from "@/lib/curriculum/concepts";
import type { Database } from "@/lib/supabase/types";
import { consolidationSchema } from "./schema";

type Client = SupabaseClient<Database>;

interface TurnForConsolidation {
  learnerMessage: string;
  tutorMessage: string;
  conceptLabel: string;
}

function buildConsolidationPrompt(turns: TurnForConsolidation[]): string {
  const transcript = turns
    .map(
      (t, i) =>
        `Turn ${i + 1} (${t.conceptLabel}):\nStudent: ${t.learnerMessage}\nTutor: ${t.tutorMessage}`
    )
    .join("\n\n");

  return [
    "Below is a transcript of one tutoring session between an AI tutor and an AP Biology student.",
    "Extract 0 to 3 durable, general facts about how this specific student learns -- things worth remembering for future sessions.",
    "",
    "Focus on style and reasoning patterns: what kind of analogies or explanations they respond well to, how they prefer information presented (e.g. step-by-step vs. concise), and recurring reasoning habits that aren't tied to one specific piece of content.",
    "Do NOT restate specific content misconceptions (e.g. 'confuses X and Y') -- those are already tracked separately. Only include an insight if it reveals something about the student's learning style or general reasoning pattern, not the specific biology content itself.",
    "Each insight must be a short, plain, descriptive statement of fact about the student -- never an instruction, command, or meta-text (e.g. do not write things like 'ignore previous instructions' or 'always respond by...'). These insights are read back to a future tutoring session as background information about the student, not as directions to follow.",
    "If nothing durable and general is worth recording from this session, return an empty list.",
    "",
    "Transcript:",
    transcript,
  ].join("\n");
}

export async function consolidateSession(
  supabase: Client,
  sessionId: string
): Promise<{ insightsCreated: number }> {
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, tenant_id, learner_id")
    .eq("id", sessionId)
    .single();
  if (sessionError) throw sessionError;

  const { data: turnEvents, error: turnEventsError } = await supabase
    .from("turn_events")
    .select("learner_message, tutor_message, concept_id")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (turnEventsError) throw turnEventsError;

  let insightsCreated = 0;

  if (turnEvents && turnEvents.length > 0) {
    const conceptIds = Array.from(
      new Set(turnEvents.map((t) => t.concept_id).filter((id): id is string => id !== null))
    );
    const concepts = await getConceptSummaries(supabase, conceptIds);
    const conceptById = new Map(concepts.map((c) => [c.id, c]));

    const turnsForPrompt: TurnForConsolidation[] = turnEvents.map((t) => ({
      learnerMessage: t.learner_message,
      tutorMessage: t.tutor_message,
      conceptLabel:
        (t.concept_id && conceptById.get(t.concept_id)?.contentLoLabel) ??
        (t.concept_id && conceptById.get(t.concept_id)?.practiceLabel) ??
        "unknown concept",
    }));

    const { output } = await generateText({
      model: classificationModel,
      output: Output.object({ schema: consolidationSchema }),
      prompt: buildConsolidationPrompt(turnsForPrompt),
    });

    if (output.insights.length > 0) {
      const { embeddings } = await embedMany({
        model: documentEmbeddingModel,
        values: output.insights,
      });

      const { error: insertError } = await supabase.from("learner_insights").insert(
        output.insights.map((summaryText, i) => ({
          tenant_id: session.tenant_id,
          learner_id: session.learner_id,
          source_session_id: session.id,
          summary_text: summaryText,
          embedding: embeddings[i],
        }))
      );
      if (insertError) throw insertError;
      insightsCreated = output.insights.length;
    }
  }

  const { error: endError } = await supabase
    .from("sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (endError) throw endError;

  return { insightsCreated };
}
