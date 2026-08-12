"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { BarChart, DonutChart, HeatMatrix } from "@/components/charts";
import { DealCard } from "@/components/DealCard";
import { DigestSendButton } from "@/components/DigestSendButton";
import { ExternalLink } from "@/components/ExternalLink";
import { CompanyLink, CompetitorLink } from "@/components/EntityLink";
import { PipelineTable } from "@/components/PipelineTable";
import { StaleQueueTable } from "@/components/StaleQueueTable";
import {
  EmptyState,
  Eyebrow,
  Panel,
  RecBadge,
  SegItem,
  Segmented,
  ToneBadge,
} from "@/components/ui";
import { cleanProse } from "@/lib/digestFormat";
import type { GoldenPack } from "@/lib/goldenInsights";
import type { JudgmentPack } from "@/lib/judgment";
import type { PeerIntelligence } from "@/lib/peerIntel";
import type {
  Commentary,
  Company,
  DigestRow,
  NewsItem,
  PeerActivity,
  SectorCall,
} from "@/lib/types";
import { cn, fmtWhen } from "@/lib/utils";
import {
  hotDeals,
  isWorkbookTab,
  nextDigestSlot,
  staleCompanies,
  watchlistCompanies,
  workbookHygiene,
  WORKBOOK_TABS,
  type WorkbookTabId,
} from "@/lib/workbook";

