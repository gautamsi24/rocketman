# Misconception Catalog Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 20 seeded misconception entries so every content concept has at least one, and give the weak demo learner two additional starting misconceptions.

**Architecture:** Pure content authoring in a single file. The `MISCONCEPTIONS` array in `supabase/seed/seed.ts` grows from 19 to 39 entries; `WEAK_MISCONCEPTION_CODES` grows from 3 to 5. Nothing else changes — no migration, no application code, no prompt change. `buildSignalExtractionSchema` keeps building its Zod enum from whatever rows exist, so the guardrail that the model cannot invent a misconception code is untouched; this change only widens the legitimate set.

**Tech Stack:** TypeScript, `tsx` seed runner, Supabase (Postgres). No test framework.

## Global Constraints

Copied verbatim from the spec (§6). Every task's requirements implicitly include these.

- **`code`** — kebab-case, naming the *error* rather than the topic. Unique within the tenant; the table enforces `unique (tenant_id, code)`.
- **`label`** — learner-facing, opening with "Thinks…", "Mixes up…", "Doesn't…", "Treats…", "Reads…", "Expects…", "Pictures…", "Uses…", or "Reverses…". Renders directly in the profile's Misconceptions tab.
- **`description`** — one sentence naming the specific confusion **and** contrasting it with the correct idea. Injected verbatim into the classification prompt (`lib/agents/signal-extraction/index.ts:22`); vagueness produces false matches, and a false misconception is worse than a missing one.
- **Real, not invented** — each must be a genuinely documented AP Biology misconception.
- **`scope: "content"`** and a `relatedConceptKey` matching an existing key in `CONCEPTS`.
- **Punctuation:** use `--` (double hyphen), never an em-dash, inside `description` strings. This matches all 19 existing entries.
- **Placement:** insert new entries in concept order, and always *before* the two `practice`-scope entries that close the array (`practice-justify-mechanism`, `practice-experimental-design`).

**No test runner exists in this project.** Do not add one, and do not invent test files. Verification is `npx tsc --noEmit`, the data checks specified in each task, and a real seed run in Task 5.

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `supabase/seed/seed.ts` | Demo tenant seed data | Modify: `MISCONCEPTIONS` array (line ~423), `WEAK_MISCONCEPTION_CODES` (line 51) |

No other file is created or modified.

---

### Task 1: Units 1–2 misconceptions (7 entries)

These are the highest-value entries: prerequisites are a linear chain (`seed.ts:1166-1169`), so Units 1–2 are the only concepts a fresh learner can reach, and four of them are currently empty.

**Files:**
- Modify: `supabase/seed/seed.ts` — `MISCONCEPTIONS` array, inserting in concept order after the existing `cell-structure` entries and before `cellular-energetics` entries
- Test: none (no test runner in this project)

**Interfaces:**
- Consumes: the `MisconceptionSeed` interface at `seed.ts:415-421` — fields `code: string`, `label: string`, `description: string`, `scope: ConceptScope`, `relatedConceptKey: string | null`
- Produces: codes `ph-scale-is-linear` and `membrane-is-rigid-not-fluid`, both consumed by Task 5's `WEAK_MISCONCEPTION_CODES` change

- [ ] **Step 1: Add the seven entries**

Insert into the `MISCONCEPTIONS` array in concept order (`ph-buffers` entries after the `macromolecule-structure-function` entry; `cell-types`, `cell-membrane`, `membrane-transport` entries after the `cell-structure` entries):

```ts
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
```

- [ ] **Step 2: Verify types still compile**

Run: `npx tsc --noEmit`
Expected: no output, exit 0. A typo in a field name or a missing comma fails here.

- [ ] **Step 3: Verify no duplicate codes**

Run:
```bash
grep -o 'code: "[^"]*"' supabase/seed/seed.ts | sort | uniq -d
```
Expected: no output. Any line printed is a duplicate code that would violate `unique (tenant_id, code)` at seed time.

- [ ] **Step 4: Verify every relatedConceptKey resolves to a real concept**

Run:
```bash
comm -23 \
  <(grep -o 'relatedConceptKey: "[^"]*"' supabase/seed/seed.ts | sed 's/.*"\(.*\)"/\1/' | sort -u) \
  <(grep -o '^    key: "[^"]*"' supabase/seed/seed.ts | sed 's/.*"\(.*\)"/\1/' | sort -u)
```
Expected: no output. Any line printed is a `relatedConceptKey` with no matching concept `key`, which would silently seed a misconception attached to nothing.

