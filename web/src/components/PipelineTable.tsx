"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Company } from "@/lib/types";
import { cn, fmtMoneyM, fmtPct, recClass } from "@/lib/utils";

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
          className="min-w-[220px] flex-1 rounded-full border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm outline-none focus:border-[var(--signal)]"
        />
        <select
          value={rec}
          onChange={(e) => setRec(e.target.value)}
          className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm"
        >
          {["All", "Deep Dive", "Watch", "Pass"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="max-w-[260px] rounded-full border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm"
        >
          {themes.map((x) => (
            <option key={String(x)}>{x}</option>
          ))}
        </select>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Rec</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Tier-1</th>
                <th className="px-4 py-3 font-medium">Round</th>
                <th className="px-4 py-3 font-medium">YoY</th>
                <th className="px-4 py-3 font-medium">Rank</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-[var(--line)] hover:bg-[rgba(20,28,40,0.65)]">
                  <td className="px-4 py-3">
                    <Link href={`/company/${c.id}`} className="font-semibold hover:text-[var(--signal)]">
                      {c.name}
                    </Link>
                    <div className="mt-0.5 max-w-[280px] truncate text-xs text-[var(--muted)]">
                      {c.sector_theme}
                    </div>
                  </td>
                  <td className="mono px-4 py-3 text-[var(--signal)]">{c.thesis_score?.toFixed(0)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", recClass(c.recommendation))}>
                      {c.recommendation}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{c.stage}</td>
                  <td className="px-4 py-3">{c.tier1_count}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{fmtMoneyM(c.last_round_size_m)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{fmtPct(c.yoy_growth_pct)}</td>
                  <td className="px-4 py-3 text-xs text-[var(--muted)]">{c.relative_rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-xs text-[var(--muted)]">{filtered.length} companies</div>
    </div>
  );
}
