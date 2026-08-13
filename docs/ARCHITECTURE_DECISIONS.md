# RocketMan — Architecture Decisions

A working retrospective of the significant technical decisions made
building RocketMan, why each one was made, and what tradeoff was
accepted. Companion to `SYSTEM_DESIGN.md` (the forward-looking design)
and `BUILD_PROMPT.md` (the build brief) — this document looks backward
at *why*, with the specifics that got settled along the way.

---

## BKT vs DKT

Went with **Bayesian Knowledge Tracing**, not Deep Knowledge Tracing,
for three concrete reasons rather than "BKT is simpler":

- **No training data exists.** DKT is a sequence model (typically an
  RNN/LSTM/Transformer over interaction histories) that needs a corpus
  of historical learner interactions to train on. A fresh deployment
  with zero learners has nothing to train on — DKT would start out
  *worse* than a neutral BKT prior, not better.
- **Explainability is a stated product requirement**, not a
  nice-to-have — the whole exercise is "let the learner see what the AI
  knows about them." BKT's four numbers (`p_init`, `p_learn`, `p_guess`,
  `p_slip`) per concept are literally inspectable and independently
  recalibratable (`bkt_concept_params` is a table, not a trained weight
  matrix). A DKT hidden state can't be explained to a learner or a
  stakeholder in the same way.
- **Hallucination guardrail.** BKT's math (`lib/bkt/engine.ts`) is
  deterministic, zero I/O, zero LLM involvement — a hard boundary the
  design doc calls out explicitly. DKT wouldn't change that per se, but
  BKT made "the actual math is provably not an LLM call" a one-line,
  verifiable claim.

Tradeoff acknowledged, not hidden: BKT assumes one skill/concept at a
time and doesn't capture cross-skill transfer the way a trained DKT
model theoretically could. Not a problem at this scale or data volume.

## Supabase vs other options

Chosen because it's **one managed service covering three things v1
actually needed**: Postgres (relational schema for BKT/misconceptions/
mastery history), pgvector (embeddings for `learner_insights`, later
`curriculum_items`), and Storage (private bucket for cached podcast
audio). The alternative would've been Postgres + a separate vector DB
vendor (Pinecone/Milvus/Weaviate) + a separate blob store (S3) — three
vendors, three bills, at a scale (a handful of learners, dozens of
insights each) that doesn't come close to needing any of them
specialized. A managed vector store is a swap-in later, not a v1
requirement.

One deliberate deviation from "just use what Supabase gives you":
**Supabase Auth was not used.** Once real username/password login with
a `role` enum (learner/tutor/evaluator) was requested, a hand-rolled
`users` table + `jose` session cookies gave direct control over that
schema shape — Supabase Auth's built-in user model doesn't map cleanly
onto "a role that isn't a learner yet has schema-only support." Small,
deliberate exception, not an oversight.

## Gemini model choices