- [ ] **Step 5: Verify the count**

Run: `grep -c 'relatedConceptKey: "' supabase/seed/seed.ts`
Expected: `26` (19 existing + 7 new).

- [ ] **Step 6: Commit**

```bash
git add supabase/seed/seed.ts
git commit -m "Add Units 1-2 misconceptions to seed catalog

Fills ph-buffers, cell-types, cell-membrane, and membrane-transport,
which were empty. These are the concepts a fresh learner reaches first,
since prerequisites are seeded as a linear chain.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Units 3–4 misconceptions (3 entries)

**Files:**
- Modify: `supabase/seed/seed.ts` — `MISCONCEPTIONS` array

**Interfaces:**
- Consumes: `MisconceptionSeed` (see Task 1)
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Add the three entries**

Insert in concept order — the `cellular-respiration` and `photosynthesis` entries after the existing `cellular-energetics` entries, the `feedback-mechanisms` entry after the existing `signal-transduction` entry:

```ts
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
    code: "negative-feedback-means-harmful",
    label: "Reads 'negative feedback' as a bad outcome",
    description: "Interprets 'negative' as damaging rather than change-opposing -- misses that negative feedback is the stabilising mechanism that returns a system toward its set point.",
    scope: "content",
    relatedConceptKey: "feedback-mechanisms",
  },
```

- [ ] **Step 2: Verify types still compile**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Verify no duplicate codes**

Run:
```bash
grep -o 'code: "[^"]*"' supabase/seed/seed.ts | sort | uniq -d
```
Expected: no output.

- [ ] **Step 4: Verify every relatedConceptKey resolves**

Run:
```bash
comm -23 \
  <(grep -o 'relatedConceptKey: "[^"]*"' supabase/seed/seed.ts | sed 's/.*"\(.*\)"/\1/' | sort -u) \
  <(grep -o '^    key: "[^"]*"' supabase/seed/seed.ts | sed 's/.*"\(.*\)"/\1/' | sort -u)
```
Expected: no output.

- [ ] **Step 5: Verify the count**

Run: `grep -c 'relatedConceptKey: "' supabase/seed/seed.ts`
Expected: `29`.

- [ ] **Step 6: Commit**

```bash
git add supabase/seed/seed.ts
git commit -m "Add Units 3-4 misconceptions to seed catalog

Fills cellular-respiration, photosynthesis, and feedback-mechanisms.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Units 5–6 misconceptions (4 entries)

**Files:**
- Modify: `supabase/seed/seed.ts` — `MISCONCEPTIONS` array

**Interfaces:**
- Consumes: `MisconceptionSeed` (see Task 1)
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Add the four entries**

Insert in concept order — `mendelian-genetics` before the existing `inheritance-patterns` entry; `dna-rna-structure`, `dna-replication`, then `gene-regulation` after the existing `genetics-gene-expression` entries:

```ts
  {
    code: "heterozygote-is-blended-phenotype",
    label: "Expects a heterozygote to show a blend of both alleles",
    description: "Applies blending inheritance to a simple dominant/recessive trait, expecting an intermediate phenotype rather than the dominant allele being fully expressed in the heterozygote.",
    scope: "content",
    relatedConceptKey: "mendelian-genetics",
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
```

- [ ] **Step 2: Verify types still compile**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Verify no duplicate codes**

Run:
```bash
grep -o 'code: "[^"]*"' supabase/seed/seed.ts | sort | uniq -d
```
Expected: no output.

- [ ] **Step 4: Verify every relatedConceptKey resolves**

Run:
```bash
comm -23 \
  <(grep -o 'relatedConceptKey: "[^"]*"' supabase/seed/seed.ts | sed 's/.*"\(.*\)"/\1/' | sort -u) \
  <(grep -o '^    key: "[^"]*"' supabase/seed/seed.ts | sed 's/.*"\(.*\)"/\1/' | sort -u)
```
Expected: no output.

- [ ] **Step 5: Verify the count**

Run: `grep -c 'relatedConceptKey: "' supabase/seed/seed.ts`
Expected: `33`.

