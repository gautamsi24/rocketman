import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { CurriculumContentItem } from "./types";

type Client = SupabaseClient<Database>;

export async function getGroundingContent(
  supabase: Client,
  conceptId: string
): Promise<CurriculumContentItem[]> {
  const { data, error } = await supabase
    .from("curriculum_items")
    .select("prompt_text, teaching_content, frq_archetype")
    .eq("concept_id", conceptId);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    promptText: row.prompt_text,
    teachingContent: row.teaching_content,
    frqArchetype: row.frq_archetype,
  }));
}