Ended up on `gemini-flash-lite-latest` for **both** the Tutor Agent and
the Signal-Extraction/Consolidation classification tier — not two
different tiers. That wasn't the starting choice: `gemini-2.5-flash`/
`flash-lite` were deprecated for this API key mid-build ("no longer
available to new users" — a real runtime error, not an assumption), the
`-latest` aliases were adopted for that reason plus future-proofing,
then `gemini-flash-latest` hit genuine 503 capacity errors, so
`gemini-flash-lite-latest` won out as the reliable option for
everything. Using one model for both tiers rather than a bigger model
for chat and a smaller one for classification was a simplicity call —
the classification task (three-way correctness + misconception-code
matching) is a small structured-output job that doesn't need a
stronger model, and running two model tiers is one more thing to keep
working.

Separately: `gemini-embedding-001` for embeddings (truncated 3072→768
dims via `outputDimensionality`, verified cosine distance is
magnitude-invariant so truncation is safe) and
`gemini-2.5-flash-preview-tts` for speech. The practical reason for
staying on one provider (`@ai-sdk/google`) across chat, embeddings, and
TTS rather than mixing providers: one API key, one SDK surface, one
place to hit rate limits/deprecations instead of three.

## Agent orchestration — four agents, and why that split

- **Tutor Agent** (sync, streaming, user-waiting) — the only agent the
  student ever waits on. Deliberately has **no write access to memory
  at all**. It writes exactly one thing synchronously: a `turn_events`
  row.
- **Signal-Extraction Agent** (async, per-turn) — classifies
  correctness (`correct`/`incorrect`/`not_gradable` — three states, not
  boolean, so a question or acknowledgment never injects false BKT
  evidence) and matches misconception codes, defense-in-depth validated
  against the real candidate list before anything is trusted.
  **Correction:** this was originally the only agent (plus the trusted
  assertion endpoint) allowed to write `concept_mastery`/
  `learner_misconceptions` — that's no longer the complete list. Practice
  FRQ submission now writes both too, via the same defense-in-depth
  validation, folded into the rubric-grading call itself rather than a
  second classification pass (see `gradeFrqAnswer` below). The real
  invariant was always "narrow, validated, structured-output LLM calls
  the Tutor Agent never touches," not literally one named agent — Quick
  check (`gradeCheckAnswer`) still only judges correctness and hasn't
  been extended to misconceptions yet, a known, tracked asymmetry, not
  an oversight.
- **Consolidation Agent** (async, end-of-session) — needs the *whole*
  conversation, not a single turn, to extract 0–3 durable style/
  reasoning insights. Explicitly instructed not to restate
  misconceptions (those are already tracked structurally) — different
  evidence type, different agent.
- **Podcast agent** (on-demand, per-concept, cached forever) —
  different in kind from the other three: not triggered by the
  tutoring loop at all, triggered by a button click, and its whole job
  is to *never run again* for a given concept once cached.

The organizing principle across all four: **the fast loop (Tutor) and
the slow loop (everything else) are separated as a correctness
property, not a performance optimization.** `turn_events` is the hinge
— written synchronously before any async dispatch, so a dropped
background callback (the real Vercel failure mode: a serverless
function recycled mid-flight) still leaves a `status: 'pending'` row a
sweep endpoint can recover. That's what makes the async side
"at-least-once" instead of "best-effort and hope." Four separate
agents rather than one god-agent because each evidence type —
quantitative graded correctness, qualitative style, structured
misconception counts — needs a different storage/retrieval shape, and
collapsing them would blur the trust boundary of "only these specific,
narrow, structured-output agents may write memory."

## Memory enrichment and decay

Three memory types, each enriched differently:

- **Structured (BKT)** — enriched per-turn by Signal-Extraction,
  deterministic math, no LLM in the update itself.
- **Semantic (insights)** — enriched per-session by Consolidation,
  embedded via `documentEmbeddingModel`, retrieved via
  `queryEmbeddingModel` + cosine similarity to *the current question +
  answer* (not "recent sessions") — a sharper retrieval target.
- **Misconceptions** — a structured specialization of semantic memory,
  not pure embeddings, because the profile view needs reliable
  counting ("you've made this error 3 times") and semantic similarity
  isn't reliable enough to dedupe "same misconception, different
  phrasing" across sessions.
- **Learner assertions** — a fourth, trusted enrichment path that
  bypasses BKT math entirely (floor-bumps mastery to 0.85, confidence
  to 0.6) since "I know this now" is a direct self-report, not
  ambiguous evidence to weigh probabilistically.

Decay is **read-time only** — an exponential half-life (30 days)
toward a floor of 0.2, never toward zero (residual familiarity is more
realistic than total erasure), and it never mutates the stored
`mastery_prob`. This is also where the completion-threshold boundary
bug came from — decay shaving a negligible sliver off an exact 0.85
floor bump, caught by actually testing the boundary rather than
assuming it was fine.

## Seeding AP Biology data

Started with 7 hand-seeded concepts across 5 units, tagged against
real College Board CED codes (`content_lo_code`/`science_practice_code`)
verified against the actual 2025 AP Bio FRQs and Chief Reader Report —
not invented codes. A later coverage review found 3 units (Chemistry
of Life, Cell Communication & Cell Cycle, Heredity) completely
missing, expanded to 13 concepts / 8 units / 19 misconceptions / 25
curriculum items. BKT params for 2 "calibrated hard" concepts were
seeded from real Chief Reader Report population-difficulty data
(`source: cb_population_data`), not a neutral default — a free
calibration source, not a build problem.

Mechanically: the seed script is idempotent at the whole-script level
(skips entirely if the tenant already exists), so expanding the live
already-seeded tenant required separate one-off backfill scripts —
written, run, verified, then deleted, matching the throwaway-script
pattern used everywhere in this build rather than leaving scratch code
lying around.

## User and tenant-level security

**RLS enabled on every table, zero policies** — deny-by-default for
`anon`/`authenticated` roles; `service_role` (the only role the
Next.js server ever uses) bypasses RLS entirely. No client ever talks
to Supabase directly — every read/write goes through our own
authenticated Route Handlers, which is also why the podcast Storage
bucket is private+proxied rather than public.

Auth identity lives in a separate `users` table (not columns on
`learners`) with bcrypt-hashed passwords and a `role` enum,
`jose`-signed httpOnly session cookies carrying only `{ learnerId }`.
A single DAL function (`getSessionLearnerId()`) is the sole source of
truth, called directly in every protected route — deliberately **not**
relying on Next 16's Proxy (renamed Middleware) as the sole gate, per
Next's own bundled guidance that Proxy must never be the only check.
Every learner-scoped route verifies resource ownership (401
unauthenticated, 403 mismatch) — verified with a real adversarial
test, not just "the code looks right": two signed-up accounts,
separate cookie jars, confirmed account A could not read, assert on,
or hijack a chat session belonging to account B.

Tenant-level: `tenant_id` sits on every table as cheap, already-paid-
for insurance, but there's no actual multi-tenant isolation logic (no
RLS policy keyed on a JWT tenant claim) — v1 is one tenant by design,
and building real isolation now would be exactly the speculative
infrastructure this build's revision explicitly avoided elsewhere.