- [ ] **Step 6: Commit**

```bash
git add supabase/seed/seed.ts
git commit -m "Add Units 5-6 misconceptions to seed catalog

Fills mendelian-genetics, dna-rna-structure, dna-replication, and
gene-regulation.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Units 7–8 misconceptions (6 entries)

**Files:**
- Modify: `supabase/seed/seed.ts` — `MISCONCEPTIONS` array

**Interfaces:**
- Consumes: `MisconceptionSeed` (see Task 1)
- Produces: nothing consumed by later tasks

Note: `natural-selection` is concept 21 and currently has no entries, while the two existing teleology misconceptions sit on `evolution` (concept 24). The `fittest-means-strongest` entry below belongs on `natural-selection` and must not be attached to `evolution`.

- [ ] **Step 1: Add the six entries**

Insert in concept order — `natural-selection`, `evidence-for-evolution`, `phylogeny` before the existing `evolution` entries; `environmental-responses` before the existing `ecology` entries; `community-ecology` and `biodiversity` after them, and still before the two `practice`-scope entries that close the array:

```ts
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
    code: "tropisms-are-deliberate-movement",
    label: "Describes a plant as choosing to move toward light",
    description: "Frames a tropism as intentional movement by the plant, rather than differential growth caused by uneven auxin distribution on the shaded and lit sides of the stem.",
    scope: "content",
    relatedConceptKey: "environmental-responses",
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
```

- [ ] **Step 2: Verify types still compile**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Verify no duplicate codes**

Run:
```bash
grep -o 'code: "[^"]*"' supabase/seed/seed.ts | sort | uniq -d
```
Expected: no output.

- [ ] **Step 4: Verify every relatedConceptKey resolves**

Run:
```bash
comm -23 \
  <(grep -o 'relatedConceptKey: "[^"]*"' supabase/seed/seed.ts | sed 's/.*"\(.*\)"/\1/' | sort -u) \
  <(grep -o '^    key: "[^"]*"' supabase/seed/seed.ts | sed 's/.*"\(.*\)"/\1/' | sort -u)
```
Expected: no output.

- [ ] **Step 5: Verify every content concept is now covered**

Run:
```bash
comm -23 \
  <(grep -o '^    key: "[^"]*"' supabase/seed/seed.ts | sed 's/.*"\(.*\)"/\1/' | grep -v '^practice-' | sort -u) \
  <(grep -o 'relatedConceptKey: "[^"]*"' supabase/seed/seed.ts | sed 's/.*"\(.*\)"/\1/' | sort -u)
```
Expected: no output. Any line printed is a content concept still without a misconception — the exact gap this plan exists to close.

- [ ] **Step 6: Verify the count**

Run: `grep -c 'relatedConceptKey: "' supabase/seed/seed.ts`
Expected: `39`.

- [ ] **Step 7: Commit**

```bash
git add supabase/seed/seed.ts
git commit -m "Add Units 7-8 misconceptions to seed catalog

Fills natural-selection, evidence-for-evolution, phylogeny,
environmental-responses, community-ecology, and biodiversity. Every
content concept now has at least one misconception, so the
signal-extraction candidate list is never just the two practice-scope
codes.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Extend the weak demo learner and verify end to end

**Files:**
- Modify: `supabase/seed/seed.ts:51-55` — `WEAK_MISCONCEPTION_CODES`

**Interfaces:**
- Consumes: `ph-scale-is-linear` and `membrane-is-rigid-not-fluid` from Task 1
- Produces: final state; nothing downstream

Both added codes sit on concepts inside the weak learner's seeded mastery window (`contentConcepts.slice(0, 6)` at `seed.ts:1066`), so the Misconceptions tab reflects topics the learner has actually worked. The insert loop at `seed.ts:1079-1091` needs no change — it iterates the list and skips any code it cannot resolve.

- [ ] **Step 1: Extend the code list**

Replace `WEAK_MISCONCEPTION_CODES` at `seed.ts:51-55` with:

```ts
const WEAK_MISCONCEPTION_CODES = [
  "water-polarity-means-charged",
  "ph-scale-is-linear",
  "monomer-polymer-direction-confusion",
  "membrane-is-rigid-not-fluid",
  "competitive-vs-noncompetitive-inhibition-confusion",
];
```

