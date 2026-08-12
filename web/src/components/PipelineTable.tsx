"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart, DonutChart } from "@/components/charts";
import { CompetitorLink } from "@/components/EntityLink";
import type { Company } from "@/lib/types";
import { evaluateThirdbaseCriteria } from "@/lib/thirdbaseCriteria";
import { useInterest } from "@/lib/useInterest";
import { companyPath } from "@/lib/paths";
import { Panel, RecBadge } from "@/components/ui";
import { cn, fmtMoneyM, fmtPct } from "@/lib/utils";

function shortRank(rank?: string | null) {
  if (!rank) return null;
  const m = rank.match(/#(\d+)\s+of\s+(\d+)/i);
  if (m) return { short: `#${m[1]}`, of: `of ${m[2]}` };
  if (rank.length <= 18) return { short: rank, of: null };
  return { short: rank.slice(0, 16) + "…", of: null };
}

export function PipelineTable({ companies }: { companies: Company[] }) {
  const [q, setQ] = useState("");
  const [rec, setRec] = useState("All");
  const [theme, setTheme] = useState("All");
  const knownIds = useMemo(() => companies.map((c) => c.id), [companies]);
  const { liked, likedCount, like } = useInterest(knownIds);

  const themes = useMemo(
    () => ["All", ...Array.from(new Set(companies.map((c) => c.sector_theme).filter(Boolean)))],
    [companies],
  );

  const filtered = companies.filter((c) => {
    const blob = `${c.name} ${c.one_liner} ${c.subsector} ${c.lead_investor}`.toLowerCase();
    if (q && !blob.includes(q.toLowerCase())) return false;
    if (rec !== "All" && c.recommendation !== rec) return false;
    if (theme !== "All" && c.sector_theme !== theme) return false;
    return true;
  });

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

    const stages = Array.from(
      companies.reduce((m, c) => {
        const k = c.stage || "Unknown";
        m.set(k, (m.get(k) || 0) + 1);
        return m;
      }, new Map<string, number>()),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({
        label: label.length > 8 ? label.slice(0, 7) + "…" : label,
        value,
      }));

    return { recSlices, bands, stages };
  }, [companies]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Panel className="!p-4">
          <div className="label-caps">Recommendation</div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <DonutChart
              size={88}
              centerLabel=""
              centerValue={String(companies.length)}
              slices={viz.recSlices}
            />
            <div className="min-w-0 space-y-1 text-[0.75rem] text-[var(--muted)]">
              {viz.recSlices.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: s.color }}
                    aria-hidden
                  />
                  <span>
                    {s.label} · {s.n}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel className="!p-4">
          <div className="label-caps">Score bands</div>
          <BarChart height={96} className="mt-2" series={viz.bands} color="var(--signal)" />
        </Panel>
        <Panel className="!p-4">
          <div className="label-caps">Stage mix</div>
          <BarChart height={96} className="mt-2" series={viz.stages} color="var(--deep)" />
        </Panel>
      </div>

      <div className="panel flex flex-col gap-3 !p-3 sm:flex-row sm:items-center sm:gap-2.5">
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
          {["All", "Deep Dive", "Watch", "Pass"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="field !w-full shrink-0 sm:!w-[14rem]"
          aria-label="Filter by sector"
        >
          {themes.map((x) => (
            <option key={String(x)}>{x}</option>
          ))}
        </select>
        <div className="flex shrink-0 items-center gap-3 px-1 text-[0.75rem] text-[var(--faint)] sm:ml-auto">
          {likedCount ? (
            <Link href="/interest" className="font-semibold text-[var(--signal)] hover:underline">
              {likedCount} liked → Interest
            </Link>
          ) : null}
          <span>
            {filtered.length}/{companies.length}
          </span>
        </div>
      </div>

      <div className="panel overflow-hidden !p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="data-table min-w-[980px]">
            <thead>
              <tr>
                <th>Company</th>
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
                return (
                  <tr key={c.id}>
                    <td>
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
                        <span className="mono text-[0.8125rem]" title={c.relative_rank || undefined}>
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
    </div>
  );
}
