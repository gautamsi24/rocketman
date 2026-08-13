<!-- Quick pre-commit check — project-specific only. Runs in the current conversation context.
     For a comprehensive multi-angle review of the working diff, run /code-review instead. -->

Review the current uncommitted changes (or the diff of $ARGUMENTS if a branch/commit is provided).

This is Next.js 16 / React 19 + Supabase. There is no test runner — verify by
type-checking, linting, building, and driving the app, not by looking for tests.

Check for:

1. **Correctness bugs** — logic errors, off-by-ones, race conditions, unhandled
   edge cases, missing `await`, null/undefined derefs, swallowed errors in `catch`,
   `?? null` on falsy-but-valid values, effects that never retry after a failure.

2. **Auth & access control** (`docs/SYSTEM_DESIGN.md` §11) — every learner-scoped
   Route Handler resolves identity through the DAL and guards in `lib/api/guards.ts`
   (`requireLearnerId` / `requireLearnerOwns`, returning 401/403), never trusting a
   client-supplied `learner_id`. Role-scoped pages use `requireRole()`. Any new
   query is scoped by `tenant_id` **and** `learner_id` — `createServiceRoleClient()`
   bypasses RLS, so scoping lives in the query. That client must never be imported
   into a Client Component, and `server-only` modules (session/DAL) must not leak
   into client code.

3. **Module boundary — the Memory Engine never speaks curriculum** (CLAUDE.md) —
   no AP-Bio-shaped fields (unit/label/content) added to `lib/bkt` or `lib/memory`;
   they operate on an opaque `concept_id`. Only `lib/curriculum` resolves an id into
   a label or teaching passage.

4. **Prompt & tool safety** — learner-authored text in `lib/agents/tutor/prompt.ts`
   stays wrapped and marked as untrusted **data**, never concatenated as instructions.
   Tutor tools stay **client-resolved** (no server `execute`), with every tool-call
   id validated against the real concept list before acting.

5. **Server/Client boundary** — data fetching and auth happen in Server Components
   (no new client-fetch waterfalls); `"use client"` sits only on interactive leaves;
   async work isn't blocking the render path unnecessarily.

6. **Next 16 framework code** — before Route Handlers, `after()`, caching, or auth,
   the relevant guide under `node_modules/next/dist/docs/` was consulted (Next 16
   has breaking changes). New DB columns/tables also need `lib/supabase/types.ts`
   updated or the typed client won't compile.

7. **Verification ran** — `npx tsc --noEmit`, `npm run lint`, and `npm run build`
   are green for the change (dead code removed, no orphaned routes/exports).

For each finding: file path + line number, what the issue is, and the one-line fix.
Skip style nits that ESLint would catch.
