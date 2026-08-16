import { createServiceRoleClient } from "../../lib/supabase/server";
import { hashPassword } from "../../lib/auth/password";

const TENANT_NAME = "AP Biology Demo";

type ConceptScope = "content" | "practice";

type DemoProfile = "strong" | "weak" | "clean";

interface DemoAccountSeed {
  username: string;
  password: string;
  displayName: string;
  profile: DemoProfile;
}

// All demo logins share one password for convenience.
const DEMO_PASSWORD = "Demo1234!";

const DEMO_ACCOUNTS: DemoAccountSeed[] = [
  {
    username: "ava_strong",
    password: DEMO_PASSWORD,
    displayName: "Ava -- strong history",
    profile: "strong",
  },
  {
    username: "ben_weak",
    password: DEMO_PASSWORD,
    displayName: "Ben -- weak history",
    profile: "weak",
  },
  {
    username: "cleo_new",
    password: DEMO_PASSWORD,
    displayName: "Cleo -- new",
    profile: "clean",
  },
  {
    username: "dev_new",
    password: DEMO_PASSWORD,
    displayName: "Dev -- new",
    profile: "clean",
  },
];

// A tutor account (role: tutor, no learner profile) for the tutor console.
const DEMO_TUTOR_USERNAME = "tutor_demo";

// Misconceptions the weak profile has demonstrated (early-unit struggles).
const WEAK_MISCONCEPTION_CODES = [
  "water-polarity-means-charged",
  "monomer-polymer-direction-confusion",
  "competitive-vs-noncompetitive-inhibition-confusion",
];

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

interface ConceptSeed {
  key: string;
  unitCode: string | null;
  unitLabel: string | null;
  contentLoCode: string | null;
  contentLoLabel: string | null;
  practiceCode: string | null;
  practiceLabel: string | null;
  bigIdeaCode: string | null;
  bigIdeaLabel: string | null;
}

