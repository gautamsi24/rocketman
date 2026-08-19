# Interaction Ledger + Concept Transfer — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist every graded interaction as a durable, replayable corpus, and let evidence on one concept move related concepts — without changing the serving engine.

**Architecture:** Two additive capabilities on top of the existing BKT engine. `kt_interactions` becomes an append-only ledger of every graded label (chat, quick check, FRQ, assertion), backfilled from the correctness columns `qna_attempts` and `frq_questions` already carry. `concept_transfer` holds a sparse directed weight matrix; `applyGradedUpdate` gains a second stage that damps the same BKT update into related concepts. `bktUpdate` itself is untouched, and `concept_mastery` stays one row per (learner, concept) — so the per-learner-blob concurrency hazard in the source roadmap never arises.

**Tech Stack:** TypeScript, Next.js 16, Supabase (Postgres), `tsx` seed runner. No test framework.

## Provenance

Derived from the "Trading BKT for DKVMN" roadmap, with three amendments made after verifying it against the codebase:

1. **`concept_prerequisites` cannot seed the transfer matrix.** It is a linear spine (`seed.ts:1303-1314` — "each topic unlocks the next"), encoding ordering, not similarity. Transfer v1 is derived from **Big Idea ∩ unit** instead.
2. **Phase 0 is partly already done.** `qna_attempts.correct` and `frq_questions.correct` are durable and timestamped, so two of four sources are backfillable. Only chat labels are genuinely discarded — along with the `rationale` field that `buildSignalExtractionSchema` already generates and `processTurnEvent` throws away.
3. **The engine swap and the `learner_kt_state` blob are out of scope.** Keeping per-concept rows avoids the lost-update race that a shared per-learner state blob would introduce under batch FRQ submission plus concurrent async signal-extraction.

## Global Constraints

- **`lib/bkt/engine.ts` must not change.** Transfer is a wrapper around `bktUpdate`, never a modification of it. The "the math is provably not an LLM call" property is preserved.
- **Transfer never increments `attempts` and never touches `last_practiced_at`.** `MIN_ATTEMPTS_FOR_COMPLETION = 3` must keep guaranteeing that no concept reaches "complete" without three direct answers, and decay must not be defeated by indirect evidence.
- **Transfer is one hop.** A transferred update never triggers further transfer. No cascading.
- **Transfer is symmetric in correctness.** An incorrect answer propagates a downward move, the same way a correct one propagates upward.
- **Public signatures stay stable.** `applyGradedUpdate` and `applyLearnerAssertion` keep their current call shapes; `check-answer/route.ts`, `lib/agents/frq/submit.ts`, and `signal-extraction/index.ts` must not need signature changes.
- **Every query scoped by `tenant_id`.** The service-role client bypasses RLS.
- **Migrations are timestamp-prefixed** under `supabase/migrations/`, and `lib/supabase/types.ts` is updated to match or the typed client will not compile.
- **No test runner exists** (CLAUDE.md). Verification is `npx tsc --noEmit`, `npm run lint`, `npm run seed -- --reset`, and driving the app.

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `supabase/migrations/20260819000000_kt_interactions_and_transfer.sql` | Both tables + backfill | Create |
| `lib/memory/interactions.ts` | Append to the ledger | Create |
| `lib/curriculum/transfer.ts` | Read transfer targets for a concept | Create |
| `lib/memory/profile-write.ts` | Direct update + ledger append + transfer propagation | Modify |
| `lib/memory/profile-read.ts` | Bound `getMasteryTrend` | Modify |
| `lib/agents/signal-extraction/index.ts` | Persist label + rationale | Modify |
| `lib/supabase/types.ts` | Generated `Database` type | Modify |
| `supabase/seed/seed.ts` | Seed `concept_transfer` from Big Idea ∩ unit | Modify |

---

### Task 1: Schema — ledger, transfer matrix, backfill

**Files:**
- Create: `supabase/migrations/20260819000000_kt_interactions_and_transfer.sql`
- Modify: `lib/supabase/types.ts`

