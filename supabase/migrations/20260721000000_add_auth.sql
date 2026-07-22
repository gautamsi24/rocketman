create table users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  role text not null default 'learner'
    check (role in ('learner', 'tutor', 'evaluator')),
  created_at timestamptz not null default now()
);

alter table users enable row level security;

alter table learners add column user_id uuid references users (id);

create unique index learners_user_id_idx
  on learners (user_id) where user_id is not null;
