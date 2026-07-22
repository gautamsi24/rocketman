import type { SupabaseClient } from "@supabase/supabase-js";
import { generateSpeech, generateText } from "ai";
import { ttsModel, tutorModel } from "@/lib/agents/shared/model";
import { getConceptSummary } from "@/lib/curriculum/concepts";
import { getGroundingContent } from "@/lib/curriculum/content";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

const BUCKET = "podcasts";

function conceptLabel(concept: {
  contentLoLabel: string | null;
  practiceLabel: string | null;
}): string {
  return concept.contentLoLabel ?? concept.practiceLabel ?? "this topic";
}

function buildScriptPrompt(label: string, groundingText: string): string {
  return [
    `Write a short, warm, conversational spoken podcast script (150-250 words) explaining the AP Biology topic "${label}" to a high-school student.`,
    "Write it to be heard, not read -- like a friendly tutor talking through the idea out loud, not a textbook passage. Use plain sentences, natural pacing, and a concrete example or analogy.",
    "Do not include headings, bullet points, or stage directions -- output only the words that should be spoken aloud.",
    "",
    "Source material to draw from (rewrite conversationally, do not read verbatim):",
    groundingText,
  ].join("\n");
}

export async function getOrCreatePodcast(
  supabase: Client,
  conceptId: string
): Promise<{ audio: Uint8Array; mediaType: string }> {
  const { data: concept, error: conceptError } = await supabase
    .from("concepts")
    .select("tenant_id")
    .eq("id", conceptId)
    .single();
  if (conceptError) throw conceptError;
  const tenantId = concept.tenant_id;

  const { data: existing, error: existingError } = await supabase
    .from("concept_podcasts")
    .select("audio_path")
    .eq("tenant_id", tenantId)
    .eq("concept_id", conceptId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const { data: file, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(existing.audio_path);
    if (downloadError) throw downloadError;
    return {
      audio: new Uint8Array(await file.arrayBuffer()),
      mediaType: "audio/wav",
    };
  }

  const [conceptSummary, groundingContent] = await Promise.all([
    getConceptSummary(supabase, conceptId),
    getGroundingContent(supabase, conceptId),
  ]);
  if (!conceptSummary) throw new Error(`Concept ${conceptId} not found`);

  const groundingText = groundingContent
    .map((item) => item.teachingContent)
    .join("\n\n");

  const { text: script } = await generateText({
    model: tutorModel,
    prompt: buildScriptPrompt(conceptLabel(conceptSummary), groundingText),
  });

  const { audio } = await generateSpeech({
    model: ttsModel,
    text: script,
    voice: "Kore",
  });

  const audioPath = `${tenantId}/${conceptId}.wav`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(audioPath, audio.uint8Array, {
      contentType: audio.mediaType,
      upsert: true,
    });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from("concept_podcasts").insert({
    tenant_id: tenantId,
    concept_id: conceptId,
    script_text: script,
    audio_path: audioPath,
  });
  if (insertError) throw insertError;

  return { audio: audio.uint8Array, mediaType: audio.mediaType };
}
