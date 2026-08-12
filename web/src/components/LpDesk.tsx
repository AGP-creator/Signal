"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MixGauge } from "@/components/MixGauge";
import { BarChart, DonutChart, FunnelChart } from "@/components/charts";
import { CompetitorLink } from "@/components/EntityLink";
import {
  EmptyState,
  Eyebrow,
  MiniStat,
  OsBanner,
  Panel,
  SegItem,
  Segmented,
  Stat,
} from "@/components/ui";
import { type DealTrail } from "@/lib/icTrail";
import { loadMergedTrails } from "@/lib/icStore";
import { buildLpDeskPack, type LpDeskPack } from "@/lib/lpDesk";
import { loadOverrides } from "@/lib/overrideStore";
import { applyStaleReviews, loadStaleReviews } from "@/lib/staleReviewStore";
import type {
  AlertItem,
  Commentary,
  Company,
  NewsItem,
  PeerActivity,
  SectorCall,
} from "@/lib/types";
import { cn, portfolioMix } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "analytics", label: "Analytics" },
  { id: "governance", label: "Governance" },
  { id: "process", label: "Process" },
  { id: "briefing", label: "Briefing" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function metricTone(tone?: string) {
  if (tone === "warn") return "text-[var(--warn)]";
  if (tone === "ok") return "text-[var(--ok)]";
  if (tone === "deep") return "text-[var(--deep)]";
  return "text-[var(--signal)]";
}

function Bar({ pct, tone = "signal" }: { pct: number; tone?: "signal" | "deep" | "ok" | "warn" }) {
  const color =
    tone === "deep"
      ? "bg-[var(--deep)]"
      : tone === "ok"
        ? "bg-[var(--ok)]"
        : tone === "warn"
          ? "bg-[var(--warn)]"
          : "bg-[var(--signal)]";
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)] ring-1 ring-[var(--line)]">
      <div
        className={cn("h-full rounded-full transition-all duration-700", color)}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

