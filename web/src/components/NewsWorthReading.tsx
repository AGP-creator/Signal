"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart, DonutChart } from "@/components/charts";
import { EmptyState, Eyebrow, Panel, SegItem, Segmented, ToneBadge } from "@/components/ui";
import { ExternalLink } from "@/components/ExternalLink";
import { cleanProse } from "@/lib/digestFormat";
import {
  NEWS_KIND_META,
  newsKindMix,
  newsThemeMix,
  newsWorthCounsel,
  rankNewsWorthReading,
  selectNewsWorthReading,
  type CuratedRead,
  type NewsKind,
} from "@/lib/newsWorthReading";
import type { Company, NewsItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS: { id: "all" | NewsKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "earnings", label: "Earnings" },
  { id: "regulatory", label: "Regulatory" },
  { id: "essay", label: "Essays" },
  { id: "contrarian", label: "Contrarian" },
  { id: "geopolitical", label: "Geopolitics" },
  { id: "market", label: "Market" },
];

export function NewsWorthReadingDesk({
  news,
  companies,
}: {
  news: NewsItem[];
  companies: Company[];
}) {
  const digestPick = useMemo(
    () => selectNewsWorthReading(news, companies, { min: 3, max: 5 }),
    [news, companies],
  );
  const allRanked = useMemo(() => rankNewsWorthReading(news, companies), [news, companies]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const filtered =
    filter === "all" ? allRanked : allRanked.filter((r) => r.kind === filter);

  const kindSlices = newsKindMix(digestPick).map((s) => ({
    label: s.label,
    pct: digestPick.length ? (s.value / digestPick.length) * 100 : 0,
    color: s.color,
  }));
  const themeBars = newsThemeMix(digestPick);

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-[0.975rem] leading-relaxed text-[var(--muted)]">
        {newsWorthCounsel(digestPick)} Each item carries a one-line why it matters to Thirdbase —
        themes, pipeline names, or Pass/Watch discipline — not a generic headline dump.
      </p>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Panel className="!p-5 md:!p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <Eyebrow>This digest</Eyebrow>
              <h2 className="title mt-1.5 text-[1.25rem]">Partner skim · {digestPick.length} of 5</h2>
            </div>
            <Link
              href="/digest"
              className="text-[0.8125rem] font-semibold text-[var(--signal)] hover:underline"
            >
              Open digest preview
            </Link>
          </div>
          <ol className="mt-5 space-y-0 divide-y divide-[var(--line)]">
            {digestPick.map((r) => (
              <li key={r.id} className="py-4 first:pt-0 last:pb-0">
                <ReadRow read={r} numbered compact />
              </li>
            ))}
            {!digestPick.length && (
              <li className="py-2">
                <EmptyState>No curated news yet — run Refresh pipeline.</EmptyState>
              </li>
            )}
          </ol>
        </Panel>

        <div className="space-y-5">
          <Panel className="!p-5">
            <Eyebrow>Kind mix</Eyebrow>
            <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
              Diversity across earnings, regulation, essays, contrarian, geopolitics.
            </p>
            {kindSlices.length ? (
              <div className="mt-4">
                <DonutChart
                  slices={kindSlices}
                  size={140}
                  centerLabel="reads"
                  centerValue={String(digestPick.length)}
                />
              </div>
            ) : (
              <p className="mt-4 body-muted">No mix yet.</p>
            )}
          </Panel>
          <Panel className="!p-5">
            <Eyebrow>Thesis themes hit</Eyebrow>
            {themeBars.length ? (
              <BarChart series={themeBars} height={148} className="mt-3" />
            ) : (
              <p className="mt-3 body-muted">Themes appear once news is tagged.</p>
            )}
          </Panel>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>Full shelf</Eyebrow>
            <h2 className="title mt-1 text-[1.2rem]">All curated news</h2>
          </div>
          <Segmented aria-label="News kinds">
            {FILTERS.map((f) => (
              <SegItem key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
              </SegItem>
            ))}
          </Segmented>
        </div>

        {!filtered.length ? (
          <Panel>
            <EmptyState>Nothing in this slice.</EmptyState>
          </Panel>
        ) : (
          <div className="space-y-3 stagger">
            {filtered.map((r) => (
              <article key={r.id} className="panel p-5 md:p-6">
                <ReadRow read={r} />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** Compact numbered list for digest email preview. */
export function DigestNewsSection({ reads }: { reads: CuratedRead[] }) {
  if (!reads.length) {
    return (
      <p className="mt-4 text-[0.95rem] text-[var(--muted)]">
        No curated reads this cycle — see{" "}
        <Link href="/library?tab=news" className="font-semibold text-[var(--signal)] hover:underline">
          Library · News Worth Reading
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="mt-5">
      <p className="text-[0.875rem] leading-relaxed text-[var(--muted)]">{newsWorthCounsel(reads)}</p>
      <ol className="mt-5 divide-y divide-[var(--line)]">
        {reads.map((r) => (
          <li key={r.id} className="py-5 first:pt-0 last:pb-0">
            <ReadRow read={r} numbered />
          </li>
        ))}
      </ol>
      <Link
        href="/library?tab=news"
        className="link-quiet mt-5 inline-block text-[0.875rem] font-semibold"
      >
        Full News Worth Reading shelf
      </Link>
    </div>
  );
}

function ReadRow({
  read,
  numbered,
  compact,
}: {
  read: CuratedRead;
  numbered?: boolean;
  compact?: boolean;
}) {
  const meta = NEWS_KIND_META[read.kind];
  const why = cleanProse(read.why);
  const dateLabel = formatPub(read.published_at);

  return (
    <div className={cn("flex gap-3", numbered && "sm:gap-4")}>
      {numbered ? (
        <div
          className="mono mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] text-[0.8125rem] font-semibold text-[var(--signal)]"
          aria-hidden
        >
          {read.rank}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <ToneBadge tone={meta.tone}>{meta.short}</ToneBadge>
          {read.source ? (
            <span className="text-[0.75rem] text-[var(--faint)]">
              {read.source}
              {dateLabel ? ` · ${dateLabel}` : ""}
            </span>
          ) : dateLabel ? (
            <span className="text-[0.75rem] text-[var(--faint)]">{dateLabel}</span>
          ) : null}
        </div>

        <h3 className={cn("title mt-2 tracking-[-0.02em]", compact ? "text-[1.05rem]" : "text-[1.15rem]")}>
          {read.url ? (
            <ExternalLink href={read.url} kind="source" className="hover:text-[var(--signal)]">
              {read.title}
            </ExternalLink>
          ) : (
            read.title
          )}
        </h3>

        {why ? (
          <div
            className={cn(
              "mt-2.5 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel-2)]/50 px-3 py-2.5",
              compact && "py-2",
            )}
          >
            <div className="label-caps text-[var(--faint)]">Why Thirdbase</div>
            <p className="mt-1 text-[0.9rem] leading-snug text-[var(--text)]/90">{why}</p>
          </div>
        ) : null}

        {(read.themes.length > 0 || read.pipeline_hits.length > 0) && !compact ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.75rem] text-[var(--faint)]">
            {read.themes.map((t) => (
              <span
                key={t}
                className="rounded-[var(--radius-sm)] border border-[var(--line)] px-1.5 py-0.5"
              >
                {t}
              </span>
            ))}
            {read.pipeline_hits.map((c) => (
              <Link
                key={c.id}
                href={`/company/${c.slug || c.id}`}
                className="font-medium text-[var(--signal)] hover:underline"
              >
                {c.name}
              </Link>
            ))}
          </div>
        ) : null}

        {compact && read.pipeline_hits.length > 0 ? (
          <div className="mt-2 text-[0.75rem] text-[var(--faint)]">
            In book:{" "}
            {read.pipeline_hits.map((c, i) => (
              <span key={c.id}>
                {i > 0 ? ", " : ""}
                <Link
                  href={`/company/${c.slug || c.id}`}
                  className="font-medium text-[var(--signal)] hover:underline"
                >
                  {c.name}
                </Link>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatPub(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
