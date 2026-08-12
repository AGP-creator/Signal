"use client";

import Link from "next/link";
import {
  AreaChart,
  BarChart,
  BenchmarkBars,
  DonutChart,
  FunnelChart,
  GaugeChart,
  GroupedBarChart,
  RadarChart,
} from "@/components/charts";
import { CompanyLink } from "@/components/EntityLink";
import { BackLink, EmptyState, Eyebrow, Meta, Panel, PanelHead, RecBadge } from "@/components/ui";
import { PartnerLogPanel } from "@/components/PartnerLog";
import type { FundAnnouncement } from "@/lib/fundAnnouncements";
import type { BattleCard } from "@/lib/goldenInsights";
import type { FirmDossier } from "@/lib/peerIntel";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "var(--signal)",
  "var(--deep)",
  "var(--ok)",
  "var(--warn)",
  "#0d9488",
  "#64748b",
];

function formatFund(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  return `$${Math.round(n)}M`;
}

function toSlices(rows: { label: string; count: number }[]) {
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;
  const raw = rows.map((r, i) => ({
    label: r.label,
    pct: Math.round((100 * r.count) / total),
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));
  const sum = raw.reduce((s, r) => s + r.pct, 0);
  if (raw.length && sum !== 100) raw[0].pct += 100 - sum;
  return raw.filter((s) => s.pct > 0);
}

function dealTimeline(firm: FirmDossier) {
  const buckets = new Map<string, number>();
  for (const d of firm.deals) {
    if (!d.date) continue;
    const key = d.date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([label, value]) => ({
      label: label.slice(2).replace("-", "/"),
      value,
    }));
}

export function CompetitorAnalytics({
  firm,
  funds,
  battle,
}: {
  firm: FirmDossier;
  funds: FundAnnouncement[];
  battle?: BattleCard | null;
}) {
  const capital = funds.reduce((s, f) => s + (f.size_m || 0), 0) || null;
  const latestFund = [...funds].sort((a, b) => b.announced_date.localeCompare(a.announced_date))[0];
  const themeSlices = toSlices(
    firm.top_themes.slice(0, 6).map((t) => ({
      label: t.theme.split(/\s+/).slice(0, 3).join(" "),
      count: t.count,
    })),
  );
  const stageSlices = toSlices(
    firm.top_stages.slice(0, 6).map((s) => ({
      label: s.stage,
      count: s.count,
    })),
  );
  const recBuckets = (() => {
    const map = new Map<string, number>();
    for (const d of firm.deals) {
      const k = d.recommendation || "Unrated";
      map.set(k, (map.get(k) || 0) + 1);
    }
    return toSlices([...map.entries()].map(([label, count]) => ({ label, count })));
  })();
  const thesisMix = toSlices([
    { label: "On thesis", count: Math.max(0, firm.deal_count - firm.off_thesis_count) },
    { label: "Off thesis", count: firm.off_thesis_count },
  ]);
  const themeBars = firm.top_themes.slice(0, 7).map((t) => ({
    label: t.theme.split(/\s+/).slice(0, 2).join(" ").slice(0, 14),
    value: t.count,
  }));
  const stageBars = firm.top_stages.slice(0, 7).map((s) => ({
    label: s.stage.slice(0, 10),
    value: s.count,
  }));
  const coinvestBars = firm.top_coinvestors.slice(0, 6).map((p) => ({
    label: p.firm.split(/\s+/)[0].slice(0, 10),
    value: p.count,
  }));
  const fundBars = funds
    .filter((f) => f.size_m != null)
    .map((f) => ({
      label: f.vehicle.split(/\s+/).slice(0, 2).join(" ").slice(0, 12),
      value: f.size_m as number,
    }));
  const timeline = dealTimeline(firm);
  const funnel = [
    { label: "Pipeline deals", count: Math.max(firm.deal_count, 1) },
    { label: "Leads", count: Math.max(firm.lead_count, 0) },
    { label: "Deep Dive", count: Math.max(firm.deep_dive_count, 0) },
    { label: "Thesis shifts", count: Math.max(firm.thesis_shift_count, 0) },
  ].filter((s, i, arr) => i === 0 || s.count > 0 || arr[i - 1].count > 0);
  const groupLen = Math.min(5, Math.max(themeBars.length, stageBars.length));
  const grouped =
    themeBars.length || stageBars.length
      ? Array.from({ length: groupLen }, (_, i) => ({
          label: themeBars[i]?.label || stageBars[i]?.label || `T${i + 1}`,
          values: {
            themes: themeBars[i]?.value ?? 0,
            stages: stageBars[i]?.value ?? 0,
          },
        }))
      : null;

  return (
    <div className="space-y-8 animate-in">
      <div>
        <BackLink href="/competitors">All competitors</BackLink>
        <div className="mt-5 overflow-hidden rounded-[calc(var(--radius-lg)+4px)] border border-[var(--line)] bg-[var(--panel)]">
          <div
            className="relative px-5 py-7 md:px-8 md:py-9"
            style={{
              background:
                "radial-gradient(ellipse 70% 120% at 0% 0%, color-mix(in srgb, var(--signal) 16%, transparent), transparent 55%), radial-gradient(ellipse 50% 80% at 100% 0%, color-mix(in srgb, var(--deep) 12%, transparent), transparent 50%)",
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0 max-w-2xl">
                <Eyebrow live className="!text-[var(--signal)]">
                  Competitor analytics
                </Eyebrow>
                <h1 className="display mt-3 text-[2.4rem] md:text-[3.35rem]">{firm.name}</h1>
                <p className="body-muted mt-3 text-[1.02rem]">
                  {firm.stated_focus || "Stated focus not catalogued in the peer watchlist."}
                </p>
                {!!firm.aliases.length && (
                  <div className="mt-2 text-[0.8125rem] text-[var(--faint)]">
                    Also tracked as {firm.aliases.join(", ")}
                  </div>
                )}
              </div>
              <div className="grid min-w-[16rem] grid-cols-2 gap-3 sm:grid-cols-2">
                <HeroMetric label="Fund capital" value={formatFund(capital)} accent />
                <HeroMetric
                  label="Latest vehicle"
                  value={latestFund ? formatFund(latestFund.size_m) : "—"}
                />
                <HeroMetric label="Investments" value={String(firm.deal_count)} />
                <HeroMetric
                  label="Watch score"
                  value={firm.watch_priority.toFixed(0)}
                  warn={firm.drift_score >= 30}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="As lead" value={String(firm.lead_count)} />
        <Kpi label="Deep Dive overlap" value={String(firm.deep_dive_count)} />
        <Kpi label="Conviction" value={firm.conviction_score.toFixed(0)} tone="signal" />
        <Kpi
          label="Drift"
          value={firm.drift_score.toFixed(0)}
          tone={firm.drift_score >= 30 ? "warn" : "ok"}
        />
        <Kpi label="Last activity" value={firm.last_activity_date || "—"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <h2 className="title text-[1.3rem]">Intelligence summary</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-[var(--text)]/90">{firm.intel_summary}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <Meta label="Alignment" value={firm.focus_alignment.toFixed(0)} />
            <Meta label="Off-thesis" value={String(firm.off_thesis_count)} />
            <Meta label="Thesis shifts" value={String(firm.thesis_shift_count)} />
            <Meta label="Vehicles" value={String(funds.length)} />
          </div>
        </Panel>
        <Panel>
          <h2 className="title text-[1.15rem]">Posture radar</h2>
          <RadarChart
            className="mt-1"
            size={220}
            scores={{
              Watch: firm.watch_priority,
              Conviction: firm.conviction_score,
              Alignment: firm.focus_alignment,
              Drift: firm.drift_score,
              Leads: Math.min(100, firm.lead_count * 25),
            }}
          />
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel>
          <h2 className="title text-[1.1rem]">Conviction gauge</h2>
          <GaugeChart
            className="mt-3"
            value={firm.conviction_score}
            label="Conviction"
            sub="Deal depth × leads"
            color="var(--signal)"
          />
        </Panel>
        <Panel>
          <h2 className="title text-[1.1rem]">Focus alignment</h2>
          <GaugeChart
            className="mt-3"
            value={firm.focus_alignment}
            label="Alignment"
            sub="Vs stated thesis"
            color="var(--ok)"
          />
        </Panel>
        <Panel>
          <h2 className="title text-[1.1rem]">Drift pressure</h2>
          <GaugeChart
            className="mt-3"
            value={firm.drift_score}
            label="Drift"
            sub="Off-thesis + shifts"
            color="var(--warn)"
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <h2 className="title text-[1.15rem]">Sector mix</h2>
          {themeSlices.length ? (
            <DonutChart
              className="mt-4"
              size={148}
              slices={themeSlices}
              centerLabel="themes"
              centerValue={String(firm.top_themes.length)}
            />
          ) : (
            <div className="mt-4">
              <EmptyState>No sector data yet.</EmptyState>
            </div>
          )}
        </Panel>
        <Panel>
          <h2 className="title text-[1.15rem]">Stage mix</h2>
          {stageSlices.length ? (
            <DonutChart
              className="mt-4"
              size={148}
              slices={stageSlices}
              centerLabel="stages"
              centerValue={String(firm.top_stages.length)}
            />
          ) : (
            <div className="mt-4">
              <EmptyState>No stage data yet.</EmptyState>
            </div>
          )}
        </Panel>
        <Panel>
          <h2 className="title text-[1.15rem]">Thesis / Signal rating</h2>
          {thesisMix.length || recBuckets.length ? (
            <div className="mt-4 space-y-5">
              {!!thesisMix.length && (
                <DonutChart
                  size={132}
                  slices={thesisMix}
                  centerLabel="thesis"
                  centerValue={`${firm.focus_alignment.toFixed(0)}`}
                />
              )}
              {!!recBuckets.length && (
                <DonutChart
                  size={120}
                  slices={recBuckets}
                  centerLabel="ratings"
                  centerValue={String(firm.deal_count)}
                />
              )}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState>No rating mix yet.</EmptyState>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="title text-[1.2rem]">Theme concentration</h2>
          {themeBars.length ? (
            <BarChart className="mt-4" series={themeBars} height={170} color="var(--signal)" />
          ) : (
            <div className="mt-4">
              <EmptyState>No theme bars.</EmptyState>
            </div>
          )}
        </Panel>
        <Panel>
          <h2 className="title text-[1.2rem]">Stage concentration</h2>
          {stageBars.length ? (
            <BarChart className="mt-4" series={stageBars} height={170} color="var(--deep)" />
          ) : (
            <div className="mt-4">
              <EmptyState>No stage bars.</EmptyState>
            </div>
          )}
        </Panel>
      </div>

      {(timeline.length > 1 || grouped || firm.deal_count > 0) && (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel>
            <h2 className="title text-[1.2rem]">Investment activity</h2>
            <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
              Overlapping Signal deals by month
            </p>
            {timeline.length > 1 ? (
              <AreaChart
                className="mt-4"
                series={timeline}
                height={180}
                color="var(--signal)"
                formatValue={(v) => String(Math.round(v))}
              />
            ) : (
              <div className="mt-4">
                <EmptyState>Need dated deals for a timeline.</EmptyState>
              </div>
            )}
          </Panel>
          <Panel>
            <h2 className="title text-[1.2rem]">Deal funnel</h2>
            <FunnelChart className="mt-4" steps={funnel} height={190} />
          </Panel>
        </div>
      )}

      {grouped && (
        <Panel>
          <h2 className="title text-[1.2rem]">Themes vs stages</h2>
          <GroupedBarChart
            className="mt-4"
            groups={grouped}
            seriesKeys={["themes", "stages"]}
            seriesLabels={{ themes: "Themes", stages: "Stages" }}
            colors={["var(--signal)", "var(--deep)"]}
            height={190}
          />
        </Panel>
      )}

      {!!funds.length && (
        <Panel className="border-[var(--deep)]/35 bg-[var(--deep-dim)]">
          <Eyebrow className="!text-[var(--deep)]">Fund size & vehicles</Eyebrow>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h2 className="title text-[1.35rem]">Capital raised on the peer set</h2>
            <div className="mono text-[1.4rem] text-[var(--deep)]">{formatFund(capital)}</div>
          </div>
          {!!fundBars.length && (
            <BarChart
              className="mt-5"
              series={fundBars}
              height={160}
              color="var(--deep)"
              formatValue={(v) => formatFund(v)}
            />
          )}
          <div className="mt-5 space-y-4">
            {funds.map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--panel)]/70 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-semibold">{f.vehicle}</div>
                  <div className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                    {f.sector_focus}
                    {f.stage_focus ? ` · ${f.stage_focus}` : ""} · {f.announced_date}
                  </div>
                  <p className="mt-2 text-[0.9rem] text-[var(--muted)]">{f.notes}</p>
                </div>
                <div className="text-right">
                  <div className="mono text-[1.1rem] text-[var(--deep)]">{formatFund(f.size_m)}</div>
                  <div className="mt-1 label-caps text-[var(--faint)]">{f.freshness}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Panel>
          <h2 className="title text-[1.2rem]">Frequent co-investors</h2>
          {coinvestBars.length ? (
            <>
              <BarChart className="mt-4" series={coinvestBars} height={150} color="var(--ok)" />
              <div className="mt-4 space-y-2">
                {firm.top_coinvestors.slice(0, 8).map((p) => (
                  <div key={p.firm} className="flex justify-between gap-3 text-sm">
                    <span className="text-[var(--muted)]">{p.firm}</span>
                    <span className="mono text-[var(--ok)]">{p.count}×</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4">
              <EmptyState>No co-investor overlap yet.</EmptyState>
            </div>
          )}
        </Panel>
        <Panel>
          <h2 className="title text-[1.2rem]">Thesis alignment</h2>
          <BenchmarkBars
            className="mt-4"
            rows={[
              {
                label: "Focus alignment",
                value: firm.focus_alignment,
                max: 100,
                format: firm.focus_alignment.toFixed(0),
                good: true,
              },
              {
                label: "Drift score",
                value: firm.drift_score,
                max: 100,
                format: firm.drift_score.toFixed(0),
                good: firm.drift_score < 30,
              },
              {
                label: "Off-thesis deals",
                value: firm.off_thesis_count,
                max: Math.max(firm.deal_count, 1),
                format: String(firm.off_thesis_count),
                good: firm.off_thesis_count === 0,
              },
              {
                label: "Lead share",
                value: firm.deal_count ? (100 * firm.lead_count) / firm.deal_count : 0,
                max: 100,
                format: firm.deal_count
                  ? `${Math.round((100 * firm.lead_count) / firm.deal_count)}%`
                  : "—",
                good: true,
              },
            ]}
          />
        </Panel>
      </div>

      {battle && (
        <Panel className="border-[var(--deep)]/40 bg-[var(--deep-dim)]">
          <Eyebrow className="!text-[var(--deep)]">Battle card</Eyebrow>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <BattleBlock label="How they win" body={battle.how_they_win} />
            <BattleBlock label="Where they're weak" body={battle.where_they_are_weak} />
            <BattleBlock label="Partner or compete" body={battle.partner_or_compete} />
            <BattleBlock label="Call when" body={battle.call_when} />
          </div>
        </Panel>
      )}

      <PartnerLogPanel
        targetType="competitor"
        targetId={firm.slug}
        targetLabel={firm.name}
        title="Partner log"
        description="Syndicate posture, call notes, and competitive reads — shared across the partnership."
      />

      {!!firm.thesis_shifts.length && (
        <Panel className="border-[var(--warn)] bg-[var(--warn-dim)]">
          <Eyebrow className="!text-[var(--warn)]">Thesis shifts</Eyebrow>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {firm.thesis_shifts.map((s) => (
              <div key={s.id} className="rounded-[12px] border border-[var(--line)] bg-[var(--panel)]/60 px-4 py-3">
                <div className="font-medium">
                  <CompanyLink id={s.company_id} name={s.company_name || "Company"} />
                </div>
                <div className="mt-1 text-[0.8125rem] text-[var(--muted)]">{s.notes}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <section className="panel overflow-hidden !p-0">
        <PanelHead title="Investments in Signal" />
        <div className="divide-y divide-[var(--line)]">
          {firm.deals.map((d) => (
            <Link
              key={d.company_id}
              href={`/company/${d.slug || d.company_id}`}
              className="flex items-start justify-between gap-3 px-5 py-3.5 transition hover:bg-white/[0.03]"
            >
              <div>
                <div className="font-semibold">{d.company_name}</div>
                <div className="mt-0.5 text-[0.8125rem] text-[var(--muted)]">
                  {d.theme} · {d.round} · {d.date || "—"}
                  {d.is_lead ? " · LEAD" : ""}
                  {!d.on_thesis_flag ? " · OFF-THESIS" : ""}
                </div>
              </div>
              <div className="text-right">
                <RecBadge rec={d.recommendation} />
                <div className="mono mt-1.5 text-sm text-[var(--signal)]">
                  {d.thesis_score != null ? d.thesis_score.toFixed(0) : "—"}
                </div>
              </div>
            </Link>
          ))}
          {!firm.deals.length && (
            <div className="px-5 py-6">
              <EmptyState>No overlapping pipeline companies yet.</EmptyState>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-[12px] border border-[var(--line)] bg-[var(--panel)]/85 px-3 py-3 backdrop-blur-sm">
      <div
        className={cn(
          "mono text-xl md:text-2xl",
          warn ? "text-[var(--warn)]" : accent ? "text-[var(--signal)]" : "text-[var(--text)]",
        )}
      >
        {value}
      </div>
      <div className="mt-1 label-caps text-[var(--faint)]">{label}</div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "signal" | "warn" | "ok";
}) {
  const toneClass =
    tone === "signal"
      ? "text-[var(--signal)]"
      : tone === "warn"
        ? "text-[var(--warn)]"
        : tone === "ok"
          ? "text-[var(--ok)]"
          : "text-[var(--text)]";
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--panel)] px-4 py-3.5">
      <div className="label-caps text-[var(--faint)]">{label}</div>
      <div className={cn("mono mt-1.5 text-[1.2rem]", toneClass)}>{value}</div>
    </div>
  );
}

function BattleBlock({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="label-caps text-[var(--faint)]">{label}</div>
      <p className="mt-1.5 text-[0.975rem] leading-relaxed text-[var(--text)]/90">{body}</p>
    </div>
  );
}
