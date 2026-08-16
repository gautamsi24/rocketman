# Misconception Catalog Coverage — Design

**Date:** 2026-08-16
**Status:** Approved, ready for implementation planning
**Scope:** Content authoring only. No schema change, no application code change.

---

## 1. Goal

Grow the seeded misconception catalog from 19 entries to 39 so that **every
content concept has at least one real misconception attached**, and extend the
weak demo learner's starting misconception set to cover the newly-filled early
concepts.

## 2. Why

`getCandidateMisconceptions` (`lib/curriculum/misconceptions.ts:12`) returns
misconceptions whose `related_concept_id` matches the current concept, plus all
`practice`-scope entries. `buildSignalExtractionSchema`
(`lib/agents/signal-extraction/schema.ts:5`) then builds a Zod enum from exactly
those codes, so the classifier can only ever match a code that already exists in
the table.

Today 17 of 28 content concepts have **zero** entries. On those topics the
candidate list collapses to the two `practice`-scope entries, which means the
misconception feature is structurally dark: a learner can hold a textbook
misconception about photosynthesis and the system cannot record it, because no
code exists for the model to match.

Four of the seven most-reachable concepts are affected. Prerequisites are seeded
as a linear chain (`supabase/seed/seed.ts:1166-1169`), so early concepts are the
only ones a new learner can reach, and `ph-buffers`, `cell-types`,
`cell-membrane`, and `membrane-transport` are all empty.

## 3. Current coverage

| Unit | Covered concepts | Uncovered concepts |
|---|---|---|
| 1 Chemistry of Life | water-properties, macromolecule-structure-function | ph-buffers |
| 2 Cell Structure | cell-structure (×2) | cell-types, cell-membrane, membrane-transport |
| 3 Cellular Energetics | cellular-energetics (×2) | cellular-respiration, photosynthesis |
| 4 Cell Comm / Cycle | signal-transduction, cell-cycle-regulation | feedback-mechanisms |
| 5 Heredity | meiosis-variation (×2), inheritance-patterns | mendelian-genetics |
| 6 Gene Expression | genetics-gene-expression (×2) | dna-rna-structure, dna-replication, gene-regulation |
| 7 Natural Selection | evolution (×2) | natural-selection, evidence-for-evolution, phylogeny |
| 8 Ecology | ecology (×2) | environmental-responses, community-ecology, biodiversity |

Practice-scope entries (`practice-justify-mechanism`,
`practice-experimental-design`) are already covered and unchanged.

## 4. What changes

**One file: `supabase/seed/seed.ts`.**

- The `MISCONCEPTIONS` array gains 20 entries.
- `WEAK_MISCONCEPTION_CODES` (line 51) gains 2 entries.

**Explicitly unchanged:** the `misconceptions` table schema, the Zod enum
construction, `getCandidateMisconceptions`, the classification prompt, and every
write path. The guardrail that the model cannot invent a misconception code is
preserved exactly as-is — this change only widens the set of codes it may
legitimately choose from.

## 5. Coverage plan — 20 new entries

One entry per uncovered concept (17), plus a second entry for the three
uncovered concepts that fall inside the weak demo learner's mastery window
(`contentConcepts.slice(0, 6)` at `seed.ts:1066`): `ph-buffers`, `cell-types`,
`cell-membrane`.

All new entries use `scope: "content"`.

| # | `relatedConceptKey` | Proposed `code` | Misconception |
|---|---|---|---|
| 1 | ph-buffers | `ph-scale-is-linear` | Treats pH as a linear scale rather than logarithmic |
| 2 | ph-buffers | `buffer-prevents-all-ph-change` | Thinks a buffer holds pH perfectly constant rather than resisting change within a capacity |
| 3 | cell-types | `prokaryotes-have-no-internal-structures` | Thinks prokaryotes have no internal structures at all, rather than lacking membrane-bound organelles |
| 4 | cell-types | `prokaryotes-are-primitive-ancestors` | Treats prokaryotes as primitive precursors still "becoming" eukaryotes rather than a separately successful lineage |
| 5 | cell-membrane | `membrane-is-rigid-not-fluid` | Pictures the bilayer as a fixed wall rather than a fluid mosaic whose components drift laterally |
| 6 | cell-membrane | `phospholipid-head-tail-polarity-reversed` | Reverses which end of a phospholipid is hydrophilic and which is hydrophobic |
| 7 | membrane-transport | `facilitated-diffusion-requires-atp` | Thinks any protein-mediated transport costs ATP, conflating facilitated diffusion with active transport |
| 8 | cellular-respiration | `glycolysis-produces-most-atp` | Attributes most ATP yield to glycolysis rather than oxidative phosphorylation |
| 9 | photosynthesis | `plants-do-not-respire` | Thinks plants only photosynthesise and never respire, or respire only at night |
| 10 | feedback-mechanisms | `negative-feedback-means-harmful` | Reads "negative" feedback as a bad outcome rather than a change-opposing correction |
| 11 | mendelian-genetics | `heterozygote-is-blended-phenotype` | Expects a heterozygote to show a blend of both alleles rather than the dominant phenotype |
| 12 | dna-rna-structure | `backbone-carries-genetic-information` | Thinks the sugar-phosphate backbone encodes the information rather than the base sequence |
| 13 | dna-replication | `replication-is-conservative` | Thinks replication produces one wholly old and one wholly new molecule rather than semiconservative strands |
| 14 | gene-regulation | `differentiated-cells-have-different-genes` | Thinks specialised cells contain different genes rather than the same genome expressed differently |
| 15 | natural-selection | `fittest-means-strongest` | Equates fitness with physical strength rather than reproductive success in a given environment |
| 16 | evidence-for-evolution | `homologous-analogous-confusion` | Treats shared function as evidence of common ancestry, conflating analogous with homologous structures |
| 17 | phylogeny | `cladogram-tips-descend-from-each-other` | Reads a cladogram as a ladder in which living tip species descended from one another |
| 18 | environmental-responses | `tropisms-are-deliberate-movement` | Describes tropisms as the plant deciding to move rather than differential growth driven by hormone distribution |
| 19 | community-ecology | `niche-equals-habitat` | Uses niche interchangeably with habitat rather than the organism's functional role |
| 20 | biodiversity | `biodiversity-is-only-species-count` | Reduces biodiversity to species richness, ignoring evenness plus genetic and ecosystem diversity |

