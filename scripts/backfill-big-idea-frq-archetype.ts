import { createServiceRoleClient } from "../lib/supabase/server";

interface ConceptUpdate {
  contentLoCode: string | null;
  matchByOldPracticeLabel?: string;
  unitLabel?: string;
  practiceLabel: string | null;
  bigIdeaCode: string | null;
  bigIdeaLabel: string | null;
}

const CONCEPT_UPDATES: ConceptUpdate[] = [
  { contentLoCode: "SYI-1.A", practiceLabel: "Argumentation", bigIdeaCode: "SYI", bigIdeaLabel: "Systems Interactions" },
  { contentLoCode: "SYI-1.C", practiceLabel: "Concept Explanation", bigIdeaCode: "SYI", bigIdeaLabel: "Systems Interactions" },
  { contentLoCode: "SYI-1.D", practiceLabel: "Concept Explanation", bigIdeaCode: "SYI", bigIdeaLabel: "Systems Interactions", unitLabel: "Cells" },
  { contentLoCode: "ENE-2.G", practiceLabel: "Argumentation", bigIdeaCode: "ENE", bigIdeaLabel: "Energetics" },
  { contentLoCode: "IST-2.B", practiceLabel: "Argumentation", bigIdeaCode: "IST", bigIdeaLabel: "Information Storage and Transmission" },
  { contentLoCode: "IST-3.A", practiceLabel: "Argumentation", bigIdeaCode: "IST", bigIdeaLabel: "Information Storage and Transmission" },
  { contentLoCode: "HER-1.D", practiceLabel: "Statistical Tests and Data Analysis", bigIdeaCode: "IST", bigIdeaLabel: "Information Storage and Transmission" },
  { contentLoCode: "HER-2.B", practiceLabel: "Statistical Tests and Data Analysis", bigIdeaCode: "IST", bigIdeaLabel: "Information Storage and Transmission" },
  { contentLoCode: "IST-1.K", practiceLabel: "Statistical Tests and Data Analysis", bigIdeaCode: "IST", bigIdeaLabel: "Information Storage and Transmission" },
  { contentLoCode: "EVO-3.E", practiceLabel: null, bigIdeaCode: "EVO", bigIdeaLabel: "Evolution" },
  { contentLoCode: "ENG-2.E", practiceLabel: "Questions and Methods", bigIdeaCode: "SYI", bigIdeaLabel: "Systems Interactions" },
  {
    contentLoCode: null,
    matchByOldPracticeLabel: "Justify a claim via biological mechanism, not just restated evidence",
    practiceLabel: "Argumentation",
    bigIdeaCode: null,
    bigIdeaLabel: null,
  },
  {
    contentLoCode: null,
    matchByOldPracticeLabel: "Identify a control group and state a null hypothesis",
    practiceLabel: "Questions and Methods",
    bigIdeaCode: null,
    bigIdeaLabel: null,
  },
];

