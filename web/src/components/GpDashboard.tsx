"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DealCard } from "@/components/DealCard";
import { MixGauge } from "@/components/MixGauge";
import { BarChart, DonutChart } from "@/components/charts";
import {
  Eyebrow,
  EmptyState,
  MiniStat,
  OsBanner,
  Panel,
  RecBadge,
  SectionTitle,
  Stat,
} from "@/components/ui";
import { type DealTrail } from "@/lib/icTrail";
import { loadMergedTrails } from "@/lib/icStore";
import { buildGpDeskPack, type GpDeskPack, type GpQueueItem } from "@/lib/gpDesk";
import { loadOverrides } from "@/lib/overrideStore";
import { companyPath } from "@/lib/paths";
import {
  applyStaleReviews,
  hydrateStaleReviews,
  loadStaleReviews,
} from "@/lib/staleReviewStore";
import type {
  AlertItem,
  Commentary,
  Company,
  DigestRow,
  NewsItem,
  PeerActivity,
  SectorCall,
} from "@/lib/types";
import { cn, fmtMoneyM, fmtPct, fmtWhen } from "@/lib/utils";

function urgencyClass(u: GpQueueItem["urgency"]) {
  if (u === "now") return "text-[var(--danger)]";
  if (u === "this_week") return "text-[var(--warn)]";
  return "text-[var(--faint)]";
}

function kindLabel(k: GpQueueItem["kind"]) {
  const map: Record<GpQueueItem["kind"], string> = {
    deal: "Deal",
    alert: "Alert",
    ic: "IC",
    insight: "Insight",
    founder: "Founder",
    stale: "Stale",
    miss: "Miss",
  };
  return map[k];
}