**Interfaces:**
- Produces: tables `kt_interactions` and `concept_transfer`; `Database` type entries consumed by every later task.

- [ ] **Step 1: Write the migration**

```sql
-- Append-only ledger of every graded interaction. This is the training corpus
-- and the replay log; concept_mastery is a derived aggregate over it.
create table kt_interactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  learner_id uuid not null references learners (id),
  concept_id uuid not null references concepts (id),
  correct boolean not null,
  -- Lets training weight rubric-graded FRQ evidence above an LLM's read of a
  -- chat turn, and exclude self-reported assertions entirely.
  source text not null check (source in ('chat', 'qna', 'frq', 'assertion')),
  label_rationale text,
  turn_event_id uuid references turn_events (id),
  created_at timestamptz not null default now()
);

create index kt_interactions_learner_idx on kt_interactions (learner_id, created_at);
create index kt_interactions_concept_idx on kt_interactions (tenant_id, concept_id);

-- Sparse directed transfer weights. source distinguishes an authored/derived
-- guess from a model-derived value, mirroring bkt_concept_params.source and
-- curriculum_items.frq_archetype_source.
create table concept_transfer (
  tenant_id uuid not null references tenants (id),
  concept_id uuid not null references concepts (id),
  related_concept_id uuid not null references concepts (id),
  weight double precision not null check (weight > 0 and weight <= 1),
  source text not null default 'curriculum_graph'
    check (source in ('curriculum_graph', 'dkvmn_derived')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, concept_id, related_concept_id),
  constraint concept_transfer_no_self check (concept_id <> related_concept_id)
);

create index concept_transfer_lookup_idx on concept_transfer (tenant_id, concept_id);

alter table kt_interactions enable row level security;
alter table concept_transfer enable row level security;

-- Backfill: quick-check and FRQ answers already carry durable correctness, so
-- the corpus starts populated rather than empty.
insert into kt_interactions (tenant_id, learner_id, concept_id, correct, source, created_at)
select tenant_id, learner_id, concept_id, correct, 'qna', coalesce(answered_at, created_at)
from qna_attempts
where answered_at is not null and correct is not null;

insert into kt_interactions (tenant_id, learner_id, concept_id, correct, source, created_at)
select tenant_id, learner_id, concept_id, correct, 'frq', answered_at
from frq_questions
where answered_at is not null and correct is not null;
```

- [ ] **Step 2: Confirm the backfill columns exist**

Run:
```bash
grep -n "learner_id\|tenant_id\|concept_id\|answered_at\|correct\|created_at" supabase/migrations/20260810000000_add_qna_attempts.sql supabase/migrations/20260813000000_add_frq.sql
```
Expected: both tables have `tenant_id`, `learner_id`, `concept_id`, `correct`, `answered_at`. If `qna_attempts` has no `created_at`, drop the `coalesce` and use `answered_at` alone.

- [ ] **Step 3: Add both tables to the Database type**

In `lib/supabase/types.ts`, add `kt_interactions` and `concept_transfer` entries following the shape of the existing table definitions (Row / Insert / Update).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260819000000_kt_interactions_and_transfer.sql lib/supabase/types.ts
git commit -m "Add kt_interactions ledger and concept_transfer matrix

kt_interactions is an append-only corpus of every graded label, backfilled
from the correctness columns qna_attempts and frq_questions already carry.
concept_transfer holds sparse directed weights with a source column
distinguishing a derived guess from a model-derived value.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Record interactions

**Files:**
- Create: `lib/memory/interactions.ts`
- Modify: `lib/memory/profile-write.ts`, `lib/agents/signal-extraction/index.ts`

**Interfaces:**
- Consumes: `kt_interactions` from Task 1.
- Produces: `recordInteraction(supabase, params)` where params is
  `{ tenantId, learnerId, conceptId, correct, source, labelRationale?, turnEventId? }`.
  `applyGradedUpdate` gains two optional params: `source?: InteractionSource` (default `'chat'`) and `labelRationale?: string`.

