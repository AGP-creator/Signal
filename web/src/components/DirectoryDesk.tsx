"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, RecBadge } from "@/components/ui";
import {
  cardsToCsv,
  directoryFacetOptions,
  EMPTY_FILTERS,
  filterDirectory,
  toDirectoryCards,
  type DirectoryFilters,
} from "@/lib/directory";
import { useInterest } from "@/lib/useInterest";
import type { Company } from "@/lib/types";
import { cn, fmtPct } from "@/lib/utils";

export function DirectoryDesk({ companies }: { companies: Company[] }) {
  const cards = useMemo(() => toDirectoryCards(companies), [companies]);
  const facets = useMemo(() => directoryFacetOptions(cards), [cards]);
  const [f, setF] = useState<DirectoryFilters>(EMPTY_FILTERS);
  const knownIds = useMemo(() => companies.map((c) => c.id), [companies]);
  const { liked, likedCount, like } = useInterest(knownIds);

  const filtered = useMemo(() => filterDirectory(cards, f), [cards, f]);

  function setFilter<K extends keyof DirectoryFilters>(key: K, value: DirectoryFilters[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  function exportCsv() {
    const csv = cardsToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signal-directory-${filtered.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const Facet = ({
    label,
    value,
    options,
    onChange,
  }: {
    label: string;
    value: string;
    options: string[];
    onChange: (v: string) => void;
  }) => (
    <label className="block space-y-1.5">
      <span className="label-caps">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="field w-full">
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-h)+1.25rem)] lg:self-start">
        <div className="panel space-y-4 p-4 md:p-5">
          <div>
            <div className="label-caps">Browse</div>
            <p className="mt-1 text-[0.8125rem] leading-snug text-[var(--muted)]">
              YC Startup Directory pattern — facet the book, then like into Interest Desk.
            </p>
          </div>
          <input
            value={f.q}
            onChange={(e) => setFilter("q", e.target.value)}
            placeholder="Search name, thesis, lead…"
            className="field w-full"
          />
          <Facet label="Theme" value={f.theme} options={facets.themes} onChange={(v) => setFilter("theme", v)} />
          <Facet label="Stage" value={f.stage} options={facets.stages} onChange={(v) => setFilter("stage", v)} />
          <Facet label="Cycle" value={f.cycle} options={facets.cycles} onChange={(v) => setFilter("cycle", v)} />
          <Facet label="Rec" value={f.rec} options={facets.recs} onChange={(v) => setFilter("rec", v)} />
          <Facet label="Status" value={f.status} options={facets.statuses} onChange={(v) => setFilter("status", v)} />
          <Facet label="Hiring" value={f.hiring} options={facets.hiring} onChange={(v) => setFilter("hiring", v)} />
          <Facet label="Bucket" value={f.bucket} options={facets.buckets} onChange={(v) => setFilter("bucket", v)} />
          <button type="button" className="btn btn-soft btn-sm w-full" onClick={() => setF(EMPTY_FILTERS)}>
            Reset filters
          </button>
        </div>
      </aside>

      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[0.875rem] text-[var(--muted)]">
            <span className="font-semibold text-[var(--text)]">{filtered.length}</span> companies
            {likedCount ? (
              <>
                {" · "}
                <Link href="/interest" className="font-semibold text-[var(--signal)] hover:underline">
                  {likedCount} liked → Interest
                </Link>
              </>
            ) : null}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv}>
            Export CSV
          </button>
        </div>

        {!filtered.length ? (
          <EmptyState>No matches — widen filters or clear search.</EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => {
              const isLiked = liked.has(c.id);
              return (
                <article
                  key={c.id}
                  className="panel panel-interactive flex flex-col gap-3 p-4 md:p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/company/${c.id}`}
                        className="title text-[1.05rem] transition hover:text-[var(--signal)]"
                      >
                        {c.name}
                      </Link>
                      <div className="mt-1 text-[0.75rem] text-[var(--faint)]">
                        {c.cycle} · {c.stage} · {c.hiring_signal} hiring
                      </div>
                    </div>
                    <RecBadge rec={c.recommendation} />
                  </div>
                  <p className="line-clamp-3 flex-1 text-[0.875rem] leading-relaxed text-[var(--muted)]">
                    {c.one_liner || c.subsector || "—"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[0.75rem] text-[var(--faint)]">
                    <span className="mono text-[var(--signal)]">{c.thesis_score?.toFixed(0) ?? "—"}</span>
                    <span>{c.sector_theme}</span>
                    {c.yoy_growth_pct != null ? <span>YoY {fmtPct(c.yoy_growth_pct)}</span> : null}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      className={cn(
                        "btn btn-sm flex-1",
                        isLiked ? "btn-primary" : "btn-soft",
                      )}
                      onClick={() => like(c.id)}
                    >
                      {isLiked ? "Liked" : "Like"}
                    </button>
                    <Link href={`/company/${c.id}`} className="btn btn-ghost btn-sm">
                      Brief
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
