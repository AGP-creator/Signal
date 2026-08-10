"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Company } from "@/lib/types";
import { RecBadge } from "@/components/ui";
import { fmtMoneyM, fmtPct } from "@/lib/utils";

export function PipelineTable({ companies }: { companies: Company[] }) {
  const [q, setQ] = useState("");
  const [rec, setRec] = useState("All");
  const [theme, setTheme] = useState("All");

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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search companies, leads, thesis…"
          className="field min-w-[220px] flex-1"
        />
        <select value={rec} onChange={(e) => setRec(e.target.value)} className="field w-auto min-w-[8.5rem]">
          {["All", "Deep Dive", "Watch", "Pass"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="field w-auto max-w-[260px] min-w-[10rem]"
        >
          {themes.map((x) => (
            <option key={String(x)}>{x}</option>
          ))}
        </select>
      </div>

      <div className="panel overflow-hidden !p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[980px] text-left text-[0.9375rem]">
            <thead className="border-b border-[var(--line)] bg-white/[0.015] text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3.5">Company</th>
                <th className="px-4 py-3.5">Score</th>
                <th className="px-4 py-3.5">Rec</th>
                <th className="px-4 py-3.5">Stage</th>
                <th className="px-4 py-3.5">Tier-1</th>
                <th className="px-4 py-3.5">Round</th>
                <th className="px-4 py-3.5">YoY</th>
                <th className="px-4 py-3.5">Rank</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[var(--line)] transition last:border-0 hover:bg-white/[0.025]"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/company/${c.id}`}
                      className="font-semibold transition hover:text-[var(--signal)]"
                    >
                      {c.name}
                    </Link>
                    <div className="mt-0.5 max-w-[280px] truncate text-[0.8125rem] text-[var(--muted)]">
                      {c.sector_theme}
                    </div>
                  </td>
                  <td className="mono px-4 py-3.5 text-[var(--signal)]">{c.thesis_score?.toFixed(0)}</td>
                  <td className="px-4 py-3.5">
                    <RecBadge rec={c.recommendation} />
                  </td>
                  <td className="px-4 py-3.5 text-[var(--muted)]">{c.stage}</td>
                  <td className="px-4 py-3.5">{c.tier1_count}</td>
                  <td className="px-4 py-3.5 text-[var(--muted)]">{fmtMoneyM(c.last_round_size_m)}</td>
                  <td className="px-4 py-3.5 text-[var(--muted)]">{fmtPct(c.yoy_growth_pct)}</td>
                  <td className="px-4 py-3.5 text-[0.8125rem] text-[var(--muted)]">{c.relative_rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-[0.8125rem] text-[var(--muted)]">{filtered.length} companies</div>
    </div>
  );
}