export function LpDesk({
  companies,
  peers,
  commentary,
  news,
  alerts,
  sectors = [],
}: {
  companies: Company[];
  peers: PeerActivity[];
  commentary: Commentary[];
  news: NewsItem[];
  alerts: AlertItem[];
  sectors?: SectorCall[];
}) {
  const [trails, setTrails] = useState<DealTrail[]>([]);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  const [staleTick, setStaleTick] = useState(0);

  useEffect(() => {
    const sync = () => setTrails(loadMergedTrails(companies));
    sync();
    window.addEventListener("signal:ic-changed", sync);
    return () => window.removeEventListener("signal:ic-changed", sync);
  }, [companies]);

  useEffect(() => {
    const sync = () => setStaleTick((n) => n + 1);
    window.addEventListener("signal:stale-reviews-changed", sync);
    window.addEventListener("signal:overrides-changed", sync);
    return () => {
      window.removeEventListener("signal:stale-reviews-changed", sync);
      window.removeEventListener("signal:overrides-changed", sync);
    };
  }, []);

  const pack: LpDeskPack = useMemo(() => {
    const overrides = typeof window !== "undefined" ? loadOverrides() : [];
    const reviewed =
      typeof window !== "undefined"
        ? applyStaleReviews(companies, loadStaleReviews())
        : companies;
    return buildLpDeskPack(
      reviewed,
      peers,
      commentary,
      news,
      alerts,
      trails,
      overrides,
      sectors,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, peers, commentary, news, alerts, trails, sectors, staleTick]);

  const mix = portfolioMix(companies);

  async function copyOnePager() {
    await navigator.clipboard.writeText(pack.one_pager_md);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function downloadOnePager() {
    const blob = new Blob([pack.one_pager_md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Signal_LP_Dashboard_OnePager.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <OsBanner
        live
        tone="ok"
        eyebrow="LP desk"
        title={pack.headline}
        stats={
          <>
            <Stat value={pack.kpis[0]?.value} label="Pipeline" />
            <Stat value={pack.kpis[1]?.value} label="Deep Dive" tone="deep" />
            <Stat value={pack.kpis[2]?.value} label="Mix D/T" />
            <Stat
              value={pack.health.documented_passes}
              label="Pass spine"
              tone={pack.health.high_alerts ? "warn" : "text"}
            />
          </>
        }
        actions={
          <>
            <button type="button" onClick={copyOnePager} className="btn btn-primary btn-sm">
              {copied ? "Copied ✓" : "Copy one-pager"}
            </button>
            <button type="button" onClick={downloadOnePager} className="btn btn-ghost btn-sm">
              Download .md
            </button>
            <Link href="/ic" className="btn btn-ghost btn-sm">
              IC trails
            </Link>
          </>
        }
      />

      <Segmented aria-label="LP dashboard sections" className="seg-scroll">
        {TABS.map((t) => (
          <SegItem key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </SegItem>
        ))}
      </Segmented>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pack.kpis.map((m) => (
              <Panel key={m.label} className="!p-4">
                <div className="label-caps">{m.label}</div>
                <div className={cn("mono mt-2 text-2xl", metricTone(m.tone))}>{m.value}</div>
                <p className="mt-2 text-[0.8125rem] text-[var(--muted)]">{m.note}</p>
              </Panel>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Panel>
              <Eyebrow>Selectivity funnel</Eyebrow>
              <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                How the book narrows from pipeline to Deep Dive.
              </p>
              <div className="mt-4">
                <FunnelChart
                  height={210}
                  steps={pack.funnel.map((f) => ({
                    label: f.label,
                    count: f.count,
                    pct: f.pct,
                  }))}
                />
              </div>
              <div className="mt-4 space-y-2 border-t border-[var(--line)] pt-3">
                {pack.funnel.map((f) => (
                  <Link
                    key={f.label}
                    href={f.href}
                    className="flex items-baseline justify-between gap-3 text-sm transition hover:text-[var(--signal)]"
                  >
                    <span className="font-medium">{f.label}</span>
                    <span className="mono text-[var(--muted)]">
                      {f.count}
                      <span className="ml-2 text-[var(--faint)]">{f.pct}%</span>
                    </span>
                  </Link>
                ))}
              </div>
            </Panel>

            <div className="space-y-4">
              <MixGauge dominantPct={mix.dominantPct} tacticalPct={mix.tacticalPct} />
              <Panel>
                <Eyebrow>Process health</Eyebrow>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <MiniStat label="Mix status" value={pack.health.mix_status.replace(/_/g, " ")} />
                  <MiniStat label="Aging / stale" value={pack.health.freshness_aging} />
                  <MiniStat label="Overrides" value={pack.health.overrides} />
                  <MiniStat label="Miss retros" value={pack.health.misses} />
                  <MiniStat label="Doc. Passes" value={pack.health.documented_passes} />
                  <MiniStat label="High alerts" value={pack.health.high_alerts} />
                </div>
              </Panel>
            </div>
          </div>
        </div>
      )}

      {tab === "analytics" && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pack.quality.map((q) => (
              <Panel key={q.label} className="!p-4">
                <div className="label-caps">{q.label}</div>
                <div className="mono mt-2 text-2xl text-[var(--signal)]">{q.value}</div>
                <p className="mt-2 text-[0.8125rem] text-[var(--muted)]">{q.detail}</p>
                {q.href ? (
                  <Link href={q.href} className="link-quiet mt-3 inline-block text-[0.8125rem]">
                    Inspect →
                  </Link>
                ) : null}
              </Panel>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <Eyebrow>Score distribution</Eyebrow>
              <div className="mt-4">
                <BarChart
                  height={160}
                  series={pack.score_bands.map((b) => ({
                    label: b.band,
                    value: b.count,
                  }))}
                  color="var(--signal)"
                />
              </div>
              <div className="mt-4 space-y-2.5 border-t border-[var(--line)] pt-3">
                {pack.score_bands.map((b) => (
                  <div key={b.band} className="flex justify-between text-sm">
                    <span className="mono text-[var(--muted)]">{b.band}</span>
                    <span className="mono">
                      {b.count}
                      <span className="ml-2 text-[var(--faint)]">{b.pct}%</span>
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <Eyebrow>Stage mix</Eyebrow>
              <div className="mt-4">
                <DonutChart
                  size={150}
                  centerLabel="stages"
                  centerValue={String(pack.stages.reduce((a, s) => a + s.count, 0))}
                  slices={pack.stages.map((s, i) => ({
                    label: s.stage,
                    pct: s.pct,
                    color: ["var(--signal)", "var(--deep)", "var(--ok)", "var(--warn)", "var(--faint)"][
                      i % 5
                    ],
                  }))}
                />
              </div>
              {!pack.stages.length && <EmptyState>No stage data yet.</EmptyState>}
            </Panel>
          </div>

          <Panel>
            <div className="flex items-end justify-between gap-3">
              <Eyebrow>Sector allocation</Eyebrow>
              <Link href="/sectors" className="link-quiet shrink-0 text-[0.8125rem]">
                Sectors →
              </Link>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-[var(--faint)]">
                    <th className="label-caps pb-2 font-medium">Theme</th>
                    <th className="label-caps pb-2 font-medium">Names</th>
                    <th className="label-caps pb-2 font-medium">Share</th>
                    <th className="label-caps pb-2 font-medium">Deep Dive</th>
                    <th className="label-caps pb-2 font-medium">Avg score</th>
                  </tr>
                </thead>
                <tbody>
                  {pack.sectors.map((s) => (
                    <tr key={s.name} className="border-b border-[var(--line)] last:border-0">
                      <td className="py-2.5 font-medium">{s.name}</td>
                      <td className="mono py-2.5">{s.count}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16">
                            <Bar pct={s.pct} />
                          </div>
                          <span className="mono text-[var(--muted)]">{s.pct}%</span>
                        </div>
                      </td>
                      <td className="mono py-2.5 text-[var(--ok)]">{s.deepDive}</td>
                      <td className="mono py-2.5 text-[var(--signal)]">
                        {s.avgScore != null ? s.avgScore : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!pack.sectors.length && (
                <div className="mt-4">
                  <EmptyState>No sector allocation yet.</EmptyState>
                </div>
              )}
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <div className="flex items-end justify-between gap-3">
                <Eyebrow>Peer snapshot</Eyebrow>
                <Link href="/peers" className="link-quiet text-[0.8125rem]">
                  Peers →
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {pack.peer_snapshot.map((p) => (
                  <div
                    key={p.firm}
                    className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <div className="font-medium">
                        <CompetitorLink name={p.firm} />
                      </div>
                      {p.latest ? (
                        <div className="mt-0.5 text-[0.8125rem] text-[var(--faint)]">{p.latest}</div>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="mono text-sm text-[var(--deep)]">{p.moves} moves</div>
                      {p.offThesis > 0 ? (
                        <div className="label-caps mt-0.5 text-[var(--warn)]">
                          {p.offThesis} off-thesis
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
                {!pack.peer_snapshot.length && <EmptyState>No peer events loaded.</EmptyState>}
              </div>
            </Panel>

            <Panel>
              <div className="flex items-end justify-between gap-3">
                <Eyebrow>Emerging sectors</Eyebrow>
                <Link href="/sectors" className="link-quiet text-[0.8125rem]">
                  View all →
                </Link>
              </div>
              <div className="mt-4 space-y-3.5">
                {pack.emerging_sectors.map((s) => (
                  <div key={s.name} className="border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-semibold">{s.name}</div>
                      <div className="mono text-[var(--signal)]">{s.heat}</div>
                    </div>
                    <div className="mt-0.5 text-[0.8125rem] text-[var(--muted)]">{s.consensus}</div>
                  </div>
                ))}
                {!pack.emerging_sectors.length && <EmptyState>No sector calls yet.</EmptyState>}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === "governance" && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pack.ic_stage_counts.map((s) => (
              <Panel key={s.stage} className="!p-4">
                <div className="label-caps">{s.stage}</div>
                <div className="mono mt-2 text-2xl text-[var(--deep)]">{s.count}</div>
              </Panel>
            ))}
            {!pack.ic_stage_counts.length && (
              <Panel className="sm:col-span-2">
                <EmptyState>No IC trails yet.</EmptyState>
              </Panel>
            )}
          </div>

          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <h3 className="title text-[1.35rem]">Governance samples</h3>
              <Link href="/ic" className="link-quiet text-[0.875rem]">
                Full IC →
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {pack.governance.map((g) => (
                <Panel key={g.company_name}>
                  <div className="flex items-baseline justify-between gap-2">
                    {g.company_slug ? (
                      <Link
                        href={`/company/${g.company_slug}`}
                        className="font-semibold hover:text-[var(--signal)]"
                      >
                        {g.company_name}
                      </Link>
                    ) : (
                      <h4 className="font-semibold">{g.company_name}</h4>
                    )}
                    <span className="label-caps text-[var(--deep)]">{g.stage}</span>
                  </div>
                  <div className="mt-1 text-sm text-[var(--signal)]">{g.outcome}</div>
                  <ul className="mt-3 space-y-1">
                    {g.paper_trail.map((line) => (
                      <li key={line} className="text-[0.8125rem] text-[var(--muted)]">
                        · {line}
                      </li>
                    ))}
                  </ul>
                </Panel>
              ))}
              {!pack.governance.length && (
                <Panel>
                  <EmptyState>No governance samples yet.</EmptyState>
                </Panel>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === "process" && (
        <div className="space-y-6">
          <div className="space-y-2">
            {pack.process.map((s) => (
              <Panel key={s.step} className="!p-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="mono text-[var(--signal)]">0{s.step}</span>
                  <span className="font-semibold">{s.title}</span>
                  <span className="text-[0.75rem] text-[var(--faint)]">{s.owner}</span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="label-caps">AI</div>
                    <p className="mt-1 text-sm text-[var(--muted)]">{s.ai_role}</p>
                  </div>
                  <div>
                    <div className="label-caps">Human</div>
                    <p className="mt-1 text-sm text-[var(--muted)]">{s.human_role}</p>
                  </div>
                </div>
              </Panel>
            ))}
          </div>

          <div className="space-y-2">
            {pack.risks_and_controls.map((r) => (
              <Panel key={r.risk} className="!p-4">
                <div className="text-sm font-semibold text-[var(--warn)]">{r.risk}</div>
                <p className="mt-1.5 text-sm text-[var(--muted)]">{r.control}</p>
              </Panel>
            ))}
          </div>
        </div>
      )}

      {tab === "briefing" && (
        <div className="space-y-6">
          <Panel>
            <Eyebrow>Talking points</Eyebrow>
            <ul className="mt-4 space-y-3">
              {pack.talking_points.map((t) => (
                <li key={t} className="flex gap-2 text-sm leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ok)]" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
              <button type="button" onClick={copyOnePager} className="btn btn-primary btn-sm">
                {copied ? "Copied ✓" : "Copy one-pager"}
              </button>
              <button type="button" onClick={downloadOnePager} className="btn btn-ghost btn-sm">
                Download .md
              </button>
            </div>
          </Panel>

          <Panel padded={false}>
            <div className="border-b border-[var(--line)] px-5 py-4 md:px-6">
              <h3 className="title text-[1.25rem]">One-pager</h3>
            </div>
            <pre className="max-h-[28rem] overflow-auto px-5 py-4 font-mono text-[0.75rem] leading-relaxed text-[var(--muted)] md:px-6">
              {pack.one_pager_md}
            </pre>
          </Panel>
        </div>
      )}
    </div>
  );
}
