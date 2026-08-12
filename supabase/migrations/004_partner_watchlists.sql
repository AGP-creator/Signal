-- Multi-partner company watchlists + Excel import provenance.
-- Each partner owns a ranked set; firm overlap is computed at read time.

create table if not exists partner_watchlist_items (
  partner_name text not null,
  company_id text not null references companies(id) on delete cascade,
  rank int not null default 999,
  note text,
  source text not null default 'ui',
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (partner_name, company_id)
);

create index if not exists partner_watchlist_items_partner_idx
  on partner_watchlist_items (partner_name, rank);

create index if not exists partner_watchlist_items_company_idx
  on partner_watchlist_items (company_id);

create table if not exists partner_watchlist_imports (
  id text primary key,
  partner_name text not null,
  filename text,
  status text not null default 'committed',
  row_count int not null default 0,
  matched int not null default 0,
  created int not null default 0,
  skipped int not null default 0,
  errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists partner_watchlist_imports_partner_idx
  on partner_watchlist_imports (partner_name, created_at desc);

alter table partner_watchlist_items enable row level security;
alter table partner_watchlist_imports enable row level security;

do $$ begin
  execute 'drop policy if exists partner_watchlist_items_all on partner_watchlist_items';
exception when others then null;
end $$;

do $$ begin
  execute 'drop policy if exists partner_watchlist_imports_all on partner_watchlist_imports';
exception when others then null;
end $$;

create policy partner_watchlist_items_all on partner_watchlist_items
  for all using (true) with check (true);

create policy partner_watchlist_imports_all on partner_watchlist_imports
  for all using (true) with check (true);
