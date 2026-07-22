import { createServiceRoleClient } from "../../lib/supabase/server";

const TENANT_NAME = "AP Biology Demo";
const DEMO_LEARNER_NAME = "Demo Learner";

type ConceptScope = "content" | "practice";

interface ConceptSeed {
  key: string;
  unitCode: string | null;
  unitLabel: string | null;
  contentLoCode: string | null;
  contentLoLabel: string | null;
  practiceCode: string | null;
  practiceLabel: string | null;
}

const CONCEPTS: ConceptSeed[] = [
  {
    key: "water-properties",
    unitCode: "Unit 1",
    unitLabel: "Chemistry of Life",
    contentLoCode: "SYI-1.A",
    contentLoLabel: "Describe the properties of water (polarity, hydrogen bonding, cohesion, adhesion, high specific heat) and their significance for living systems",
    practiceCode: "Skill 6.B",
    practiceLabel: "Support a claim with evidence",
  },
  {
    key: "macromolecule-structure-function",
    unitCode: "Unit 1",
    unitLabel: "Chemistry of Life",
    contentLoCode: "SYI-1.C",
    contentLoLabel: "Explain how the structure of macromolecules (proteins, nucleic acids, carbohydrates, lipids) relates to their function",
    practiceCode: "Skill 6.D",
    practiceLabel: "Explain relationships between structures and functions",
  },
  {
    key: "cell-structure",
    unitCode: "Unit 2",
    unitLabel: "Cell Structure and Function",
    contentLoCode: "SYI-1.D",
    contentLoLabel: "Explain how the structure of an organelle relates to its function",
    practiceCode: "Skill 6.D",
    practiceLabel: "Explain relationships between structures and functions",
  },
  {
    key: "cellular-energetics",
    unitCode: "Unit 3",
    unitLabel: "Cellular Energetics",
    contentLoCode: "ENE-2.G",
    contentLoLabel: "Describe how enzyme structure affects catalysis, including feedback inhibition",
    practiceCode: "Skill 6.C",
    practiceLabel: "Justify a claim using evidence and reasoning",
  },
  {
    key: "signal-transduction",
    unitCode: "Unit 4",
    unitLabel: "Cell Communication and Cell Cycle",
    contentLoCode: "IST-2.B",
    contentLoLabel: "Describe the events of a signal transduction pathway from ligand binding to cellular response",
    practiceCode: "Skill 6.C",
    practiceLabel: "Justify a claim using evidence and reasoning",
  },
  {
    key: "cell-cycle-regulation",
    unitCode: "Unit 4",
    unitLabel: "Cell Communication and Cell Cycle",
    contentLoCode: "IST-3.A",
    contentLoLabel: "Explain how the cell cycle is regulated at checkpoints, and how loss of regulation relates to cancer",
    practiceCode: "Skill 6.C",
    practiceLabel: "Justify a claim using evidence and reasoning",
  },
  {
    key: "meiosis-variation",
    unitCode: "Unit 5",
    unitLabel: "Heredity",
    contentLoCode: "HER-1.D",
    contentLoLabel: "Explain how meiosis (crossing over and independent assortment) produces genetic variation",
    practiceCode: "Skill 5.A",
    practiceLabel: "Perform a quantitative calculation from experimental data",
  },
  {
    key: "inheritance-patterns",
    unitCode: "Unit 5",
    unitLabel: "Heredity",
    contentLoCode: "HER-2.B",
    contentLoLabel: "Predict patterns of inheritance in non-Mendelian scenarios (incomplete dominance, codominance, linked genes)",
    practiceCode: "Skill 5.A",
    practiceLabel: "Perform a quantitative calculation from experimental data",
  },
  {
    key: "genetics-gene-expression",
    unitCode: "Unit 6",
    unitLabel: "Gene Expression and Regulation",
    contentLoCode: "IST-1.K",
    contentLoLabel: "Explain the connection between gene expression and protein synthesis (central dogma)",
    practiceCode: "Skill 5.A",
    practiceLabel: "Perform a quantitative calculation from experimental data",
  },
  {
    key: "evolution",
    unitCode: "Unit 7",
    unitLabel: "Natural Selection",
    contentLoCode: "EVO-3.E",
    contentLoLabel: "Explain how reproductive isolation (e.g. allopatric divergence) leads to speciation",
    practiceCode: null,
    practiceLabel: null,
  },
  {
    key: "ecology",
    unitCode: "Unit 8",
    unitLabel: "Ecology",
    contentLoCode: "ENG-2.E",
    contentLoLabel: "Explain how the growth of a keystone species affects an ecosystem",
    practiceCode: "Skill 3.C",
    practiceLabel: "Identify experimental design elements, including a control group and null hypothesis",
  },
  {
    key: "practice-justify-mechanism",
    unitCode: null,
    unitLabel: null,
    contentLoCode: null,
    contentLoLabel: null,
    practiceCode: "Skill 6.C/D",
    practiceLabel: "Justify a claim via biological mechanism, not just restated evidence",
  },
  {
    key: "practice-experimental-design",
    unitCode: null,
    unitLabel: null,
    contentLoCode: null,
    contentLoLabel: null,
    practiceCode: "Skill 3.C",
    practiceLabel: "Identify a control group and state a null hypothesis",
  },
];

interface MisconceptionSeed {
  code: string;
  label: string;
  description: string;
  scope: ConceptScope;
  relatedConceptKey: string | null;
}

