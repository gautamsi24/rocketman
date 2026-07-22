export interface ConceptSummary {
  id: string;
  unitCode: string | null;
  unitLabel: string | null;
  contentLoCode: string | null;
  contentLoLabel: string | null;
  practiceCode: string | null;
  practiceLabel: string | null;
}

export interface CurriculumContentItem {
  promptText: string;
  teachingContent: string;
}

export interface MisconceptionCatalogEntry {
  id: string;
  code: string;
  label: string;
  description: string | null;
  scope: "content" | "practice";
}
