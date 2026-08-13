-- Practice FRQ questions are generated per learner on demand (grounded in
-- curriculum content, targeting weak concepts) rather than seeded from a fixed
-- bank -- so each row is learner-scoped, grouped into a "set" (one paper of
-- 2 long + 4 short), and answered in place. A question is server-issued: the
-- client answers by id and can never fabricate the prompt or rubric. One row is
-- graded at most once (answered_at stamps it), and the learner is never served a
-- question they've already answered (deduped at generation time).
--
-- Idempotent drop+create: the earlier bank-style tables were empty, so this is
-- safe to paste into the SQL editor to reshape an already-applied v1.
drop table if exists frq_attempts;
drop table if exists frq_questions;

create table frq_questions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  learner_id uuid not null references learners (id),
  concept_id uuid not null references concepts (id),
  set_id uuid not null,
  position smallint not null,
  kind text not null check (kind in ('long', 'short')),
  requires_diagram boolean not null default false,
  task_word text not null,
  stimulus text,
  prompt text not null,
  prompt_hash text not null,
  rubric jsonb not null,
  max_points smallint not null,
  -- Answer fields, null until the learner submits.
  answered_at timestamptz,
  answer_text text,
  image_path text,
  awarded_points smallint,
  correct boolean,
  points_detail jsonb,
  created_at timestamptz not null default now()
);

create index frq_questions_learner_set_idx
  on frq_questions (learner_id, set_id);
create index frq_questions_learner_answered_idx
  on frq_questions (learner_id, answered_at);

alter table frq_questions enable row level security;

-- Private bucket for uploaded diagram/graph photos (mirrors the podcasts bucket).
insert into storage.buckets (id, name, public)
values ('frq-uploads', 'frq-uploads', false)
on conflict (id) do nothing;
