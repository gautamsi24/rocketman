-- Rework qna_attempts from a ledger of *answered* attempts into a record of
-- every check question the server *issues*. check-question now inserts a row up
-- front (answered_at + correct null) and returns its id; check-answer accepts
-- only that id and later stamps answered_at/correct after grading the stored
-- question text. So two things change:
--   1. `correct` must allow null until the question is actually answered.
--   2. The same (learner, concept, question_hash) may be issued more than once
--      (e.g. an identical authored-fallback question), so the old unique
--      constraint has to go -- the route enforces that at most one *answered*
--      question with a given text counts toward mastery.
-- Written idempotently so it is safe whether applied via the migration runner or
-- pasted into the SQL editor.
alter table qna_attempts
  add column if not exists answered_at timestamptz;

alter table qna_attempts
  alter column correct drop not null;

alter table qna_attempts
  drop constraint if exists qna_attempts_learner_id_concept_id_question_hash_key;
