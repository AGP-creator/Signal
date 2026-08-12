-- Partner stale-review decisions (Keep / Archive / Request refresh).
-- Partners decide what comes off the list — never silent delete.

create table if not exists partner_reviews (
  company_id text primary key references companies(id) on delete cascade,
  decision text not null check (decision in ('keep', 'archive', 'refresh')),
  note text,
  reviewed_by text not null default 'Partner',
  reviewed_at timestamptz not null default now()
);

create index if not exists partner_reviews_decision_idx on partner_reviews (decision);
create index if not exists partner_reviews_reviewed_idx on partner_reviews (reviewed_at desc);

alter table partner_reviews enable row level security;

do $$ begin
  execute 'drop policy if exists partner_reviews_all on partner_reviews';
exception when others then null;
end $$;

create policy partner_reviews_all on partner_reviews for all using (true) with check (true);
