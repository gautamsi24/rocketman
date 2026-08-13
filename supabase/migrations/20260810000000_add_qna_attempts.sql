-- Records each distinct check question a learner has answered, so grading can
-- be idempotent: the first answer to a given question feeds BKT, and repeats of
-- the same question never move mastery again (prevents replay-to-farm-mastery).
create table qna_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  learner_id uuid not null references learners (id),
  concept_id uuid not null references concepts (id),
  question_hash text not null,
  question_text text not null,
  correct boolean not null,
  created_at timestamptz not null default now(),
  unique (learner_id, concept_id, question_hash)
);

create index qna_attempts_learner_concept_idx
  on qna_attempts (learner_id, concept_id);

alter table qna_attempts enable row level security;
