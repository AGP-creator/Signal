"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BarChart,
  BenchmarkBars,
  DonutChart,
  HeatMatrix,
  SparkBars,
} from "@/components/charts";
import { CompanyLink, CompetitorLink } from "@/components/EntityLink";
import { Eyebrow, Panel, SegItem, Segmented } from "@/components/ui";
import { PartnerLogButton } from "@/components/PartnerLog";
import type { GoldenPack, GoldenInsight } from "@/lib/goldenInsights";
import type { PeerIntelligence } from "@/lib/peerIntel";
import { cn } from "@/lib/utils";

type Tab =
  | "insights"
  | "funds"
  | "shifts"
  | "syndicate"
  | "flows"
  | "battles"
  | "radar"
  | "matrix"
  | "heatmap";

const KIND_LABEL: Record<GoldenInsight["kind"], string> = {
  alpha: "Proprietary alpha",
  crowding: "Crowding",
  whitespace: "White space",
  syndicate: "Syndicate unlock",
  drift: "Thesis drift",
  race: "Competitive race",
  asymmetric: "Asymmetric signal",
  defend: "Battle card",
};

const URGENCY_CLASS = {
  now: "border-[var(--signal)] bg-[var(--signal-dim)]",
  this_week: "border-[var(--deep)] bg-[var(--deep-dim)]",
  monitor: "border-[var(--line)]",
};

const FRESH_CLASS = {
  new: "bg-[var(--signal-dim)] text-[var(--signal)]",
  recent: "bg-[var(--deep-dim)] text-[var(--deep)]",
  monitor: "border border-[var(--line)] text-[var(--muted)]",
};

function shortTheme(t: string) {
  const parts = t.split(/\s+/);
  if (parts.length <= 2) return t.length > 14 ? `${t.slice(0, 12)}…` : t;
  return parts
    .slice(0, 2)
    .map((p) => p.slice(0, 6))
    .join(" ");
}

function formatUsdM(n: number | null) {
  if (n == null) return "Undisclosed";
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  return `$${Math.round(n)}M`;
}

