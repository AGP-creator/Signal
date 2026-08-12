"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart, DonutChart, SparkBars } from "@/components/charts";
import { Eyebrow, Panel } from "@/components/ui";
import type { FundAnnouncement } from "@/lib/fundAnnouncements";
import type { FirmDossier } from "@/lib/peerIntel";
import { resolveWatchlistFirms } from "@/lib/vcWatchlist";
import { cn } from "@/lib/utils";

type SortKey = "watch" | "deals" | "fund" | "drift" | "name";
type ActivityFilter = "all" | "active" | "drift" | "quiet" | "funded";

const CHART_COLORS = [
  "var(--signal)",
  "var(--deep)",
  "var(--ok)",
  "var(--warn)",
  "#0d9488",
  "#64748b",
];

function formatFund(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  return `$${Math.round(n)}M`;
}

function activityOf(f: FirmDossier) {
  if (f.thesis_shift_count > 0 || f.drift_score >= 30) return "Drift" as const;
  if (f.deal_count > 0) return "Active" as const;
  return "Quiet" as const;
}

function latestFund(funds: FundAnnouncement[], slug: string) {
  const rows = funds
    .filter((f) => f.firm_slug === slug)
    .sort((a, b) => b.announced_date.localeCompare(a.announced_date));
  return rows[0] ?? null;
}

function fundCapital(funds: FundAnnouncement[], slug: string) {
  return funds
    .filter((f) => f.firm_slug === slug && f.size_m != null)
    .reduce((s, f) => s + (f.size_m || 0), 0);
}

