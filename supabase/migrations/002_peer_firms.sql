-- Competitor intelligence: peer firm dossiers
create table if not exists peer_firms (
  id text primary key,
  slug text unique not null,
  name text not null,
  aliases jsonb not null default '[]'::jsonb,
  stated_focus text,
  deal_count int not null default 0,
  lead_count int not null default 0,
  deep_dive_count int not null default 0,
  thesis_shift_count int not null default 0,
  off_thesis_count int not null default 0,
  drift_score double precision,
  focus_alignment double precision,
  conviction_score double precision,
  watch_priority double precision,
  top_themes jsonb not null default '[]'::jsonb,
  top_stages jsonb not null default '[]'::jsonb,
  top_coinvestors jsonb not null default '[]'::jsonb,
  last_activity_date text,
  deals jsonb not null default '[]'::jsonb,
  recent_activity jsonb not null default '[]'::jsonb,
  thesis_shifts jsonb not null default '[]'::jsonb,
  intel_summary text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists peer_firms_watch_idx on peer_firms (watch_priority desc nulls last);
create index if not exists peer_firms_drift_idx on peer_firms (drift_score desc nulls last);

alter table peer_firms enable row level security;

do $$ begin
  execute 'drop policy if exists peer_firms_all on peer_firms';
exception when others then null;
end $$;

create policy peer_firms_all on peer_firms for all using (true) with check (true);
