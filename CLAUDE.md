# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> **Next.js 16 / React 19.** APIs differ from older versions — see AGENTS.md.
> Before writing framework code (Route Handlers, `after()`, Proxy/middleware,
> caching, auth), read the relevant guide under `node_modules/next/dist/docs/`.

## What this is

RocketMan is an AI tutoring app for AP Biology prep. A learner chats with a
streaming tutor; the system builds a persistent, per-learner **memory**
(quantitative mastery + qualitative insights + misconceptions) that the tutor
reads on every turn and the learner can inspect in a profile view.

**`docs/SYSTEM_DESIGN.md` is the canonical design doc** — it explains every
architectural decision and its rationale (section numbers like §6 are
referenced throughout the code). Read it before making non-trivial changes; it
documents deliberate scope boundaries so you don't "fix" things that were left
out on purpose.

## Commands

```bash
npm run dev      # Next dev server (localhost:3000)
npm run build    # production build
npm run lint     # eslint
npm run seed     # seed the database (tsx --env-file=.env.local supabase/seed/seed.ts)
```

There is no test runner configured. Verify changes by running the app (`/run`
skill) and driving the flow, not by looking for a test suite.

**Database:** Supabase (Postgres + pgvector + Storage). Schema lives in
`supabase/migrations/*.sql` (timestamp-prefixed, applied in order). After
changing migrations or pointing at a fresh database, apply migrations then run
`npm run seed`. Copy `.env.local.example` → `.env.local` and fill in Supabase
keys and a Google AI Studio key (`GOOGLE_GENERATIVE_AI_API_KEY`, free-tier
Gemini). To exercise the async memory update locally, set `INNGEST_DEV=1` for
`npm run dev` and also run `npx inngest-cli dev` alongside it (see README).

## Architecture

Four logical services, one Next.js app + one database. The separation is a
**module boundary**, enforced by one rule:

> **The Memory Engine never speaks curriculum.** BKT math and insight
> retrieval operate only on an opaque `concept_id`. Only the Curriculum Service
> (`lib/curriculum`) resolves an id into an AP-Bio label, unit, or teaching
> passage. This is what keeps the system swappable to other markets/subjects.
> Don't leak AP-Bio-shaped fields into `lib/bkt` or `lib/memory`.

- **Tutor Orchestrator** — `app/api/chat/route.ts` + `lib/agents/tutor`.
  Builds context (`context.ts`), assembles the prompt (`prompt.ts`), streams
  the response.
- **Memory Engine** — `lib/bkt` (Bayesian Knowledge Tracing, deterministic),
  `lib/memory` (insights + misconceptions, reads/writes), `lib/profile`.
- **Curriculum Service** — `lib/curriculum` (concepts, content, misconceptions
  catalog).
- **Agents** — `lib/agents/*` (see below).

### The four agents (and their trust/timing boundaries)

The agents split on two axes: **who may write learner memory** and
**sync vs. async**. Preserve these boundaries.

1. **Tutor Agent** (`lib/agents/tutor`) — synchronous, streaming. Reads memory,
   never writes it. Gemini via `@ai-sdk/google` (`lib/agents/shared/model.ts`).
2. **Signal-Extraction Agent** (`lib/agents/signal-extraction`) — async,
   off the critical path. Classifies a turn's correctness + misconceptions into
   **structured fields validated against real `concept_id`/misconception codes**,
   then the deterministic BKT engine applies the update. No LLM math.
3. **Consolidation Agent** (`lib/agents/consolidation`) — runs at session end,
   extracts 0–3 embedded `learner_insights`.
4. **Podcast Agent** (`lib/agents/podcast`) — two-step (script rewrite → TTS),
   result cached per `(tenant_id, concept_id)` in `concept_podcasts` + private
   Storage.

### Fast-loop / slow-loop (the async memory update)

The chat route does **not** write memory inline. On stream end it writes one
`turn_events` row and, in an unawaited `after()` callback, enqueues a
`turn_event/created` Inngest event; an Inngest function (`lib/inngest/functions.ts`)
picks it up and runs Signal-Extraction with automatic retry/backoff, marking
the row `status: 'error'` only once retries are exhausted (`onFailure`).
`turn_events` is a durable append-only ledger. A second, cron-triggered
Inngest function (`sweepStaleTurnEventsFn`) re-enqueues any row still
`pending` past a staleness window — the narrow backstop for `inngest.send()`
itself failing to enqueue, not a general retry mechanism (Inngest already
owns that). No separate HTTP sweep endpoint or Vercel Cron config exists;
scheduling lives entirely in Inngest.

### Auth (this is real, not theater)

- Identity is in `users` (bcrypt via `bcryptjs`), separate from `learners`.
- Session = signed httpOnly cookie (`jose`, HS256) carrying only `{ learnerId }`.
- **`getSessionLearnerId()` in `lib/auth/dal.ts` is the single source of truth**,
  called directly in every protected Route Handler / Server Component. No
  Proxy/middleware auth.
- Every learner-scoped route must verify the session learner **owns** the
  resource it touches: 401 if unauthenticated, 403 on mismatch (see the
  `sessionId → learner_id` check in `app/api/chat/route.ts`). Don't trust a
  client-supplied `learner_id`.

### Prompt & tool conventions

- `lib/agents/tutor/prompt.ts` builds a structured Markdown+JSON prompt with a
  deliberate token budget (§6). Learner-authored text is wrapped and explicitly
  marked as untrusted data, never instructions — preserve that guard when
  editing the prompt.
- Tutor tools (`lib/agents/tutor/tools.ts`: `switch_concept`, `share_podcast`)
  are **client-resolved** (no server `execute`) — the client validates every
  tool-call id against the real concept list before acting. Adding a tutor
  capability = "add a validated, client-resolved tool," not "hope the text
  describes doing it."

### Data access

- Server code uses `createServiceRoleClient()` (`lib/supabase/server.ts`),
  which **bypasses RLS** — so access control lives in the query (tenant +
  learner scoping), not in the database. Never import it into a Client
  Component. `lib/supabase/types.ts` holds the generated `Database` type.
- The UI is largely client components using `@ai-sdk/react` `useChat` and
  shadcn-style primitives in `components/ui`. App Router with a `(web)` route
  group for the authenticated shell.