export function CompetitorOS({
  intel,
  pack,
}: {
  intel: PeerIntelligence;
  pack: GoldenPack;
}) {
  const [tab, setTab] = useState<Tab>("insights");
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState("all");
  const [driftOnly, setDriftOnly] = useState(false);
  const [copied, setCopied] = useState(false);
  const [heatSel, setHeatSel] = useState<{ i: number; j: number } | null>(null);

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

  const sectorSeries = useMemo(
    () =>
      intel.sector_bets.slice(0, 8).map((s) => ({
        label: shortTheme(s.theme),
        value: s.count,
      })),
    [intel.sector_bets],
  );

  const fundCapitalSeries = useMemo(
    () =>
      intel.fund_sector_bets.slice(0, 7).map((s) => ({
        label: shortTheme(s.theme),
        value: s.capital_m / 1000,
      })),
    [intel.fund_sector_bets],
  );

  const driftDonut = useMemo(() => {
    const elevated = intel.firms.filter((f) => f.drift_score >= 30 || f.thesis_shift_count > 0).length;
    const mild = intel.firms.filter(
      (f) => f.drift_score >= 15 && f.drift_score < 30 && f.thesis_shift_count === 0,
    ).length;
    const aligned = Math.max(0, intel.firms.length - elevated - mild);
    const total = Math.max(intel.firms.length, 1);
    return [
      { label: "Elevated drift", pct: Math.round((100 * elevated) / total), color: "var(--warn)" },
      { label: "Mild drift", pct: Math.round((100 * mild) / total), color: "var(--deep)" },
      { label: "On thesis", pct: Math.round((100 * aligned) / total), color: "var(--signal)" },
    ];
  }, [intel.firms]);

  const heatPair = useMemo(() => {
    if (!heatSel) return null;
    const { i, j } = heatSel;
    const a = intel.coinvest_matrix.firms[i];
    const b = intel.coinvest_matrix.firms[j];
    if (!a || !b) return null;
    const count = intel.coinvest_matrix.cells[i]?.[j] || 0;
    const dossierA = intel.firms.find((f) => f.slug === a.slug);
    const dossierB = intel.firms.find((f) => f.slug === b.slug);
    const namesA = new Set(
      [a.name, ...(dossierA?.aliases || [])].map((n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "")),
    );
    const namesB = new Set(
      [b.name, ...(dossierB?.aliases || [])].map((n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "")),
    );
    const matches = (raw: string, set: Set<string>) => {
      const n = raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
      if (set.has(n)) return true;
      for (const x of set) if (x && (n.includes(x) || x.includes(n))) return true;
      return false;
    };
    const row =
      intel.heatmap.find(
        (h) =>
          (matches(h.firm_a, namesA) && matches(h.firm_b, namesB)) ||
          (matches(h.firm_a, namesB) && matches(h.firm_b, namesA)),
      ) || null;
    return { a, b, count, row };
  }, [heatSel, intel.coinvest_matrix, intel.heatmap, intel.firms]);

  const topPairBars = useMemo(
    () =>
      intel.heatmap.slice(0, 8).map((r) => ({
        label: `${r.firm_a.split(" ")[0]}×${r.firm_b.split(" ")[0]}`,
        value: r.coinvest_count,
      })),
    [intel.heatmap],
  );

  async function copyBrief() {
    const text = [
      pack.weekly_brief.subject,
      "",
      pack.weekly_brief.headline,
      "",
      ...pack.weekly_brief.paragraphs,
      "",
      "MUST DO",
      ...pack.weekly_brief.must_do.map((m) => `• ${m}`),
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div className="min-w-0">
          <Eyebrow live className="!text-[var(--signal)]">This week</Eyebrow>
          <h2 className="title mt-2 text-[1.25rem] md:text-[1.4rem]">{pack.weekly_brief.headline}</h2>
        </div>
        <button type="button" onClick={copyBrief} className="btn btn-soft btn-sm shrink-0">
          {copied ? "Copied" : "Copy brief"}
        </button>
      </div>

      {!!pack.proprietary_deals.length && (
        <section className="stagger grid gap-3 md:grid-cols-3">
          {pack.proprietary_deals.slice(0, 3).map((d) => (
            <Link
              key={d.id}
              href={`/company/${d.slug || d.id}`}
              className="panel panel-interactive block p-4"
            >
              <div className="label-caps text-[var(--signal)]">Proprietary window</div>
              <div className="title mt-2 text-[1.2rem]">{d.name}</div>
              <div className="mono mt-1 text-sm text-[var(--deep)]">
                score {d.thesis_score?.toFixed(0)}
              </div>
              <p className="mt-2 text-[0.8125rem] text-[var(--muted)]">{d.note}</p>
            </Link>
          ))}
        </section>
      )}

      <Segmented aria-label="Competitor views" className="seg-scroll">
        {(
          [
            ["insights", "Golden insights"],
            ["funds", "New funds"],
            ["shifts", "Thesis shifts"],
            ["syndicate", "Syndicate plays"],
            ["flows", "Sector bets"],
            ["battles", "Battle cards"],
            ["radar", "Firm radar"],
            ["matrix", "Matrix"],
            ["heatmap", "Heatmap"],
          ] as const
        ).map(([id, label]) => (
          <SegItem key={id} active={tab === id} onClick={() => setTab(id)}>
            {label}
          </SegItem>
        ))}
      </Segmented>

      {tab === "insights" && (
        <div className="stagger space-y-3">
          {pack.insights.map((insight) => (
            <article
              key={insight.id}
              className={cn(
                "insight-card panel border p-5 md:p-6",
                URGENCY_CLASS[insight.urgency],
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="insight-kind">{KIND_LABEL[insight.kind]}</span>
                <span
                  className={cn(
                    "label-caps !text-[0.6rem]",
                    insight.urgency === "now"
                      ? "!text-[var(--signal)]"
                      : insight.urgency === "this_week"
                        ? "!text-[var(--deep)]"
                        : "!text-[var(--muted)]",
                  )}
                >
                  {insight.urgency.replace("_", " ")}
                </span>
                <span className="mono ml-auto text-[0.8125rem] text-[var(--faint)]">
                  {insight.score.toFixed(0)}
                </span>
              </div>
              <h3 className="title mt-2.5 text-[1.25rem] md:text-[1.35rem]">{insight.title}</h3>
              <p className="mt-2.5 max-w-3xl text-[0.9375rem] leading-relaxed text-[var(--muted)]">
                {insight.insight}
              </p>
              <p className="insight-action mt-4 text-[0.875rem] leading-snug">{insight.action}</p>
              {!!insight.evidence?.length && (
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem] text-[var(--faint)]">
                  {insight.evidence.filter(Boolean).map((e) => (
                    <li key={e} className="flex gap-1.5">
                      <span className="text-[var(--signal)]/60">▸</span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              )}
              {!!insight.hrefs?.length && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {insight.hrefs.map((h) => (
                    <Link key={h.href + h.label} href={h.href} className="chip">
                      {h.label}
                    </Link>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {tab === "funds" && (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <Panel>
              <Eyebrow className="!text-[var(--signal)]">Capital formation</Eyebrow>
              <h2 className="title mt-2 text-[1.35rem]">New fund announcements</h2>
              <p className="mt-1 text-[0.9375rem] text-[var(--muted)]">
                Peer vehicles and sector sleeves — dry powder that reshapes who shows up in your
                races.
              </p>
              <div className="mt-5 divide-y divide-[var(--line)]">
                {intel.fund_announcements.map((f) => (
                  <div key={f.id} className="flex flex-wrap items-start gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/competitors/${f.firm_slug}`}
                          className="title text-[1.05rem] hover:text-[var(--signal)]"
                        >
                          {f.firm}
                        </Link>
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
                            FRESH_CLASS[f.freshness],
                          )}
                        >
                          {f.freshness}
                        </span>
                      </div>
                      <div className="mt-1 font-medium text-[var(--text)]">{f.vehicle}</div>
                      <div className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                        {f.sector_focus}
                        {f.stage_focus ? ` · ${f.stage_focus}` : ""}
                      </div>
                      <p className="mt-2 text-[0.875rem] text-[var(--muted)]">{f.notes}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="mono text-lg text-[var(--deep)]">{formatUsdM(f.size_m)}</div>
                      <div className="mt-1 text-[0.75rem] text-[var(--faint)]">{f.announced_date}</div>
                      {f.source && (
                        <div className="mt-1 text-[0.7rem] uppercase tracking-wide text-[var(--faint)]">
                          {f.source}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <div className="space-y-4">
              <Panel>
                <h3 className="title text-[1.15rem]">Fund capital by sector bet</h3>
                <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                  Reported vehicle size ($B) tagged to focus sectors.
                </p>
                <BarChart
                  className="mt-4"
                  series={fundCapitalSeries}
                  height={200}
                  color="var(--deep)"
                  formatValue={(v) => `$${v.toFixed(1)}B`}
                />
              </Panel>
              <Panel>
                <h3 className="title text-[1.15rem]">Freshness mix</h3>
                <DonutChart
                  className="mt-4"
                  size={140}
                  centerLabel="funds"
                  centerValue={String(intel.fund_announcements.length)}
                  slices={(() => {
                    const total = Math.max(intel.fund_announcements.length, 1);
                    const neu = intel.fund_announcements.filter((f) => f.freshness === "new").length;
                    const rec = intel.fund_announcements.filter((f) => f.freshness === "recent").length;
                    const mon = total - neu - rec;
                    return [
                      { label: "New", pct: Math.round((100 * neu) / total), color: "var(--signal)" },
                      { label: "Recent", pct: Math.round((100 * rec) / total), color: "var(--deep)" },
                      { label: "Monitor", pct: Math.round((100 * mon) / total), color: "var(--faint)" },
                    ];
                  })()}
                />
              </Panel>
            </div>
          </div>
        </div>
      )}

      {tab === "shifts" && (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <Panel>
              <h2 className="title text-[1.25rem]">Peer thesis posture</h2>
              <p className="mt-1 text-[0.875rem] text-[var(--muted)]">
                Drift vs stated focus across the active peer set.
              </p>
              <DonutChart
                className="mt-5"
                slices={driftDonut}
                centerLabel="firms"
                centerValue={String(intel.firms.length)}
              />
            </Panel>
            <Panel>
              <h2 className="title text-[1.25rem]">Highest drift firms</h2>
              <BenchmarkBars
                className="mt-5"
                rows={[...intel.firms]
                  .filter((f) => f.drift_score >= 15 || f.thesis_shift_count > 0)
                  .sort((a, b) => b.drift_score - a.drift_score)
                  .slice(0, 8)
                  .map((f) => ({
                    label: f.name,
                    value: f.drift_score,
                    max: 100,
                    format: `${f.drift_score.toFixed(0)} · ${f.thesis_shift_count} flag(s)`,
                    good: f.drift_score < 30,
                  }))}
              />
            </Panel>
          </div>

          <Panel className="!p-0 overflow-hidden">
            <div className="border-b border-[var(--line)] px-5 py-4">
              <h2 className="title text-[1.35rem]">Flagged thesis shifts</h2>
              <p className="mt-1 text-[0.9375rem] text-[var(--muted)]">
                Explicit off-focus bets — investigate why the firm stretched, and whether it opens a
                syndicate or competitive wedge.
              </p>
            </div>
            <div className="divide-y divide-[var(--line)]">
              {intel.thesis_shifts.map((s) => (
                <div key={s.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--warn-dim)]">
                    <span className="mono text-sm font-semibold text-[var(--warn)]">!</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CompetitorLink name={s.firm} className="font-semibold" />
                      <span className="text-[var(--faint)]">→</span>
                      {s.company_id ? (
                        <CompanyLink
                          id={s.company_id}
                          name={s.company_name || "Company"}
                          className="text-[var(--signal)]"
                        />
                      ) : (
                        <span>{s.company_name}</span>
                      )}
                      <span className="rounded-md bg-[var(--warn-dim)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--warn)]">
                        Off thesis
                      </span>
                    </div>
                    <div className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                      {s.theme} · {s.round} · {s.date || "—"}
                    </div>
                    <p className="mt-2 text-[0.9375rem] text-[var(--muted)]">{s.notes}</p>
                  </div>
                </div>
              ))}
              {!intel.thesis_shifts.length && (
                <p className="px-5 py-8 text-[0.9375rem] text-[var(--muted)]">
                  No explicit thesis-shift flags in the current peer feed.
                </p>
              )}
            </div>
          </Panel>
        </div>
      )}

      {tab === "syndicate" && (
        <div className="space-y-4">
          <p className="text-[0.9375rem] text-[var(--muted)]">
            For every Deep Dive: who is already in, how crowded the tape is, and who Thirdbase should
            call next based on co-invest patterns + theme fit.
          </p>
          {pack.syndicate_plays.map((play) => (
            <div key={play.company_id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/company/${play.slug || play.company_id}`}
                    className="title text-[1.35rem] hover:text-[var(--signal)]"
                  >
                    {play.company_name}
                  </Link>
                  <div className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                    score {play.thesis_score?.toFixed(0)} · crowding{" "}
                    <span className="text-[var(--warn)]">{play.crowding}</span>
                  </div>
                </div>
                <div className="max-w-sm text-right text-[0.8125rem] text-[var(--muted)]">
                  {play.edge_note}
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="label-caps">Already on tape</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {play.already_in.map((inv) => (
                      <span key={inv} className="chip">
                        {inv}
                      </span>
                    ))}
                    {!play.already_in.length && (
                      <span className="text-[0.8125rem] text-[var(--signal)]">
                        Quiet — proprietary window
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="label-caps">Call list</div>
                  <div className="mt-2 space-y-2">
                    {play.call_list.slice(0, 4).map((c) => (
                      <Link
                        key={c.slug}
                        href={`/competitors/${c.slug}`}
                        className="block rounded-lg border border-[var(--line)] px-3 py-2 text-sm hover:border-[var(--signal)]"
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-medium">{c.firm}</span>
                          <span className="mono text-[var(--deep)]">{c.fit_score}</span>
                        </div>
                        <div className="text-[0.8125rem] text-[var(--muted)]">{c.reason}</div>
                      </Link>
                    ))}
                    {!play.call_list.length && (
                      <p className="text-[0.8125rem] text-[var(--muted)]">
                        No clear syndicate unlock yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "flows" && (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <h2 className="title text-[1.25rem]">Peer capital concentration</h2>
              <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                Themes with the most peer firm appearances across the pipeline.
              </p>
              <BarChart className="mt-4" series={sectorSeries} height={200} color="var(--signal)" />
            </Panel>
            <Panel>
              <h2 className="title text-[1.25rem]">Fund sleeves by theme</h2>
              <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                New vehicle capital ($B) pointing at sector bets.
              </p>
              <BarChart
                className="mt-4"
                series={fundCapitalSeries}
                height={200}
                color="var(--deep)"
                formatValue={(v) => `$${v.toFixed(1)}B`}
              />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {pack.theme_flows.map((flow) => (
              <div key={flow.theme} className="panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="title text-[1.2rem]">{flow.theme}</h3>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide",
                      flow.posture === "whitespace"
                        ? "bg-[var(--signal-dim)] text-[var(--signal)]"
                        : flow.posture === "flood"
                          ? "bg-[var(--warn-dim)] text-[var(--warn)]"
                          : flow.posture === "contested"
                            ? "bg-[var(--deep-dim)] text-[var(--deep)]"
                            : "border border-[var(--line)] text-[var(--muted)]",
                    )}
                  >
                    {flow.posture}
                  </span>
                </div>
                <div className="mt-4">
                  <SparkBars
                    values={[flow.peer_deals, flow.thirdbase_deals, flow.thirdbase_deep_dives]}
                  />
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-[var(--muted)]">
                    <span>Peers {flow.peer_deals}</span>
                    <span>Ours {flow.thirdbase_deals}</span>
                    <span>DD {flow.thirdbase_deep_dives}</span>
                  </div>
                </div>
                <p className="mt-4 text-[0.9375rem] text-[var(--muted)]">{flow.counsel}</p>
                <div className="mt-3 text-[0.8125rem] text-[var(--faint)]">
                  Peers: {flow.peer_firms.join(" · ") || "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "battles" && (
        <div className="grid gap-4 md:grid-cols-2">
          {pack.battle_cards.map((card) => (
            <Link
              key={card.slug}
              href={`/competitors/${card.slug}`}
              className="panel panel-interactive block p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="title text-[1.35rem]">{card.name}</h3>
                  <div className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                    {card.stated_focus || "—"}
                  </div>
                </div>
                <div className="mono text-sm text-[var(--signal)]">
                  {card.watch_priority.toFixed(0)}
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <Block label="How they win" body={card.how_they_win} />
                <Block label="Where they're weak" body={card.where_they_are_weak} />
                <Block label="Partner or compete" body={card.partner_or_compete} />
                <Block label="Call when" body={card.call_when} />
              </div>
              {!!card.top_deals.length && (
                <div className="mt-4 text-[0.8125rem] text-[var(--faint)]">
                  Overlap: {card.top_deals.filter(Boolean).join(" · ")}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {(tab === "radar" || tab === "matrix" || tab === "heatmap") && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[14rem] flex-1">
            <span className="label-caps">Search firms</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="a16z, Shield, robotics…"
              className="field mt-1"
            />
          </label>
          <label>
            <span className="label-caps">Theme</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} className="field mt-1">
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
              "rounded-xl border px-3 py-2 text-sm",
              driftOnly
                ? "border-[var(--warn)] bg-[var(--warn-dim)] text-[var(--warn)]"
                : "border-[var(--line)] text-[var(--muted)]",
            )}
          >
            Thesis drift only
          </button>
          <Link href="/firms" className="link-quiet self-end pb-2 text-sm">
            Full watchlist →
          </Link>
        </div>
      )}

      {tab === "radar" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, 36).map((f) => (
            <Link
              key={f.id}
              href={`/competitors/${f.slug}`}
              className="panel panel-interactive group block p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="title text-[1.2rem] group-hover:text-[var(--signal)]">{f.name}</div>
                  <div className="mt-1 line-clamp-1 text-[0.8125rem] text-[var(--muted)]">
                    {f.stated_focus || "Focus not catalogued"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="mono text-lg text-[var(--signal)]">{f.watch_priority.toFixed(0)}</div>
                  <div className="label-caps text-[var(--faint)]">watch</div>
                </div>
              </div>
              <div className="mt-3">
                <SparkBars
                  values={[
                    f.deal_count,
                    f.lead_count,
                    Math.round(f.drift_score / 10),
                    f.thesis_shift_count * 2,
                  ]}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <MiniStat label="Deals" value={String(f.deal_count)} />
                <MiniStat label="Drift" value={f.drift_score.toFixed(0)} warn={f.drift_score >= 30} />
                <MiniStat
                  label="Shifts"
                  value={String(f.thesis_shift_count)}
                  warn={f.thesis_shift_count > 0}
                />
              </div>
              <p className="mt-4 line-clamp-3 text-[0.9375rem] text-[var(--muted)]">{f.intel_summary}</p>
            </Link>
          ))}
        </div>
      )}

      {tab === "matrix" && (
        <div className="panel overflow-auto">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="title text-[1.35rem]">Investor × company matrix</h2>
            <p className="mt-1 text-[0.9375rem] text-[var(--muted)]">
              Lead = signal cell · On-thesis = deep · Off-thesis = warn
            </p>
          </div>
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                <th className="sticky left-0 bg-[var(--panel)] px-3 py-2 font-medium">Firm</th>
                {intel.matrix.companies.map((c) => (
                  <th
                    key={c.id}
                    className="max-w-[4.5rem] truncate px-1 py-2 font-medium"
                    title={c.name}
                  >
                    <Link href={`/company/${c.slug || c.id}`} className="hover:text-[var(--deep)]">
                      {c.name.slice(0, 10)}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {intel.matrix.firms.map((f) => (
                <tr key={f.slug} className="border-b border-[var(--line)]">
                  <td className="sticky left-0 bg-[var(--panel)] px-3 py-2">
                    <Link href={`/competitors/${f.slug}`} className="font-medium hover:text-[var(--signal)]">
                      {f.name}
                    </Link>
                  </td>
                  {intel.matrix.companies.map((c) => {
                    const cell = cellMap.get(`${f.slug}::${c.id}`);
                    if (!cell) {
                      return (
                        <td key={c.id} className="px-1 py-2 text-center text-[var(--faint)]">
                          ·
                        </td>
                      );
                    }
                    return (
                      <td key={c.id} className="px-1 py-2 text-center">
                        <span
                          className={cn(
                            "inline-block h-3.5 w-3.5 rounded-sm",
                            cell.is_lead
                              ? "bg-[var(--signal)]"
                              : cell.on_thesis
                                ? "bg-[var(--deep)]"
                                : "bg-[var(--warn)]",
                          )}
                          title={`${f.name} × ${c.name}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "heatmap" && (
        <div className="space-y-5">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="title text-[1.35rem]">Co-investor heatmap</h2>
                <p className="mt-1 max-w-2xl text-[0.9375rem] text-[var(--muted)]">
                  Firm × firm syndicate map — darker cells mean more shared deals. Click a cell to
                  inspect the pair for syndicate building.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[0.75rem] text-[var(--muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ background: "var(--signal)", opacity: 0.2 }}
                  />
                  Rare
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ background: "var(--signal)", opacity: 0.85 }}
                  />
                  Frequent
                </span>
              </div>
            </div>
            <HeatMatrix
              className="mt-6"
              labels={intel.coinvest_matrix.firms.map((f) => f.name)}
              cells={intel.coinvest_matrix.cells}
              max={intel.coinvest_matrix.max}
              selected={heatSel}
              onSelect={(i, j) => setHeatSel({ i, j })}
            />
            {heatPair && (
              <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--signal)]/30 bg-[var(--signal-dim)] p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="title text-[1.15rem]">
                    <Link href={`/competitors/${heatPair.a.slug}`} className="hover:text-[var(--signal)]">
                      {heatPair.a.name}
                    </Link>
                    <span className="mx-2 text-[var(--faint)]">×</span>
                    <Link href={`/competitors/${heatPair.b.slug}`} className="hover:text-[var(--signal)]">
                      {heatPair.b.name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <PartnerLogButton
                      targetType="competitor"
                      targetId={[heatPair.a.slug, heatPair.b.slug].sort().join("__")}
                      targetLabel={`${heatPair.a.name} × ${heatPair.b.name}`}
                    />
                    <div className="mono text-[var(--deep)]">{heatPair.count} shared</div>
                  </div>
                </div>
                {heatPair.row ? (
                  <>
                    <div className="mt-2 text-[0.875rem] text-[var(--muted)]">
                      Themes: {heatPair.row.shared_themes.join(" · ") || "—"}
                      {heatPair.row.last_shared_deal
                        ? ` · Last: ${heatPair.row.last_shared_deal}`
                        : ""}
                    </div>
                    {!!heatPair.row.shared_deals.length && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {heatPair.row.shared_deals.map((d) => (
                          <span key={d} className="chip">
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mono mt-3 text-[0.8125rem] text-[var(--signal)]">
                      Syndicate score {heatPair.row.syndicate_score.toFixed(0)}
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-[0.875rem] text-[var(--muted)]">
                    Shared on {heatPair.count} pipeline name(s).
                  </p>
                )}
              </div>
            )}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <Panel>
              <h3 className="title text-[1.15rem]">Strongest pairs</h3>
              <BarChart className="mt-4" series={topPairBars} height={190} color="var(--deep)" />
            </Panel>
            <Panel className="!p-0 overflow-hidden">
              <div className="border-b border-[var(--line)] px-5 py-4">
                <h3 className="title text-[1.15rem]">Ranked syndicate pairs</h3>
              </div>
              <div className="divide-y divide-[var(--line)]">
                {intel.heatmap.slice(0, 12).map((row) => (
                  <div key={`${row.firm_a}-${row.firm_b}`} className="flex items-center gap-4 px-5 py-3">
                    <div
                      className="mono flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
                      style={{
                        background: `color-mix(in srgb, var(--signal) ${Math.min(70, 18 + row.coinvest_count * 14)}%, transparent)`,
                        color: "var(--text)",
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
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="label-caps text-[var(--faint)]">{label}</div>
      <p className="mt-1 text-[var(--text)]/90">{body}</p>
    </div>
  );
}

function MiniStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-[var(--panel-2)] px-2 py-2">
      <div className={cn("mono text-base", warn ? "text-[var(--warn)]" : "text-[var(--text)]")}>
        {value}
      </div>
      <div className="label-caps text-[var(--faint)]">{label}</div>
    </div>
  );
}
