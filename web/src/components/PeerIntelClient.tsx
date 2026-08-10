"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PeerIntelligence } from "@/lib/peerIntel";
import { EmptyState, Eyebrow, Panel, PanelHead } from "@/components/ui";
import { cn } from "@/lib/utils";

type Tab = "radar" | "matrix" | "heatmap" | "activity";

export function PeerIntelClient({ intel }: { intel: PeerIntelligence }) {
  const [tab, setTab] = useState<Tab>("radar");
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState("all");
  const [driftOnly, setDriftOnly] = useState(false);

  const themes = useMemo(() => {
    const s = new Set<string>();
    for (const f of intel.firms) for (const t of f.top_themes) s.add(t.theme);
    return ["all", ...[...s].sort()];
  }, [intel.firms]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return intel.firms.filter((f) => {
      if (driftOnly && f.drift_score < 25 && f.thesis_shift_count === 0) return false;
      if (theme !== "all" && !f.top_themes.some((t) => t.theme === theme)) return false;
      if (!needle) return true;
      const blob = `${f.name} ${f.stated_focus} ${f.aliases.join(" ")} ${f.intel_summary}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [intel.firms, q, theme, driftOnly]);

  const cellMap = useMemo(() => {
    const m = new Map<string, { is_lead: boolean; on_thesis: boolean }>();
    for (const c of intel.matrix.cells) m.set(`${c.firm_slug}::${c.company_id}`, c);
    return m;
  }, [intel.matrix.cells]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[14rem] flex-1">
          <span className="label-caps">Search firms</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="a16z, Shield, robotics…"
            className="field mt-1.5"
          />
        </label>
        <label>
          <span className="label-caps">Theme</span>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="field mt-1.5 w-auto min-w-[10rem]"
          >
            {themes.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All themes" : t}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setDriftOnly((v) => !v)}
          className={cn(
            "rounded-[12px] border px-3.5 py-2.5 text-sm transition",
            driftOnly
              ? "border-[var(--warn)] bg-[var(--warn-dim)] text-[var(--warn)]"
              : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]",
          )}
        >
          Thesis drift only
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-[var(--line)] pb-3">
        {(
          [
            ["radar", "Firm radar"],
            ["matrix", "Investor × company"],
            ["heatmap", "Co-investor heatmap"],
            ["activity", "Activity feed"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-[10px] px-3.5 py-1.5 text-sm font-medium transition",
              tab === id
                ? "bg-[var(--signal-dim)] text-[var(--signal)]"
                : "text-[var(--muted)] hover:bg-white/[0.03] hover:text-[var(--text)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "radar" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 stagger">
          {filtered.slice(0, 36).map((f) => (
            <Link
              key={f.id}
              href={`/peers/${f.slug}`}
              className="panel panel-interactive group block p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="title text-[1.2rem] transition group-hover:text-[var(--signal)]">
                    {f.name}
                  </div>
                  <div className="mt-1 line-clamp-1 text-[0.8125rem] text-[var(--muted)]">
                    {f.stated_focus || "Focus not catalogued"}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="mono text-lg text-[var(--signal)]">{f.watch_priority.toFixed(0)}</div>
                  <div className="label-caps text-[var(--faint)]">watch</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <StatCell label="Deals" value={String(f.deal_count)} />
                <StatCell label="Drift" value={f.drift_score.toFixed(0)} warn={f.drift_score >= 30} />
                <StatCell
                  label="Shifts"
                  value={String(f.thesis_shift_count)}
                  warn={f.thesis_shift_count > 0}
                />
              </div>
              <p className="mt-4 line-clamp-3 text-[0.975rem] leading-relaxed text-[var(--muted)]">
                {f.intel_summary}
              </p>
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {f.top_themes.slice(0, 3).map((t) => (
                  <span key={t.theme} className="chip !px-2 !py-0.5">
                    {t.theme} · {t.count}
                  </span>
                ))}
              </div>
            </Link>
          ))}
          {!filtered.length && <EmptyState>No firms match these filters.</EmptyState>}
        </div>
      )}

      {tab === "matrix" && (
        <section className="panel overflow-auto !p-0">
          <PanelHead
            title="Investor × company matrix"
            description="Who is on which Hot / high-score deals. Lead = filled signal cell. Off-thesis = warn tint."
          />
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                <th className="sticky left-0 bg-[var(--panel)] px-4 py-2.5 font-medium">Firm</th>
                {intel.matrix.companies.map((c) => (
                  <th key={c.id} className="max-w-[4.5rem] truncate px-1 py-2.5 font-medium" title={c.name}>
                    <Link href={`/company/${c.slug || c.id}`} className="hover:text-[var(--deep)]">
                      {c.name.slice(0, 10)}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {intel.matrix.firms.map((f) => (
                <tr key={f.slug} className="border-b border-[var(--line)] last:border-0">
                  <td className="sticky left-0 bg-[var(--panel)] px-4 py-2.5">
                    <Link href={`/peers/${f.slug}`} className="font-medium hover:text-[var(--signal)]">
                      {f.name}
                    </Link>
                  </td>
                  {intel.matrix.companies.map((c) => {
                    const cell = cellMap.get(`${f.slug}::${c.id}`);
                    if (!cell) {
                      return (
                        <td key={c.id} className="px-1 py-2.5 text-center text-[var(--faint)]">
                          ·
                        </td>
                      );
                    }
                    return (
                      <td key={c.id} className="px-1 py-2.5 text-center">
                        <span
                          className={cn(
                            "inline-block h-3.5 w-3.5 rounded-sm",
                            cell.is_lead
                              ? "bg-[var(--signal)]"
                              : cell.on_thesis
                                ? "bg-[var(--deep)]"
                                : "bg-[var(--warn)]",
                          )}
                          title={`${f.name} × ${c.name}${cell.is_lead ? " (lead)" : ""}${!cell.on_thesis ? " (off-thesis)" : ""}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "heatmap" && (
        <section className="panel overflow-hidden !p-0">
          <PanelHead
            title="Co-investor heatmap"
            description="Pairs that repeatedly co-invest — syndicate building map for Thirdbase."
          />
          <div className="divide-y divide-[var(--line)]">
            {intel.heatmap.slice(0, 28).map((row) => (
              <div key={`${row.firm_a}-${row.firm_b}`} className="flex items-center gap-4 px-5 py-3.5">
                <div
                  className="mono flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-sm font-semibold"
                  style={{
                    background: `rgba(214,255,60,${Math.min(0.55, 0.1 + row.coinvest_count * 0.1)})`,
                    color: "#0b1a08",
                  }}
                >
                  {row.coinvest_count}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {row.firm_a} <span className="text-[var(--faint)]">×</span> {row.firm_b}
                  </div>
                  <div className="truncate text-[0.8125rem] text-[var(--muted)]">
                    {row.shared_themes.slice(0, 2).join(" · ") || "—"}
                    {row.last_shared_deal ? ` · last: ${row.last_shared_deal}` : ""}
                  </div>
                </div>
                <div className="mono shrink-0 text-[0.8125rem] text-[var(--deep)]">
                  syn {row.syndicate_score.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "activity" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="panel overflow-hidden !p-0">
            <PanelHead title="Recent peer activity" />
            <div className="divide-y divide-[var(--line)]">
              {[...intel.firms]
                .flatMap((f) =>
                  f.recent_activity.map((a) => ({
                    ...a,
                    firmSlug: f.slug,
                    firmName: f.name,
                  })),
                )
                .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                .slice(0, 24)
                .map((p, i) => (
                  <div
                    key={`${p.id || i}`}
                    className="flex items-start justify-between gap-3 px-5 py-3.5 text-sm"
                  >
                    <div>
                      <Link
                        href={`/peers/${p.firmSlug}`}
                        className="font-semibold transition hover:text-[var(--signal)]"
                      >
                        {p.firmName}
                      </Link>
                      <div className="mt-0.5 text-[var(--muted)]">
                        {p.company_name} · {p.round} · {p.theme}
                        {p.thesis_shift ? (
                          <span className="ml-2 text-[var(--warn)]">THESIS SHIFT</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mono shrink-0 text-[0.8125rem] text-[var(--faint)]">{p.date}</div>
                  </div>
                ))}
            </div>
          </section>
          <Panel>
            <Eyebrow>Sector bets</Eyebrow>
            <h2 className="title mt-2 text-[1.35rem]">Peer capital</h2>
            <div className="mt-5 space-y-3.5">
              {intel.sector_bets.map((s) => (
                <div key={s.theme}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span>{s.theme}</span>
                    <span className="mono text-[var(--signal)]">{s.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
                    <div
                      className="h-full rounded-full bg-[var(--deep)]"
                      style={{
                        width: `${Math.min(100, (100 * s.count) / (intel.sector_bets[0]?.count || 1))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-[10px] bg-[var(--panel-2)] px-2 py-2 ring-1 ring-[var(--line)]">
      <div className={cn("mono text-base", warn ? "text-[var(--warn)]" : "text-[var(--text)]")}>
        {value}
      </div>
      <div className="label-caps text-[var(--faint)]">{label}</div>
    </div>
  );
}
