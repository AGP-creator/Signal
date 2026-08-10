-- Signal / Thirdbase Deal OS — initial schema
-- Run in Supabase SQL Editor if apply_schema.py cannot connect via Postgres.

create extension if not exists pg_trgm;

create table if not exists meta (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists companies (
  id text primary key,
  slug text unique not null,
  name text not null,
  domain text,
  one_liner text,
  sector_theme text,
  theme_id text,
  subsector text,
  stage text,
  pipeline_bucket text,
  last_round_size_m double precision,
  last_round_date text,
  valuation_est_m double precision,
  valuation_confidence text,
  lead_investor text,
  investors jsonb not null default '[]'::jsonb,
  tier1_count int not null default 0,
  tier1_names jsonb not null default '[]'::jsonb,
  tier2_count int not null default 0,
  headcount int,
  headcount_6m_growth_pct double precision,
  yoy_growth_pct double precision,
  runway_months_est int,
  tam_usd_b double precision,
  moat_notes text,
  team_notes text,
  traction_notes text,
  last_signal_date text,
  sources jsonb not null default '[]'::jsonb,
  is_stale boolean not null default false,
  review_status text,
  thesis_score double precision,
  score_breakdown jsonb not null default '{}'::jsonb,
  relative_rank text,
  recommendation text,
  why_now text,
  commentary_summary text,
  brief_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companies_score_idx on companies (thesis_score desc nulls last);
create index if not exists companies_rec_idx on companies (recommendation);
create index if not exists companies_theme_idx on companies (theme_id);
create index if not exists companies_name_trgm on companies using gin (name gin_trgm_ops);

create table if not exists signals (
  id text primary key,
  company_id text references companies(id) on delete set null,
  company_name text,
  source text,
  signal_type text,
  title text,
  summary text,
  url text,
  observed_at text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists signals_observed_idx on signals (observed_at desc);

create table if not exists commentary (
  id text primary key,
  company_id text references companies(id) on delete cascade,
  company_name text,
  source text,
  quote_or_summary text,
  sentiment text,
  credibility_tier text,
  captured_at text,
  created_at timestamptz not null default now()
);

create table if not exists news (
  id text primary key,
  title text not null,
  source text,
  url text,
  published_at text,
  why_it_matters text,
  related_themes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists peer_activity (
  id text primary key,
  firm text,
  company_id text references companies(id) on delete set null,
  company_name text,
  round text,
  date text,
  theme text,
  on_thesis_flag boolean not null default true,
  thesis_shift boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists sector_calls (
  id text primary key,
  subsector text,
  parent_theme text,
  evidence jsonb not null default '[]'::jsonb,
  heat_score double precision,
  consensus_level text,
  top_companies jsonb not null default '[]'::jsonb,
  why_thirdbase_cares text,
  created_at timestamptz not null default now()
);

create table if not exists alerts (
  id text primary key,
  alert_type text,
  severity text,
  title text,
  body text,
  company_id text,
  created_at text,
  inserted_at timestamptz not null default now()
);

create table if not exists digests (
  id text primary key,
  subject text,
  generated_at text,
  markdown text,
  html text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Service role bypasses RLS; enable RLS + permissive anon policies for demo reads.
alter table meta enable row level security;
alter table companies enable row level security;
alter table signals enable row level security;
alter table commentary enable row level security;
alter table news enable row level security;
alter table peer_activity enable row level security;
alter table sector_calls enable row level security;
alter table alerts enable row level security;
alter table digests enable row level security;

-- Drop old policies if re-running
do $$ begin
  execute 'drop policy if exists meta_all on meta';
  execute 'drop policy if exists companies_all on companies';
  execute 'drop policy if exists signals_all on signals';
  execute 'drop policy if exists commentary_all on commentary';
  execute 'drop policy if exists news_all on news';
  execute 'drop policy if exists peer_activity_all on peer_activity';
  execute 'drop policy if exists sector_calls_all on sector_calls';
  execute 'drop policy if exists alerts_all on alerts';
  execute 'drop policy if exists digests_all on digests';
exception when others then null;
end $$;

create policy meta_all on meta for all using (true) with check (true);
create policy companies_all on companies for all using (true) with check (true);
create policy signals_all on signals for all using (true) with check (true);
create policy commentary_all on commentary for all using (true) with check (true);
create policy news_all on news for all using (true) with check (true);
create policy peer_activity_all on peer_activity for all using (true) with check (true);
create policy sector_calls_all on sector_calls for all using (true) with check (true);
create policy alerts_all on alerts for all using (true) with check (true);
create policy digests_all on digests for all using (true) with check (true);
