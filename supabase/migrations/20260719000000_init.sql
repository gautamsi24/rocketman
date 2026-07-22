create extension if not exists vector;
create extension if not exists pgcrypto;

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table tutor_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  name text not null,
  tone text not null default 'warm and encouraging',
  formality text not null default 'casual' check (formality in ('casual', 'neutral', 'formal')),
  vocabulary_level text not null default 'high-school' check (vocabulary_level in ('high-school', 'college', 'professional')),
  created_at timestamptz not null default now(),
  unique (tenant_id)
);

create table learners (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  display_name text not null,
  market_id text not null default 'us-ap-bio',
  age_band text not null default '14-18',
  created_at timestamptz not null default now()
);

create index learners_tenant_idx on learners (tenant_id);

create table concepts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  unit_code text,
  unit_label text,
  content_lo_code text,
  content_lo_label text,
  science_practice_code text,
  science_practice_label text,
  created_at timestamptz not null default now(),
  constraint concept_has_an_axis check (
    content_lo_code is not null or science_practice_code is not null
  )
);

create index concepts_tenant_idx on concepts (tenant_id);
create index concepts_unit_idx on concepts (unit_code);

create table concept_prerequisites (
  tenant_id uuid not null references tenants (id),
  concept_id uuid not null references concepts (id),
  prerequisite_concept_id uuid not null references concepts (id),
  primary key (concept_id, prerequisite_concept_id)
);

create table misconceptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  code text not null,
  label text not null,
  description text,
  scope text not null check (scope in ('content', 'practice')),
  related_concept_id uuid references concepts (id),
  created_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create index misconceptions_tenant_idx on misconceptions (tenant_id);

create table bkt_concept_params (
  concept_id uuid primary key references concepts (id),
  tenant_id uuid not null references tenants (id),
  p_init double precision not null default 0.3,
  p_learn double precision not null default 0.15,
  p_guess double precision not null default 0.25,
  p_slip double precision not null default 0.1,
  source text not null default 'neutral_default'
    check (source in ('neutral_default', 'cb_population_data')),
  updated_at timestamptz not null default now()
);

create table concept_mastery (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  learner_id uuid not null references learners (id),
  concept_id uuid not null references concepts (id),
  mastery_prob double precision not null default 0.3,
  confidence double precision not null default 0,
  last_practiced_at timestamptz,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (learner_id, concept_id)
);

create index concept_mastery_tenant_idx on concept_mastery (tenant_id);
create index concept_mastery_learner_idx on concept_mastery (learner_id);

create table concept_mastery_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  learner_id uuid not null references learners (id),
  concept_id uuid not null references concepts (id),
  mastery_prob double precision not null,
  recorded_at timestamptz not null default now()
);

create index concept_mastery_history_lookup_idx
  on concept_mastery_history (learner_id, concept_id, recorded_at);

create table learner_misconceptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  learner_id uuid not null references learners (id),
  misconception_id uuid not null references misconceptions (id),
  evidence_count int not null default 1,
  last_observed_at timestamptz not null default now(),
  status text not null default 'active'
    check (status in ('active', 'learner_dismissed', 'resolved')),
  unique (learner_id, misconception_id)
);

create index learner_misconceptions_learner_idx on learner_misconceptions (learner_id);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  learner_id uuid not null references learners (id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active' check (status in ('active', 'ended'))
);

create index sessions_learner_idx on sessions (learner_id);

create table learner_insights (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  learner_id uuid not null references learners (id),
  source_session_id uuid references sessions (id),
  summary_text text not null,
  embedding vector (768),
  retention_until timestamptz,
  created_at timestamptz not null default now()
);

create index learner_insights_learner_idx on learner_insights (learner_id);
create index learner_insights_embedding_idx
  on learner_insights using ivfflat (embedding vector_cosine_ops);

create table turn_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  learner_id uuid not null references learners (id),
  session_id uuid not null references sessions (id),
  concept_id uuid references concepts (id),
  learner_message text not null,
  tutor_message text not null,
  hints_used int not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'processed', 'error')),
  error_detail text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index turn_events_status_idx on turn_events (status, created_at);
create index turn_events_session_idx on turn_events (session_id);

create table learner_assertions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  learner_id uuid not null references learners (id),
  concept_id uuid not null references concepts (id),
  assertion_type text not null
    check (assertion_type in ('knows_now', 'misconception_resolved')),
  note text,
  created_at timestamptz not null default now()
);

create table curriculum_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  concept_id uuid not null references concepts (id),
  prompt_text text not null,
  teaching_content text not null,
  embedding vector (768),
  created_at timestamptz not null default now()
);

create index curriculum_items_concept_idx on curriculum_items (concept_id);

create function match_learner_insights(
  query_embedding vector (768),
  match_learner_id uuid,
  match_count int
)
returns table (
  id uuid,
  summary_text text,
  similarity double precision
)
language sql stable
as $$
  select
    learner_insights.id,
    learner_insights.summary_text,
    1 - (learner_insights.embedding <=> query_embedding) as similarity
  from learner_insights
  where learner_insights.learner_id = match_learner_id
    and learner_insights.embedding is not null
  order by learner_insights.embedding <=> query_embedding
  limit match_count;
$$;

alter table tenants enable row level security;
alter table tutor_profiles enable row level security;
alter table learners enable row level security;
alter table concepts enable row level security;
alter table concept_prerequisites enable row level security;
alter table misconceptions enable row level security;
alter table bkt_concept_params enable row level security;
alter table concept_mastery enable row level security;
alter table concept_mastery_history enable row level security;
alter table learner_misconceptions enable row level security;
alter table sessions enable row level security;
alter table learner_insights enable row level security;
alter table turn_events enable row level security;
alter table learner_assertions enable row level security;
alter table curriculum_items enable row level security;