export function CompetitorsDesk({
  firms,
  funds = [],
}: {
  firms: FirmDossier[];
  funds?: FundAnnouncement[];
}) {
  const watch = useMemo(() => resolveWatchlistFirms(firms), [firms]);
  const [q, setQ] = useState("");
  const [activity, setActivity] = useState<ActivityFilter>("all");
  const [sort, setSort] = useState<SortKey>("watch");

  const enriched = useMemo(() => {
    return watch.map((f) => {
      const fund = latestFund(funds, f.slug);
      const capital_m = fundCapital(funds, f.slug);
      return {
        ...f,
        fund,
        capital_m: capital_m || null,
        activity: activityOf(f),
        top_theme: f.top_themes[0]?.theme || f.stated_focus.split(/[·,]/)[0]?.trim() || "—",
      };
    });
  }, [watch, funds]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = enriched.filter((f) => {
      if (activity === "active" && f.activity !== "Active" && f.activity !== "Drift") return false;
      if (activity === "drift" && f.activity !== "Drift") return false;
      if (activity === "quiet" && f.activity !== "Quiet") return false;
      if (activity === "funded" && f.capital_m == null) return false;
      if (!needle) return true;
      const blob = `${f.name} ${f.aliases.join(" ")} ${f.stated_focus} ${f.top_theme} ${f.intel_summary}`.toLowerCase();
      return blob.includes(needle);
    });

    rows = [...rows].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "deals") return b.deal_count - a.deal_count;
      if (sort === "fund") return (b.capital_m || 0) - (a.capital_m || 0);
      if (sort === "drift") return b.drift_score - a.drift_score;
      return b.watch_priority - a.watch_priority;
    });
    return rows;
  }, [enriched, q, activity, sort]);

  const overview = useMemo(() => {
    const total = Math.max(watch.length, 1);
    const drift = enriched.filter((f) => f.activity === "Drift").length;
    const active = enriched.filter((f) => f.activity === "Active").length;
    const quiet = enriched.filter((f) => f.activity === "Quiet").length;
    const funded = enriched.filter((f) => f.capital_m != null).length;
    const capital = enriched.reduce((s, f) => s + (f.capital_m || 0), 0);
    const themeMap = new Map<string, number>();
    for (const f of enriched) {
      for (const t of f.top_themes.slice(0, 2)) {
        themeMap.set(t.theme, (themeMap.get(t.theme) || 0) + t.count);
      }
    }
    const topThemes = [...themeMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({
        label: label.split(/\s+/).slice(0, 2).join(" ").slice(0, 14),
        value,
      }));
    return {
      drift,
      active,
      quiet,
      funded,
      capital,
      topThemes,
      donut: [
        { label: "Active", pct: Math.round((100 * active) / total), color: "var(--signal)" },
        { label: "Drift", pct: Math.round((100 * drift) / total), color: "var(--warn)" },
        { label: "Quiet", pct: Math.round((100 * quiet) / total), color: "var(--faint)" },
      ],
    };
  }, [watch.length, enriched]);

  return (
    <div className="space-y-7">
      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewTile label="Competitors" value={String(watch.length)} />
          <OverviewTile label="With deals" value={String(overview.active + overview.drift)} tone="signal" />
          <OverviewTile label="Fund capital" value={formatFund(overview.capital || null)} tone="deep" />
          <OverviewTile label="Funded vehicles" value={String(overview.funded)} />
        </div>
        <Panel className="!p-4 md:!p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="label-caps">Field mix</div>
              <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                Activity posture across the peer set
              </p>
            </div>
            <DonutChart
              size={118}
              slices={overview.donut}
              centerLabel="firms"
              centerValue={String(watch.length)}
            />
          </div>
        </Panel>
      </div>

      {!!overview.topThemes.length && (
        <Panel>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Eyebrow className="!text-[var(--signal)]">Sector heat</Eyebrow>
              <h2 className="title mt-2 text-[1.2rem]">Where competitors concentrate</h2>
            </div>
            <span className="text-[0.8125rem] text-[var(--faint)]">Pipeline overlap themes</span>
          </div>
          <BarChart className="mt-4" series={overview.topThemes} height={148} color="var(--signal)" />
        </Panel>
      )}

      <Panel className="!p-4 md:!p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[14rem] flex-1">
            <span className="label-caps">Search competitors</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="a16z, Sequoia, defence, fintech…"
              className="field mt-1"
            />
          </label>
          <label>
            <span className="label-caps">Filter</span>
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value as ActivityFilter)}
              className="field mt-1"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="drift">Thesis drift</option>
              <option value="funded">With fund size</option>
              <option value="quiet">Quiet</option>
            </select>
          </label>
          <label>
            <span className="label-caps">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="field mt-1"
            >
              <option value="watch">Watch priority</option>
              <option value="deals">Deal count</option>
              <option value="fund">Fund capital</option>
              <option value="drift">Drift</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
        <div className="mt-3 text-[0.8125rem] text-[var(--faint)]">
          Showing {filtered.length} of {watch.length} · click any firm for full analytics
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((f, i) => (
          <Link
            key={f.slug}
            href={`/competitors/${f.slug}`}
            className={cn(
              "group relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)]",
              "bg-[var(--panel)] p-5 transition duration-300",
              "hover:-translate-y-0.5 hover:border-[var(--signal)] hover:shadow-[0_18px_40px_-28px_color-mix(in_srgb,var(--signal)_55%,transparent)]",
            )}
            style={{ animationDelay: `${Math.min(i, 12) * 28}ms` }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition group-hover:opacity-100"
              style={{
                background:
                  "linear-gradient(90deg, transparent, color-mix(in srgb, var(--signal) 70%, transparent), transparent)",
              }}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="mono text-[0.7rem] text-[var(--faint)]">
                    #{String(f.watch_rank).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
                      f.activity === "Drift"
                        ? "bg-[var(--warn-dim)] text-[var(--warn)]"
                        : f.activity === "Active"
                          ? "bg-[var(--signal-dim)] text-[var(--signal)]"
                          : "bg-[var(--panel-2)] text-[var(--muted)]",
                    )}
                  >
                    {f.activity}
                  </span>
                </div>
                <h3 className="title mt-2 text-[1.15rem] transition group-hover:text-[var(--signal)]">
                  {f.name}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-[var(--muted)]">
                  {f.stated_focus || "Focus not catalogued"}
                </p>
              </div>
              <SparkBars
                values={[
                  f.deal_count,
                  f.lead_count,
                  Math.round(f.drift_score / 12),
                  f.thesis_shift_count * 2,
                ]}
                color={CHART_COLORS[i % CHART_COLORS.length]}
              />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-4">
              <MiniStat label="Fund" value={formatFund(f.capital_m)} />
              <MiniStat label="Deals" value={String(f.deal_count)} />
              <MiniStat label="Watch" value={f.watch_priority ? f.watch_priority.toFixed(0) : "—"} accent />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[0.75rem] text-[var(--faint)]">
              <span className="line-clamp-1">{f.top_theme}</span>
              <span className="mono shrink-0 text-[var(--signal)] opacity-0 transition group-hover:opacity-100">
                Analytics →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {!filtered.length && (
        <Panel>
          <p className="text-[var(--muted)]">No competitors match this filter.</p>
        </Panel>
      )}
    </div>
  );
}

function OverviewTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "signal" | "deep" | "warn";
}) {
  const toneClass =
    tone === "signal"
      ? "text-[var(--signal)]"
      : tone === "deep"
        ? "text-[var(--deep)]"
        : tone === "warn"
          ? "text-[var(--warn)]"
          : "text-[var(--text)]";
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--panel)] px-4 py-4">
      <div className="label-caps text-[var(--faint)]">{label}</div>
      <div className={cn("mono mt-2 text-[1.45rem]", toneClass)}>{value}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="label-caps text-[var(--faint)]">{label}</div>
      <div className={cn("mono mt-1 text-[0.95rem]", accent ? "text-[var(--signal)]" : "text-[var(--text)]")}>
        {value}
      </div>
    </div>
  );
}