const MISCONCEPTIONS: MisconceptionSeed[] = [
  {
    code: "water-polarity-means-charged",
    label: "Thinks a polar molecule is fully charged, like an ion",
    description: "Confuses partial charge distribution (polarity) with a net electric charge -- treats water as if it were an ion rather than a neutral molecule with uneven charge distribution.",
    scope: "content",
    relatedConceptKey: "water-properties",
  },
  {
    code: "monomer-polymer-direction-confusion",
    label: "Mixes up dehydration synthesis and hydrolysis",
    description: "Doesn't distinguish which direction adds water (hydrolysis, breaking polymers into monomers) from which removes it (dehydration synthesis, building polymers).",
    scope: "content",
    relatedConceptKey: "macromolecule-structure-function",
  },
  {
    code: "ribosome-synthesize-vs-secrete-confusion",
    label: "Thinks ribosomes secrete proteins rather than synthesize them",
    description: '"Ribosomes make amino acids" / secrete-vs-synthesize confusion at the organelle level.',
    scope: "content",
    relatedConceptKey: "cell-structure",
  },
  {
    code: "surface-area-to-volume-not-limiting",
    label: "Doesn't see why cell size is limited",
    description: "Doesn't connect surface-area-to-volume ratio to diffusion/exchange efficiency, so doesn't understand why cells can't just keep growing larger.",
    scope: "content",
    relatedConceptKey: "cell-structure",
  },
  {
    code: "competitive-vs-noncompetitive-inhibition-confusion",
    label: "Mixes up competitive and noncompetitive enzyme inhibition",
    description: "Conflates active-site blocking (competitive) with allosteric-site binding (noncompetitive) inhibition.",
    scope: "content",
    relatedConceptKey: "cellular-energetics",
  },
  {
    code: "enzymes-consumed-in-reaction",
    label: "Thinks enzymes are used up like reactants",
    description: "Doesn't understand that enzymes are catalysts that are regenerated and reused, not consumed or permanently altered by the reaction.",
    scope: "content",
    relatedConceptKey: "cellular-energetics",
  },
  {
    code: "signal-must-enter-cell-to-act",
    label: "Thinks the signaling molecule must enter the cell",
    description: "Believes a ligand must physically cross the membrane to cause a response, rather than binding a surface receptor and triggering an internal cascade without entering.",
    scope: "content",
    relatedConceptKey: "signal-transduction",
  },
  {
    code: "cancer-is-foreign-invader",
    label: "Thinks cancer cells are foreign invaders, like a pathogen",
    description: "Treats cancer as something introduced from outside the body rather than the person's own cells with mutated, checkpoint-evading cell-cycle regulation.",
    scope: "content",
    relatedConceptKey: "cell-cycle-regulation",
  },
  {
    code: "confuses-mitosis-meiosis-stage-count",
    label: "Mixes up mitosis and meiosis stage counts",
    description: "Treats mitosis and meiosis as having the same number of divisions/stages.",
    scope: "content",
    relatedConceptKey: "meiosis-variation",
  },
  {
    code: "dominant-allele-is-more-common",
    label: "Thinks 'dominant' means more frequent in the population",
    description: "Confuses dominance (which allele is phenotypically expressed in a heterozygote) with allele frequency in a population -- a dominant allele can be rare.",
    scope: "content",
    relatedConceptKey: "meiosis-variation",
  },
  {
    code: "punnett-square-predicts-individual-offspring",
    label: "Treats a Punnett-square ratio as a guarantee, not a probability",
    description: "Thinks a predicted 3:1 ratio means exactly 3 of every literal 4 offspring, rather than a probability that only approximates in large samples.",
    scope: "content",
    relatedConceptKey: "inheritance-patterns",
  },
  {
    code: "poly-a-tail-protein-confusion",
    label: "Confuses mRNA poly(A) tail with a protein feature",
    description: "Applies an mRNA-specific vocabulary term (poly(A) tail) to a protein structure.",
    scope: "content",
    relatedConceptKey: "genetics-gene-expression",
  },
  {
    code: "mutations-always-harmful",
    label: "Thinks all mutations are harmful",
    description: "Assumes every mutation damages an organism, ignoring silent, neutral, and occasionally beneficial mutations.",
    scope: "content",
    relatedConceptKey: "genetics-gene-expression",
  },
  {
    code: "evolution-is-goal-directed",
    label: "Thinks organisms evolve traits because they need them",
    description: 'Teleological misconception -- e.g. "giraffes evolved long necks because they needed to reach high leaves" -- rather than variation existing first and being differentially selected.',
    scope: "content",
    relatedConceptKey: "evolution",
  },
  {
    code: "individuals-evolve-within-lifetime",
    label: "Thinks a single organism evolves during its own lifetime",
    description: "Confuses evolution (allele-frequency change across generations in a population) with an individual's own adaptation or development within one lifetime.",
    scope: "content",
    relatedConceptKey: "evolution",
  },
  {
    code: "energy-cycles-like-matter",
    label: "Thinks energy cycles through an ecosystem like matter does",
    description: "Assumes energy is recycled between trophic levels the way nutrients/matter are, rather than flowing one-way and dissipating as heat at each transfer.",
    scope: "content",
    relatedConceptKey: "ecology",
  },
  {
    code: "confuses-population-and-community",
    label: "Mixes up population and community",
    description: "Doesn't distinguish a population (one species in an area) from a community (all species in an area) as levels of ecological organization.",
    scope: "content",
    relatedConceptKey: "ecology",
  },
  {
    code: "support-vs-justify-conflation",
    label: "Restates evidence instead of explaining the mechanism behind it",
    description: 'Answers "why" questions by re-describing what changed (support) instead of explaining the biological mechanism that caused it (justify).',
    scope: "practice",
    relatedConceptKey: "practice-justify-mechanism",
  },
  {
    code: "ignores-error-bar-significance",
    label: "Treats any visual difference as significant without checking error bars",
    description: "Calls a difference between groups meaningful without checking whether error bars/confidence intervals overlap.",
    scope: "practice",
    relatedConceptKey: "practice-experimental-design",
  },
];

