import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export interface TransferTarget {
  relatedConceptId: string;
  weight: number;
}

/**
 * Concepts that graded evidence on `conceptId` should partially move, and by
 * how much. The matrix is sparse by construction -- v1 links only concepts
 * sharing both a Big Idea and a unit -- so this returns a handful of rows, not
 * the whole curriculum.
 */
export async function getTransferTargets(
  supabase: Client,
  tenantId: string,
  conceptId: string
): Promise<TransferTarget[]> {
  const { data, error } = await supabase
    .from("concept_transfer")
    .select("related_concept_id, weight")
    .eq("tenant_id", tenantId)
    .eq("concept_id", conceptId);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    relatedConceptId: row.related_concept_id,
    weight: row.weight,
  }));
}