const CONCEPTS: ConceptSeed[] = [
  // ---- Unit 1: Chemistry of Life ----
  {
    key: "water-properties",
    unitCode: "Unit 1",
    unitLabel: "Chemistry of Life",
    contentLoCode: "SYI-1.A",
    contentLoLabel: "Water: properties and hydrogen bonding",
    practiceCode: "Skill 6.B",
    practiceLabel: "Argumentation",
    bigIdeaCode: "SYI",
    bigIdeaLabel: "Systems Interactions",
  },
  {
    key: "ph-buffers",
    unitCode: "Unit 1",
    unitLabel: "Chemistry of Life",
    contentLoCode: "SYI-1.B",
    contentLoLabel: "pH and buffers",
    practiceCode: null,
    practiceLabel: null,
    bigIdeaCode: "SYI",
    bigIdeaLabel: "Systems Interactions",
  },
  {
    key: "macromolecule-structure-function",
    unitCode: "Unit 1",
    unitLabel: "Chemistry of Life",
    contentLoCode: "SYI-1.C",
    contentLoLabel: "Biological macromolecules",
    practiceCode: "Skill 6.D",
    practiceLabel: "Concept Explanation",
    bigIdeaCode: "SYI",
    bigIdeaLabel: "Systems Interactions",
  },
  // ---- Unit 2: Cell Structure and Function ----
  {
    key: "cell-types",
    unitCode: "Unit 2",
    unitLabel: "Cell Structure and Function",
    contentLoCode: "SYI-2.A",
    contentLoLabel: "Cell types: prokaryotic vs eukaryotic",
    practiceCode: null,
    practiceLabel: null,
    bigIdeaCode: "SYI",
    bigIdeaLabel: "Systems Interactions",
  },
  {
    key: "cell-structure",
    unitCode: "Unit 2",
    unitLabel: "Cell Structure and Function",
    contentLoCode: "SYI-2.B",
    contentLoLabel: "Organelle structure and function",
    practiceCode: "Skill 6.D",
    practiceLabel: "Concept Explanation",
    bigIdeaCode: "SYI",
    bigIdeaLabel: "Systems Interactions",
  },
  {
    key: "cell-membrane",
    unitCode: "Unit 2",
    unitLabel: "Cell Structure and Function",
    contentLoCode: "SYI-2.C",
    contentLoLabel: "Cell membrane structure",
    practiceCode: null,
    practiceLabel: null,
    bigIdeaCode: "SYI",
    bigIdeaLabel: "Systems Interactions",
  },
  {
    key: "membrane-transport",
    unitCode: "Unit 2",
    unitLabel: "Cell Structure and Function",
    contentLoCode: "SYI-2.D",
    contentLoLabel: "Membrane transport",
    practiceCode: null,
    practiceLabel: null,
    bigIdeaCode: "SYI",
    bigIdeaLabel: "Systems Interactions",
  },
  // ---- Unit 3: Cellular Energetics ----
  {
    key: "cellular-energetics",
    unitCode: "Unit 3",
    unitLabel: "Cellular Energetics",
    contentLoCode: "ENE-3.A",
    contentLoLabel: "Enzymes and catalysis",
    practiceCode: "Skill 6.C",
    practiceLabel: "Argumentation",
    bigIdeaCode: "ENE",
    bigIdeaLabel: "Energetics",
  },
  {
    key: "cellular-respiration",
    unitCode: "Unit 3",
    unitLabel: "Cellular Energetics",
    contentLoCode: "ENE-3.B",
    contentLoLabel: "Cellular respiration",
    practiceCode: null,
    practiceLabel: null,
    bigIdeaCode: "ENE",
    bigIdeaLabel: "Energetics",
  },
  {
    key: "photosynthesis",
    unitCode: "Unit 3",
    unitLabel: "Cellular Energetics",
    contentLoCode: "ENE-3.C",
    contentLoLabel: "Photosynthesis",
    practiceCode: null,
    practiceLabel: null,
    bigIdeaCode: "ENE",
    bigIdeaLabel: "Energetics",
  },
  // ---- Unit 4: Cell Communication and Cell Cycle ----
  {
    key: "signal-transduction",
    unitCode: "Unit 4",
    unitLabel: "Cell Communication and Cell Cycle",
    contentLoCode: "IST-4.A",
    contentLoLabel: "Signal transduction pathways",
    practiceCode: "Skill 6.C",
    practiceLabel: "Argumentation",
    bigIdeaCode: "IST",
    bigIdeaLabel: "Information Storage and Transmission",
  },
  {
    key: "feedback-mechanisms",
    unitCode: "Unit 4",
    unitLabel: "Cell Communication and Cell Cycle",
    contentLoCode: "IST-4.B",
    contentLoLabel: "Feedback mechanisms",
    practiceCode: null,
    practiceLabel: null,
    bigIdeaCode: "IST",
    bigIdeaLabel: "Information Storage and Transmission",
  },
  {
    key: "cell-cycle-regulation",
    unitCode: "Unit 4",
    unitLabel: "Cell Communication and Cell Cycle",
    contentLoCode: "IST-4.C",
    contentLoLabel: "Cell cycle and mitosis",
    practiceCode: "Skill 6.C",
    practiceLabel: "Argumentation",
    bigIdeaCode: "IST",
    bigIdeaLabel: "Information Storage and Transmission",
  },
  // ---- Unit 5: Heredity ----
  {
    key: "meiosis-variation",
    unitCode: "Unit 5",
    unitLabel: "Heredity",
    contentLoCode: "IST-5.A",
    contentLoLabel: "Meiosis and genetic variation",
    practiceCode: "Skill 5.A",
    practiceLabel: "Statistical Tests and Data Analysis",
    bigIdeaCode: "IST",
    bigIdeaLabel: "Information Storage and Transmission",
  },
  {
    key: "mendelian-genetics",
    unitCode: "Unit 5",
    unitLabel: "Heredity",
    contentLoCode: "IST-5.B",
    contentLoLabel: "Mendelian genetics",
    practiceCode: "Skill 5.A",
    practiceLabel: "Statistical Tests and Data Analysis",
    bigIdeaCode: "IST",
    bigIdeaLabel: "Information Storage and Transmission",
  },
  {
    key: "inheritance-patterns",
    unitCode: "Unit 5",
    unitLabel: "Heredity",
    contentLoCode: "IST-5.C",
    contentLoLabel: "Non-Mendelian inheritance patterns",
    practiceCode: "Skill 5.A",
    practiceLabel: "Statistical Tests and Data Analysis",
    bigIdeaCode: "IST",
    bigIdeaLabel: "Information Storage and Transmission",
  },
  // ---- Unit 6: Gene Expression and Regulation ----
  {
    key: "dna-rna-structure",
    unitCode: "Unit 6",
    unitLabel: "Gene Expression and Regulation",
    contentLoCode: "IST-6.A",
    contentLoLabel: "DNA and RNA structure",
    practiceCode: null,
    practiceLabel: null,
    bigIdeaCode: "IST",
    bigIdeaLabel: "Information Storage and Transmission",
  },
  {
    key: "dna-replication",
    unitCode: "Unit 6",
    unitLabel: "Gene Expression and Regulation",
    contentLoCode: "IST-6.B",
    contentLoLabel: "DNA replication",
    practiceCode: null,
    practiceLabel: null,
    bigIdeaCode: "IST",
    bigIdeaLabel: "Information Storage and Transmission",
  },
  {
    key: "genetics-gene-expression",
    unitCode: "Unit 6",
    unitLabel: "Gene Expression and Regulation",
    contentLoCode: "IST-6.C",
    contentLoLabel: "Transcription and translation",
    practiceCode: "Skill 5.A",
    practiceLabel: "Statistical Tests and Data Analysis",
    bigIdeaCode: "IST",
    bigIdeaLabel: "Information Storage and Transmission",
  },
  {
    key: "gene-regulation",
    unitCode: "Unit 6",
    unitLabel: "Gene Expression and Regulation",
    contentLoCode: "IST-6.D",
    contentLoLabel: "Gene regulation",
    practiceCode: null,
    practiceLabel: null,
    bigIdeaCode: "IST",
    bigIdeaLabel: "Information Storage and Transmission",
  },
  // ---- Unit 7: Natural Selection ----
  {
    key: "natural-selection",
    unitCode: "Unit 7",
    unitLabel: "Natural Selection",
    contentLoCode: "EVO-7.A",
    contentLoLabel: "Natural selection",
    practiceCode: null,
    practiceLabel: null,
    bigIdeaCode: "EVO",
    bigIdeaLabel: "Evolution",
  },
  {
    key: "evidence-for-evolution",
    unitCode: "Unit 7",
    unitLabel: "Natural Selection",
    contentLoCode: "EVO-7.B",
    contentLoLabel: "Evidence for evolution",
    practiceCode: null,
    practiceLabel: null,
    bigIdeaCode: "EVO",
    bigIdeaLabel: "Evolution",
  },
  {
    key: "phylogeny",
    unitCode: "Unit 7",
    unitLabel: "Natural Selection",
    contentLoCode: "EVO-7.C",
    contentLoLabel: "Phylogeny and common ancestry",
    practiceCode: null,
    practiceLabel: null,
    bigIdeaCode: "EVO",
    bigIdeaLabel: "Evolution",
  },
  {
    key: "evolution",
    unitCode: "Unit 7",
    unitLabel: "Natural Selection",
    contentLoCode: "EVO-7.D",
    contentLoLabel: "Speciation",
    practiceCode: null,
    practiceLabel: null,
    bigIdeaCode: "EVO",
    bigIdeaLabel: "Evolution",
  },
  // ---- Unit 8: Ecology ----
  {
    key: "environmental-responses",
    unitCode: "Unit 8",
    unitLabel: "Ecology",
    contentLoCode: "SYI-8.A",
    contentLoLabel: "Responses to the environment",
    practiceCode: null,
    practiceLabel: null,
    bigIdeaCode: "SYI",
    bigIdeaLabel: "Systems Interactions",
  },
  {
    key: "ecology",
    unitCode: "Unit 8",
    unitLabel: "Ecology",
    contentLoCode: "SYI-8.B",
    contentLoLabel: "Energy flow in ecosystems",
    practiceCode: "Skill 3.C",
    practiceLabel: "Questions and Methods",
    bigIdeaCode: "SYI",
    bigIdeaLabel: "Systems Interactions",
  },
  {
    key: "community-ecology",
    unitCode: "Unit 8",
    unitLabel: "Ecology",
    contentLoCode: "SYI-8.C",
    contentLoLabel: "Community ecology",
    practiceCode: null,
    practiceLabel: null,
    bigIdeaCode: "SYI",
    bigIdeaLabel: "Systems Interactions",
  },
  {
    key: "biodiversity",
    unitCode: "Unit 8",
    unitLabel: "Ecology",
    contentLoCode: "SYI-8.D",
    contentLoLabel: "Biodiversity",
    practiceCode: null,
    practiceLabel: null,
    bigIdeaCode: "SYI",
    bigIdeaLabel: "Systems Interactions",
  },
  // ---- Cross-cutting science-practice skills (no unit) ----
  {
    key: "practice-justify-mechanism",
    unitCode: null,
    unitLabel: null,
    contentLoCode: null,
    contentLoLabel: null,
    practiceCode: "Skill 6.C/D",
    practiceLabel: "Argumentation",
    bigIdeaCode: null,
    bigIdeaLabel: null,
  },
  {
    key: "practice-experimental-design",
    unitCode: null,
    unitLabel: null,
    contentLoCode: null,
    contentLoLabel: null,
    practiceCode: "Skill 3.C",
    practiceLabel: "Questions and Methods",
    bigIdeaCode: null,
    bigIdeaLabel: null,
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
    code: "ph-scale-is-linear",
    label: "Thinks each pH step is one unit of acidity, not a tenfold change",
    description: "Treats pH as a linear scale, so pH 4 is read as twice as acidic as pH 8 rather than ten thousand times -- misses that each whole pH unit is a tenfold change in hydrogen ion concentration.",
    scope: "content",
    relatedConceptKey: "ph-buffers",
  },
  {
    code: "buffer-prevents-all-ph-change",
    label: "Thinks a buffer holds pH perfectly constant",
    description: "Believes a buffered solution cannot change pH at all, rather than resisting change within a limited capacity that is exhausted once enough acid or base is added.",
    scope: "content",
    relatedConceptKey: "ph-buffers",
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
    code: "prokaryotes-have-no-internal-structures",
    label: "Thinks prokaryotic cells are empty bags with nothing inside",
    description: "Reads 'no membrane-bound organelles' as 'no internal structures at all' -- overlooks that prokaryotes still have ribosomes, a nucleoid region holding their DNA, and a cytoskeleton.",
    scope: "content",
    relatedConceptKey: "cell-types",
  },
  {
    code: "prokaryotes-are-primitive-ancestors",
    label: "Thinks prokaryotes are primitive cells still becoming eukaryotes",
    description: "Treats prokaryotes as an unfinished earlier stage on a ladder toward eukaryotes, rather than a separate lineage that has been evolving just as long and is highly successful on its own terms.",
    scope: "content",
    relatedConceptKey: "cell-types",
  },
  {
    code: "membrane-is-rigid-not-fluid",
    label: "Pictures the membrane as a solid wall rather than a fluid layer",
    description: "Treats the phospholipid bilayer as a fixed structure with proteins locked in place, rather than a fluid mosaic in which lipids and most proteins drift laterally within the layer.",
    scope: "content",
    relatedConceptKey: "cell-membrane",
  },
  {
    code: "phospholipid-head-tail-polarity-reversed",
    label: "Reverses which end of a phospholipid is water-attracting",
    description: "Assigns hydrophobic character to the phosphate head and hydrophilic character to the fatty acid tails -- the reverse of the real arrangement that drives a bilayer to form in water.",
    scope: "content",
    relatedConceptKey: "cell-membrane",
  },
  {
    code: "facilitated-diffusion-requires-atp",
    label: "Thinks any transport through a protein costs energy",
    description: "Conflates facilitated diffusion with active transport, assuming a channel or carrier protein must consume ATP -- misses that facilitated diffusion still moves solutes down their concentration gradient for free.",
    scope: "content",
    relatedConceptKey: "membrane-transport",
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
    code: "glycolysis-produces-most-atp",
    label: "Thinks most ATP comes from glycolysis",
    description: "Credits glycolysis with the bulk of the ATP yield rather than oxidative phosphorylation at the electron transport chain -- glycolysis nets only a small fraction of the ATP produced per glucose.",
    scope: "content",
    relatedConceptKey: "cellular-respiration",
  },
  {
    code: "plants-do-not-respire",
    label: "Thinks plants photosynthesise instead of respiring",
    description: "Treats photosynthesis as the plant's substitute for cellular respiration, or assumes plants respire only at night -- misses that plant cells respire continuously to release usable energy from the sugars they make.",
    scope: "content",
    relatedConceptKey: "photosynthesis",
  },
  {
    code: "signal-must-enter-cell-to-act",
    label: "Thinks the signaling molecule must enter the cell",
    description: "Believes a ligand must physically cross the membrane to cause a response, rather than binding a surface receptor and triggering an internal cascade without entering.",
    scope: "content",
    relatedConceptKey: "signal-transduction",
  },
  {
    code: "negative-feedback-means-harmful",
    label: "Reads 'negative feedback' as a bad outcome",
    description: "Interprets 'negative' as damaging rather than change-opposing -- misses that negative feedback is the stabilising mechanism that returns a system toward its set point.",
    scope: "content",
    relatedConceptKey: "feedback-mechanisms",
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
    code: "heterozygote-is-blended-phenotype",
    label: "Expects a heterozygote to show a blend of both alleles",
    description: "Applies blending inheritance to a simple dominant/recessive trait, expecting an intermediate phenotype rather than the dominant allele being fully expressed in the heterozygote.",
    scope: "content",
    relatedConceptKey: "mendelian-genetics",
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
    code: "backbone-carries-genetic-information",
    label: "Thinks the sugar-phosphate backbone stores the genetic code",
    description: "Locates hereditary information in the backbone, which is chemically identical along the entire strand, rather than in the sequence of nitrogenous bases, which is the part that actually varies.",
    scope: "content",
    relatedConceptKey: "dna-rna-structure",
  },
  {
    code: "replication-is-conservative",
    label: "Thinks replication makes one all-old and one all-new molecule",
    description: "Describes replication as conservative, producing an intact original plus a wholly new copy, rather than semiconservative, where each daughter molecule keeps one parental strand and one new one.",
    scope: "content",
    relatedConceptKey: "dna-replication",
  },
  {
    code: "differentiated-cells-have-different-genes",
    label: "Thinks specialised cells contain different genes",
    description: "Explains cell differentiation by different cell types carrying different genes, rather than every somatic cell carrying the same genome and differing only in which genes are expressed.",
    scope: "content",
    relatedConceptKey: "gene-regulation",
  },
  {
    code: "fittest-means-strongest",
    label: "Thinks 'fittest' means strongest or healthiest",
    description: "Equates evolutionary fitness with physical strength or general health, rather than reproductive success in a particular environment -- a small, physically weak organism that leaves more offspring is fitter.",
    scope: "content",
    relatedConceptKey: "natural-selection",
  },
  {
    code: "homologous-analogous-confusion",
    label: "Treats shared function as evidence of common ancestry",
    description: "Infers relatedness from similar function, conflating analogous structures produced by convergent evolution with homologous structures genuinely inherited from a shared ancestor.",
    scope: "content",
    relatedConceptKey: "evidence-for-evolution",
  },
  {
    code: "cladogram-tips-descend-from-each-other",
    label: "Reads a cladogram as a ladder from older to newer species",
    description: "Interprets living species at the tips as having descended from one another, or reads position further right as more advanced, rather than reading shared ancestry from where branches split.",
    scope: "content",
    relatedConceptKey: "phylogeny",
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
    code: "tropisms-are-deliberate-movement",
    label: "Describes a plant as choosing to move toward light",
    description: "Frames a tropism as intentional movement by the plant, rather than differential growth caused by uneven auxin distribution on the shaded and lit sides of the stem.",
    scope: "content",
    relatedConceptKey: "environmental-responses",
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
    code: "niche-equals-habitat",
    label: "Uses niche and habitat to mean the same thing",
    description: "Treats a niche as simply where an organism lives, rather than its full functional role -- what it consumes, what consumes it, and how it interacts with the rest of the community.",
    scope: "content",
    relatedConceptKey: "community-ecology",
  },
  {
    code: "biodiversity-is-only-species-count",
    label: "Thinks biodiversity just means the number of species",
    description: "Reduces biodiversity to species richness alone, ignoring how evenly individuals are distributed among those species and the genetic and ecosystem diversity that also count.",
    scope: "content",
    relatedConceptKey: "biodiversity",
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

type FrqArchetype =
  | "interpret_evaluate_experimental_results"
  | "interpret_evaluate_experimental_results_graphing"
  | "scientific_investigation"
  | "conceptual_analysis"
  | "analyze_model_visual"
  | "analyze_data";

interface CurriculumItemSeed {
  conceptKey: string;
  promptText: string;
  teachingContent: string;
  frqArchetype: FrqArchetype | null;
}

const CURRICULUM_ITEMS: CurriculumItemSeed[] = [
  {
    conceptKey: "water-properties",
    promptText: "Explain why water is described as a polar molecule, and how that property allows it to dissolve ionic compounds like NaCl.",
    teachingContent: "Water is polar because oxygen pulls shared electrons closer than hydrogen does, giving the oxygen end a partial negative charge and each hydrogen end a partial positive charge -- not a full ionic charge. That partial charge lets water molecules surround and separate ions in a solute: the partially negative oxygens face a cation like Na+, and the partially positive hydrogens face an anion like Cl-, pulling the crystal apart. Cohesion (water sticking to itself) and adhesion (water sticking to other surfaces) both come from this same hydrogen-bonding behavior.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "water-properties",
    promptText: "A student says 'water is polar, so it must be an ion.' What's wrong with this statement?",
    teachingContent: "Polarity and ionic charge are different things. A polar molecule like water is electrically neutral overall -- it just has an uneven distribution of that neutral charge, giving it a slightly negative end and a slightly positive end. An ion, by contrast, has an actual net charge from gaining or losing electrons entirely. Water's polarity comes from unequal electron sharing in its covalent bonds, not from gaining or losing electrons.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "macromolecule-structure-function",
    promptText: "Two monomers join and a water molecule is released. Is this dehydration synthesis or hydrolysis? What would the reverse reaction look like?",
    teachingContent: "This is dehydration synthesis -- building a polymer from monomers by removing (releasing) a water molecule at each bond formed. The reverse, hydrolysis, breaks a polymer back into monomers by adding a water molecule across each bond. A useful way to keep them straight: 'hydrolysis' contains 'hydro' (water) and 'lysis' (breaking) -- water breaks bonds. Dehydration synthesis is the opposite: removing water to build bonds.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "cell-structure",
    promptText: "Explain how the folded structure of the inner mitochondrial membrane (cristae) relates to its function.",
    teachingContent: "Mitochondria have a highly folded inner membrane (cristae) that increases surface area for the electron transport chain and ATP synthase, allowing more ATP to be produced per organelle. Structure-function logic like this recurs across organelles: ribosomes synthesize proteins (they don't secrete them), the rough ER's studded surface increases folding/modification surface area, and the smooth ER's tubular shape suits lipid synthesis.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "cell-structure",
    promptText: "A student says 'ribosomes package and secrete proteins out of the cell.' What is wrong with this statement, and what is the correct role of the ribosome?",
    teachingContent: "Ribosomes synthesize (translate) proteins from mRNA; they do not package or secrete them. Packaging and secretion are handled by the Golgi apparatus and vesicles. Confusing 'synthesize' with 'secrete' is a common organelle-function mix-up.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "cell-structure",
    promptText: "Why can't cells just keep growing larger and larger instead of dividing?",
    teachingContent: "As a cell grows, its volume (and metabolic demand) increases faster than its surface area, since volume scales with the cube of radius while surface area only scales with the square. Past a certain size, the membrane's surface area can't keep up with the exchange of nutrients and waste the growing volume needs, which is why cells divide instead of growing indefinitely -- dividing resets the surface-area-to-volume ratio back to something efficient.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "cellular-energetics",
    promptText: "An enzyme's reaction rate drops sharply when a molecule binds to a site other than the active site. Is this competitive or noncompetitive inhibition, and why?",
    teachingContent: "Noncompetitive inhibition occurs when an inhibitor binds an allosteric site (not the active site), changing the enzyme's shape so it can no longer bind substrate effectively -- this is not overcome by adding more substrate. Competitive inhibition, by contrast, involves the inhibitor binding the active site directly, competing with substrate, and can be overcome with excess substrate.",
    frqArchetype: "analyze_model_visual",
  },
  {
    conceptKey: "cellular-energetics",
    promptText: "In a feedback-inhibited pathway, the end product binds an early enzyme and shuts the pathway down. Justify why this is beneficial to the cell, not just describe what happens.",
    teachingContent: "Feedback inhibition is beneficial because it prevents the cell from wasting energy and raw materials producing more end product than it needs -- the mechanism (end product binding an allosteric site on an early enzyme) directly couples production rate to current supply. A 'support' answer would just restate that the pathway slows down; a 'justify' answer explains why that slowing is mechanistically tied to resource efficiency.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "cellular-energetics",
    promptText: "A student says 'the enzyme gets used up during the reaction, so you need a fresh one for the next molecule.' What's wrong with this claim?",
    teachingContent: "Enzymes are catalysts: they lower the activation energy of a reaction without being consumed or permanently changed by it. After releasing the product, the same enzyme molecule is free to bind another substrate molecule and catalyze the same reaction again -- it isn't used up like a reactant.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "signal-transduction",
    promptText: "A hormone binds a receptor on the outside of a cell, and the cell responds by activating an internal enzyme. Explain how the signal gets from outside the cell to an internal response without the hormone itself entering the cell.",
    teachingContent: "Many signaling molecules (like peptide hormones) never cross the membrane at all -- they bind a receptor protein embedded in the membrane, which changes shape and triggers a cascade of internal events (often via second messengers or a phosphorylation cascade) that relay and amplify the signal to the cell's interior. The original signaling molecule stays outside; only the information it carries gets transmitted inward.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "cell-cycle-regulation",
    promptText: "Explain how a failure at a cell-cycle checkpoint could lead to cancer.",
    teachingContent: "Checkpoints (e.g. at G1/S and G2/M) normally stop the cell cycle if DNA damage is detected or conditions aren't right, giving repair machinery a chance to act or triggering cell death if damage is too severe. If checkpoint proteins themselves are mutated (e.g. in genes like p53), damaged cells can bypass these stop signals and keep dividing uncontrollably -- this loss of regulation, not an outside invader, is what characterizes cancer at the cellular level.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "meiosis-variation",
    promptText: "How many rounds of division occur in meiosis compared to mitosis, and how does that difference relate to genetic variation?",
    teachingContent: "Mitosis is one division producing two genetically identical diploid cells. Meiosis is two divisions (meiosis I and meiosis II) producing four genetically distinct haploid cells. The extra division in meiosis (specifically meiosis I, where homologous chromosomes separate) is also where crossing over and independent assortment happen, which is why meiosis -- not mitosis -- is the source of genetic variation between gametes.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "meiosis-variation",
    promptText: "A student says 'a dominant allele must be the more common one in the population.' Is this true?",
    teachingContent: "No -- dominance describes which allele is phenotypically expressed when two different alleles are present together (heterozygous), not how frequently that allele appears in a population. A dominant allele can be rare; a recessive allele can be common. Population frequency depends on factors like selection pressure and genetic drift, which are independent of which allele happens to be dominant.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "inheritance-patterns",
    promptText: "A cross predicts a 3:1 phenotypic ratio. In an actual litter of 4 offspring, would you expect exactly 3 with the dominant phenotype and 1 with the recessive phenotype?",
    teachingContent: "Not necessarily -- a predicted ratio like 3:1 is a probability based on random assortment of gametes, not a guarantee for any specific small sample. With only 4 offspring, getting exactly a 3:1 split is just one possible outcome among several; the predicted ratio becomes a more reliable approximation only across many offspring (a large sample), where chance deviations average out.",
    frqArchetype: "analyze_data",
  },
  {
    conceptKey: "genetics-gene-expression",
    promptText: "A gene's coding sequence is 300 nucleotides long. How many amino acids will the resulting protein have (ignoring start/stop codons)?",
    teachingContent: "Each amino acid is coded by a codon of 3 nucleotides, so 300 nucleotides / 3 = 100 amino acids. This is central-dogma quantitative reasoning: DNA is transcribed into mRNA, and mRNA is translated into protein 3 nucleotides (1 codon) at a time.",
    frqArchetype: "analyze_data",
  },
  {
    conceptKey: "genetics-gene-expression",
    promptText: "A student says 'the mRNA's poly(A) tail helps the protein fold correctly.' What is wrong with this statement?",
    teachingContent: "The poly(A) tail is a feature of mRNA (added during mRNA processing to increase stability and aid export from the nucleus), not a feature of the protein. Protein folding is driven by amino acid interactions (the protein's primary structure), not by anything carried over from the mRNA.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "genetics-gene-expression",
    promptText: "A student says 'any mutation in a gene will damage the protein it codes for.' Evaluate this claim.",
    teachingContent: "Not all mutations are harmful. A silent mutation may not change the amino acid sequence at all (due to codon redundancy); a mutation might land in a non-critical region and have negligible effect (neutral); and in rare cases, a mutation can even improve a protein's function or provide a new advantage (beneficial). Whether a mutation is harmful, neutral, or beneficial depends on where it occurs and how it affects protein structure and function.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "ecology",
    promptText: "Researchers remove a keystone predator from an ecosystem and observe a decline in plant diversity. Identify the control group this study would need, and state a null hypothesis.",
    teachingContent: "The control group is a comparable plot/ecosystem where the keystone predator is NOT removed, observed over the same time period. A null hypothesis would state that removing the keystone predator has no effect on plant diversity. Keystone species (like a predator controlling herbivore populations) can have outsized effects on ecosystem structure relative to their abundance.",
    frqArchetype: "scientific_investigation",
  },
  {
    conceptKey: "ecology",
    promptText: "A student says 'energy cycles through an ecosystem the same way nutrients do.' What's wrong with this statement?",
    teachingContent: "Matter (nutrients like carbon and nitrogen) does cycle through an ecosystem and can be reused. Energy does not -- it flows one-way from producers through each trophic level, and a large portion is lost as heat at every transfer (typically only about 10% passes to the next level). That's why ecosystems need a constant energy input (usually sunlight) but can, in principle, recycle the same matter indefinitely.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "ecology",
    promptText: "A biologist studies all the deer in a forest, then separately studies all the species living in that same forest. What ecological levels of organization is each study describing?",
    teachingContent: "Studying all the deer (one species) in the forest describes a population. Studying all the species living together in that forest describes a community. A community is made up of multiple populations interacting with each other; a population is just one species' individuals in a given area.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "evolution",
    promptText: "A mountain range splits one population of a species into two. Predict what happens to the two populations over many generations and justify your answer.",
    teachingContent: "This is allopatric divergence: physical separation prevents gene flow between the two populations, so they accumulate different mutations and face different selective pressures independently. Over enough generations, this can lead to reproductive isolation and speciation. A justification should explain the mechanism (blocked gene flow + independent selection), not just state 'they will become different species.'",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "evolution",
    promptText: "A student says 'giraffes evolved long necks because they needed to reach leaves high in trees.' What's the flaw in this reasoning?",
    teachingContent: "This treats evolution as goal-directed, as if organisms change their traits because they need to. In reality, variation in neck length already existed in the population before any selective pressure; giraffes with longer necks that could access more food happened to survive and reproduce more successfully, passing that trait on. The population's average neck length increased over generations through differential survival and reproduction -- no individual giraffe's neck grew because it 'needed' more food.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "evolution",
    promptText: "A student takes antibiotics and says 'my bacteria evolved resistance during my illness.' Is 'evolved' the right word here for what happened to those bacteria as individuals?",
    teachingContent: "Individual bacteria don't evolve during their own lifetime -- they either already have resistance genes (from pre-existing variation or mutation) or they don't. What looks like 'evolving resistance' is actually the population's allele frequency shifting: resistant bacteria survive the antibiotic and reproduce, while susceptible ones die off, so the surviving population becomes more resistant on average. That's evolution at the population level across generations, not adaptation within one bacterium's lifetime.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "practice-justify-mechanism",
    promptText: "Data shows two populations of finches have different average beak sizes after a drought. A student writes: 'The beak sizes changed because of the drought.' Improve this into a justification rather than a restatement.",
    teachingContent: "A 'support' answer restates the correlation (beak size changed when the drought happened). A 'justify' answer explains the causal mechanism: the drought reduced availability of small, soft seeds, so birds with larger, stronger beaks (able to crack harder, larger seeds) survived and reproduced at higher rates, shifting the population's average beak size via natural selection over generations.",
    frqArchetype: "interpret_evaluate_experimental_results",
  },
  {
    conceptKey: "practice-experimental-design",
    promptText: "A study compares plant growth with and without fertilizer and finds a small difference in average height, with overlapping error bars between groups. Is this difference significant? What would you need to conclude it is?",
    teachingContent: "Overlapping error bars/confidence intervals generally mean the observed difference could be due to chance, not a real treatment effect -- you cannot conclude significance from a small average difference alone. A properly designed study needs a control group (no fertilizer), a stated null hypothesis (fertilizer has no effect on height), and a statistical test to determine whether the difference exceeds what chance variation would produce.",
    frqArchetype: "interpret_evaluate_experimental_results_graphing",
  },

  // -- Comprehensive per-concept overviews (one anchor explanation per
  // concept, deeper than the targeted misconception Q&A items above) --
  {
    conceptKey: "water-properties",
    promptText: "Give a comprehensive overview of water's properties and why they matter for life.",
    teachingContent: "Water's behavior comes almost entirely from its bent shape and polar covalent bonds: oxygen holds shared electrons more tightly than hydrogen, so each water molecule has a partial negative charge near the oxygen and partial positive charges near the hydrogens. That polarity lets neighboring water molecules form hydrogen bonds with each other, and hydrogen bonding is the root cause of nearly every distinctive property of water.\n\nCohesion (water molecules hydrogen-bonding to each other) produces surface tension and pulls water columns upward through plant xylem during transpiration. Adhesion (water hydrogen-bonding to other polar surfaces) works alongside cohesion to move water against gravity in capillary action. High specific heat -- it takes a lot of energy to break hydrogen bonds before water's temperature rises -- lets organisms and bodies of water resist rapid temperature swings, buffering internal conditions against external fluctuation. Water's polarity also makes it an excellent solvent for other polar and ionic substances: it can surround and separate the ions in a salt crystal, or dissolve sugars and amino acids, which is why nearly all biochemistry happens in an aqueous environment. A final well-known property is that solid water (ice) is less dense than liquid water, because hydrogen bonds lock molecules into a spaced-out lattice -- this is why ice floats and insulates bodies of water from freezing solid, protecting aquatic life underneath.",
    frqArchetype: null,
  },
  {
    conceptKey: "macromolecule-structure-function",
    promptText: "Give a comprehensive overview of the four macromolecule classes and how structure relates to function.",
    teachingContent: "Living things build almost everything from four classes of macromolecules: carbohydrates, lipids, proteins, and nucleic acids. Except for lipids, each is a polymer built from repeating monomers -- monosaccharides for carbohydrates, amino acids for proteins, nucleotides for nucleic acids -- joined by dehydration synthesis (removing a water molecule per bond) and taken apart by hydrolysis (adding a water molecule per bond).\n\nCarbohydrates like glucose store and transport energy efficiently; how their monomers link (e.g. the bond angle in cellulose versus starch) determines whether the result is a rigid structural fiber plants use for cell walls or a compact, easily broken-down energy store. Lipids are hydrophobic, so they don't form true polymers, but their nonpolar tails are exactly what makes them the structural basis of every cell membrane and a dense, long-term energy reserve. Proteins get their function almost entirely from folding: the linear sequence of amino acids (primary structure) determines local folding patterns like alpha helices and beta sheets (secondary structure), which pack into an overall 3D shape (tertiary structure) -- and it's that precise 3D shape that creates an enzyme's active site or an antibody's binding site. Change the sequence enough and the fold breaks, and the function goes with it. Nucleic acids (DNA and RNA) are built from nucleotides and store and transmit hereditary information through the specific pairing of bases (A-T/A-U and G-C), which is also what allows DNA to be copied accurately and RNA to carry a gene's message to the ribosome.",
    frqArchetype: null,
  },
  {
    conceptKey: "cell-structure",
    promptText: "Give a comprehensive overview of cell structure and why organelle structure relates to function.",
    teachingContent: "Eukaryotic cells are organized into membrane-bound compartments, and in nearly every case, an organelle's structure is shaped by the specific job it does. The nucleus houses and protects DNA behind a double membrane perforated by pores that control what enters and exits. Mitochondria have a folded inner membrane (cristae) that maximizes surface area for the electron transport chain and ATP synthase, directly increasing how much ATP the organelle can produce. Ribosomes -- found free in the cytoplasm or studding the rough ER -- translate mRNA into protein; they do not package or secrete anything themselves. The endomembrane system works as a pipeline: the rough ER folds and modifies proteins headed for secretion or membranes, the smooth ER synthesizes lipids and detoxifies compounds, and the Golgi apparatus further modifies, sorts, and packages proteins into vesicles for their final destination.\n\nCell size itself is constrained by geometry: as a cell grows, its volume increases faster than its surface area (volume scales with the cube of radius, surface area only with the square), so a growing cell eventually can't exchange nutrients and waste across its membrane fast enough to support its own volume. That surface-area-to-volume limit is the real reason cells divide rather than simply growing larger indefinitely -- dividing resets the ratio back to something the membrane can support.",
    frqArchetype: null,
  },
  {
    conceptKey: "cellular-energetics",
    promptText: "Give a comprehensive overview of enzyme function and regulation.",
    teachingContent: "Enzymes are catalysts: they speed up reactions by lowering the activation energy required, without being consumed or permanently altered in the process -- the same enzyme molecule releases its product and immediately binds a new substrate to do it again. An enzyme's active site has a shape complementary to its substrate (induced fit refines that fit as binding occurs), which is why enzymes are so specific to particular reactions. Reaction rate depends on temperature, pH, and substrate concentration, each of which can denature the enzyme's shape or limit collision frequency if pushed outside the enzyme's optimal range.\n\nEnzymes can be inhibited two main ways: a competitive inhibitor resembles the substrate and binds the active site directly, so it can be out-competed by adding more substrate; a noncompetitive inhibitor binds a separate allosteric site and changes the enzyme's shape so it can no longer bind substrate well, regardless of substrate concentration. Many metabolic pathways use feedback inhibition, where the pathway's own end product binds an allosteric site on an early enzyme in the sequence, throttling production once enough product has accumulated -- an efficient way to avoid wasting energy and raw material on unneeded output.",
    frqArchetype: null,
  },
  {
    conceptKey: "signal-transduction",
    promptText: "Give a comprehensive overview of how cell signaling works.",
    teachingContent: "Cells communicate by sending signaling molecules (ligands) that bind receptor proteins on or in a target cell, triggering a signal transduction pathway that converts an external signal into an internal response. Many important ligands -- peptide hormones, neurotransmitters -- are not able to cross the plasma membrane at all, so they bind a receptor embedded in the membrane instead; the ligand itself stays outside the cell the whole time. Binding changes the receptor's shape, which passes the signal inward, often through a cascade: G-protein-coupled receptors activate second messengers like cyclic AMP, while receptor tyrosine kinases trigger phosphorylation cascades that pass a phosphate group from one relay protein to the next.\n\nThis cascading design does two important things at once: it transmits the signal from the membrane to wherever in the cell the response needs to happen (often the nucleus, to switch specific genes on or off), and it amplifies the signal, since one activated receptor can trigger many downstream molecules, each activating still more. The end result is a cellular response -- a change in gene expression, metabolism, or cell behavior -- that can be far larger in scale than the single binding event that started it.",
    frqArchetype: null,
  },
  {
    conceptKey: "cell-cycle-regulation",
    promptText: "Give a comprehensive overview of the cell cycle and its regulation.",
    teachingContent: "The cell cycle moves a cell through G1 (growth), S (DNA replication), G2 (further growth and preparation), and M (mitosis and division). Progression is driven by cyclins binding and activating cyclin-dependent kinases (CDKs), whose concentrations rise and fall in a regular pattern that pushes the cell from one phase to the next. At key checkpoints -- notably G1/S and G2/M -- the cell verifies conditions are right (adequate size, undamaged DNA, correctly attached chromosomes) before allowing the cycle to continue; if something is wrong, checkpoint proteins halt the cycle to allow repair, or trigger apoptosis (programmed cell death) if the damage is too severe to fix.\n\nCancer arises when checkpoint regulation itself breaks down -- for example, when a tumor suppressor gene like p53 (which normally halts the cycle or triggers apoptosis in response to DNA damage) is mutated and loses its function, or when a proto-oncogene that normally promotes controlled division is mutated into an oncogene that promotes division constantly. The resulting cells are the body's own, not a foreign invader -- what makes them dangerous is that they no longer respond to the checkpoints that would otherwise stop uncontrolled growth.",
    frqArchetype: null,
  },
  {
    conceptKey: "meiosis-variation",
    promptText: "Give a comprehensive overview of meiosis and how it generates genetic variation.",
    teachingContent: "Meiosis takes one diploid cell through two successive divisions -- meiosis I and meiosis II -- to produce four haploid cells, in contrast to mitosis's single division producing two identical diploid cells. In meiosis I, homologous chromosome pairs (one from each parent) line up together and separate from each other; in meiosis II, sister chromatids separate, much like in mitosis. It's this extra division, meiosis I, that is unique to meiosis and is where nearly all of the genetic variation is generated.\n\nTwo mechanisms in meiosis I create that variation: crossing over, where homologous chromosomes exchange segments of DNA while paired up in prophase I, creating new combinations of alleles on a single chromosome; and independent assortment, where each homologous pair orients randomly relative to other pairs during metaphase I, so which parent's chromosome ends up in which gamete is effectively random for each pair. Together these mean that, aside from identical twins, no two gametes (and no two offspring) produced by meiosis are genetically identical -- this is the cellular basis for genetic variation within a species, which natural selection then acts on.",
    frqArchetype: null,
  },
  {
    conceptKey: "inheritance-patterns",
    promptText: "Give a comprehensive overview of inheritance patterns beyond simple Mendelian dominance.",
    teachingContent: "Mendel's original model -- one dominant allele fully masking one recessive allele -- describes many traits well, but several common inheritance patterns don't fit that simple picture. In incomplete dominance, neither allele fully masks the other, so heterozygotes show a blended, intermediate phenotype (e.g. red and white flowers producing pink offspring). In codominance, both alleles are fully and separately expressed in the heterozygote rather than blending (e.g. an AB blood type genotype expressing both A and B surface antigens). Neither of these is dominance being 'weaker' -- they're different molecular relationships between the alleles' gene products.\n\nGenes located close together on the same chromosome are said to be linked, and tend to be inherited together rather than assorting independently, because crossing over is less likely to separate genes that are physically close. The farther apart two linked genes are, the more likely crossing over will separate them, which is why recombination frequency between genes can be used to map their relative positions on a chromosome. It's also worth remembering that a Punnett square only predicts probabilities, not guaranteed outcomes for any specific small number of offspring -- ratios like 3:1 only become a reliable approximation across many offspring, not four.",
    frqArchetype: null,
  },
  {
    conceptKey: "genetics-gene-expression",
    promptText: "Give a comprehensive overview of gene expression, from DNA to protein.",
    teachingContent: "The central dogma describes the flow of genetic information: DNA is transcribed into messenger RNA, and mRNA is translated into protein. During transcription, RNA polymerase reads one strand of a gene and builds a complementary mRNA strand; that mRNA is processed (in eukaryotes, a 5' cap and poly-A tail are added, and introns are spliced out) before it leaves the nucleus. During translation, a ribosome reads the mRNA three nucleotides (one codon) at a time, and transfer RNAs bring in the matching amino acid for each codon, building a polypeptide chain in the order the codons specify.\n\nWhether and how much a gene is expressed is itself regulated -- through promoters and transcription factors that control whether RNA polymerase binds a gene at all, and in prokaryotes, through operons that turn groups of related genes on or off together in response to the cell's environment. A mutation is simply a change in the DNA sequence, and its effect on the resulting protein depends entirely on where it falls and what it changes: many mutations are silent (the amino acid sequence doesn't change, due to codon redundancy) or neutral (a changed amino acid doesn't affect protein function), some are harmful, and occasionally a mutation improves a protein's function or provides some new advantage -- mutations are the ultimate source of the genetic variation evolution acts on.",
    frqArchetype: null,
  },
  {
    conceptKey: "evolution",
    promptText: "Give a comprehensive overview of how natural selection and speciation work.",
    teachingContent: "Natural selection requires three ingredients already present in a population: heritable variation (individuals differ genetically), differential survival or reproduction tied to that variation (some variants leave more offspring than others in a given environment), and time across generations for those differences to accumulate. Selection does not create new traits on demand -- variation exists first, arising from mutation and genetic recombination, and the environment simply determines which existing variants happen to do better. A population's allele frequencies shift generation over generation as a result; no individual organism 'evolves' during its own lifetime, since evolution is a change in a population's genetic makeup across generations, not an individual's adaptation within one.\n\nSpeciation happens when populations of the same species become reproductively isolated from each other long enough that they can no longer interbreed even if they later come back into contact. Allopatric speciation is the most common route: a physical barrier (a mountain range, a new river) splits a population and blocks gene flow between the two halves, which then accumulate different mutations and face different selective pressures independently until they've diverged enough to be separate species. Sympatric speciation, without geographic separation, is rarer but can occur through mechanisms like polyploidy or strong behavioral/temporal isolation within the same range.",
    frqArchetype: null,
  },
  {
    conceptKey: "ecology",
    promptText: "Give a comprehensive overview of ecosystem structure, energy flow, and matter cycling.",
    teachingContent: "Ecology studies life at increasing levels of organization: an organism belongs to a population (all individuals of one species in an area), which belongs to a community (all species' populations interacting in that area), which together with the physical environment forms an ecosystem. Within an ecosystem, energy and matter behave fundamentally differently. Energy enters as sunlight, is captured by producers through photosynthesis, and flows one-way through the food chain -- at each trophic transfer, roughly 90% of the energy is lost as metabolic heat, so only about 10% moves up to the next level (the '10% rule'), which is why food chains rarely extend past four or five levels and why there's always far more producer biomass than top-predator biomass.\n\nMatter, by contrast, is not lost this way -- elements like carbon, nitrogen, and water cycle repeatedly through the ecosystem via biogeochemical cycles, moving between organisms, atmosphere, soil, and water and being reused indefinitely rather than needing constant outside replenishment (which is why ecosystems need continuous energy input from the sun but not continuous new matter). Some species have effects on their community far out of proportion to their abundance -- a keystone species, such as a top predator that controls a herbivore population and thereby protects plant diversity, can reshape an entire ecosystem's structure if it is removed.",
    frqArchetype: null,
  },
  {
    conceptKey: "practice-justify-mechanism",
    promptText: "Explain the difference between describing, supporting, and justifying a claim on the AP Biology exam.",
    teachingContent: "AP Biology free-response questions reward different depths of reasoning, and the command word matters. 'Describe' just asks you to state what a pattern or result is (e.g. beak size increased after the drought). 'Support a claim with evidence' asks you to connect a claim to specific data (e.g. average beak size rose from X mm to Y mm after the drought, which supports the claim that selection favored larger beaks). 'Justify' goes a step further and requires the underlying biological mechanism, not just a restated correlation: explaining *why* the data came out that way in terms of a causal process -- for instance, that the drought reduced the supply of small, soft seeds, so individuals with larger, stronger beaks could still access food, survived and reproduced at higher rates than smaller-beaked individuals, and passed the large-beak trait on, shifting the population's average over generations.\n\nA common way students lose points is stopping at 'support' when a question asks to 'justify' -- restating that a variable changed, without explaining the mechanism connecting cause to effect. When justifying, always ask: what is the actual biological process (molecular, cellular, or evolutionary) that makes this outcome happen, not just what changed.",
    frqArchetype: null,
  },
  {
    conceptKey: "practice-experimental-design",
    promptText: "Explain what makes an experimental design valid, including controls and statistical significance.",
    teachingContent: "A well-designed experiment isolates the effect of one independent variable on a dependent variable while holding other factors constant. That requires a control group -- a comparison condition that is treated identically except for the variable being tested -- so that any difference between groups can be attributed to that variable rather than to some other uncontrolled factor. A null hypothesis states the default assumption that the independent variable has no effect on the dependent variable; the experiment's job is to gather evidence for or against that assumption, not to assume the desired outcome from the start.\n\nBecause any single measurement varies somewhat by chance, good experimental design also requires adequate replication (multiple independent trials or subjects per group) and statistical analysis to determine whether an observed difference is likely real or could plausibly be due to random variation alone. A visual shortcut for this: if error bars or confidence intervals for two groups overlap substantially, the difference between them is usually not statistically significant, and a formal statistical test (not just eyeballing the averages) is needed before concluding the independent variable actually had an effect.",
    frqArchetype: null,
  },
  // -- Full CED topic coverage: grounding + check question for each new topic --
  {
    conceptKey: "ph-buffers",
    promptText: "A solution's pH drops from 7 to 4. Has the hydrogen ion concentration increased or decreased, and by roughly how much?",
    teachingContent: "pH measures hydrogen ion concentration on a logarithmic scale: pH = -log[H+]. A lower pH means MORE H+ (more acidic); a higher pH means fewer H+ (more basic). Because the scale is logarithmic, each whole-number change is a tenfold change in [H+] -- so a drop from pH 7 to pH 4 is three steps, or about 1000x more H+. Living systems hold pH within narrow ranges because a protein's shape (and therefore an enzyme's function) depends on it. Buffers resist pH change by absorbing or releasing H+ as conditions shift -- for example, the bicarbonate buffer system that stabilizes blood pH.",
    frqArchetype: "analyze_data",
  },
  {
    conceptKey: "cell-types",
    promptText: "Name two structural features that distinguish a eukaryotic cell from a prokaryotic cell, and one feature they share.",
    teachingContent: "Prokaryotic cells (bacteria and archaea) have no membrane-bound nucleus and no membrane-bound organelles; their DNA sits in the cytoplasm in a region called the nucleoid, and they are generally small. Eukaryotic cells (plants, animals, fungi, protists) enclose their DNA in a membrane-bound nucleus and contain membrane-bound organelles such as mitochondria, endoplasmic reticulum, and Golgi. Both cell types share a plasma membrane, cytoplasm, ribosomes, and DNA as their genetic material. The compartmentalization in eukaryotes is significant because it lets chemically incompatible processes run at the same time in separate organelles.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "cell-membrane",
    promptText: "Why is the cell membrane described as a 'fluid mosaic,' and why do its phospholipids form a bilayer in water?",
    teachingContent: "The cell membrane is a phospholipid bilayer. Each phospholipid has a hydrophilic (water-attracting) phosphate head and two hydrophobic (water-repelling) fatty-acid tails. In a watery environment the tails tuck inward, away from water, while the heads face the watery interior and exterior -- so a bilayer forms spontaneously. It is called a 'fluid mosaic' because the phospholipids drift laterally within each layer (fluid) and a mosaic of embedded proteins, cholesterol, and surface carbohydrates is scattered throughout. This structure makes the membrane selectively permeable: small nonpolar molecules slip across easily, while ions and large polar molecules require transport proteins.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "membrane-transport",
    promptText: "A cell moves ions from a region of low concentration to high concentration. Is this passive or active transport, and what does it require?",
    teachingContent: "Passive transport moves substances DOWN their concentration gradient (high to low) with no energy input -- this includes simple diffusion, facilitated diffusion through proteins, and osmosis (the diffusion of water across a selectively permeable membrane toward the higher solute concentration). Active transport moves substances AGAINST their gradient (low to high) and therefore requires energy, usually ATP, as in the sodium-potassium pump. So moving ions from low to high concentration is active transport, and it requires ATP. A quick check: if a substance moves toward where it is already more concentrated, energy must be spent.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "cellular-respiration",
    promptText: "In which stage of cellular respiration is the most ATP produced, and what molecule is the final electron acceptor?",
    teachingContent: "Cellular respiration breaks glucose down to make ATP in three stages. Glycolysis, in the cytoplasm, splits glucose into two pyruvate molecules for a small net ATP yield. The Krebs (citric acid) cycle, in the mitochondrial matrix, releases CO2 and loads the electron carriers NADH and FADH2. Oxidative phosphorylation -- the electron transport chain plus chemiosmosis on the inner mitochondrial membrane -- produces the large majority of the ATP. Oxygen is the final electron acceptor at the end of the electron transport chain, combining with electrons and H+ to form water; without oxygen the chain backs up and cells fall back on fermentation.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "photosynthesis",
    promptText: "What are the inputs and outputs of the light-dependent reactions versus the Calvin cycle?",
    teachingContent: "Photosynthesis converts light energy into chemical energy in two linked stages. The light-dependent reactions, in the thylakoid membranes, capture light energy to split water (releasing O2) and produce ATP and NADPH. The Calvin cycle (light-independent reactions), in the stroma, uses that ATP and NADPH to fix CO2 into sugar (building G3P, which forms glucose). So the outputs of the light reactions -- ATP and NADPH -- are the inputs the Calvin cycle needs, and overall CO2, water, and light energy become glucose and oxygen. In energy terms it is essentially the reverse of cellular respiration.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "feedback-mechanisms",
    promptText: "Rising body temperature triggers sweating, which cools the body back down. Is this positive or negative feedback, and why?",
    teachingContent: "Feedback loops keep biological systems regulated. Negative feedback counteracts a change to restore a set point -- for example, sweating when body temperature rises, or insulin lowering blood glucose after a meal. Negative feedback is the dominant mode of homeostasis. Positive feedback instead amplifies a change, pushing the system further from where it started until a distinct event completes -- for example, the oxytocin surge that intensifies labor contractions, or the clotting cascade at a wound. Sweating to cool down is negative feedback because the response (cooling) opposes and reduces the original change (the temperature increase).",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "mendelian-genetics",
    promptText: "Cross two heterozygotes (Aa x Aa) for a completely dominant trait. What genotypic and phenotypic ratios do you predict, and why is that only a prediction?",
    teachingContent: "Mendel's two laws underlie simple inheritance: the law of segregation (each parent passes just one of its two alleles for a gene to each gamete) and the law of independent assortment (alleles of different genes sort into gametes independently). A cross of two heterozygotes, Aa x Aa, gives a genotypic ratio of 1 AA : 2 Aa : 1 aa. If A is completely dominant, the phenotypic ratio is 3 dominant : 1 recessive. A Punnett square only predicts these as probabilities from random fertilization -- they become reliable across many offspring, not guaranteed in any single small litter.",
    frqArchetype: "analyze_data",
  },
  {
    conceptKey: "dna-rna-structure",
    promptText: "Give two structural differences between DNA and RNA, and explain how base pairing lets DNA be copied accurately.",
    teachingContent: "DNA is a double-stranded, antiparallel double helix. Its nucleotides use the sugar deoxyribose and the bases adenine, thymine, guanine, and cytosine, with A pairing to T and G pairing to C through hydrogen bonds. RNA is usually single-stranded, uses the sugar ribose, and replaces thymine with uracil, so A pairs with U. The strict complementary base pairing in DNA (A-T, G-C) is exactly what allows faithful copying: each strand specifies its partner, so a template strand determines the sequence of the new strand. RNA's single-stranded, uracil-containing form suits carrying and translating messages rather than long-term storage.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "dna-replication",
    promptText: "Why is DNA replication described as 'semiconservative,' and what does DNA polymerase do?",
    teachingContent: "DNA replication is semiconservative: the double helix unwinds and each original strand serves as a template for a new complementary strand, so every daughter molecule ends up with one old (conserved) strand and one newly built strand. Helicase unwinds and separates the strands; DNA polymerase reads each template and adds complementary nucleotides in the 5'-to-3' direction; the leading strand is synthesized continuously while the lagging strand is made in short pieces (Okazaki fragments) later joined by ligase. Accuracy comes from complementary base pairing (A-T, G-C) plus polymerase's proofreading.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "gene-regulation",
    promptText: "A neuron and a muscle cell in the same body contain identical DNA. How can they have such different structures and functions?",
    teachingContent: "Almost every cell in an organism carries the same DNA; what differs between cell types is which genes are actually expressed. Gene regulation controls this -- especially at transcription, through promoters, enhancers, and transcription factors that determine whether RNA polymerase transcribes a given gene. In prokaryotes, operons such as the lac operon switch groups of related genes on or off together in response to the environment. Because of this differential gene expression, a neuron and a muscle cell with identical genomes end up structurally and functionally distinct: each turns on a different subset of its shared genes.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "natural-selection",
    promptText: "State the conditions a population must meet for natural selection to occur, and explain why selection is not goal-directed.",
    teachingContent: "Natural selection requires three things in a population: heritable variation among individuals, differential reproductive success tied to that variation (some variants leave more offspring in a given environment), and time across generations. Crucially, the variation arises first -- from mutation and recombination -- and the environment merely selects among the variants that already exist. Selection is therefore not goal-directed: organisms do not develop traits because they 'need' them. The outcome is a shift in the population's allele frequencies over generations; individuals themselves do not evolve within their own lifetimes.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "evidence-for-evolution",
    promptText: "Name three independent lines of evidence that support common ancestry, and explain why having several independent lines matters.",
    teachingContent: "Several independent lines of evidence support evolution and common ancestry: the fossil record (transitional forms and chronological succession of species), homologous structures (the same underlying anatomy adapted to different functions, like the vertebrate forelimb), molecular evidence (shared DNA and protein sequences and the near-universal genetic code), embryological similarities among related groups, and directly observed selection such as antibiotic resistance. What makes the case strong is that these independent data sets -- anatomy, molecules, fossils -- converge on the same branching pattern of relationships, which is far more convincing than any single line alone.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "phylogeny",
    promptText: "On a phylogenetic tree, what does a node represent, and how do you tell which two groups are most closely related?",
    teachingContent: "A phylogenetic tree (or cladogram) diagrams evolutionary relationships inferred from shared derived characters and molecular data. Each node (branch point) represents a common ancestor from which the diverging lineages descended. Two groups are most closely related when they share the most recent common ancestor -- that is, their branches meet at the nearest node -- not because they look similar or sit near each other at the tips. Shared derived traits (synapomorphies) define a clade, and the more recently two lineages split, the more features they tend to share. Reading relatedness by node depth, not tip proximity, is the key skill.",
    frqArchetype: "analyze_model_visual",
  },
  {
    conceptKey: "environmental-responses",
    promptText: "Give an example of how an organism responds to an environmental cue in a way that improves survival or reproduction.",
    teachingContent: "Organisms detect and respond to environmental signals in ways that affect survival and reproduction. Responses may be behavioral (migration, hibernation timing, moving toward light), physiological (a plant closing its stomata during drought to conserve water), or tied to timing cues such as photoperiod (day length triggering flowering or breeding seasons). Many of these responses are shaped by natural selection, because well-timed responses to cues like food availability, temperature, and light improve fitness. Communication between organisms -- signaling and cooperative behavior -- is another category of response that can raise survival and reproductive success.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "community-ecology",
    promptText: "Distinguish competition, predation, and mutualism, and give the effect (+ or -) each has on the species involved.",
    teachingContent: "A community is all the interacting populations living in an area, and species interactions shape its structure. Competition (-/-) occurs when species vie for the same limited resource, which can drive niche partitioning or competitive exclusion. Predation (+/-) benefits the predator at the prey's expense and drives adaptations such as camouflage and warning coloration. Symbioses include mutualism (+/+, both species benefit, like pollinators and flowering plants), commensalism (+/0, one benefits and the other is unaffected), and parasitism (+/-). A keystone species has effects on community structure far larger than its abundance would suggest.",
    frqArchetype: "conceptual_analysis",
  },
  {
    conceptKey: "biodiversity",
    promptText: "Why is a more biodiverse ecosystem generally more resilient to disturbance than a low-diversity one?",
    teachingContent: "Biodiversity -- the variety of species, plus genetic variety within them and the range of ecosystems present -- tends to increase stability and resilience. When many species fill varied and overlapping roles, the loss or decline of one is more likely to be buffered by others that can perform a similar function, so the ecosystem recovers from disturbance more readily. Genetic diversity within a population similarly buffers against disease and environmental change. Low-diversity systems are more fragile: with little functional redundancy, a single disturbance can cascade through the whole system because no other species can take over the affected role.",
    frqArchetype: "conceptual_analysis",
  },
];

const CALIBRATED_HARD_CONCEPTS = new Set([
  "genetics-gene-expression",
  "practice-experimental-design",
]);

// Every tenant-scoped table, ordered children-before-parents so a wipe never
// violates a foreign key.
const TENANT_TABLES = [
  "frq_questions",
  "qna_attempts",
  "turn_events",
  "learner_insights",
  "learner_assertions",
  "learner_misconceptions",
  "concept_mastery_history",
  "concept_mastery",
  "concept_podcasts",
  "curriculum_items",
  "concept_prerequisites",
  "bkt_concept_params",
  "misconceptions",
  "sessions",
  "concepts",
  "learners",
  "tutor_profiles",
] as const;

async function resetTenant(
  supabase: ReturnType<typeof createServiceRoleClient>,
  tenantId: string
): Promise<void> {
  for (const table of TENANT_TABLES) {
    // Cast to one concrete table type: every table here has a tenant_id column
    // and the delete semantics are identical, but the union of builder types
    // otherwise confuses the typed client.
    const { error } = await supabase
      .from(table as "concepts")
      .delete()
      .eq("tenant_id", tenantId);
    if (error) throw error;
  }

  // Clear the seed's own login accounts (learner + tutor) by username, so a
  // reseed can recreate them without leaving orphaned users (valid login, no
  // linked learner -> 403) and without touching any other tenant's users.
  const seedUsernames = [
    ...DEMO_ACCOUNTS.map((account) => account.username),
    DEMO_TUTOR_USERNAME,
  ];
  const { error: usersError } = await supabase
    .from("users")
    .delete()
    .in("username", seedUsernames);
  if (usersError) throw usersError;

  const { error } = await supabase.from("tenants").delete().eq("id", tenantId);
  if (error) throw error;
  console.log(`Wiped existing tenant ${tenantId} (including seed accounts)`);
}

type Supabase = ReturnType<typeof createServiceRoleClient>;

// Seeds one concept's mastery plus a short history trail, tuned to the profile.
async function seedConceptMastery(
  supabase: Supabase,
  params: {
    tenantId: string;
    learnerId: string;
    conceptId: string;
    strong: boolean;
    inLastUnit: boolean;
  }
): Promise<void> {
  const { tenantId, learnerId, conceptId, strong, inLastUnit } = params;
  const masteryProb = strong ? (inLastUnit ? 0.58 : 0.9) : 0.32;
  const attempts = strong ? (inLastUnit ? 2 : 5) : 2;
  const confidence = strong ? (inLastUnit ? 0.4 : 0.85) : 0.33;

  const { error: masteryError } = await supabase.from("concept_mastery").insert({
    tenant_id: tenantId,
    learner_id: learnerId,
    concept_id: conceptId,
    mastery_prob: masteryProb,
    confidence,
    attempts,
    last_practiced_at: daysAgo(strong ? 1 : 4),
  });
  if (masteryError) throw masteryError;

  // A little history so the Trend view isn't empty.
  const historyPoints = strong
    ? [
        { days: 21, prob: 0.4 },
        { days: 10, prob: 0.66 },
        { days: 1, prob: masteryProb },
      ]
    : [
        { days: 18, prob: 0.28 },
        { days: 4, prob: masteryProb },
      ];
  for (const point of historyPoints) {
    const { error } = await supabase.from("concept_mastery_history").insert({
      tenant_id: tenantId,
      learner_id: learnerId,
      concept_id: conceptId,
      mastery_prob: point.prob,
      recorded_at: daysAgo(point.days),
    });
    if (error) throw error;
  }
}

// Creates a login-able demo account and back-fills history to match its profile.
async function seedDemoAccount(
  supabase: Supabase,
  params: {
    tenantId: string;
    account: DemoAccountSeed;
    contentConcepts: ConceptSeed[];
    conceptIdByKey: Map<string, string>;
    misconceptionIdByCode: Map<string, string>;
  }
): Promise<void> {
  const { tenantId, account, contentConcepts, conceptIdByKey, misconceptionIdByCode } =
    params;

  const { data: user, error: userError } = await supabase
    .from("users")
    .insert({
      username: account.username,
      password_hash: await hashPassword(account.password),
      role: "learner",
    })
    .select("id")
    .single();
  if (userError) throw userError;

  const { data: learner, error: learnerError } = await supabase
    .from("learners")
    .insert({
      tenant_id: tenantId,
      display_name: account.displayName,
      market_id: "us-ap-bio",
      age_band: "14-18",
      user_id: user.id,
    })
    .select("id")
    .single();
  if (learnerError) throw learnerError;
  const learnerId = learner.id;

  if (account.profile !== "clean") {
    const strong = account.profile === "strong";
    // Strong learner has worked all the way through; weak learner has only
    // touched the first few topics and hasn't mastered them.
    const targets = strong ? contentConcepts : contentConcepts.slice(0, 6);
    for (const concept of targets) {
      await seedConceptMastery(supabase, {
        tenantId,
        learnerId,
        conceptId: conceptIdByKey.get(concept.key)!,
        strong,
        inLastUnit: concept.unitCode === "Unit 8",
      });
    }
  }

  if (account.profile === "weak") {
    for (const code of WEAK_MISCONCEPTION_CODES) {
      const misconceptionId = misconceptionIdByCode.get(code);
      if (!misconceptionId) continue;
      const { error } = await supabase.from("learner_misconceptions").insert({
        tenant_id: tenantId,
        learner_id: learnerId,
        misconception_id: misconceptionId,
        evidence_count: 2,
        last_observed_at: daysAgo(4),
        status: "active",
      });
      if (error) throw error;
    }
  }

  console.log(`Created demo account ${account.username} (${account.profile})`);
}

async function main() {
  const reset =
    process.env.SEED_RESET === "1" || process.argv.includes("--reset");
  const supabase = createServiceRoleClient();

  const { data: existingTenant, error: existingTenantError } = await supabase
    .from("tenants")
    .select("id")
    .eq("name", TENANT_NAME)
    .maybeSingle();
  if (existingTenantError) throw existingTenantError;

  if (existingTenant) {
    if (!reset) {
      console.log(
        `Tenant "${TENANT_NAME}" already exists (id=${existingTenant.id}); skipping. ` +
          "Re-run with --reset (npm run seed -- --reset) to wipe and re-seed."
      );
      return;
    }
    await resetTenant(supabase, existingTenant.id);
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
        big_idea_code: concept.bigIdeaCode,
        big_idea_label: concept.bigIdeaLabel,
      })
      .select("id")
      .single();
    if (error) throw error;
    conceptIdByKey.set(concept.key, data.id);
  }
  console.log(`Created ${CONCEPTS.length} concepts`);

  // Prerequisite progression: a linear spine through the content topics in unit
  // order, so each topic unlocks the next (Unit 1 -> ... -> Unit 8). The
  // cross-cutting practice skills (no unit) stay always-available.
  const contentConcepts = CONCEPTS.filter((concept) => concept.unitCode !== null);
  for (let i = 1; i < contentConcepts.length; i++) {
    const { error } = await supabase.from("concept_prerequisites").insert({
      tenant_id: tenantId,
      concept_id: conceptIdByKey.get(contentConcepts[i].key)!,
      prerequisite_concept_id: conceptIdByKey.get(contentConcepts[i - 1].key)!,
    });
    if (error) throw error;
  }
  console.log(`Seeded ${contentConcepts.length - 1} prerequisite links`);

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

  const misconceptionIdByCode = new Map<string, string>();
  for (const m of MISCONCEPTIONS) {
    const relatedConceptId = m.relatedConceptKey
      ? conceptIdByKey.get(m.relatedConceptKey) ?? null
      : null;
    const { data, error } = await supabase
      .from("misconceptions")
      .insert({
        tenant_id: tenantId,
        code: m.code,
        label: m.label,
        description: m.description,
        scope: m.scope,
        related_concept_id: relatedConceptId,
      })
      .select("id")
      .single();
    if (error) throw error;
    misconceptionIdByCode.set(m.code, data.id);
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
      frq_archetype: item.frqArchetype,
      frq_archetype_source: item.frqArchetype ? "editorial_classification" : null,
    });
    if (error) throw error;
  }
  console.log(`Created ${CURRICULUM_ITEMS.length} curriculum items`);

  // FRQ practice questions are generated per learner on demand (grounded in
  // curriculum content, targeting weak concepts) -- nothing to seed here.

  for (const account of DEMO_ACCOUNTS) {
    await seedDemoAccount(supabase, {
      tenantId,
      account,
      contentConcepts,
      conceptIdByKey,
      misconceptionIdByCode,
    });
  }

  const { error: tutorUserError } = await supabase.from("users").insert({
    username: DEMO_TUTOR_USERNAME,
    password_hash: await hashPassword(DEMO_PASSWORD),
    role: "tutor",
  });
  if (tutorUserError) throw tutorUserError;
  console.log(`Created demo tutor ${DEMO_TUTOR_USERNAME}`);

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