export function WorkbookDesk({
  companies,
  sectors,
  peers,
  news,
  commentary,
  digest,
  lastRefreshed,
  intel,
  golden,
  judgment,
  initialTab = "pipeline",
}: {
  companies: Company[];
  sectors: SectorCall[];
  peers: PeerActivity[];
  news: NewsItem[];
  commentary: Commentary[];
  digest: DigestRow | null;
  lastRefreshed: string;
  intel: PeerIntelligence;
  golden: GoldenPack;
  judgment: JudgmentPack;
  initialTab?: string;
}) {
  const [tab, setTab] = useState<WorkbookTabId>(
    isWorkbookTab(initialTab) ? initialTab : "pipeline",
  );
  const [heatSel, setHeatSel] = useState<{ i: number; j: number } | null>(null);

  const hygiene = useMemo(
    () => workbookHygiene(companies, peers, sectors),
    [companies, peers, sectors],
  );
  const hot = useMemo(() => hotDeals(companies).slice(0, 8), [companies]);
  const watch = useMemo(() => watchlistCompanies(companies), [companies]);
  const stale = useMemo(() => staleCompanies(companies), [companies]);
  const digestNext = nextDigestSlot();

  const scoreBands = useMemo(() => {
    const bands = [
      { label: "90+", min: 90, max: 101 },
      { label: "80–89", min: 80, max: 90 },
      { label: "70–79", min: 70, max: 80 },
      { label: "<70", min: 0, max: 70 },
    ];
    return bands.map((b) => ({
      label: b.label,
      value: companies.filter((c) => {
        const s = c.thesis_score ?? 0;
        return s >= b.min && s < b.max;
      }).length,
    }));
  }, [companies]);

  const recSlices = useMemo(() => {
    const total = companies.length || 1;
    return (
      [
        { label: "Deep Dive", color: "var(--signal)", n: hygiene.deep },
        { label: "Watch", color: "var(--warn)", n: hygiene.watch },
        { label: "Pass", color: "var(--faint)", n: hygiene.pass },
      ] as const
    )
      .filter((s) => s.n > 0)
      .map((s) => ({ ...s, pct: Math.round((100 * s.n) / total) }));
  }, [companies.length, hygiene]);

  const sectorBars = useMemo(
    () =>
      sectors.slice(0, 8).map((s) => ({
        label: (s.subsector || "").length > 14 ? `${(s.subsector || "").slice(0, 12)}…` : s.subsector || "—",
        value: Math.round(s.heat_score ?? 0),
      })),
    [sectors],
  );

  const heatPair = useMemo(() => {
    if (!heatSel) return null;
    const { i, j } = heatSel;
    const a = intel.coinvest_matrix.firms[i];
    const b = intel.coinvest_matrix.firms[j];
    if (!a || !b) return null;
    const count = intel.coinvest_matrix.cells[i]?.[j] || 0;
    const row = intel.heatmap.find(
      (h) =>
        (h.firm_a === a.name && h.firm_b === b.name) ||
        (h.firm_a === b.name && h.firm_b === a.name),
    );
    return { a: a.name, b: b.name, count, row };
  }, [heatSel, intel]);

  function selectTab(id: WorkbookTabId) {
    setTab(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState({}, "", url.toString());
  }

  return (
    <div className="space-y-6">
      {/* Living loop status */}
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Panel className="!p-5 md:!p-6">
          <div>
            <Eyebrow live>Self-maintaining</Eyebrow>
            <h2 className="title mt-2 text-[1.25rem]">Rolling hygiene</h2>
            <p className="mt-2 max-w-lg text-[0.875rem] leading-relaxed text-[var(--muted)]">
              Adds new companies, updates existing entries, flags stale for partner review (never
              silent-delete), and re-scores against thesis on every refresh — no manual rebuild.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Book", value: hygiene.total },
              { label: "Hot Deals", value: hygiene.hot },
              { label: "14d signals", value: hygiene.recentSignal },
              { label: "Stale queue", value: hygiene.stale },
            ].map((m) => (
              <div key={m.label} className="rounded-[var(--radius)] bg-[var(--panel-2)]/55 px-3 py-3">
                <div className="mono text-[1.35rem] leading-none text-[var(--signal)]">{m.value}</div>
                <div className="stat-label !mt-1.5">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.75rem] text-[var(--faint)]">
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3" strokeWidth={1.75} />
              Refreshed {lastRefreshed ? fmtWhen(lastRefreshed) : "—"}
            </span>
            <span>
              Mix {hygiene.deep}/{hygiene.watch}/{hygiene.pass} Deep·Watch·Pass
            </span>
            <span>{hygiene.peerShifts} thesis shifts</span>
            <span>{hygiene.sectorHeat} hot sectors</span>
          </div>
        </Panel>

        <Panel className="!p-5 md:!p-6">
          <Eyebrow>Partner email</Eyebrow>
          <h2 className="title mt-2 text-[1.25rem]">Mon / Wed / Fri</h2>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--muted)]">
            Highest-priority deals only — hard-capped so partners don&apos;t drown. Instant alerts
            still fire for special situations between digests.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <div className="label-caps">Next slot</div>
              <div className="mt-1 title text-[1.1rem]">{digestNext.label}</div>
            </div>
            <div>
              <div className="label-caps">Last digest deals</div>
              <div className="mono mt-1 text-[1.1rem] text-[var(--signal)]">
                {digest?.payload?.deals?.length ?? "—"}
              </div>
            </div>
            {digest?.subject ? (
              <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                <div className="label-caps">Subject</div>
                <div
                  className="mt-1 text-[0.8125rem] leading-snug text-[var(--muted)] sm:line-clamp-2"
                  title={digest.subject}
                >
                  {digest.subject}
                </div>
              </div>
            ) : null}
          </div>
          <div className="mt-3">
            <DigestSendButton />
          </div>
        </Panel>
      </div>

      {/* Excel-matching tabs */}
      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <Eyebrow>Thirdbase_Deal_Pipeline.xlsx</Eyebrow>
          <span className="text-[0.7rem] text-[var(--faint)]">
            Core tabs + Signal extracts · Download or Rebuild Excel
          </span>
        </div>
        <Segmented aria-label="Workbook tabs" className="seg-scroll">
          {WORKBOOK_TABS.map((t) => (
            <SegItem key={t.id} active={tab === t.id} onClick={() => selectTab(t.id)} className="shrink-0">
              {t.label}
              {t.id === "hot" && hygiene.hot ? (
                <span className="ml-1.5 mono text-[0.65rem] opacity-70">{hygiene.hot}</span>
              ) : null}
              {t.id === "stale" && hygiene.stale ? (
                <span className="ml-1.5 mono text-[0.65rem] opacity-70">{hygiene.stale}</span>
              ) : null}
            </SegItem>
          ))}
        </Segmented>
      </div>

      {tab === "pipeline" && (
        <div className="space-y-5 animate-in">
          <div className="grid gap-3 sm:grid-cols-3">
            <Panel className="!p-4">
              <div className="label-caps">Recommendation</div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <DonutChart
                  size={88}
                  centerLabel=""
                  centerValue={String(companies.length)}
                  slices={recSlices}
                />
                <div className="space-y-1 text-[0.75rem] text-[var(--muted)]">
                  {recSlices.map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: s.color }}
                      />
                      {s.label} · {s.n}
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
            <Panel className="!p-4">
              <div className="label-caps">Thesis score bands</div>
              <BarChart height={96} className="mt-2" series={scoreBands} color="var(--signal)" />
            </Panel>
            <Panel className="!p-4">
              <div className="label-caps">Pipeline job</div>
              <p className="mt-3 text-[0.875rem] leading-relaxed text-[var(--muted)]">
                Full scored book: why now, thesis score, relative rank, recommendation — the shared
                object of argument regenerated on every refresh.
              </p>
              <Link href="/pipeline" className="link-quiet mt-3 inline-block text-[0.8125rem] font-semibold">
                Open filterable table →
              </Link>
            </Panel>
          </div>
          <PipelineTable companies={companies} />
        </div>
      )}

      {tab === "hot" && (
        <div className="space-y-4 animate-in">
          <Panel className="!p-5">
            <h2 className="title text-[1.2rem]">Hot Deals</h2>
            <p className="mt-1.5 text-[0.875rem] text-[var(--muted)]">
              Last ~30 days, high conviction only — drives the M/W/F email. If this list is long,
              Signal failed.
            </p>
          </Panel>
          {hot.length ? (
            <div className="space-y-2">
              {hot.map((c, i) => (
                <DealCard key={c.id} company={c} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState>
              No hot deals in the 30-day window — refresh pipeline or check Watchlist.
            </EmptyState>
          )}
        </div>
      )}

      {tab === "watchlist" && (
        <div className="space-y-4 animate-in">
          <Panel padded={false} className="overflow-hidden">
            <div className="border-b border-[var(--line)] px-5 py-4">
              <h2 className="title text-[1.15rem]">Watchlist</h2>
              <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                Scoring Watch / early-stage book — not your personal likes. Like → stack-rank lives
                on{" "}
                <Link href="/interest" className="text-[var(--signal)] hover:underline">
                  Interest Desk
                </Link>
                .
              </p>
            </div>
            <div className="divide-y divide-[var(--line)]">
              {watch.map((c) => (
                <Link
                  key={c.id}
                  href={`/company/${c.slug || c.id}`}
                  className="flex items-start justify-between gap-4 px-5 py-3.5 transition hover:bg-[var(--panel-2)]/40"
                >
                  <div className="min-w-0">
                    <div className="font-semibold">{c.name}</div>
                    <div className="mt-0.5 truncate text-[0.8125rem] text-[var(--muted)]">
                      {[c.stage, c.sector_theme, c.lead_investor].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <RecBadge rec={c.recommendation} />
                    <span className="mono text-[0.9rem] text-[var(--signal)]">
                      {c.thesis_score?.toFixed(0) ?? "—"}
                    </span>
                  </div>
                </Link>
              ))}
              {!watch.length ? (
                <p className="px-5 py-8 text-[0.875rem] text-[var(--muted)]">No watchlist names.</p>
              ) : null}
            </div>
          </Panel>
        </div>
      )}

      {tab === "sectors" && (
        <div className="space-y-4 animate-in">
          <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
            <Panel className="!p-5">
              <h2 className="title text-[1.15rem]">Sector of Tomorrow</h2>
              <p className="mt-1.5 text-[0.8125rem] text-[var(--muted)]">
                Emerging / contrarian subsectors with evidence — not consensus chase.
              </p>
              <BarChart height={180} className="mt-4" series={sectorBars} color="var(--deep)" />
            </Panel>
            <div className="space-y-3">
              {sectors.slice(0, 6).map((s) => (
                <article key={s.id || s.subsector} className="panel !p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="title text-[1.05rem]">{s.subsector}</h3>
                      <div className="mt-1 text-[0.75rem] text-[var(--faint)]">
                        {s.parent_theme} · {s.consensus_level}
                      </div>
                    </div>
                    <div className="mono text-[1.15rem] text-[var(--deep)]">
                      {Math.round(s.heat_score ?? 0)}
                    </div>
                  </div>
                  <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--muted)]">
                    {cleanProse(s.why_thirdbase_cares)}
                  </p>
                  {(s.top_companies || []).length ? (
                    <div className="mt-2 text-[0.75rem] text-[var(--faint)]">
                      {(s.top_companies || []).slice(0, 4).join(" · ")}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
          <Link href="/sectors" className="link-quiet text-[0.8125rem] font-semibold">
            Open full sector scanner →
          </Link>
        </div>
      )}

      {tab === "peers" && (
        <div className="space-y-4 animate-in">
          <Panel className="!p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="title text-[1.15rem]">Peer Set Activity</h2>
                <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                  What peer firms are doing — filter by theme, stage, date in Excel.
                </p>
              </div>
              <ToneBadge tone={hygiene.peerShifts ? "now" : "monitor"}>
                {hygiene.peerShifts} thesis shifts
              </ToneBadge>
            </div>
          </Panel>
          <Panel padded={false} className="overflow-hidden">
            <div className="divide-y divide-[var(--line)]">
              {peers.slice(0, 24).map((p, i) => (
                <div key={`${p.firm}-${p.company_name}-${i}`} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-semibold">
                      <CompetitorLink name={p.firm} />
                      <span className="font-normal text-[var(--faint)]"> on </span>
                      <CompanyLink
                        id={p.company_id}
                        name={p.company_name || "Company"}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-[0.75rem] text-[var(--faint)]">
                      {p.date || "—"}
                      {p.thesis_shift ? (
                        <span className="font-semibold uppercase tracking-wide text-[var(--warn)]">
                          Thesis shift
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {p.notes ? (
                    <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">{cleanProse(p.notes)}</p>
                  ) : null}
                </div>
              ))}
              {!peers.length ? (
                <p className="px-5 py-8 text-[0.875rem] text-[var(--muted)]">No peer activity yet.</p>
              ) : null}
            </div>
          </Panel>
          <Link href="/peers" className="link-quiet text-[0.8125rem] font-semibold">
            Open Competitors OS →
          </Link>
        </div>
      )}

      {tab === "heatmap" && (
        <div className="space-y-4 animate-in">
          <Panel className="!p-5">
            <h2 className="title text-[1.2rem]">Co-investor Heatmap</h2>
            <p className="mt-1.5 text-[0.875rem] text-[var(--muted)]">
              Who co-invests with whom — syndicate unlocks for Monday calls.
            </p>
            <div className="mt-5">
              <HeatMatrix
                labels={intel.coinvest_matrix.firms.map((f) => f.name)}
                cells={intel.coinvest_matrix.cells}
                max={intel.coinvest_matrix.max}
                onSelect={(i, j) => setHeatSel({ i, j })}
                selected={heatSel}
              />
            </div>
            {heatPair ? (
              <div className="mt-4 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel-2)]/40 px-4 py-3">
                <div className="font-semibold">
                  {heatPair.a} × {heatPair.b}
                </div>
                <div className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                  {heatPair.count} shared deals
                  {heatPair.row?.shared_themes?.length
                    ? ` · ${(heatPair.row.shared_themes || []).slice(0, 3).join(", ")}`
                    : ""}
                  {heatPair.row?.last_shared_deal
                    ? ` · last: ${heatPair.row.last_shared_deal}`
                    : ""}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-[0.8125rem] text-[var(--faint)]">Click a cell for pair detail.</p>
            )}
          </Panel>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {intel.heatmap.slice(0, 9).map((row) => (
              <div
                key={`${row.firm_a}-${row.firm_b}`}
                className="rounded-[var(--radius)] border border-[var(--line)] px-3.5 py-3"
              >
                <div className="text-[0.875rem] font-semibold">
                  {row.firm_a} × {row.firm_b}
                </div>
                <div className="mt-1 mono text-[0.8rem] text-[var(--signal)]">
                  {row.coinvest_count}× · syn {row.syndicate_score}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "golden" && (
        <div className="space-y-4 animate-in">
          <Panel className="!p-5">
            <h2 className="title text-[1.2rem]">Actions</h2>
            <p className="mt-1.5 text-[0.875rem] text-[var(--muted)]">
              {golden.weekly_brief.headline ||
                "Same queue as Excel Actions — proprietary windows, crowding, who to call."}
            </p>
            {(golden.weekly_brief.must_do || []).length ? (
              <ul className="mt-3 space-y-1.5 text-[0.875rem] text-[var(--muted)]">
                {golden.weekly_brief.must_do.slice(0, 4).map((m) => (
                  <li key={m}>· {m}</li>
                ))}
              </ul>
            ) : null}
          </Panel>
          <div className="grid gap-3 md:grid-cols-2">
            {golden.insights.slice(0, 8).map((g) => (
              <article
                key={g.id}
                className={cn(
                  "panel !p-4 border-l-2",
                  g.urgency === "now"
                    ? "border-l-[var(--signal)]"
                    : g.urgency === "this_week"
                      ? "border-l-[var(--deep)]"
                      : "border-l-[var(--line)]",
                )}
              >
                <div className="label-caps">{g.urgency.replace("_", " ")} · {g.kind}</div>
                <h3 className="title mt-1.5 text-[1.05rem]">{g.title}</h3>
                <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--muted)]">
                  {g.insight}
                </p>
                {g.action ? (
                  <p className="mt-2 text-[0.8125rem] font-medium text-[var(--text)]">{g.action}</p>
                ) : null}
              </article>
            ))}
          </div>
          <Link href="/peers" className="link-quiet text-[0.8125rem] font-semibold">
            Open full golden pack →
          </Link>
        </div>
      )}

      {tab === "dossiers" && (
        <div className="space-y-4 animate-in">
          <Panel className="!p-5">
            <h2 className="title text-[1.15rem]">Peer Firm Dossiers</h2>
            <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
              Firm-level battle cards — drift, conviction, watch priority.
            </p>
          </Panel>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {intel.firms.slice(0, 12).map((f) => (
              <Link
                key={f.slug}
                href={`/competitors/${f.slug}`}
                className="panel panel-interactive !p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="title text-[1.05rem]">{f.name}</h3>
                  <ToneBadge tone={f.watch_priority >= 70 ? "now" : "monitor"}>
                    watch {Math.round(f.watch_priority)}
                  </ToneBadge>
                </div>
                <p className="mt-2 line-clamp-2 text-[0.8125rem] text-[var(--muted)]">
                  {f.stated_focus || f.intel_summary}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem] text-[var(--faint)]">
                  <span>{f.deal_count} deals</span>
                  <span>·</span>
                  <span>drift {f.drift_score}</span>
                  <span>·</span>
                  <span>conviction {f.conviction_score}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tab === "judgment" && (
        <div className="space-y-4 animate-in">
          <Panel className="!p-5">
            <h2 className="title text-[1.2rem]">Judgment</h2>
            <p className="mt-1.5 text-[0.875rem] text-[var(--muted)]">
              {judgment.summary.headline}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[var(--radius)] bg-[var(--panel-2)]/50 px-3 py-3">
                <div className="label-caps">Mix drift</div>
                <div className="mono mt-1 text-[1.2rem] text-[var(--signal)]">
                  {judgment.mix_drift.dominantPct}/{judgment.mix_drift.tacticalPct}
                </div>
                <div className="mt-1 text-[0.75rem] text-[var(--muted)]">{judgment.mix_drift.status}</div>
              </div>
              <div className="rounded-[var(--radius)] bg-[var(--panel-2)]/50 px-3 py-3">
                <div className="label-caps">Misses</div>
                <div className="mono mt-1 text-[1.2rem]">{judgment.misses.length}</div>
              </div>
              <div className="rounded-[var(--radius)] bg-[var(--panel-2)]/50 px-3 py-3">
                <div className="label-caps">Founder radar</div>
                <div className="mono mt-1 text-[1.2rem]">{judgment.founder_radar.length}</div>
              </div>
            </div>
            {(judgment.summary.must_do || []).length ? (
              <ul className="mt-4 space-y-1.5 text-[0.875rem] text-[var(--muted)]">
                {judgment.summary.must_do.slice(0, 4).map((m) => (
                  <li key={m}>· {m}</li>
                ))}
              </ul>
            ) : null}
          </Panel>
          <div className="grid gap-3 md:grid-cols-2">
            {judgment.misses.slice(0, 4).map((m) => (
              <article key={m.id} className="panel !p-4">
                <div className="label-caps">{m.severity} · miss</div>
                <h3 className="title mt-1 text-[1.05rem]">
                  <CompanyLink id={m.company_id} slug={m.slug} name={m.company_name} />
                </h3>
                <p className="mt-2 text-[0.8125rem] text-[var(--muted)]">{m.lesson}</p>
                <p className="mt-2 text-[0.8125rem] font-medium">{m.action}</p>
              </article>
            ))}
            {judgment.founder_radar.slice(0, 4).map((f) => (
              <article key={f.id} className="panel !p-4">
                <div className="label-caps">{f.urgency} · founder radar</div>
                <h3 className="title mt-1 text-[1.05rem]">
                  {f.company_slug ? (
                    <CompanyLink slug={f.company_slug} name={f.founder} />
                  ) : (
                    f.founder
                  )}
                </h3>
                <p className="mt-2 text-[0.8125rem] text-[var(--muted)]">{f.signal}</p>
                <p className="mt-2 text-[0.8125rem] font-medium">{f.action}</p>
              </article>
            ))}
          </div>
          <Link href="/judgment" className="link-quiet text-[0.8125rem] font-semibold">
            Open Judgment OS →
          </Link>
        </div>
      )}

      {tab === "news" && (
        <div className="space-y-3 animate-in">
          <Panel className="!p-5">
            <h2 className="title text-[1.15rem]">News Worth Reading</h2>
            <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
              Curated reads with why Thirdbase cares — capped for attention.
            </p>
          </Panel>
          {news.slice(0, 10).map((n) => (
            <article key={n.id} className="panel !p-4 md:!p-5">
              <Eyebrow>
                {n.source}
                {n.published_at ? ` · ${n.published_at}` : ""}
              </Eyebrow>
              <h3 className="title mt-1.5 text-[1.1rem]">
                {n.url ? (
                  <ExternalLink href={n.url} kind="source" className="hover:text-[var(--signal)]">
                    {n.title}
                  </ExternalLink>
                ) : (
                  n.title
                )}
              </h3>
              <p className="mt-2 text-[0.875rem] text-[var(--muted)]">{cleanProse(n.why_it_matters)}</p>
            </article>
          ))}
          {!news.length ? <EmptyState>No curated news yet — run Refresh pipeline.</EmptyState> : null}
        </div>
      )}

      {tab === "commentary" && (
        <div className="space-y-3 animate-in">
          <Panel className="!p-5">
            <h2 className="title text-[1.15rem]">Investor Commentary</h2>
            <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
              Operator / GP chatter with source and credibility.
            </p>
          </Panel>
          {commentary.slice(0, 12).map((c) => (
            <article key={c.id} className="panel !p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-semibold">
                  {c.company_id || c.company_name ? (
                    <CompanyLink
                      id={c.company_id}
                      name={c.company_name || "Company"}
                    />
                  ) : (
                    "General"
                  )}
                </div>
                <div className="text-[0.75rem] text-[var(--faint)]">
                  {c.source}
                  {c.credibility_tier ? ` · ${c.credibility_tier}` : ""}
                </div>
              </div>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--muted)]">
                {cleanProse(c.quote_or_summary)}
              </p>
            </article>
          ))}
          {!commentary.length ? (
            <EmptyState>No commentary yet — run Refresh pipeline.</EmptyState>
          ) : null}
        </div>
      )}

      {tab === "stale" && (
        <div className="space-y-4 animate-in">
          <Panel className="!p-5">
            <h2 className="title text-[1.15rem]">Stale</h2>
            <p className="mt-1.5 text-[0.875rem] text-[var(--muted)]">
              ≥90 days quiet — partner review (Keep / Archive / Request refresh). Never auto-deleted.
              Institutional memory stays until a partner says otherwise.
            </p>
          </Panel>
          <StaleQueueTable companies={stale} />
        </div>
      )}
    </div>
  );
}
