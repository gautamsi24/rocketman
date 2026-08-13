## API & Data Conventions

Next.js 16 App Router + Supabase (Postgres + pgvector + Storage). Server code
uses the service-role client, which **bypasses RLS** — so access control lives
in the query, not the database.

### Route Handlers (`app/api/**/route.ts`)

1. **Authenticate first.** Resolve identity through the DAL (`lib/auth/dal.ts`)
   and the guards in `lib/api/guards.ts`:
   - `requireLearnerId()` → `string | NextResponse` (401 if unauthenticated).
   - `requireLearnerOwns(id)` → also 403 if the session learner doesn't own the
     `[id]` resource.
   - `forbidden()` / `unauthorized()` for ad-hoc checks (e.g. verifying a
     session/concept's owner or tenant fetched from the DB).

   ```ts
   const learnerId = await requireLearnerId();
   if (learnerId instanceof NextResponse) return learnerId;
   ```

2. **Scope every query by `tenant_id` and `learner_id`.** The service-role
   client sees everything; the query is the only access boundary. Never trust a
   client-supplied `learner_id`. Verify a resource's tenant before writing to it
   (see `check-answer` / `check-question`).

3. **Never import `createServiceRoleClient()` (or any `server-only` module —
   the session/DAL) into a Client Component.**

4. Return `NextResponse.json(...)`; use `serverErrorResponse(err)` for 500s.

### Role-scoped pages

Server Components that belong to one role call `requireRole("learner" | "tutor")`
(`lib/auth/require-role.ts`), which redirects a mismatched or unauthenticated
session to the right place. Don't hand-roll `getSession()` + role redirects.

### Sessions

A signed, httpOnly cookie (`jose`, HS256) carrying `{ userId, role, learnerId }`.
Read/write only through `lib/auth/session.ts` (marked `server-only`). Login
branches by `role`; the client routes learners to `/journey`, tutors to `/tutor`.

### Schema changes

- Add a **timestamp-prefixed migration** under `supabase/migrations/*.sql`
  (applied in order).
- Update `lib/supabase/types.ts` (the generated `Database` type) to match, or
  the typed client won't compile.
- Re-seed with `npm run seed` (or `npm run seed -- --reset` to wipe + reseed the
  demo tenant, which also clears the seed's own login accounts).

### Structured LLM output

Signal-extraction and QnA grading validate model output against a schema built
from **real `concept_id` / misconception codes** — the deterministic BKT engine
applies the update; the LLM never does the math.