export function GpDashboard({
  companies,
  peers,
  commentary,
  news,
  alerts,
  sectors,
  digest,
  lastRefreshed,
  liveSignals,
}: {
  companies: Company[];
  peers: PeerActivity[];
  commentary: Commentary[];
  news: NewsItem[];
  alerts: AlertItem[];
  sectors: SectorCall[];
  digest: DigestRow | null;
  lastRefreshed: string;
  liveSignals: string;
}) {
  const [trails, setTrails] = useState<DealTrail[]>([]);
  const [copied, setCopied] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [staleTick, setStaleTick] = useState(0);

  useEffect(() => {
    const sync = () => setTrails(loadMergedTrails(companies));
    sync();
    window.addEventListener("signal:ic-changed", sync);
    return () => window.removeEventListener("signal:ic-changed", sync);
  }, [companies]);

  useEffect(() => {
    const sync = () => setStaleTick((n) => n + 1);
    void hydrateStaleReviews().then(sync);
    window.addEventListener("signal:stale-reviews-changed", sync);
    window.addEventListener("signal:overrides-changed", sync);
    return () => {
      window.removeEventListener("signal:stale-reviews-changed", sync);
      window.removeEventListener("signal:overrides-changed", sync);
    };
  }, []);

  const pack: GpDeskPack = useMemo(() => {
    const overrides = typeof window !== "undefined" ? loadOverrides() : [];
    const reviewed =
      typeof window !== "undefined"
        ? applyStaleReviews(companies, loadStaleReviews())
        : companies;
    return buildGpDeskPack(
      reviewed,
      peers,
      commentary,
      news,
      alerts,
      sectors,
      trails,
      digest,
      lastRefreshed,
      liveSignals,
      overrides,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    companies,
    peers,
    commentary,
    news,
    alerts,
    sectors,
    trails,
    digest,
    lastRefreshed,
    liveSignals,
    staleTick,
  ]);

  async function copyBrief() {
    await navigator.clipboard.writeText(pack.brief_md);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const digestDeals = pack.digest?.payload?.deals?.slice(0, 4) || [];
  const attention = pack.attention.slice(0, 6);

  return (
    <div className="space-y-10">
      <OsBanner
        live
        tone="signal"
        eyebrow="Partner desk"
        title={pack.headline}
        description={pack.counsel}
        stats={
          <>
            <Stat value={companies.length} label="Pipeline" />
            <Stat
              value={companies.filter((c) => c.recommendation === "Deep Dive").length}
              label="Deep Dive"
            />
            <Stat value={pack.ic.active} label="Active IC" tone="deep" />
            <div>
              <div className="label-caps">Refreshed</div>
              <div className="mono mt-1.5 text-[0.8125rem] text-[var(--muted)]">
                {fmtWhen(pack.last_refreshed)}
              </div>
            </div>
          </>
        }
        actions={
          <>
            <Link href="/meeting" className="btn btn-primary btn-sm">
              Partner agenda
            </Link>
            <button type="button" onClick={copyBrief} className="btn btn-ghost btn-sm">
              {copied ? "Copied" : "Copy brief"}
            </button>
          </>
        }
      />

      {/* Must-do + KPIs inline */}
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <Eyebrow>Must-do this week</Eyebrow>
          <ul className="mt-4 space-y-3">
            {pack.golden.must_do.slice(0, 4).map((m) => (
              <li key={m} className="flex gap-3 text-[0.9375rem] leading-snug">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--signal)]" />
                <span>{m}</span>
              </li>
            ))}
            {!pack.golden.must_do.length && (
              <EmptyState>No forced moves — hold the line on Hot Deals.</EmptyState>
            )}
          </ul>
          {pack.golden.watch.length > 0 && (
            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <div className="label-caps">Watch</div>
              <ul className="mt-2 space-y-1.5">
                {pack.golden.watch.slice(0, 3).map((w) => (
                  <li key={w} className="text-[0.8125rem] text-[var(--muted)]">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-l-0 border-[var(--line)] lg:border-l lg:pl-8">
          {pack.kpis.slice(0, 4).map((k) => (
            <div key={k.id}>
              <div className="label-caps">{k.label}</div>
              <div
                className={cn(
                  "mono mt-1.5 text-xl",
                  k.tone === "warn"
                    ? "text-[var(--warn)]"
                    : k.tone === "ok"
                      ? "text-[var(--ok)]"
                      : k.tone === "deep"
                        ? "text-[var(--deep)]"
                        : k.tone === "muted"
                          ? "text-[var(--muted)]"
                          : "text-[var(--signal)]",
                )}
              >
                {k.href ? (
                  <Link href={k.href} className="transition hover:opacity-80">
                    {k.value}
                  </Link>
                ) : (
                  k.value
                )}
              </div>
              <p className="mt-1 text-[0.75rem] leading-snug text-[var(--faint)]">{k.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Hot Deals + Attention */}
      <section className="grid gap-10 lg:grid-cols-[1.4fr_0.75fr]">
        <div className="space-y-5">
          <SectionTitle title="Hot Deals" href="/pipeline" hrefLabel="Pipeline →" />
          <div className="stagger">
            {pack.hot_deals.slice(0, 5).map((c, i) => (
              <DealCard key={c.id} company={c} index={i} />
            ))}
            {!pack.hot_deals.length && (
              <EmptyState>No hot deals yet — run Refresh to score the pipeline.</EmptyState>
            )}
          </div>
        </div>

        <aside className="space-y-8">
          <div>
            <div className="flex items-end justify-between gap-3">
              <h2 className="title text-[1.1rem]">Attention</h2>
              <span className="label-caps text-[var(--faint)]">{attention.length}</span>
            </div>
            <div className="mt-4 space-y-0">
              {attention.map((item) => {
                const body = (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("label-caps", urgencyClass(item.urgency))}>
                        {item.urgency.replace("_", " ")}
                      </span>
                      <span className="label-caps text-[var(--faint)]">{kindLabel(item.kind)}</span>
                    </div>
                    <div className="mt-1 font-medium leading-snug">{item.title}</div>
                    {item.subtitle ? (
                      <p className="mt-1 line-clamp-2 text-[0.75rem] leading-relaxed text-[var(--muted)]">
                        {item.subtitle}
                      </p>
                    ) : null}
                  </>
                );
                return item.href ? (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="block border-b border-[var(--line)] py-3.5 transition last:border-0 hover:opacity-80"
                  >
                    {body}
                  </Link>
                ) : (
                  <div key={item.id} className="border-b border-[var(--line)] py-3.5 last:border-0">
                    {body}
                  </div>
                );
              })}
              {!attention.length && <EmptyState>Queue clear.</EmptyState>}
            </div>
          </div>

          <MixGauge dominantPct={pack.mix.dominantPct} tacticalPct={pack.mix.tacticalPct} />
        </aside>
      </section>

      {/* Firm pulse — compact three columns, no card chrome overload */}
      <section className="grid gap-8 border-t border-[var(--line)] pt-8 lg:grid-cols-3">
        <div>
          <div className="flex items-center justify-between gap-2">
            <Eyebrow>IC</Eyebrow>
            <Link href="/ic" className="link-quiet text-[0.75rem] font-medium">
              Open
            </Link>
          </div>
          <p className="mt-2 text-[0.8125rem] text-[var(--muted)]">
            {pack.ic.active} active · {pack.ic.needing_meeting} need meeting
          </p>
          <div className="mt-4 space-y-0">
            {pack.ic.trails.slice(0, 4).map((t) => (
              <Link
                key={t.name + t.stage}
                href={t.href || "/ic"}
                className="flex items-start justify-between gap-3 border-b border-[var(--line)] py-2.5 last:border-0 transition hover:text-[var(--signal)]"
              >
                <div>
                  <div className="text-[0.9375rem] font-medium">{t.name}</div>
                  <div className="mt-0.5 text-[0.75rem] text-[var(--muted)]">
                    {t.stage} · {t.sponsor}
                  </div>
                </div>
              </Link>
            ))}
            {!pack.ic.trails.length && <EmptyState>No active IC trails.</EmptyState>}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <Eyebrow>Judgment</Eyebrow>
            <Link href="/judgment" className="link-quiet text-[0.75rem] font-medium">
              Open
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <MiniStat label="Founder radar" value={pack.judgment.founder_radar.length} />
            <MiniStat label="Miss retros" value={pack.judgment.misses.length} />
            <MiniStat label="Stale briefs" value={pack.judgment.stale_freshness} />
            <MiniStat label="Overrides" value={pack.judgment.overrides} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <Eyebrow>Competitors</Eyebrow>
            <Link href="/peers" className="link-quiet text-[0.75rem] font-medium">
              Open
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <MiniStat label="Thesis shifts" value={pack.peer_pulse.thesis_shifts} />
            <MiniStat label="On-thesis" value={pack.peer_pulse.on_thesis} />
            <MiniStat label="Windows" value={pack.golden.proprietary.length} />
            <MiniStat label="Crowded" value={pack.golden.races} />
          </div>
          <div className="mt-4 space-y-2.5 border-t border-[var(--line)] pt-4">
            {pack.peer_pulse.recent.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[0.875rem] font-medium">{p.firm}</span>
                <span className="truncate text-[0.75rem] text-[var(--muted)]">
                  {p.company_name || "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Digest + sectors — quiet */}
      <section className="grid gap-8 border-t border-[var(--line)] pt-8 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-2">
            <Eyebrow>Latest digest</Eyebrow>
            <Link href="/digest" className="link-quiet text-[0.75rem] font-medium">
              Preview
            </Link>
          </div>
          {pack.digest ? (
            <div className="mt-4">
              <div className="font-medium">{pack.digest.subject || "M/W/F digest"}</div>
              <div className="mt-1 text-[0.75rem] text-[var(--muted)]">
                {fmtWhen(pack.digest.generated_at)}
              </div>
              <div className="mt-4 space-y-3">
                {digestDeals.map((d) => {
                  const href = d.brief_url || companyPath({ slug: d.slug, id: d.name }) || null;
                  return (
                  <div key={d.name} className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[0.9375rem] font-medium">
                        {href ? (
                          <Link href={href} className="entity-link">
                            {d.name}
                          </Link>
                        ) : (
                          d.name
                        )}
                      </div>
                      <div className="text-[0.75rem] text-[var(--muted)]">{d.sector}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <RecBadge rec={d.recommendation} />
                      <div className="mono mt-1 text-[0.8rem] text-[var(--signal)]">
                        {d.score ?? "—"}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState>No digest generated yet.</EmptyState>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <Eyebrow>Sector of Tomorrow</Eyebrow>
            <Link href="/sectors" className="link-quiet text-[0.75rem] font-medium">
              All
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {pack.sectors.slice(0, 4).map((s) => (
              <div key={s.id} className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{s.subsector}</div>
                  <div className="mt-0.5 text-[0.75rem] text-[var(--muted)]">
                    {s.consensus_level} · {s.parent_theme}
                  </div>
                </div>
                <div className="mono shrink-0 text-[var(--signal)]">{s.heat_score}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[var(--line)] pt-5">
            <MiniStat label="Deep Dive round sum" value={fmtMoneyM(pack.capital.deep_dive_round_sum_m)} />
            <MiniStat
              label="Avg thesis"
              value={
                pack.capital.avg_deep_dive_score
                  ? pack.capital.avg_deep_dive_score.toFixed(0)
                  : "—"
              }
            />
            <MiniStat label="Avg Tier-1" value={pack.capital.avg_tier1_on_deep.toFixed(1)} />
            <MiniStat
              label="Median YoY"
              value={
                pack.capital.median_yoy_deep != null ? fmtPct(pack.capital.median_yoy_deep) : "—"
              }
            />
          </div>
        </div>
      </section>

      {/* Analytics — collapsed by default */}
      <section className="border-t border-[var(--line)] pt-6">
        <button
          type="button"
          onClick={() => setShowAnalytics((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="title text-[1.05rem]">Pipeline analytics</span>
          <span className="text-[0.8125rem] text-[var(--muted)]">
            {showAnalytics ? "Hide" : "Show"}
          </span>
        </button>
        {showAnalytics && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4 animate-in">
            <Panel className="viz-card !p-4">
              <div className="label-caps">Recommendation</div>
              <DonutChart
                className="mt-auto pt-2"
                size={136}
                centerLabel="book"
                centerValue={String(
                  pack.recommendation.reduce((a, r) => a + r.count, 0),
                )}
                slices={pack.recommendation.map((r, i) => ({
                  label: r.label,
                  pct: r.pct,
                  color: ["var(--signal)", "var(--warn)", "var(--faint)", "var(--deep)"][i % 4],
                }))}
              />
            </Panel>
            <Panel className="viz-card !p-4">
              <div className="label-caps">Score bands</div>
              <BarChart
                className="mt-auto pt-2"
                height={156}
                series={pack.score_bands.map((r) => ({
                  label: r.label,
                  value: r.count,
                }))}
              />
            </Panel>
            <Panel className="viz-card !p-4">
              <div className="label-caps">Stage</div>
              <BarChart
                className="mt-auto pt-2"
                height={156}
                color="var(--deep)"
                series={pack.stages.map((r) => ({
                  label: r.label,
                  value: r.count,
                }))}
              />
            </Panel>
            <Panel className="viz-card !p-4">
              <div className="label-caps">Tier-1 quality</div>
              <BarChart
                className="mt-auto pt-2"
                height={156}
                color="var(--ok)"
                series={pack.tier1_quality.map((r) => ({
                  label: r.label,
                  value: r.count,
                }))}
              />
            </Panel>
          </div>
        )}
      </section>

      {(pack.golden.now.length > 0 || pack.golden.proprietary.length > 0) && (
        <section className="space-y-4 border-t border-[var(--line)] pt-8">
          <SectionTitle title="Now" href="/peers" hrefLabel="Competitors →" />
          <div className="space-y-0">
            {pack.golden.now.slice(0, 3).map((g) => (
              <div key={g.id} className="border-b border-[var(--line)] py-4 last:border-0">
                <div className="label-caps text-[var(--danger)]">{g.kind}</div>
                <div className="mt-1.5 title text-[1.05rem]">{g.title}</div>
                <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--muted)]">
                  {g.insight}
                </p>
                <p className="mt-2 text-[0.8125rem] text-[var(--signal)]">{g.action}</p>
              </div>
            ))}
            {pack.golden.proprietary.slice(0, 2).map((p) => (
              <Link
                key={p.id}
                href={p.slug ? `/company/${p.slug}` : `/company/${p.id}`}
                className="block border-b border-[var(--line)] py-4 last:border-0 transition hover:opacity-80"
              >
                <Eyebrow className="!text-[var(--ok)]">Proprietary window</Eyebrow>
                <div className="mt-1.5 title text-[1.05rem]">{p.name}</div>
                <p className="mt-1.5 text-[0.875rem] text-[var(--muted)]">{p.note}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