- [ ] **Step 2: Verify types still compile**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Verify both new codes exist in the catalog**

Run:
```bash
for c in ph-scale-is-linear membrane-is-rigid-not-fluid; do
  grep -q "code: \"$c\"" supabase/seed/seed.ts && echo "OK $c" || echo "MISSING $c"
done
```
Expected: `OK ph-scale-is-linear` and `OK membrane-is-rigid-not-fluid`. A `MISSING` line means the loop at `seed.ts:1080` would silently `continue` and the learner would quietly get fewer misconceptions than intended.

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: 0 errors. One pre-existing warning in `components/ai-elements/prompt-input.tsx` about an unused `_id` is expected and unrelated.

- [ ] **Step 5: Reseed the database**

Run: `npm run seed -- --reset`
Expected: completes without error, and the output includes `Created 39 misconceptions` (logged at `seed.ts:1209`). A unique-constraint error here means a duplicate code slipped past the Step 3 checks in earlier tasks.

Note: `--reset` wipes tenant-scoped tables and the seed's own login accounts, then regenerates concepts, curriculum items, BKT params, prerequisites, demo learners, mastery, mastery history, and `learner_misconceptions`.

- [ ] **Step 6: Verify the weak learner's profile in the app**

Start the app (`npm run dev`), log in as the weak demo account, and open `/profile` → Misconceptions.
Expected: five entries, including "Thinks each pH step is one unit of acidity, not a tenfold change" and "Pictures the membrane as a solid wall rather than a fluid layer".

- [ ] **Step 7: Verify a previously-uncovered concept can now record a misconception**

On `/journey`, open `cell-membrane` and send a message exhibiting the new misconception, e.g.:

> "The membrane is basically a solid wall of phospholipids that holds everything in place."

Wait for the async signal-extraction to land (run `npx inngest-cli dev` alongside `npm run dev` with `INNGEST_DEV=1`, or wait for the stale sweep), then reload `/profile` → Misconceptions.
Expected: `membrane-is-rigid-not-fluid` shows an increased evidence count. Before this plan, `cell-membrane` had no candidates and this turn could not have been recorded at all.

- [ ] **Step 8: Commit**

```bash
git add supabase/seed/seed.ts
git commit -m "Give the weak demo learner two early-concept misconceptions

Adds ph-scale-is-linear and membrane-is-rigid-not-fluid to
WEAK_MISCONCEPTION_CODES. Both sit inside the learner's seeded mastery
window (first six content concepts), so the profile's Misconceptions tab
reflects topics they have actually worked.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Covered by |
|---|---|
| §4 — 20 new entries in `MISCONCEPTIONS` | Tasks 1–4 (7 + 3 + 4 + 6 = 20) |
| §4 — 2 new codes in `WEAK_MISCONCEPTION_CODES` | Task 5 Step 1 |
| §5 — one entry per uncovered concept, seconds for ph-buffers/cell-types/cell-membrane | Task 1 (both ph-buffers, both cell-types, both cell-membrane), Tasks 2–4 (one each) |
| §6 — authoring rules | Global Constraints; every authored entry conforms |
| §7 — weak learner wiring, insert loop unchanged | Task 5 Step 1 and its note |
| §8 — reseed and verification | Task 5 Steps 4–7 |
| §9 — out of scope | No task touches schema, `getCandidateMisconceptions`, or `gradeCheckAnswer` |

All 20 spec rows appear exactly once across Tasks 1–4, with the same codes and `relatedConceptKey` values the spec assigns.

**Placeholder scan:** No TBDs, no "add error handling", no "similar to Task N". Every entry is written out in full, including in tasks that repeat the same verification commands.

**Type consistency:** Every entry uses the five fields of `MisconceptionSeed` (`seed.ts:415-421`) with the exact names `code`, `label`, `description`, `scope`, `relatedConceptKey`. Cumulative counts are consistent: 19 → 26 → 29 → 33 → 39. The two codes Task 5 consumes are both defined in Task 1.

**Known deviation from the skill template:** the standard write-failing-test / watch-it-fail cycle is replaced by data-integrity checks and a real seed run, because this project has no test runner and CLAUDE.md directs verification through running the app. The Task 4 Step 5 check is the closest analogue to a failing test: it enumerates uncovered concepts and must print nothing once the work is done.
