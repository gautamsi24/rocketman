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
    bigIdeaCode: row.big_idea_code,
    bigIdeaLabel: row.big_idea_label,
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
    .eq("tenant_id", tenantId)
    .order("unit_code", { ascending: true })
    .order("content_lo_code", { ascending: true });
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

/**
 * Concepts sharing the same Big Idea but a different unit -- the
 * cross-unit connections Big Ideas are meant to surface, distinct from
 * getAdjacentConceptIds's same-unit siblings.
 */
export async function getSameBigIdeaConceptIds(
  supabase: Client,
  conceptId: string,
  limit = 2
): Promise<string[]> {
  const { data: current, error: currentError } = await supabase
    .from("concepts")
    .select("id, unit_code, big_idea_code")
    .eq("id", conceptId)
    .single();
  if (currentError) throw currentError;
  if (!current.big_idea_code) return [];

  const { data: sameBigIdea, error: sameBigIdeaError } = await supabase
    .from("concepts")
    .select("id, unit_code")
    .eq("big_idea_code", current.big_idea_code)
    .neq("id", conceptId);
  if (sameBigIdeaError) throw sameBigIdeaError;

  return (sameBigIdea ?? [])
    .filter((c) => c.unit_code !== current.unit_code)
    .slice(0, limit)
    .map((c) => c.id);
}
