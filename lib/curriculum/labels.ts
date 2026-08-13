// Pure label helpers -- no Supabase imports, so both server code and client
// components can share the single "how do we name a concept" rule.

export interface LabelledConcept {
  contentLoLabel: string | null;
  practiceLabel: string | null;
}

export function conceptLabel(
  concept: LabelledConcept,
  fallback = "this concept"
): string {
  return concept.contentLoLabel ?? concept.practiceLabel ?? fallback;
}
