"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BarChart, DonutChart, GroupedBarChart } from "@/components/charts";
import { CompanyLink } from "@/components/EntityLink";
import { EmptyState, PageHeader, Panel, RecBadge, SegItem, Segmented } from "@/components/ui";
import {
  buildComparePack,
  suggestCompareCandidates,
  type ComparePack,
} from "@/lib/compare";
import { useInterest } from "@/lib/useInterest";
import type { Company, PeerActivity } from "@/lib/types";
import { cn, fmtMoneyM, fmtPct } from "@/lib/utils";

const DIM_COLORS = ["var(--signal)", "var(--ok)", "var(--warn)", "var(--deep)"];

function formatField(
  format: string,
  v: string | number | null,
): string {
  if (v == null || v === "") return "—";
  if (format === "money" && typeof v === "number") return fmtMoneyM(v);
  if (format === "pct" && typeof v === "number") return fmtPct(v);
  if (format === "number" && typeof v === "number") return v % 1 === 0 ? String(v) : v.toFixed(1);
  return String(v);
}

export function DealCompare({
  companies,
  peers,
  initialIds,
}: {
  companies: Company[];
  peers: PeerActivity[];
  initialIds?: string[];
}) {
  const knownIds = useMemo(() => companies.map((c) => c.id), [companies]);
  const { rankedIds } = useInterest(knownIds);
  const candidates = useMemo(() => suggestCompareCandidates(companies, 12), [companies]);
  const [selected, setSelected] = useState<string[]>(() => {
    if (initialIds?.length) return initialIds.slice(0, 4);
    return [];
  });
  const [seeded, setSeeded] = useState(false);
  const [tab, setTab] = useState<"dims" | "snapshot" | "export">("dims");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (seeded || selected.length) return;
    if (initialIds?.length) {
      setSelected(initialIds.slice(0, 4));
      setSeeded(true);
      return;
    }
    const fromLikes = rankedIds.filter((id) => knownIds.includes(id)).slice(0, 4);
    if (fromLikes.length >= 2) {
      setSelected(fromLikes);
    } else {
      setSelected(candidates.slice(0, 2).map((c) => c.id));
    }
    setSeeded(true);
  }, [seeded, selected.length, initialIds, rankedIds, knownIds, candidates]);

  const selectedCompanies = useMemo(
    () =>
      selected
        .map((id) => companies.find((c) => c.id === id || c.slug === id))
        .filter(Boolean) as Company[],
    [selected, companies],
  );

  const pack: ComparePack = useMemo(
    () => buildComparePack(selectedCompanies, peers),
    [selectedCompanies, peers],
  );

  const likedCandidates = useMemo(
    () =>
      rankedIds
        .map((id) => companies.find((c) => c.id === id))
        .filter(Boolean) as Company[],
    [rankedIds, companies],
  );

  const pickerPool = useMemo(() => {
    const fromLikes = likedCandidates.slice(0, 8);
    const rest = (candidates.length ? candidates : companies.slice(0, 12)).filter(
      (c) => !fromLikes.some((l) => l.id === c.id),
    );
    return [...fromLikes, ...rest].slice(0, 16);
  }, [likedCandidates, candidates, companies]);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  function loadStack() {
    const ids = rankedIds.filter((id) => knownIds.includes(id)).slice(0, 4);
    if (ids.length >= 2) setSelected(ids);
  }

  async function copyMd() {
    await navigator.clipboard.writeText(pack.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Conviction debate"
        title="Deal compare"
        description="Pick 2–4 names. See who wins each thesis dimension before you spend partner hours."
        actions={
          <>
            {likedCandidates.length >= 2 ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={loadStack}>
                Load Interest stack
              </button>
            ) : null}
            <button type="button" className="btn btn-soft btn-sm" onClick={copyMd}>
              {copied ? "Copied ✓" : "Copy compare.md"}
            </button>
          </>
        }
      />

      <Panel>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="label-caps">Select up to 4</div>
          {likedCandidates.length ? (
            <Link href="/interest" className="text-[0.75rem] text-[var(--signal)] hover:underline">
              {likedCandidates.length} in Interest stack →
            </Link>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {pickerPool.map((c) => {
            const on = selected.includes(c.id);
            const liked = likedCandidates.some((l) => l.id === c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={cn(
                  "chip transition",
                  on && "!border-[var(--signal)] !text-[var(--signal)]",
                )}
              >
                {liked ? "★ " : ""}
                {c.name}
                <span className="mono ml-1.5 text-[0.65rem] text-[var(--faint)]">
                  {c.thesis_score?.toFixed(0)}
                </span>
              </button>
            );
          })}
        </div>
        {selectedCompanies.length < 2 && (
          <p className="mt-3 text-sm text-[var(--warn)]">Select at least two companies.</p>
        )}
      </Panel>

      {selectedCompanies.length >= 2 && (
        <>
          <Panel
            className={cn(
              pack.verdict.close_call && "border-[var(--warn)]/40 bg-[var(--warn-dim)]",
            )}
          >
            <div className="label-caps">
              {pack.verdict.close_call ? "Close call" : "Verdict"}
            </div>
            <p className="mt-2 text-[1.05rem] leading-relaxed">{pack.verdict.counsel}</p>
            <div className="mt-4 flex flex-wrap gap-4">
              {selectedCompanies.map((c) => (
                <div key={c.id} className="min-w-[7rem]">
                  <div className="text-[0.8125rem] font-medium">
                    <CompanyLink id={c.id} slug={c.slug} name={c.name} />
                  </div>
                  <div className="mono text-[1.35rem] text-[var(--signal)]">
                    {pack.verdict.dims_won[c.id] || 0}
                    <span className="text-[0.7rem] text-[var(--faint)]"> dims</span>
                  </div>
                  <RecBadge rec={c.recommendation} />
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <Panel>
              <div className="label-caps">Dimension scoreboard</div>
              <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                Who wins each thesis axis — taller bar wins the dim.
              </p>
              <div className="mt-4">
                <GroupedBarChart
                  height={240}
                  seriesKeys={selectedCompanies.map((c) => c.id)}
                  seriesLabels={Object.fromEntries(
                    selectedCompanies.map((c) => [c.id, c.name]),
                  )}
                  colors={DIM_COLORS}
                  groups={pack.rows.map((row) => ({
                    label: row.label,
                    values: row.values,
                  }))}
                />
              </div>
            </Panel>
            <Panel>
              <div className="label-caps">Dims won</div>
              <div className="mt-4">
                <DonutChart
                  size={150}
                  centerLabel="dims"
                  centerValue={String(
                    Object.values(pack.verdict.dims_won).reduce((a, b) => a + b, 0),
                  )}
                  slices={selectedCompanies.map((c, i) => {
                    const won = pack.verdict.dims_won[c.id] || 0;
                    const total =
                      Object.values(pack.verdict.dims_won).reduce((a, b) => a + b, 0) || 1;
                    return {
                      label: c.name,
                      pct: Math.round((100 * won) / total),
                      color: DIM_COLORS[i % DIM_COLORS.length],
                    };
                  })}
                />
              </div>
              <div className="mt-5">
                <div className="label-caps">Thesis score</div>
                <BarChart
                  height={120}
                  className="mt-2"
                  series={selectedCompanies.map((c) => ({
                    label: c.name.slice(0, 8),
                    value: c.thesis_score ?? 0,
                  }))}
                  formatValue={(v) => String(Math.round(v))}
                />
              </div>
            </Panel>
          </div>

          <Segmented>
            <SegItem active={tab === "dims"} onClick={() => setTab("dims")}>
              Dimensions
            </SegItem>
            <SegItem active={tab === "snapshot"} onClick={() => setTab("snapshot")}>
              Snapshot
            </SegItem>
            <SegItem active={tab === "export"} onClick={() => setTab("export")}>
              Export
            </SegItem>
          </Segmented>

          {tab === "dims" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-left text-[0.7rem] uppercase tracking-wider text-[var(--faint)]">
                    <th className="py-2 pr-3 font-medium">Dimension</th>
                    {selectedCompanies.map((c) => (
                      <th key={c.id} className="px-2 py-2 font-medium">
                        <CompanyLink id={c.id} slug={c.slug} name={c.name} />
                      </th>
                    ))}
                    <th className="py-2 pl-2 font-medium">Spread</th>
                  </tr>
                </thead>
                <tbody>
                  {pack.rows.map((row) => (
                    <tr key={row.key} className="border-b border-[var(--line)]/70">
                      <td className="py-2.5 pr-3 text-[var(--muted)]">{row.label}</td>
                      {selectedCompanies.map((c) => {
                        const v = row.values[c.id];
                        const win = row.winner_id === c.id;
                        return (
                          <td
                            key={c.id}
                            className={cn(
                              "mono px-2 py-2.5",
                              win && "font-semibold text-[var(--signal)]",
                            )}
                          >
                            {v != null ? v.toFixed(0) : "—"}
                            {win ? " ▸" : ""}
                          </td>
                        );
                      })}
                      <td className="mono py-2.5 pl-2 text-[var(--faint)]">{row.spread || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "snapshot" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-left text-[0.7rem] uppercase tracking-wider text-[var(--faint)]">
                    <th className="py-2 pr-3 font-medium">Field</th>
                    {selectedCompanies.map((c) => (
                      <th key={c.id} className="px-2 py-2 font-medium">
                        <CompanyLink id={c.id} slug={c.slug} name={c.name} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pack.fields.map((f) => (
                    <tr key={f.key} className="border-b border-[var(--line)]/70">
                      <td className="py-2.5 pr-3 text-[var(--muted)]">{f.label}</td>
                      {selectedCompanies.map((c) => (
                        <td key={c.id} className="px-2 py-2.5">
                          {f.format === "rec" ? (
                            <RecBadge rec={String(f.values[c.id] || "—")} />
                          ) : (
                            <span className={f.format !== "text" ? "mono" : ""}>
                              {formatField(f.format, f.values[c.id])}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {pack.peer_pressure.length > 0 && (
                <div className="mt-6">
                  <div className="label-caps">Peer pressure</div>
                  <ul className="mt-2 space-y-1.5 text-sm text-[var(--muted)]">
                    {pack.peer_pressure.map((p, i) => (
                      <li key={`${p.company_id}-${i}`}>
                        <span className="text-[var(--text)]">
                          {selectedCompanies.find((c) => c.id === p.company_id)?.name}
                        </span>{" "}
                        · {p.firm} — {p.notes}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {tab === "export" && (
            <Panel>
              <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap font-mono text-[0.75rem] leading-relaxed text-[var(--muted)]">
                {pack.markdown}
              </pre>
            </Panel>
          )}
        </>
      )}

      {selectedCompanies.length < 2 && (
        <EmptyState>Select two or more pipeline companies to open the compare board.</EmptyState>
      )}
    </div>
  );
}
