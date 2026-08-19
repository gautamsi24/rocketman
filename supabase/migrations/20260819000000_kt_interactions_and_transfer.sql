-- Two additive capabilities on top of the existing BKT engine.
--
-- kt_interactions is an append-only ledger of every graded label. Until now
-- concept_mastery was the only durable record of graded evidence, and it is an
-- aggregate -- the individual labels were discarded, so there was no corpus to
-- replay, evaluate offline, or train any future engine against. Chat labels in
-- particular were produced by Signal-Extraction and thrown away.
--
-- concept_transfer holds a sparse directed weight matrix so graded evidence on
-- one concept can damp into related ones. It is deliberately NOT derived from
-- concept_prerequisites: that graph is seeded as a linear spine through the
-- units (each topic unlocks the next), which encodes ordering, not similarity,
-- and would propagate mastery between unrelated adjacent topics.

create table kt_interactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  learner_id uuid not null references learners (id),
  concept_id uuid not null references concepts (id),
  correct boolean not null,
  -- Lets a future training pass weight rubric-graded FRQ evidence above an
  -- LLM's read of a chat turn, and exclude self-reported assertions entirely.
  source text not null check (source in ('chat', 'qna', 'frq', 'assertion')),
  -- Signal-Extraction already generates a rationale for its label and until now
  -- discarded it. Keeping it makes a label auditable after the fact.
  label_rationale text,
  turn_event_id uuid references turn_events (id),
  created_at timestamptz not null default now()
);

create index kt_interactions_learner_idx on kt_interactions (learner_id, created_at);
create index kt_interactions_concept_idx on kt_interactions (tenant_id, concept_id);

create table concept_transfer (
  tenant_id uuid not null references tenants (id),
  concept_id uuid not null references concepts (id),
  related_concept_id uuid not null references concepts (id),
  weight double precision not null check (weight > 0 and weight <= 1),
  -- Mirrors bkt_concept_params.source and curriculum_items.frq_archetype_source:
  -- the schema records whether a value is an editorial/derived guess or a
  -- verified one, so upgrading it later is an UPDATE rather than a deploy.
  source text not null default 'curriculum_graph'
    check (source in ('curriculum_graph', 'dkvmn_derived')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, concept_id, related_concept_id),
  constraint concept_transfer_no_self check (concept_id <> related_concept_id)
);

create index concept_transfer_lookup_idx on concept_transfer (tenant_id, concept_id);

alter table kt_interactions enable row level security;
alter table concept_transfer enable row level security;

-- Backfill. Quick-check and FRQ answers already carry durable correctness, so
-- two of the four evidence sources have a recoverable history -- the corpus
-- starts populated rather than empty. Chat turns cannot be backfilled: their
-- labels were never persisted.
insert into kt_interactions (tenant_id, learner_id, concept_id, correct, source, created_at)
select tenant_id, learner_id, concept_id, correct, 'qna', coalesce(answered_at, created_at)
from qna_attempts
where answered_at is not null and correct is not null;

insert into kt_interactions (tenant_id, learner_id, concept_id, correct, source, created_at)
select tenant_id, learner_id, concept_id, correct, 'frq', coalesce(answered_at, created_at)
from frq_questions
where answered_at is not null and correct is not null;
