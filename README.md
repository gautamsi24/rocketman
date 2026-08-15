# RocketMan

An AI tutor for AP Biology exam prep that builds a persistent, per-learner
**memory** — quantitative mastery (Bayesian Knowledge Tracing), tracked
misconceptions, and qualitative insights about how each learner learns — and
reads that memory back on every turn to personalize its response. Learners
can inspect exactly what the system knows about them on a dedicated profile
view; nothing shown there is inferred without a stored, traceable attempt
behind it.

Beyond the core chat tutor, the app includes:

- **Journey** (`/journey`) — a mission-map view of AP Biology content, unit
  by unit, with mastery tracked per topic and a chat panel for working
  through any topic directly.
- **Practice FRQs** (`/practice`) — a set of free-response questions
  generated fresh and targeted at a learner's weaker topics; answers persist
  as drafts while working through the set, then the whole set is submitted
  and graded at once, point-by-point against a rubric, the way the real exam
  is scored (including optional diagram/graph uploads for questions that
  call for one).
- **My progress** (`/profile`) — the transparency view: a mastery heatmap,
  tracked misconceptions, durable learning-style insights, and a trend chart
  per topic, plus a cached per-topic audio "podcast" generated on request.
- **Tutor console** (`/tutor`) — a roster view for the `tutor` role showing
  every learner's progress at a glance; opening a learner drills into their
  Practice FRQ history, where a tutor can leave a suggestion on a specific
  answer that the learner then sees on their own Practice page.

See `docs/SYSTEM_DESIGN.md` for the full architecture and the reasoning
behind it, and `docs/ARCHITECTURE_DECISIONS.md` for a decision-by-decision
retrospective (why BKT over DKT, why Supabase, why four separate agents,
etc.).

## Stack

Next.js 16 (App Router) + TypeScript, Supabase (Postgres + pgvector +
Storage), Gemini via the Vercel AI SDK, Tailwind + shadcn-style UI
primitives.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env template and fill it in:

   ```bash
   cp .env.local.example .env.local
   ```

   You'll need:
   - A Supabase project (Postgres + pgvector + Storage) — URL, anon key, and
     service role key from **Settings → API**.
   - A free-tier Gemini key from [Google AI Studio](https://aistudio.google.com/apikey).
   - A `SESSION_SECRET` — any random string (`openssl rand -base64 32`).

3. Apply the migrations in `supabase/migrations/` in order, via the Supabase
   SQL Editor (there's no CLI-driven migration runner wired up — each file
   is timestamp-prefixed and applied in order, once).

4. Seed the demo curriculum content (AP Biology concepts, misconceptions,
   curriculum passages):

   ```bash
   npm run seed
   ```

   The seed script is idempotent — safe to re-run, it skips entirely once
   the demo tenant already exists.

## Running it

```bash
npm run dev      # dev server at localhost:3000
npm run build    # production build (also type-checks)
npm run lint     # eslint
```

There's no automated test suite — verify changes by actually running the app
and driving the flow (sign up, chat, submit a Quick check or an FRQ, check
the profile view) rather than relying on a type-check alone.

The async memory update (chat turns get classified and folded into mastery /
misconceptions off the critical path) dispatches through
[Inngest](https://www.inngest.com). To exercise that path locally, set
`INNGEST_DEV=1` for `npm run dev` (the SDK needs this told explicitly — it
doesn't infer dev mode on its own) and run its dev server alongside it:

```bash
INNGEST_DEV=1 npm run dev
npx inngest-cli dev
```

It auto-discovers the local `/api/inngest` route at `http://localhost:3000`.
Without both running, dispatched events just go undelivered locally (same
practical effect as before); the app itself works either way. In production,
add the [Inngest Vercel integration](https://vercel.com/marketplace/inngest)
once and it wires the required env vars automatically on every deploy — no
`INNGEST_DEV` there.

## Demo users

A handful of accounts with pre-seeded, deliberately differentiated learner
histories exist for trying the app without building up history from
scratch. Passwords aren't in this file — ask whoever set up your database
copy, or sign up a fresh account of your own (`/login` → Sign up) if you'd
rather start from zero.

| Username     | Role    | What it demonstrates                                 |
| ------------ | ------- | ----------------------------------------------------- |
| `ava_strong` | learner | Strong, mostly-complete mastery across topics          |
| `ben_weak`   | learner | Struggling -- low mastery and open misconceptions      |
| `cleo_new`   | learner | Brand new -- little to no history yet                 |
| `dev_new`    | learner | Brand new -- little to no history yet                 |
| `tutor_demo` | tutor   | Roster view (`/tutor`) across all learners, with drill-down + suggestions |

Logging in as a `learner` role lands on `/journey`; `tutor` lands on
`/tutor`. Signing up creates a new `learner` account.