- [ ] **Step 1: Write the recorder**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export type InteractionSource = "chat" | "qna" | "frq" | "assertion";

/**
 * Appends one graded label to the interaction ledger. A failure here must not
 * fail the caller's request -- the mastery update is the user-visible effect
 * and has already happened; a missing corpus row is recoverable, a lost grade
 * is not.
 */
export async function recordInteraction(
  supabase: Client,
  params: {
    tenantId: string;
    learnerId: string;
    conceptId: string;
    correct: boolean;
    source: InteractionSource;
    labelRationale?: string | null;
    turnEventId?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("kt_interactions").insert({
    tenant_id: params.tenantId,
    learner_id: params.learnerId,
    concept_id: params.conceptId,
    correct: params.correct,
    source: params.source,
    label_rationale: params.labelRationale ?? null,
    turn_event_id: params.turnEventId ?? null,
  });
  if (error) console.error("kt_interactions insert failed", error);
}
```

- [ ] **Step 2: Call it from `applyGradedUpdate`**

In `lib/memory/profile-write.ts`, extend the params type with `source?: InteractionSource` and `labelRationale?: string | null`, and call `recordInteraction` after the direct mastery update succeeds. Default `source` to `'chat'` so existing call sites compile unchanged.

- [ ] **Step 3: Pass the rationale from signal-extraction**

In `lib/agents/signal-extraction/index.ts`, the `applyGradedUpdate` call becomes:

```ts
await applyGradedUpdate(supabase, {
  tenantId: turnEvent.tenant_id,
  learnerId: turnEvent.learner_id,
  conceptId,
  correct: output.correctness === "correct",
  source: "chat",
  labelRationale: output.rationale,
  turnEventId: turnEvent.id,
});
```

`output.rationale` is already produced by `buildSignalExtractionSchema` and currently discarded.

- [ ] **Step 4: Tag the other two call sites**

`app/api/concepts/[id]/check-answer/route.ts` passes `source: "qna"`.
`lib/agents/frq/submit.ts` passes `source: "frq"`.

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors. One pre-existing `_id` warning in `components/ai-elements/prompt-input.tsx` is expected.

- [ ] **Step 6: Commit**

```bash
git add lib/memory/interactions.ts lib/memory/profile-write.ts lib/agents/signal-extraction/index.ts "app/api/concepts/[id]/check-answer/route.ts" lib/agents/frq/submit.ts
git commit -m "Record every graded label to the interaction ledger

Signal-extraction already generated a rationale and discarded it; it is now
persisted alongside the label. Each call site tags its evidence source so
training can weight rubric-graded FRQ answers above an LLM's read of a chat
turn.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Seed the transfer matrix

**Files:**
- Modify: `supabase/seed/seed.ts`

**Interfaces:**
- Consumes: `concept_transfer` from Task 1.
- Produces: seeded rows. Later tasks read them via `getTransferTargets`.

- [ ] **Step 1: Derive and insert the matrix**

Add after the prerequisite seeding block. Two concepts get a directed pair in **both** directions when they share a `bigIdeaCode` **and** a `unitCode`, and are not the same concept:

```ts
// Transfer v1: concepts that share a Big Idea AND a unit are treated as
// partially the same skill, so graded evidence on one damps into the others.
// Deliberately NOT derived from concept_prerequisites -- that is a linear
// spine encoding order, not similarity, so it would propagate between
// unrelated adjacent topics.
const TRANSFER_WEIGHT = 0.3;

const transferRows: {
  tenant_id: string;
  concept_id: string;
  related_concept_id: string;
  weight: number;
  source: string;
}[] = [];

for (const a of contentConcepts) {
  for (const b of contentConcepts) {
    if (a.key === b.key) continue;
    if (a.unitCode === null || a.bigIdeaCode === null) continue;
    if (a.unitCode !== b.unitCode || a.bigIdeaCode !== b.bigIdeaCode) continue;
    transferRows.push({
      tenant_id: tenantId,
      concept_id: conceptIdByKey.get(a.key)!,
      related_concept_id: conceptIdByKey.get(b.key)!,
      weight: TRANSFER_WEIGHT,
      source: "curriculum_graph",
    });
  }
}

if (transferRows.length > 0) {
  const { error } = await supabase.from("concept_transfer").insert(transferRows);
  if (error) throw error;
}
console.log(`Seeded ${transferRows.length} concept_transfer edges`);
```

- [ ] **Step 2: Add the table to the reset list**

Add `"concept_transfer"` and `"kt_interactions"` to `TENANT_TABLES`, children before parents — both must be deleted before `concepts` and `learners`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add supabase/seed/seed.ts
git commit -m "Seed concept_transfer from Big Idea and unit

Two concepts sharing both a Big Idea and a unit are treated as partially the
same skill. Not derived from concept_prerequisites, which is a linear spine
encoding order rather than similarity.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Propagate transfer

**Files:**
- Create: `lib/curriculum/transfer.ts`
- Modify: `lib/memory/profile-write.ts`

**Interfaces:**
- Consumes: `recordInteraction` (Task 2), seeded rows (Task 3).
- Produces: `getTransferTargets(supabase, tenantId, conceptId) → Promise<TransferTarget[]>` where
  `TransferTarget = { relatedConceptId: string; weight: number }`.

- [ ] **Step 1: Write the reader**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export interface TransferTarget {
  relatedConceptId: string;
  weight: number;
}

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
```

- [ ] **Step 2: Add the propagation step**

In `lib/memory/profile-write.ts`, after the direct update and ledger append, apply a damped version of the same evidence to each target. The controlling detail: this writes **only** `mastery_prob`.

```ts
// Indirect evidence moves the probability toward what a direct answer would
// have produced, damped by the transfer weight. It deliberately does NOT
// touch attempts or last_practiced_at: MIN_ATTEMPTS_FOR_COMPLETION must keep
// guaranteeing three real answers before a concept can complete, and decay
// must not be defeated by a concept the learner never actually practised.
async function applyTransferredEvidence(
  supabase: Client,
  params: {
    tenantId: string;
    learnerId: string;
    conceptId: string;
    weight: number;
    correct: boolean;
  }
): Promise<void> {
  const bktParams = await getBktParams(supabase, params.conceptId);
  const prior = await getPriorState(
    supabase,
    params.learnerId,
    params.conceptId,
    bktParams.pInit
  );

  const direct = bktUpdate(prior, bktParams, {
    kind: "graded",
    correct: params.correct,
  });
  const masteryProb =
    prior.masteryProb + params.weight * (direct.masteryProb - prior.masteryProb);

  const { error } = await supabase.from("concept_mastery").upsert(
    {
      tenant_id: params.tenantId,
      learner_id: params.learnerId,
      concept_id: params.conceptId,
      mastery_prob: masteryProb,
      confidence: prior.confidence,
      attempts: prior.attempts,
    },
    { onConflict: "learner_id,concept_id" }
  );
  if (error) throw error;
}
```

Then in `applyGradedUpdate`, after the direct write:

```ts
const targets = await getTransferTargets(supabase, tenantId, conceptId);
for (const target of targets) {
  try {
    await applyTransferredEvidence(supabase, {
      tenantId,
      learnerId,
      conceptId: target.relatedConceptId,
      weight: target.weight,
      correct,
    });
  } catch (err) {
    console.error("transfer propagation failed", target.relatedConceptId, err);
  }
}
```

A transfer failure logs and continues — the direct grade is the user-visible effect and must not be lost to a secondary write.

- [ ] **Step 3: Confirm no cascading**

`applyTransferredEvidence` calls `bktUpdate` directly and never calls `applyGradedUpdate`. Verify:

```bash
grep -n "applyGradedUpdate\|getTransferTargets" lib/memory/profile-write.ts
```
Expected: `getTransferTargets` appears only inside `applyGradedUpdate`; `applyTransferredEvidence` does not call `applyGradedUpdate`.

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add lib/curriculum/transfer.ts lib/memory/profile-write.ts
git commit -m "Propagate graded evidence to related concepts

A graded answer now damps into concepts sharing its Big Idea and unit, moving
mastery_prob toward what a direct answer would have produced. attempts and
last_practiced_at are untouched, so the completion floor still requires three
real answers and decay is not defeated by indirect evidence.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Bound the trend query, then verify end to end

**Files:**
- Modify: `lib/memory/profile-read.ts`

**Interfaces:**
- Consumes: everything above.

`getMasteryTrend` currently selects a learner's entire history with no time bound and no limit. Transfer multiplies history writes by the clique size, so this must be bounded before the feature ships.

- [ ] **Step 1: Bound the query**

In `getMasteryTrend`, add a 90-day window and a row cap:

```ts
const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

const { data, error } = await supabase
  .from("concept_mastery_history")
  .select("concept_id, mastery_prob, recorded_at")
  .eq("learner_id", learnerId)
  .gte("recorded_at", since)
  .order("recorded_at", { ascending: true })
  .limit(2000);
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Reseed**

Run: `npm run seed -- --reset`
Expected: completes, and the output includes `Seeded 72 concept_transfer edges`.

The count is derived: four units of 3 concepts (1, 3, 4, 5) contribute 4 × 3 × 2 = 24 directed edges; four units of 4 concepts (2, 6, 7, 8) contribute 4 × 4 × 3 = 48. Total 72. A different number means the derivation is wrong — investigate rather than accept it.

- [ ] **Step 4: Verify the ledger backfilled**

The seed wipes the tenant, so post-reseed `kt_interactions` will be empty. To verify the backfill path itself works, check the migration applied cleanly and the table exists. Real backfill value is only visible on a database with pre-existing answers.

- [ ] **Step 5: Verify transfer in the running app**

Start the app, log in as the weak demo learner, open `/journey`, and answer a Check question correctly on a Unit 1 concept. Then open `/profile` → Mastery.

Expected: the answered concept's mastery rises **and** the other two Unit 1 concepts rise by a smaller amount. No concept outside Unit 1 moves.

- [ ] **Step 6: Verify the completion guard still holds**

On a concept the learner has never directly answered, confirm it does not show as complete even if transfer has pushed its probability past 0.85 — `attempts` should still be 0.

This is the single most important behavioural check in the plan: it is what stops indirect evidence from unlocking the mission map.

- [ ] **Step 7: Commit**

```bash
git add lib/memory/profile-read.ts
git commit -m "Bound the mastery trend query

Transfer multiplies history writes by clique size, and getMasteryTrend
previously selected a learner's entire history unbounded. Now windowed to 90
days and capped.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Roadmap coverage:** Phase 0 is implemented in Tasks 1–2 (ledger, label persistence, backfill). The §4 "distil transfer into BKT" recommendation is implemented in Tasks 3–4, with `concept_transfer.source` ready to accept `dkvmn_derived` weights later with no consuming-code change. Phases 1–4 of the roadmap (tracer seam, DKVMN forward pass, training, shadow mode) are deliberately out of scope and unblocked by this work.

**Amendments applied:** the prerequisite spine is not used (Task 3 Step 1 documents why); the backfill exploits existing correctness columns (Task 1 Step 1); no per-learner state blob is introduced, so no lost-update race.

**Constraint check:** `lib/bkt/engine.ts` is not in the file structure — untouched. Transfer writes only `mastery_prob`. `applyTransferredEvidence` never calls `applyGradedUpdate`, so no cascading. All queries filter on `tenant_id`.

**Known gap:** transfer currently writes no `concept_mastery_history` row, so the trend chart will show direct evidence only. That is a deliberate v1 simplification — it keeps history growth at 1 row per event instead of 3–4 — and should be revisited if the profile's trend view needs to explain indirect movement.
