import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { ConceptSummary } from "./types";

type Client = SupabaseClient<Database>;

function toSummary(row: Database["public"]["Tables"]["concepts"]["Row"]): ConceptSummary {
  return {
    id: row.id,
    unitCode: row.unit_code,
    unitLabel: row.unit_label,
    contentLoCode: row.content_lo_code,
    contentLoLabel: row.content_lo_label,
    practiceCode: row.science_practice_code,
    practiceLabel: row.science_practice_label,
  };
}

export async function getConceptSummary(
  supabase: Client,
  conceptId: string
): Promise<ConceptSummary | null> {
  const { data, error } = await supabase
    .from("concepts")
    .select("*")
    .eq("id", conceptId)
    .maybeSingle();
  if (error) throw error;
  return data ? toSummary(data) : null;
}

export async function getConceptSummaries(
  supabase: Client,
  conceptIds: string[]
): Promise<ConceptSummary[]> {
  if (conceptIds.length === 0) return [];
  const { data, error } = await supabase
    .from("concepts")
    .select("*")
    .in("id", conceptIds);
  if (error) throw error;
  return (data ?? []).map(toSummary);
}

export async function listConcepts(
  supabase: Client,
  tenantId: string
): Promise<ConceptSummary[]> {
  const { data, error } = await supabase
    .from("concepts")
    .select("*")
    .eq("tenant_id", tenantId);
  if (error) throw error;
  return (data ?? []).map(toSummary);
}

export async function getAdjacentConceptIds(
  supabase: Client,
  conceptId: string
): Promise<string[]> {
  const { data: current, error: currentError } = await supabase
    .from("concepts")
    .select("id, unit_code")
    .eq("id", conceptId)
    .single();
  if (currentError) throw currentError;

  const adjacentIds = new Set<string>([conceptId]);

  if (current.unit_code) {
    const { data: siblings, error: siblingsError } = await supabase
      .from("concepts")
      .select("id")
      .eq("unit_code", current.unit_code);
    if (siblingsError) throw siblingsError;
    for (const sibling of siblings ?? []) adjacentIds.add(sibling.id);
  }

  const { data: prerequisites, error: prerequisitesError } = await supabase
    .from("concept_prerequisites")
    .select("prerequisite_concept_id")
    .eq("concept_id", conceptId);
  if (prerequisitesError) throw prerequisitesError;
  for (const row of prerequisites ?? []) adjacentIds.add(row.prerequisite_concept_id);

  return Array.from(adjacentIds);
}