const CURRICULUM_ITEM_ARCHETYPES: Record<string, string> = {
  "Explain why water is described as a polar molecule, and how that property allows it to dissolve ionic compounds like NaCl.":
    "conceptual_analysis",
  "A student says 'water is polar, so it must be an ion.' What's wrong with this statement?":
    "conceptual_analysis",
  "Two monomers join and a water molecule is released. Is this dehydration synthesis or hydrolysis? What would the reverse reaction look like?":
    "conceptual_analysis",
  "Explain how the folded structure of the inner mitochondrial membrane (cristae) relates to its function.":
    "conceptual_analysis",
  "A student says 'ribosomes package and secrete proteins out of the cell.' What is wrong with this statement, and what is the correct role of the ribosome?":
    "conceptual_analysis",
  "Why can't cells just keep growing larger and larger instead of dividing?": "conceptual_analysis",
  "An enzyme's reaction rate drops sharply when a molecule binds to a site other than the active site. Is this competitive or noncompetitive inhibition, and why?":
    "analyze_model_visual",
  "In a feedback-inhibited pathway, the end product binds an early enzyme and shuts the pathway down. Justify why this is beneficial to the cell, not just describe what happens.":
    "conceptual_analysis",
  "A student says 'the enzyme gets used up during the reaction, so you need a fresh one for the next molecule.' What's wrong with this claim?":
    "conceptual_analysis",
  "A hormone binds a receptor on the outside of a cell, and the cell responds by activating an internal enzyme. Explain how the signal gets from outside the cell to an internal response without the hormone itself entering the cell.":
    "conceptual_analysis",
  "Explain how a failure at a cell-cycle checkpoint could lead to cancer.": "conceptual_analysis",
  "How many rounds of division occur in meiosis compared to mitosis, and how does that difference relate to genetic variation?":
    "conceptual_analysis",
  "A student says 'a dominant allele must be the more common one in the population.' Is this true?":
    "conceptual_analysis",
  "A cross predicts a 3:1 phenotypic ratio. In an actual litter of 4 offspring, would you expect exactly 3 with the dominant phenotype and 1 with the recessive phenotype?":
    "analyze_data",
  "A gene's coding sequence is 300 nucleotides long. How many amino acids will the resulting protein have (ignoring start/stop codons)?":
    "analyze_data",
  "A student says 'the mRNA's poly(A) tail helps the protein fold correctly.' What is wrong with this statement?":
    "conceptual_analysis",
  "A student says 'any mutation in a gene will damage the protein it codes for.' Evaluate this claim.":
    "conceptual_analysis",
  "Researchers remove a keystone predator from an ecosystem and observe a decline in plant diversity. Identify the control group this study would need, and state a null hypothesis.":
    "scientific_investigation",
  "A student says 'energy cycles through an ecosystem the same way nutrients do.' What's wrong with this statement?":
    "conceptual_analysis",
  "A biologist studies all the deer in a forest, then separately studies all the species living in that same forest. What ecological levels of organization is each study describing?":
    "conceptual_analysis",
  "A mountain range splits one population of a species into two. Predict what happens to the two populations over many generations and justify your answer.":
    "conceptual_analysis",
  "A student says 'giraffes evolved long necks because they needed to reach leaves high in trees.' What's the flaw in this reasoning?":
    "conceptual_analysis",
  "A student takes antibiotics and says 'my bacteria evolved resistance during my illness.' Is 'evolved' the right word here for what happened to those bacteria as individuals?":
    "conceptual_analysis",
  "Data shows two populations of finches have different average beak sizes after a drought. A student writes: 'The beak sizes changed because of the drought.' Improve this into a justification rather than a restatement.":
    "interpret_evaluate_experimental_results",
  "A study compares plant growth with and without fertilizer and finds a small difference in average height, with overlapping error bars between groups. Is this difference significant? What would you need to conclude it is?":
    "interpret_evaluate_experimental_results_graphing",
};

async function main() {
  const supabase = createServiceRoleClient();

  let conceptsUpdated = 0;
  for (const update of CONCEPT_UPDATES) {
    let builder = supabase.from("concepts").update({
      science_practice_label: update.practiceLabel,
      big_idea_code: update.bigIdeaCode,
      big_idea_label: update.bigIdeaLabel,
      ...(update.unitLabel ? { unit_label: update.unitLabel } : {}),
    });

    builder = update.contentLoCode
      ? builder.eq("content_lo_code", update.contentLoCode)
      : builder.is("content_lo_code", null).eq(
          "science_practice_label",
          update.matchByOldPracticeLabel!
        );

    const { data, error } = await builder.select("id");
    if (error) throw error;
    if (!data || data.length !== 1) {
      throw new Error(
        `Expected exactly 1 concept match for ${update.contentLoCode ?? update.matchByOldPracticeLabel}, got ${data?.length ?? 0}`
      );
    }
    conceptsUpdated += data.length;
  }
  console.log(`Updated ${conceptsUpdated} concepts`);

  let itemsUpdated = 0;
  for (const [promptText, frqArchetype] of Object.entries(CURRICULUM_ITEM_ARCHETYPES)) {
    const { data, error } = await supabase
      .from("curriculum_items")
      .update({ frq_archetype: frqArchetype, frq_archetype_source: "editorial_classification" })
      .eq("prompt_text", promptText)
      .select("id");
    if (error) throw error;
    if (!data || data.length !== 1) {
      throw new Error(`Expected exactly 1 curriculum_items match for prompt "${promptText.slice(0, 40)}...", got ${data?.length ?? 0}`);
    }
    itemsUpdated += data.length;
  }
  console.log(`Updated ${itemsUpdated} curriculum items`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