**Correction from a later audit:** "every read/write goes through our
own authenticated Route Handlers" above wasn't quite true — `GET
/api/concepts` and `POST /api/turn-events/process` shipped with no
auth check at all. `concepts` now calls `getSessionLearnerId()` like
every other route (401 if unauthenticated; no ownership check needed
since curriculum is tenant-wide, not learner-scoped). `turn-events/process`
is a system sweep endpoint rather than a user action, so it's gated
differently: a shared-secret bearer token (`CRON_SECRET`), matching
Vercel Cron's convention of auto-sending that header on scheduled
invocations. Also fixed at the same time: several routes were
returning raw Supabase error messages (schema/column details) straight
to the client on unexpected 500s; a shared `serverErrorResponse()`
helper (`lib/api/error-response.ts`) now logs the real error
server-side and returns a generic message instead.

## Prompt injection security

Learner chat input is treated as **untrusted data, never
instructions** — an explicit guardrail. The actual structural
defenses, not just a stated policy:

1. **Grounding constraint** — the Tutor Agent is instructed to ground
   factual claims in retrieved curriculum content and decline rather
   than guess, which limits how far a crafted prompt can push it
   off-script.
2. **Defense-in-depth on classification output** — Signal-Extraction's
   misconception codes are constrained twice: a zod enum limits what
   the model can even output, *and* application code re-validates
   against the real in-memory candidate list before anything is
   written. A hallucinated or injected code is silently rejected, never
   trusted.
3. **The memory-write boundary itself is the strongest mitigation** —
   the one agent directly exposed to raw, adversarial-possible learner
   text (the Tutor Agent) has no write access to memory at all. Only
   Signal-Extraction and Consolidation can write, and both operate on
   narrow structured-output schemas, not free-form generation.
4. **Blast radius containment** — even a successful injection is
   scoped to that one learner's own rows, never cross-learner.
5. **Stored-insight framing (added after a later audit)** — the four
   defenses above cover the *inbound* path (raw chat text) but missed a
   *stored* one: `learner_insights.summary_text`, written once by the
   Consolidation Agent, gets read back into every future Tutor prompt
   as trusted context, with the original schema constraining only
   array length (`max(3)`), not content. A learner who steered a
   session's phrasing, or a paraphrase the Consolidation Agent
   produced, could plant instruction-shaped text that resurfaces as
   part of `# CURRENT LEARNER CONTEXT` in a later session. Closed three
   ways: each insight string is now capped at 200 chars (not just the
   array), the Consolidation Agent's prompt explicitly instructs it to
   emit only plain descriptive statements — never instructions or
   meta-text, and the Tutor prompt now states outright, immediately
   before the JSON block, that `# CURRENT LEARNER CONTEXT` is
   descriptive data and must never be read as a command overriding the
   constraints above it (standard data/instruction separation).

Honest limitation, not glossed over: there's still **no dedicated
prompt-injection filter or guard model** in front of the Tutor Agent —
point 5 closes the specific stored-context vector found in review, not
the general case. That's a reasonable v1 posture given the contained
blast radius above, but it's a real gap if this ever handled
higher-stakes content or untrusted multi-party input.

## Provisions for scaling in production

Explicitly scoped as demo/exercise, not production-volume — but
several things were built in a scale-*ready* shape even though nothing
exercises that at demo scale:

- `turn_events` as a durable event log + pending-sweep is a drop-in
  replacement point for a real message broker (SQS, Cloud Tasks) later
  — the fast-loop/slow-loop *separation* is already the correctness
  property; only the queue implementation would change. **Correction:**
  the sweep endpoint (`/api/turn-events/process`) shipped with nothing
  actually calling it, so the "at-least-once" recovery story was
  aspirational — a dropped `after()` callback left a `pending` row
  with no automatic recovery. Fixed with a `vercel.json` cron entry
  invoking it every 5 minutes, authenticated via `CRON_SECRET` (see
  the security-section correction above).
- `bkt_concept_params` as data means recalibrating a concept's
  difficulty from real usage data is an `UPDATE`, not a deploy.
- The `concept_id` decoupling means a second market/subject is a
  data-population problem for the Curriculum Service, not a schema
  migration.
- An `ivfflat` vector index already exists on `learner_insights.embedding`
  even though a sequential scan would be fine at current insight
  counts — costs nothing to have now.
- Podcast caching amortizes the expensive LLM+TTS cost to once per
  concept, ever — a real production-cost decision already baked in,
  not an afterthought.

What's explicitly **not** done, flagged rather than silently skipped:
no Redis/real message broker (in-process `after()` + sweep instead),
no rate limiting or lockout on login attempts, no atomic increment on
`recordMisconceptionEvidence` (a manual read-then-write — flagged as a
real race condition under actual concurrent load, harmless under
today's sequential single-learner processing), no multi-tenant RLS
policies or geographic sharding, and the podcast audio path proxies
every byte through the Next.js server rather than serving from a CDN
with signed URLs — fine at demo scale, the first thing to change if
podcast listens became a real traffic pattern.
