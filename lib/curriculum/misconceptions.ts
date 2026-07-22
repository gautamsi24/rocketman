import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { MisconceptionCatalogEntry } from "./types";

type Client = SupabaseClient<Database>;

export async function getCandidateMisconceptions(
  supabase: Client,
  tenantId: string,
  conceptId: string
): Promise<MisconceptionCatalogEntry[]> {
  const { data, error } = await supabase
    .from("misconceptions")
    .select("id, code, label, description, scope, related_concept_id")
    .eq("tenant_id", tenantId);
  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.related_concept_id === conceptId || row.scope === "practice")
    .map((row) => ({
      id: row.id,
      code: row.code,
      label: row.label,
      description: row.description,
      scope: row.scope,
    }));
}