The `label` and `description` for each are authored during implementation
against the rules in §6.

## 6. Authoring rules

Every new entry must satisfy all five:

1. **`code`** — kebab-case, naming the *error* rather than the topic
   (`enzymes-consumed-in-reaction`, never `enzyme-misconception`). Must be
   unique within the tenant; the table enforces `unique (tenant_id, code)`.
2. **`label`** — learner-facing, opening with "Thinks…", "Mixes up…",
   "Doesn't…", or "Treats…". This string renders directly in the profile's
   Misconceptions tab, so it must read as a plain statement about the learner,
   matching the voice of the existing 19.
3. **`description`** — one sentence that names the specific confusion **and**
   contrasts it with the correct idea. This is injected verbatim into the
   classification prompt (`lib/agents/signal-extraction/index.ts:22`), so a
   vague description produces false matches. A false misconception is worse
   than a missing one: the learner sees it on their profile and it steers the
   tutor toward a gap that isn't real.
4. **Real, not invented** — each must be a genuinely documented AP Biology
   misconception. An invented one will rarely match and becomes dead weight in
   every candidate list for that concept.
5. **`scope: "content"`** and a `relatedConceptKey` matching an existing key in
   `CONCEPTS`. No new `practice`-scope entries are in scope here.

## 7. Demo learner wiring

`WEAK_MISCONCEPTION_CODES` (`seed.ts:51`) currently holds three codes:

```
water-polarity-means-charged                        -> water-properties        (concept 1)
monomer-polymer-direction-confusion                 -> macromolecule-...       (concept 3)
competitive-vs-noncompetitive-inhibition-confusion  -> cellular-energetics     (concept 8)
```

The weak learner has seeded mastery only on the first six content concepts, so
the third code sits on a topic they have no mastery record for. That is not a
bug — misconception state and mastery state are independent by design — and it
is left unchanged.

**Add two codes**, both on newly-covered concepts inside the first-six window,
so the Misconceptions tab reflects topics the learner has actually worked:

- `ph-scale-is-linear` (ph-buffers, concept 2)
- `membrane-is-rigid-not-fluid` (cell-membrane, concept 6)

The weak learner then starts with five active misconceptions. The insert loop at
`seed.ts:1079-1091` needs no change; it iterates the list and skips any code it
cannot resolve.

## 8. Applying and verifying

New catalog entries require a full reseed:

```bash
npm run seed -- --reset
```

A plain `npm run seed` refuses when the tenant already exists
(`seed.ts:1110-1113`). The reset wipes tenant-scoped tables and the seed's own
login accounts, then regenerates concepts, curriculum items, BKT params,
prerequisites, demo learners, mastery, mastery history, and
`learner_misconceptions` — so the demo profile returns populated rather than
empty.

**Verification steps:**

1. `npm run seed -- --reset` completes without error. The seed logs a
   misconception count; confirm it reports 39.
2. `npm run lint` and `npx tsc --noEmit` stay clean.
3. Log in as the weak demo learner and open `/profile` → Misconceptions. Five
   entries appear, including the two new ones.
4. Open `/journey`, select a previously-uncovered early concept (e.g.
   `cell-membrane`), and confirm in chat that a matching wrong answer is
   recorded against the new code rather than silently dropped.

## 9. Out of scope

- Runtime discovery of novel misconceptions (an LLM proposing new catalog
  entries, with or without human review). Considered and deliberately deferred;
  it would require a proposals table, a review surface, and a decision about the
  Zod enum guardrail.
- A `source` column on `misconceptions` to record authored-vs-derived
  provenance, mirroring `bkt_concept_params.source` and
  `curriculum_items.frq_archetype_source`. Only worth adding alongside the
  discovery loop above.
- The N+1-shaped read in `getCandidateMisconceptions`, which selects all tenant
  misconceptions and filters in JS. At 39 entries this is still trivially fast;
  revisit if the catalog reaches the hundreds.
- Extending `gradeCheckAnswer` to match misconceptions. It currently judges
  correctness only — a known asymmetry recorded in `ARCHITECTURE_DECISIONS.md`,
  unrelated to catalog coverage.

## 10. Risks

**False positives from weak descriptions.** The main risk, mitigated by rule 6.3.
A description that names a topic rather than a specific confusion will match
loosely and attach wrong misconceptions to real learners.

**Larger candidate lists per turn.** Concepts gaining a second entry send three
candidates to the classifier instead of two (including practice scope). The
prompt cost is negligible and the enum stays small.

**Reseed timing.** `--reset` clears `qna_attempts`. This is beneficial before a
demo recording — it restores the ability for a Check-tab answer to count toward
mastery — but it also discards any manually-created accounts in the demo tenant.
