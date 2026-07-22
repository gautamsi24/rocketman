import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export interface TutorProfile {
  name: string;
  tone: string;
  formality: "casual" | "neutral" | "formal";
  vocabularyLevel: "high-school" | "college" | "professional";
}

export async function getTutorProfile(
  supabase: Client,
  tenantId: string
): Promise<TutorProfile> {
  const { data, error } = await supabase
    .from("tutor_profiles")
    .select("name, tone, formality, vocabulary_level")
    .eq("tenant_id", tenantId)
    .single();
  if (error) throw error;

  return {
    name: data.name,
    tone: data.tone,
    formality: data.formality,
    vocabularyLevel: data.vocabulary_level,
  };
}
