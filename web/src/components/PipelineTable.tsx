"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart, DonutChart } from "@/components/charts";
import { CompetitorLink } from "@/components/EntityLink";
import type { Company } from "@/lib/types";
import { evaluateThirdbaseCriteria } from "@/lib/thirdbaseCriteria";
import { useInterest } from "@/lib/useInterest";
import { companyPath } from "@/lib/paths";
import { EmptyState, Panel, RecBadge } from "@/components/ui";
import { cn, fmtMoneyM, fmtPct } from "@/lib/utils";

function shortRank(rank?: string | null) {
  if (!rank) return null;
  const m = rank.match(/#(\d+)\s+of\s+(\d+)/i);
  if (m) return { short: `#${m[1]}`, of: `of ${m[2]}` };
  if (rank.length <= 18) return { short: rank, of: null };
  return { short: rank.slice(0, 16) + "…", of: null };
}

const REC_FILTERS = ["All", "Deep Dive", "Watch", "Pass"] as const;
const SORTS = [
  { id: "score", label: "Score ↓" },
  { id: "name", label: "Name" },
  { id: "stage", label: "Stage" },
  { id: "yoy", label: "YoY ↓" },
  { id: "round", label: "Round ↓" },
] as const;

type SortId = (typeof SORTS)[number]["id"];

function normalizeRec(param?: string | null): string {
  if (!param) return "All";
  const hit = REC_FILTERS.find((r) => r.toLowerCase() === param.toLowerCase());
  return hit || "All";
}

function csvEscape(v: string | number | null | undefined) {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportPipelineCsv(rows: Company[]) {
  const header = [
    "name",
    "thesis_score",
    "recommendation",
    "sector_theme",
    "stage",
    "lead_investor",
    "tier1_count",
    "last_round_size_m",
    "yoy_growth_pct",
    "runway_months_est",
    "relative_rank",
  ];
  const lines = [
    header.join(","),
    ...rows.map((c) =>
      [
        c.name,
        c.thesis_score,
        c.recommendation,
        c.sector_theme,
        c.stage,
        c.lead_investor,
        c.tier1_count,
        c.last_round_size_m,
        c.yoy_growth_pct,
        c.runway_months_est,
        c.relative_rank,
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `signal-pipeline-${rows.length}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function PipelineTable({
  companies,
  initialRec,
}: {
  companies: Company[];
  initialRec?: string | null;
}) {
  const [q, setQ] = useState("");
  const [rec, setRec] = useState(() => normalizeRec(initialRec));
  const [theme, setTheme] = useState("All");
  const [stage, setStage] = useState("All");
  const [sort, setSort] = useState<SortId>("score");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const knownIds = useMemo(() => companies.map((c) => c.id), [companies]);
  const { liked, likedCount, like } = useInterest(knownIds);

  const themes = useMemo(
    () => ["All", ...Array.from(new Set(companies.map((c) => c.sector_theme).filter(Boolean)))],
    [companies],
  );
  const stages = useMemo(
    () => ["All", ...Array.from(new Set(companies.map((c) => c.stage).filter(Boolean)))],
    [companies],
  );

  const filtered = useMemo(() => {
    const rows = companies.filter((c) => {
      const blob = `${c.name} ${c.one_liner} ${c.subsector} ${c.lead_investor}`.toLowerCase();
      if (q && !blob.includes(q.toLowerCase())) return false;
      if (rec !== "All" && c.recommendation !== rec) return false;
      if (theme !== "All" && c.sector_theme !== theme) return false;
      if (stage !== "All" && c.stage !== stage) return false;
      return true;
    });

    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sort === "name") return (a.name || "").localeCompare(b.name || "");
      if (sort === "stage") return (a.stage || "").localeCompare(b.stage || "");
      if (sort === "yoy") return (b.yoy_growth_pct ?? -1) - (a.yoy_growth_pct ?? -1);
      if (sort === "round") return (b.last_round_size_m ?? -1) - (a.last_round_size_m ?? -1);
      return (b.thesis_score ?? -1) - (a.thesis_score ?? -1);
    });
    return sorted;
  }, [companies, q, rec, theme, stage, sort]);

  const hasFilters =
    Boolean(q) || rec !== "All" || theme !== "All" || stage !== "All" || sort !== "score";

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  const viz = useMemo(() => {
    const recs = ["Deep Dive", "Watch", "Pass"] as const;
    const recColors: Record<string, string> = {
      "Deep Dive": "var(--signal)",
      Watch: "var(--warn)",
      Pass: "var(--faint)",
    };
    const total = companies.length || 1;
    const recSlices = recs
      .map((r) => {
        const n = companies.filter((c) => c.recommendation === r).length;
        return { label: r, pct: Math.round((100 * n) / total), color: recColors[r], n };
      })
      .filter((s) => s.n > 0);

    const bands = [
      { label: "90+", min: 90, max: 101 },
      { label: "80–89", min: 80, max: 90 },
      { label: "70–79", min: 70, max: 80 },
      { label: "<70", min: 0, max: 70 },
    ].map((b) => ({
      label: b.label,
      value: companies.filter((c) => {
        const s = c.thesis_score ?? 0;
        return s >= b.min && s < b.max;
      }).length,
    }));

    const stageBars = Array.from(
      companies.reduce((m, c) => {
        const k = c.stage || "Unknown";
        m.set(k, (m.get(k) || 0) + 1);
        return m;
      }, new Map<string, number>()),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }));

    return { recSlices, bands, stages: stageBars };
  }, [companies]);

  return (
    <div className="space-y-5">
      <div className="viz-strip">
        <Panel className="viz-card !p-4">
          <div className="label-caps">Recommendation</div>
          <div className="mt-auto flex flex-1 flex-wrap items-center gap-x-4 gap-y-2 pt-2">
            <DonutChart
              size={108}
              centerLabel="book"
              centerValue={String(companies.length)}
              slices={viz.recSlices}
              className="!gap-3"
            />
          </div>
        </Panel>
        <Panel className="viz-card !p-4">
          <div className="label-caps">Score bands</div>
          <BarChart height={148} className="mt-auto pt-2" series={viz.bands} color="var(--signal)" />
        </Panel>
        <Panel className="viz-card !p-4">
          <div className="label-caps">Stage mix</div>
          <BarChart height={148} className="mt-auto pt-2" series={viz.stages} color="var(--deep)" />
        </Panel>
      </div>

      <div className="panel flex flex-col gap-3 !p-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search companies, leads, thesis…"
            className="field !w-full min-w-0 flex-1 sm:!w-auto"
            aria-label="Search pipeline"
          />
          <select
            value={rec}
            onChange={(e) => setRec(e.target.value)}
            className="field !w-full shrink-0 sm:!w-[9.5rem]"
            aria-label="Filter by recommendation"
          >
            {REC_FILTERS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="field !w-full shrink-0 sm:!w-[12rem]"
            aria-label="Filter by sector"
          >
            {themes.map((x) => (
              <option key={String(x)}>{x}</option>
            ))}
          </select>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="field !w-full shrink-0 sm:!w-[9rem]"
            aria-label="Filter by stage"
          >
            {stages.map((x) => (
              <option key={String(x)}>{x}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortId)}
            className="field !w-full shrink-0 sm:!w-[8.5rem]"
            aria-label="Sort pipeline"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-2.5">
          {likedCount ? (
            <Link href="/interest" className="text-[0.75rem] font-semibold text-[var(--signal)] hover:underline">
              {likedCount} liked → Interest
            </Link>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => exportPipelineCsv(filtered)}
            disabled={!filtered.length}
          >
            Export CSV
          </button>
          {compareIds.length >= 2 ? (
            <Link
              href={`/compare?ids=${compareIds.join(",")}`}
              className="btn btn-primary btn-sm"
            >
              Compare {compareIds.length}
            </Link>
          ) : compareIds.length === 1 ? (
            <span className="text-[0.75rem] text-[var(--faint)]">Select 1 more to compare</span>
          ) : (
            <span className="text-[0.75rem] text-[var(--faint)]">Tick rows to compare (2–4)</span>
          )}
          {compareIds.length ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCompareIds([])}>
              Clear compare
            </button>
          ) : null}
          <span className="mono ml-auto text-[0.75rem] text-[var(--faint)]">
            {filtered.length}/{companies.length}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="panel overflow-hidden !p-0">
          <div className="data-table-empty">
            <EmptyState
              title={hasFilters ? "No matches" : "Pipeline empty"}
              action={
                hasFilters ? (
                  <button
                    type="button"
                    className="btn btn-soft btn-sm"
                    onClick={() => {
                      setQ("");
                      setRec("All");
                      setTheme("All");
                      setStage("All");
                      setSort("score");
                    }}
                  >
                    Clear filters
                  </button>
                ) : undefined
              }
            >
              {hasFilters
                ? "Widen search or clear recommendation / sector / stage filters."
                : "Run Refresh pipeline to score the book."}
            </EmptyState>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2 lg:hidden">
            {filtered.map((c) => {
              const rank = shortRank(c.relative_rank);
              const criteria = evaluateThirdbaseCriteria(c);
              const inCompare = compareIds.includes(c.id);
              return (
                <div key={c.id} className="panel !p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <input
                        type="checkbox"
                        className="mt-1.5"
                        checked={inCompare}
                        onChange={() => toggleCompare(c.id)}
                        aria-label={`Compare ${c.name}`}
                      />
                      <div className="min-w-0">
                        <Link
                          href={companyPath({ id: c.id, slug: c.slug }) || `/company/${c.id}`}
                          className="entity-link title text-[1.02rem] font-semibold"
                        >
                          {c.name}
                        </Link>
                        <div className="mt-0.5 truncate text-[0.78rem] text-[var(--muted)]">
                          {c.sector_theme || "—"}
                          {c.stage ? ` · ${c.stage}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="mono text-[1.05rem] font-semibold text-[var(--signal)]">
                        {c.thesis_score != null ? Math.round(c.thesis_score) : "—"}
                      </div>
                      <div className="mt-1">
                        <RecBadge rec={c.recommendation} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[0.78rem] sm:grid-cols-4">
                    <div>
                      <div className="label-caps !text-[0.6rem]">Criteria</div>
                      <div
                        className={cn(
                          "mono mt-0.5 font-medium",
                          criteria.fit_pct >= 75
                            ? "text-[var(--ok)]"
                            : criteria.fit_pct >= 50
                              ? "text-[var(--warn)]"
                              : "text-[var(--danger)]",
                        )}
                      >
                        {criteria.met}/{criteria.items.length}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="label-caps !text-[0.6rem]">Lead</div>
                      <div className="mt-0.5 truncate">
                        {c.lead_investor ? <CompetitorLink name={c.lead_investor} /> : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="label-caps !text-[0.6rem]">Round</div>
                      <div className="mono mt-0.5">{fmtMoneyM(c.last_round_size_m)}</div>
                    </div>
                    <div>
                      <div className="label-caps !text-[0.6rem]">Rank</div>
                      <div className="mono mt-0.5">
                        {rank ? (
                          <>
                            <span className="font-semibold">{rank.short}</span>
                            {rank.of ? (
                              <span className="ml-1 text-[var(--muted)]">{rank.of}</span>
                            ) : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-2.5">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.72rem] text-[var(--muted)]">
                      <span>YoY {fmtPct(c.yoy_growth_pct)}</span>
                      <span>
                        Runway{" "}
                        {c.runway_months_est != null ? `${c.runway_months_est} mo` : "—"}
                      </span>
                      <span>T1 {c.tier1_count ?? "—"}</span>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "btn btn-sm shrink-0",
                        liked.has(c.id) ? "btn-primary" : "btn-soft",
                      )}
                      onClick={() => like(c.id)}
                      aria-pressed={liked.has(c.id)}
                    >
                      {liked.has(c.id) ? "Liked" : "Like"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="panel hidden overflow-hidden !p-0 lg:block">
            <div className="max-h-[min(70dvh,52rem)] overflow-auto scrollbar-thin">
              <table className="data-table min-w-[1040px]">
                <thead>
                  <tr>
                    <th className="w-10">Cmp</th>
                    <th className="sticky-col">Company</th>
                    <th>Score</th>
                    <th>Criteria</th>
                    <th>Rec</th>
                    <th>Stage</th>
                    <th>Lead</th>
                    <th>Tier-1</th>
                    <th>Round</th>
                    <th>YoY</th>
                    <th>Runway</th>
                    <th>Rank</th>
                    <th>Interest</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const rank = shortRank(c.relative_rank);
                    const criteria = evaluateThirdbaseCriteria(c);
                    const inCompare = compareIds.includes(c.id);
                    return (
                      <tr key={c.id} className={inCompare ? "bg-[var(--signal-dim)]" : undefined}>
                        <td>
                          <input
                            type="checkbox"
                            checked={inCompare}
                            onChange={() => toggleCompare(c.id)}
                            aria-label={`Compare ${c.name}`}
                          />
                        </td>
                        <td className="sticky-col">
                          <Link
                            href={companyPath({ id: c.id, slug: c.slug }) || `/company/${c.id}`}
                            className="entity-link font-semibold"
                          >
                            {c.name}
                          </Link>
                          <div className="mt-0.5 max-w-[240px] truncate text-[0.8125rem] text-[var(--muted)]">
                            {c.sector_theme}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="mono font-semibold text-[var(--signal)]">
                              {c.thesis_score != null ? Math.round(c.thesis_score) : "—"}
                            </span>
                            <span
                              className="inline-block h-1.5 w-10 overflow-hidden rounded-full bg-[var(--panel-2)]"
                              title="Thesis score"
                            >
                              <span
                                className="block h-full rounded-full bg-[var(--signal)]"
                                style={{
                                  width: `${Math.max(4, Math.min(100, c.thesis_score ?? 0))}%`,
                                }}
                              />
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`mono text-[0.8125rem] ${
                              criteria.fit_pct >= 75
                                ? "text-[var(--ok)]"
                                : criteria.fit_pct >= 50
                                  ? "text-[var(--warn)]"
                                  : "text-[var(--danger)]"
                            }`}
                            title={`${criteria.met} met · ${criteria.partial} partial · ${criteria.miss} miss`}
                          >
                            {criteria.met}/{criteria.items.length}
                          </span>
                        </td>
                        <td>
                          <RecBadge rec={c.recommendation} />
                        </td>
                        <td className="whitespace-nowrap">{c.stage || "—"}</td>
                        <td
                          className="max-w-[7.5rem] truncate text-[0.8125rem]"
                          title={c.lead_investor || undefined}
                        >
                          {c.lead_investor ? (
                            <CompetitorLink name={c.lead_investor} />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="mono">{c.tier1_count ?? "—"}</td>
                        <td className="mono whitespace-nowrap">{fmtMoneyM(c.last_round_size_m)}</td>
                        <td className="mono whitespace-nowrap">{fmtPct(c.yoy_growth_pct)}</td>
                        <td className="mono whitespace-nowrap">
                          {c.runway_months_est != null ? `${c.runway_months_est} mo` : "—"}
                        </td>
                        <td className="whitespace-nowrap">
                          {rank ? (
                            <span
                              className="mono text-[0.8125rem]"
                              title={c.relative_rank || undefined}
                            >
                              <span className="font-semibold text-[var(--text)]">{rank.short}</span>
                              {rank.of ? (
                                <span className="ml-1 text-[var(--muted)]">{rank.of}</span>
                              ) : null}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={cn(
                              "btn btn-sm",
                              liked.has(c.id) ? "btn-primary" : "btn-soft",
                            )}
                            onClick={() => like(c.id)}
                            aria-pressed={liked.has(c.id)}
                          >
                            {liked.has(c.id) ? "Liked" : "Like"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
