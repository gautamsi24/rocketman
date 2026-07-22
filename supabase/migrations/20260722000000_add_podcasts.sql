create table concept_podcasts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id),
  concept_id uuid not null references concepts (id),
  script_text text not null,
  audio_path text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, concept_id)
);

alter table concept_podcasts enable row level security;

insert into storage.buckets (id, name, public)
values ('podcasts', 'podcasts', false)
on conflict (id) do nothing;
