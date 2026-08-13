Fix the issue described in $ARGUMENTS.

This is Next.js 16 / React 19 + Supabase, with no test runner — verify by
type-checking, linting, building, and driving the app.

Steps:

1. Read the relevant files to understand the current behaviour.
2. Identify the root cause — do not treat symptoms.
3. Make the minimal change that fixes the issue without introducing new
   abstractions or refactoring surrounding code.
4. If the fix touches a Route Handler or auth, keep identity/ownership checks
   flowing through the DAL and `lib/api/guards.ts` (`requireLearnerId` /
   `requireLearnerOwns`, 401/403), keep tenant + learner scoping in the query
   (`createServiceRoleClient()` bypasses RLS), and use `requireRole()` for
   role-scoped pages.
5. Respect the module boundary — the Memory Engine (`lib/bkt`, `lib/memory`)
   operates on an opaque `concept_id`; only `lib/curriculum` resolves an id into
   a label or teaching passage. Keep learner-authored text in prompts as
   untrusted data, never instructions.
6. If you added a DB column or table, update `lib/supabase/types.ts` (or add a
   migration under `supabase/migrations/`) or the typed client won't compile.
7. Verify `npx tsc --noEmit`, `npm run lint`, and `npm run build` are green.
8. Summarise: what was wrong, what was changed, and any follow-up that is out of
   scope for this fix.