interface CurriculumItemSeed {
  conceptKey: string;
  promptText: string;
  teachingContent: string;
}

const CURRICULUM_ITEMS: CurriculumItemSeed[] = [
  {
    conceptKey: "water-properties",
    promptText: "Explain why water is described as a polar molecule, and how that property allows it to dissolve ionic compounds like NaCl.",
    teachingContent: "Water is polar because oxygen pulls shared electrons closer than hydrogen does, giving the oxygen end a partial negative charge and each hydrogen end a partial positive charge -- not a full ionic charge. That partial charge lets water molecules surround and separate ions in a solute: the partially negative oxygens face a cation like Na+, and the partially positive hydrogens face an anion like Cl-, pulling the crystal apart. Cohesion (water sticking to itself) and adhesion (water sticking to other surfaces) both come from this same hydrogen-bonding behavior.",
  },
  {
    conceptKey: "water-properties",
    promptText: "A student says 'water is polar, so it must be an ion.' What's wrong with this statement?",
    teachingContent: "Polarity and ionic charge are different things. A polar molecule like water is electrically neutral overall -- it just has an uneven distribution of that neutral charge, giving it a slightly negative end and a slightly positive end. An ion, by contrast, has an actual net charge from gaining or losing electrons entirely. Water's polarity comes from unequal electron sharing in its covalent bonds, not from gaining or losing electrons.",
  },
  {
    conceptKey: "macromolecule-structure-function",
    promptText: "Two monomers join and a water molecule is released. Is this dehydration synthesis or hydrolysis? What would the reverse reaction look like?",
    teachingContent: "This is dehydration synthesis -- building a polymer from monomers by removing (releasing) a water molecule at each bond formed. The reverse, hydrolysis, breaks a polymer back into monomers by adding a water molecule across each bond. A useful way to keep them straight: 'hydrolysis' contains 'hydro' (water) and 'lysis' (breaking) -- water breaks bonds. Dehydration synthesis is the opposite: removing water to build bonds.",
  },
  {
    conceptKey: "cell-structure",
    promptText: "Explain how the folded structure of the inner mitochondrial membrane (cristae) relates to its function.",
    teachingContent: "Mitochondria have a highly folded inner membrane (cristae) that increases surface area for the electron transport chain and ATP synthase, allowing more ATP to be produced per organelle. Structure-function logic like this recurs across organelles: ribosomes synthesize proteins (they don't secrete them), the rough ER's studded surface increases folding/modification surface area, and the smooth ER's tubular shape suits lipid synthesis.",
  },
  {
    conceptKey: "cell-structure",
    promptText: "A student says 'ribosomes package and secrete proteins out of the cell.' What is wrong with this statement, and what is the correct role of the ribosome?",
    teachingContent: "Ribosomes synthesize (translate) proteins from mRNA; they do not package or secrete them. Packaging and secretion are handled by the Golgi apparatus and vesicles. Confusing 'synthesize' with 'secrete' is a common organelle-function mix-up.",
  },
  {
    conceptKey: "cell-structure",
    promptText: "Why can't cells just keep growing larger and larger instead of dividing?",
    teachingContent: "As a cell grows, its volume (and metabolic demand) increases faster than its surface area, since volume scales with the cube of radius while surface area only scales with the square. Past a certain size, the membrane's surface area can't keep up with the exchange of nutrients and waste the growing volume needs, which is why cells divide instead of growing indefinitely -- dividing resets the surface-area-to-volume ratio back to something efficient.",
  },
  {
    conceptKey: "cellular-energetics",
    promptText: "An enzyme's reaction rate drops sharply when a molecule binds to a site other than the active site. Is this competitive or noncompetitive inhibition, and why?",
    teachingContent: "Noncompetitive inhibition occurs when an inhibitor binds an allosteric site (not the active site), changing the enzyme's shape so it can no longer bind substrate effectively -- this is not overcome by adding more substrate. Competitive inhibition, by contrast, involves the inhibitor binding the active site directly, competing with substrate, and can be overcome with excess substrate.",
  },
  {
    conceptKey: "cellular-energetics",
    promptText: "In a feedback-inhibited pathway, the end product binds an early enzyme and shuts the pathway down. Justify why this is beneficial to the cell, not just describe what happens.",
    teachingContent: "Feedback inhibition is beneficial because it prevents the cell from wasting energy and raw materials producing more end product than it needs -- the mechanism (end product binding an allosteric site on an early enzyme) directly couples production rate to current supply. A 'support' answer would just restate that the pathway slows down; a 'justify' answer explains why that slowing is mechanistically tied to resource efficiency.",
  },
  {
    conceptKey: "cellular-energetics",
    promptText: "A student says 'the enzyme gets used up during the reaction, so you need a fresh one for the next molecule.' What's wrong with this claim?",
    teachingContent: "Enzymes are catalysts: they lower the activation energy of a reaction without being consumed or permanently changed by it. After releasing the product, the same enzyme molecule is free to bind another substrate molecule and catalyze the same reaction again -- it isn't used up like a reactant.",
  },
  {
    conceptKey: "signal-transduction",
    promptText: "A hormone binds a receptor on the outside of a cell, and the cell responds by activating an internal enzyme. Explain how the signal gets from outside the cell to an internal response without the hormone itself entering the cell.",
    teachingContent: "Many signaling molecules (like peptide hormones) never cross the membrane at all -- they bind a receptor protein embedded in the membrane, which changes shape and triggers a cascade of internal events (often via second messengers or a phosphorylation cascade) that relay and amplify the signal to the cell's interior. The original signaling molecule stays outside; only the information it carries gets transmitted inward.",
  },
  {
    conceptKey: "cell-cycle-regulation",
    promptText: "Explain how a failure at a cell-cycle checkpoint could lead to cancer.",
    teachingContent: "Checkpoints (e.g. at G1/S and G2/M) normally stop the cell cycle if DNA damage is detected or conditions aren't right, giving repair machinery a chance to act or triggering cell death if damage is too severe. If checkpoint proteins themselves are mutated (e.g. in genes like p53), damaged cells can bypass these stop signals and keep dividing uncontrollably -- this loss of regulation, not an outside invader, is what characterizes cancer at the cellular level.",
  },
  {
    conceptKey: "meiosis-variation",
    promptText: "How many rounds of division occur in meiosis compared to mitosis, and how does that difference relate to genetic variation?",
    teachingContent: "Mitosis is one division producing two genetically identical diploid cells. Meiosis is two divisions (meiosis I and meiosis II) producing four genetically distinct haploid cells. The extra division in meiosis (specifically meiosis I, where homologous chromosomes separate) is also where crossing over and independent assortment happen, which is why meiosis -- not mitosis -- is the source of genetic variation between gametes.",
  },
  {
    conceptKey: "meiosis-variation",
    promptText: "A student says 'a dominant allele must be the more common one in the population.' Is this true?",
    teachingContent: "No -- dominance describes which allele is phenotypically expressed when two different alleles are present together (heterozygous), not how frequently that allele appears in a population. A dominant allele can be rare; a recessive allele can be common. Population frequency depends on factors like selection pressure and genetic drift, which are independent of which allele happens to be dominant.",
  },
  {
    conceptKey: "inheritance-patterns",
    promptText: "A cross predicts a 3:1 phenotypic ratio. In an actual litter of 4 offspring, would you expect exactly 3 with the dominant phenotype and 1 with the recessive phenotype?",
    teachingContent: "Not necessarily -- a predicted ratio like 3:1 is a probability based on random assortment of gametes, not a guarantee for any specific small sample. With only 4 offspring, getting exactly a 3:1 split is just one possible outcome among several; the predicted ratio becomes a more reliable approximation only across many offspring (a large sample), where chance deviations average out.",
  },
  {
    conceptKey: "genetics-gene-expression",
    promptText: "A gene's coding sequence is 300 nucleotides long. How many amino acids will the resulting protein have (ignoring start/stop codons)?",
    teachingContent: "Each amino acid is coded by a codon of 3 nucleotides, so 300 nucleotides / 3 = 100 amino acids. This is central-dogma quantitative reasoning: DNA is transcribed into mRNA, and mRNA is translated into protein 3 nucleotides (1 codon) at a time.",
  },
  {
    conceptKey: "genetics-gene-expression",
    promptText: "A student says 'the mRNA's poly(A) tail helps the protein fold correctly.' What is wrong with this statement?",
    teachingContent: "The poly(A) tail is a feature of mRNA (added during mRNA processing to increase stability and aid export from the nucleus), not a feature of the protein. Protein folding is driven by amino acid interactions (the protein's primary structure), not by anything carried over from the mRNA.",
  },
  {
    conceptKey: "genetics-gene-expression",
    promptText: "A student says 'any mutation in a gene will damage the protein it codes for.' Evaluate this claim.",
    teachingContent: "Not all mutations are harmful. A silent mutation may not change the amino acid sequence at all (due to codon redundancy); a mutation might land in a non-critical region and have negligible effect (neutral); and in rare cases, a mutation can even improve a protein's function or provide a new advantage (beneficial). Whether a mutation is harmful, neutral, or beneficial depends on where it occurs and how it affects protein structure and function.",
  },
  {
    conceptKey: "ecology",
    promptText: "Researchers remove a keystone predator from an ecosystem and observe a decline in plant diversity. Identify the control group this study would need, and state a null hypothesis.",
    teachingContent: "The control group is a comparable plot/ecosystem where the keystone predator is NOT removed, observed over the same time period. A null hypothesis would state that removing the keystone predator has no effect on plant diversity. Keystone species (like a predator controlling herbivore populations) can have outsized effects on ecosystem structure relative to their abundance.",
  },
  {
    conceptKey: "ecology",
    promptText: "A student says 'energy cycles through an ecosystem the same way nutrients do.' What's wrong with this statement?",
    teachingContent: "Matter (nutrients like carbon and nitrogen) does cycle through an ecosystem and can be reused. Energy does not -- it flows one-way from producers through each trophic level, and a large portion is lost as heat at every transfer (typically only about 10% passes to the next level). That's why ecosystems need a constant energy input (usually sunlight) but can, in principle, recycle the same matter indefinitely.",
  },
  {
    conceptKey: "ecology",
    promptText: "A biologist studies all the deer in a forest, then separately studies all the species living in that same forest. What ecological levels of organization is each study describing?",
    teachingContent: "Studying all the deer (one species) in the forest describes a population. Studying all the species living together in that forest describes a community. A community is made up of multiple populations interacting with each other; a population is just one species' individuals in a given area.",
  },
  {
    conceptKey: "evolution",
    promptText: "A mountain range splits one population of a species into two. Predict what happens to the two populations over many generations and justify your answer.",
    teachingContent: "This is allopatric divergence: physical separation prevents gene flow between the two populations, so they accumulate different mutations and face different selective pressures independently. Over enough generations, this can lead to reproductive isolation and speciation. A justification should explain the mechanism (blocked gene flow + independent selection), not just state 'they will become different species.'",
  },
  {
    conceptKey: "evolution",
    promptText: "A student says 'giraffes evolved long necks because they needed to reach leaves high in trees.' What's the flaw in this reasoning?",
    teachingContent: "This treats evolution as goal-directed, as if organisms change their traits because they need to. In reality, variation in neck length already existed in the population before any selective pressure; giraffes with longer necks that could access more food happened to survive and reproduce more successfully, passing that trait on. The population's average neck length increased over generations through differential survival and reproduction -- no individual giraffe's neck grew because it 'needed' more food.",
  },
  {
    conceptKey: "evolution",
    promptText: "A student takes antibiotics and says 'my bacteria evolved resistance during my illness.' Is 'evolved' the right word here for what happened to those bacteria as individuals?",
    teachingContent: "Individual bacteria don't evolve during their own lifetime -- they either already have resistance genes (from pre-existing variation or mutation) or they don't. What looks like 'evolving resistance' is actually the population's allele frequency shifting: resistant bacteria survive the antibiotic and reproduce, while susceptible ones die off, so the surviving population becomes more resistant on average. That's evolution at the population level across generations, not adaptation within one bacterium's lifetime.",
  },
  {
    conceptKey: "practice-justify-mechanism",
    promptText: "Data shows two populations of finches have different average beak sizes after a drought. A student writes: 'The beak sizes changed because of the drought.' Improve this into a justification rather than a restatement.",
    teachingContent: "A 'support' answer restates the correlation (beak size changed when the drought happened). A 'justify' answer explains the causal mechanism: the drought reduced availability of small, soft seeds, so birds with larger, stronger beaks (able to crack harder, larger seeds) survived and reproduced at higher rates, shifting the population's average beak size via natural selection over generations.",
  },
  {
    conceptKey: "practice-experimental-design",
    promptText: "A study compares plant growth with and without fertilizer and finds a small difference in average height, with overlapping error bars between groups. Is this difference significant? What would you need to conclude it is?",
    teachingContent: "Overlapping error bars/confidence intervals generally mean the observed difference could be due to chance, not a real treatment effect -- you cannot conclude significance from a small average difference alone. A properly designed study needs a control group (no fertilizer), a stated null hypothesis (fertilizer has no effect on height), and a statistical test to determine whether the difference exceeds what chance variation would produce.",
  },

  // -- Comprehensive per-concept overviews (one anchor explanation per
  // concept, deeper than the targeted misconception Q&A items above) --
  {
    conceptKey: "water-properties",
    promptText: "Give a comprehensive overview of water's properties and why they matter for life.",
    teachingContent: "Water's behavior comes almost entirely from its bent shape and polar covalent bonds: oxygen holds shared electrons more tightly than hydrogen, so each water molecule has a partial negative charge near the oxygen and partial positive charges near the hydrogens. That polarity lets neighboring water molecules form hydrogen bonds with each other, and hydrogen bonding is the root cause of nearly every distinctive property of water.\n\nCohesion (water molecules hydrogen-bonding to each other) produces surface tension and pulls water columns upward through plant xylem during transpiration. Adhesion (water hydrogen-bonding to other polar surfaces) works alongside cohesion to move water against gravity in capillary action. High specific heat -- it takes a lot of energy to break hydrogen bonds before water's temperature rises -- lets organisms and bodies of water resist rapid temperature swings, buffering internal conditions against external fluctuation. Water's polarity also makes it an excellent solvent for other polar and ionic substances: it can surround and separate the ions in a salt crystal, or dissolve sugars and amino acids, which is why nearly all biochemistry happens in an aqueous environment. A final well-known property is that solid water (ice) is less dense than liquid water, because hydrogen bonds lock molecules into a spaced-out lattice -- this is why ice floats and insulates bodies of water from freezing solid, protecting aquatic life underneath.",
  },
  {
    conceptKey: "macromolecule-structure-function",
    promptText: "Give a comprehensive overview of the four macromolecule classes and how structure relates to function.",
    teachingContent: "Living things build almost everything from four classes of macromolecules: carbohydrates, lipids, proteins, and nucleic acids. Except for lipids, each is a polymer built from repeating monomers -- monosaccharides for carbohydrates, amino acids for proteins, nucleotides for nucleic acids -- joined by dehydration synthesis (removing a water molecule per bond) and taken apart by hydrolysis (adding a water molecule per bond).\n\nCarbohydrates like glucose store and transport energy efficiently; how their monomers link (e.g. the bond angle in cellulose versus starch) determines whether the result is a rigid structural fiber plants use for cell walls or a compact, easily broken-down energy store. Lipids are hydrophobic, so they don't form true polymers, but their nonpolar tails are exactly what makes them the structural basis of every cell membrane and a dense, long-term energy reserve. Proteins get their function almost entirely from folding: the linear sequence of amino acids (primary structure) determines local folding patterns like alpha helices and beta sheets (secondary structure), which pack into an overall 3D shape (tertiary structure) -- and it's that precise 3D shape that creates an enzyme's active site or an antibody's binding site. Change the sequence enough and the fold breaks, and the function goes with it. Nucleic acids (DNA and RNA) are built from nucleotides and store and transmit hereditary information through the specific pairing of bases (A-T/A-U and G-C), which is also what allows DNA to be copied accurately and RNA to carry a gene's message to the ribosome.",
  },
  {
    conceptKey: "cell-structure",
    promptText: "Give a comprehensive overview of cell structure and why organelle structure relates to function.",
    teachingContent: "Eukaryotic cells are organized into membrane-bound compartments, and in nearly every case, an organelle's structure is shaped by the specific job it does. The nucleus houses and protects DNA behind a double membrane perforated by pores that control what enters and exits. Mitochondria have a folded inner membrane (cristae) that maximizes surface area for the electron transport chain and ATP synthase, directly increasing how much ATP the organelle can produce. Ribosomes -- found free in the cytoplasm or studding the rough ER -- translate mRNA into protein; they do not package or secrete anything themselves. The endomembrane system works as a pipeline: the rough ER folds and modifies proteins headed for secretion or membranes, the smooth ER synthesizes lipids and detoxifies compounds, and the Golgi apparatus further modifies, sorts, and packages proteins into vesicles for their final destination.\n\nCell size itself is constrained by geometry: as a cell grows, its volume increases faster than its surface area (volume scales with the cube of radius, surface area only with the square), so a growing cell eventually can't exchange nutrients and waste across its membrane fast enough to support its own volume. That surface-area-to-volume limit is the real reason cells divide rather than simply growing larger indefinitely -- dividing resets the ratio back to something the membrane can support.",
  },
  {
    conceptKey: "cellular-energetics",
    promptText: "Give a comprehensive overview of enzyme function and regulation.",
    teachingContent: "Enzymes are catalysts: they speed up reactions by lowering the activation energy required, without being consumed or permanently altered in the process -- the same enzyme molecule releases its product and immediately binds a new substrate to do it again. An enzyme's active site has a shape complementary to its substrate (induced fit refines that fit as binding occurs), which is why enzymes are so specific to particular reactions. Reaction rate depends on temperature, pH, and substrate concentration, each of which can denature the enzyme's shape or limit collision frequency if pushed outside the enzyme's optimal range.\n\nEnzymes can be inhibited two main ways: a competitive inhibitor resembles the substrate and binds the active site directly, so it can be out-competed by adding more substrate; a noncompetitive inhibitor binds a separate allosteric site and changes the enzyme's shape so it can no longer bind substrate well, regardless of substrate concentration. Many metabolic pathways use feedback inhibition, where the pathway's own end product binds an allosteric site on an early enzyme in the sequence, throttling production once enough product has accumulated -- an efficient way to avoid wasting energy and raw material on unneeded output.",
  },
  {
    conceptKey: "signal-transduction",
    promptText: "Give a comprehensive overview of how cell signaling works.",
    teachingContent: "Cells communicate by sending signaling molecules (ligands) that bind receptor proteins on or in a target cell, triggering a signal transduction pathway that converts an external signal into an internal response. Many important ligands -- peptide hormones, neurotransmitters -- are not able to cross the plasma membrane at all, so they bind a receptor embedded in the membrane instead; the ligand itself stays outside the cell the whole time. Binding changes the receptor's shape, which passes the signal inward, often through a cascade: G-protein-coupled receptors activate second messengers like cyclic AMP, while receptor tyrosine kinases trigger phosphorylation cascades that pass a phosphate group from one relay protein to the next.\n\nThis cascading design does two important things at once: it transmits the signal from the membrane to wherever in the cell the response needs to happen (often the nucleus, to switch specific genes on or off), and it amplifies the signal, since one activated receptor can trigger many downstream molecules, each activating still more. The end result is a cellular response -- a change in gene expression, metabolism, or cell behavior -- that can be far larger in scale than the single binding event that started it.",
  },
  {
    conceptKey: "cell-cycle-regulation",
    promptText: "Give a comprehensive overview of the cell cycle and its regulation.",
    teachingContent: "The cell cycle moves a cell through G1 (growth), S (DNA replication), G2 (further growth and preparation), and M (mitosis and division). Progression is driven by cyclins binding and activating cyclin-dependent kinases (CDKs), whose concentrations rise and fall in a regular pattern that pushes the cell from one phase to the next. At key checkpoints -- notably G1/S and G2/M -- the cell verifies conditions are right (adequate size, undamaged DNA, correctly attached chromosomes) before allowing the cycle to continue; if something is wrong, checkpoint proteins halt the cycle to allow repair, or trigger apoptosis (programmed cell death) if the damage is too severe to fix.\n\nCancer arises when checkpoint regulation itself breaks down -- for example, when a tumor suppressor gene like p53 (which normally halts the cycle or triggers apoptosis in response to DNA damage) is mutated and loses its function, or when a proto-oncogene that normally promotes controlled division is mutated into an oncogene that promotes division constantly. The resulting cells are the body's own, not a foreign invader -- what makes them dangerous is that they no longer respond to the checkpoints that would otherwise stop uncontrolled growth.",
  },
  {
    conceptKey: "meiosis-variation",
    promptText: "Give a comprehensive overview of meiosis and how it generates genetic variation.",
    teachingContent: "Meiosis takes one diploid cell through two successive divisions -- meiosis I and meiosis II -- to produce four haploid cells, in contrast to mitosis's single division producing two identical diploid cells. In meiosis I, homologous chromosome pairs (one from each parent) line up together and separate from each other; in meiosis II, sister chromatids separate, much like in mitosis. It's this extra division, meiosis I, that is unique to meiosis and is where nearly all of the genetic variation is generated.\n\nTwo mechanisms in meiosis I create that variation: crossing over, where homologous chromosomes exchange segments of DNA while paired up in prophase I, creating new combinations of alleles on a single chromosome; and independent assortment, where each homologous pair orients randomly relative to other pairs during metaphase I, so which parent's chromosome ends up in which gamete is effectively random for each pair. Together these mean that, aside from identical twins, no two gametes (and no two offspring) produced by meiosis are genetically identical -- this is the cellular basis for genetic variation within a species, which natural selection then acts on.",
  },
  {
    conceptKey: "inheritance-patterns",
    promptText: "Give a comprehensive overview of inheritance patterns beyond simple Mendelian dominance.",
    teachingContent: "Mendel's original model -- one dominant allele fully masking one recessive allele -- describes many traits well, but several common inheritance patterns don't fit that simple picture. In incomplete dominance, neither allele fully masks the other, so heterozygotes show a blended, intermediate phenotype (e.g. red and white flowers producing pink offspring). In codominance, both alleles are fully and separately expressed in the heterozygote rather than blending (e.g. an AB blood type genotype expressing both A and B surface antigens). Neither of these is dominance being 'weaker' -- they're different molecular relationships between the alleles' gene products.\n\nGenes located close together on the same chromosome are said to be linked, and tend to be inherited together rather than assorting independently, because crossing over is less likely to separate genes that are physically close. The farther apart two linked genes are, the more likely crossing over will separate them, which is why recombination frequency between genes can be used to map their relative positions on a chromosome. It's also worth remembering that a Punnett square only predicts probabilities, not guaranteed outcomes for any specific small number of offspring -- ratios like 3:1 only become a reliable approximation across many offspring, not four.",
  },
  {
    conceptKey: "genetics-gene-expression",
    promptText: "Give a comprehensive overview of gene expression, from DNA to protein.",
    teachingContent: "The central dogma describes the flow of genetic information: DNA is transcribed into messenger RNA, and mRNA is translated into protein. During transcription, RNA polymerase reads one strand of a gene and builds a complementary mRNA strand; that mRNA is processed (in eukaryotes, a 5' cap and poly-A tail are added, and introns are spliced out) before it leaves the nucleus. During translation, a ribosome reads the mRNA three nucleotides (one codon) at a time, and transfer RNAs bring in the matching amino acid for each codon, building a polypeptide chain in the order the codons specify.\n\nWhether and how much a gene is expressed is itself regulated -- through promoters and transcription factors that control whether RNA polymerase binds a gene at all, and in prokaryotes, through operons that turn groups of related genes on or off together in response to the cell's environment. A mutation is simply a change in the DNA sequence, and its effect on the resulting protein depends entirely on where it falls and what it changes: many mutations are silent (the amino acid sequence doesn't change, due to codon redundancy) or neutral (a changed amino acid doesn't affect protein function), some are harmful, and occasionally a mutation improves a protein's function or provides some new advantage -- mutations are the ultimate source of the genetic variation evolution acts on.",
  },
  {
    conceptKey: "evolution",
    promptText: "Give a comprehensive overview of how natural selection and speciation work.",
    teachingContent: "Natural selection requires three ingredients already present in a population: heritable variation (individuals differ genetically), differential survival or reproduction tied to that variation (some variants leave more offspring than others in a given environment), and time across generations for those differences to accumulate. Selection does not create new traits on demand -- variation exists first, arising from mutation and genetic recombination, and the environment simply determines which existing variants happen to do better. A population's allele frequencies shift generation over generation as a result; no individual organism 'evolves' during its own lifetime, since evolution is a change in a population's genetic makeup across generations, not an individual's adaptation within one.\n\nSpeciation happens when populations of the same species become reproductively isolated from each other long enough that they can no longer interbreed even if they later come back into contact. Allopatric speciation is the most common route: a physical barrier (a mountain range, a new river) splits a population and blocks gene flow between the two halves, which then accumulate different mutations and face different selective pressures independently until they've diverged enough to be separate species. Sympatric speciation, without geographic separation, is rarer but can occur through mechanisms like polyploidy or strong behavioral/temporal isolation within the same range.",
  },
  {
    conceptKey: "ecology",
    promptText: "Give a comprehensive overview of ecosystem structure, energy flow, and matter cycling.",
    teachingContent: "Ecology studies life at increasing levels of organization: an organism belongs to a population (all individuals of one species in an area), which belongs to a community (all species' populations interacting in that area), which together with the physical environment forms an ecosystem. Within an ecosystem, energy and matter behave fundamentally differently. Energy enters as sunlight, is captured by producers through photosynthesis, and flows one-way through the food chain -- at each trophic transfer, roughly 90% of the energy is lost as metabolic heat, so only about 10% moves up to the next level (the '10% rule'), which is why food chains rarely extend past four or five levels and why there's always far more producer biomass than top-predator biomass.\n\nMatter, by contrast, is not lost this way -- elements like carbon, nitrogen, and water cycle repeatedly through the ecosystem via biogeochemical cycles, moving between organisms, atmosphere, soil, and water and being reused indefinitely rather than needing constant outside replenishment (which is why ecosystems need continuous energy input from the sun but not continuous new matter). Some species have effects on their community far out of proportion to their abundance -- a keystone species, such as a top predator that controls a herbivore population and thereby protects plant diversity, can reshape an entire ecosystem's structure if it is removed.",
  },
  {
    conceptKey: "practice-justify-mechanism",
    promptText: "Explain the difference between describing, supporting, and justifying a claim on the AP Biology exam.",
    teachingContent: "AP Biology free-response questions reward different depths of reasoning, and the command word matters. 'Describe' just asks you to state what a pattern or result is (e.g. beak size increased after the drought). 'Support a claim with evidence' asks you to connect a claim to specific data (e.g. average beak size rose from X mm to Y mm after the drought, which supports the claim that selection favored larger beaks). 'Justify' goes a step further and requires the underlying biological mechanism, not just a restated correlation: explaining *why* the data came out that way in terms of a causal process -- for instance, that the drought reduced the supply of small, soft seeds, so individuals with larger, stronger beaks could still access food, survived and reproduced at higher rates than smaller-beaked individuals, and passed the large-beak trait on, shifting the population's average over generations.\n\nA common way students lose points is stopping at 'support' when a question asks to 'justify' -- restating that a variable changed, without explaining the mechanism connecting cause to effect. When justifying, always ask: what is the actual biological process (molecular, cellular, or evolutionary) that makes this outcome happen, not just what changed.",
  },
  {
    conceptKey: "practice-experimental-design",
    promptText: "Explain what makes an experimental design valid, including controls and statistical significance.",
    teachingContent: "A well-designed experiment isolates the effect of one independent variable on a dependent variable while holding other factors constant. That requires a control group -- a comparison condition that is treated identically except for the variable being tested -- so that any difference between groups can be attributed to that variable rather than to some other uncontrolled factor. A null hypothesis states the default assumption that the independent variable has no effect on the dependent variable; the experiment's job is to gather evidence for or against that assumption, not to assume the desired outcome from the start.\n\nBecause any single measurement varies somewhat by chance, good experimental design also requires adequate replication (multiple independent trials or subjects per group) and statistical analysis to determine whether an observed difference is likely real or could plausibly be due to random variation alone. A visual shortcut for this: if error bars or confidence intervals for two groups overlap substantially, the difference between them is usually not statistically significant, and a formal statistical test (not just eyeballing the averages) is needed before concluding the independent variable actually had an effect.",
  },
];

