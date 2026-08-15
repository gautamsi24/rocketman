-- Persisted so a re-fetched set (batch grading returns the DB state, not a
-- live response) still carries the LLM's per-question feedback -- previously
-- this only existed transiently in the single-question submit response and
-- vanished on reload.
alter table frq_questions add column feedback text;

create table frq_tutor_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  frq_question_id uuid not null references frq_questions (id),
  learner_id uuid not null references learners (id),
  tutor_user_id uuid not null references users (id),
  note_text text not null,
  created_at timestamptz not null default now()
);

create index frq_tutor_notes_question_idx on frq_tutor_notes (frq_question_id);
create index frq_tutor_notes_learner_idx on frq_tutor_notes (learner_id);

alter table frq_tutor_notes enable row level security;