const CALIBRATED_HARD_CONCEPTS = new Set([
  "genetics-gene-expression",
  "practice-experimental-design",
]);

async function main() {
  const supabase = createServiceRoleClient();

  const { data: existingTenant, error: existingTenantError } = await supabase
    .from("tenants")
    .select("id")
    .eq("name", TENANT_NAME)
    .maybeSingle();
  if (existingTenantError) throw existingTenantError;

  if (existingTenant) {
    console.log(`Tenant "${TENANT_NAME}" already exists (id=${existingTenant.id}); skipping.`);
    return;
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({ name: TENANT_NAME })
    .select("id")
    .single();
  if (tenantError) throw tenantError;
  const tenantId = tenant.id;
  console.log(`Created tenant ${tenantId}`);

  const { error: tutorProfileError } = await supabase.from("tutor_profiles").insert({
    tenant_id: tenantId,
    name: "RocketMan",
    tone: "warm and encouraging",
    formality: "casual",
    vocabulary_level: "high-school",
  });
  if (tutorProfileError) throw tutorProfileError;
  console.log("Created tutor profile");

  const { data: learner, error: learnerError } = await supabase
    .from("learners")
    .insert({
      tenant_id: tenantId,
      display_name: DEMO_LEARNER_NAME,
      market_id: "us-ap-bio",
      age_band: "14-18",
    })
    .select("id")
    .single();
  if (learnerError) throw learnerError;
  console.log(`Created demo learner ${learner.id}`);

  const conceptIdByKey = new Map<string, string>();
  for (const concept of CONCEPTS) {
    const { data, error } = await supabase
      .from("concepts")
      .insert({
        tenant_id: tenantId,
        unit_code: concept.unitCode,
        unit_label: concept.unitLabel,
        content_lo_code: concept.contentLoCode,
        content_lo_label: concept.contentLoLabel,
        science_practice_code: concept.practiceCode,
        science_practice_label: concept.practiceLabel,
      })
      .select("id")
      .single();
    if (error) throw error;
    conceptIdByKey.set(concept.key, data.id);
  }
  console.log(`Created ${CONCEPTS.length} concepts`);

  for (const concept of CONCEPTS) {
    const conceptId = conceptIdByKey.get(concept.key)!;
    const isHard = CALIBRATED_HARD_CONCEPTS.has(concept.key);
    const { error } = await supabase.from("bkt_concept_params").insert({
      concept_id: conceptId,
      tenant_id: tenantId,
      ...(isHard
        ? { p_slip: 0.25, p_guess: 0.15, source: "cb_population_data" as const }
        : {}),
    });
    if (error) throw error;
  }
  console.log(`Seeded bkt_concept_params for ${CONCEPTS.length} concepts`);

  for (const m of MISCONCEPTIONS) {
    const relatedConceptId = m.relatedConceptKey
      ? conceptIdByKey.get(m.relatedConceptKey) ?? null
      : null;
    const { error } = await supabase.from("misconceptions").insert({
      tenant_id: tenantId,
      code: m.code,
      label: m.label,
      description: m.description,
      scope: m.scope,
      related_concept_id: relatedConceptId,
    });
    if (error) throw error;
  }
  console.log(`Created ${MISCONCEPTIONS.length} misconceptions`);

  for (const item of CURRICULUM_ITEMS) {
    const conceptId = conceptIdByKey.get(item.conceptKey);
    if (!conceptId) throw new Error(`Unknown concept key ${item.conceptKey}`);
    const { error } = await supabase.from("curriculum_items").insert({
      tenant_id: tenantId,
      concept_id: conceptId,
      prompt_text: item.promptText,
      teaching_content: item.teachingContent,
    });
    if (error) throw error;
  }
  console.log(`Created ${CURRICULUM_ITEMS.length} curriculum items`);

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
