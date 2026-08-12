/**
 * GP Desk — the partner operating cockpit.
 *
 * Command (/) is the brand landing. Meeting is the partner ritual.
 * LP Desk is for the LP conversation. This is what GPs open on a Tuesday:
 * attention queue, firm health, competitive pulse, analytics, and every surface link.
 */

import { buildGoldenPack, type GoldenInsight, type GoldenPack } from "@/lib/goldenInsights";
import {
  buildJudgmentPack,
  type FounderHit,
  type JudgmentPack,
  type MissCase,
  type PartnerOverride,
} from "@/lib/judgment";
import {
  diligenceProgress,
  STAGE_LABEL,
  trailsNeedingMeeting,
  type DealTrail,
  type IcStage,
} from "@/lib/icTrail";
import { buildPeerIntelligence } from "@/lib/peerIntel";
import type {
  AlertItem,
  Commentary,
  Company,
  DigestRow,
  NewsItem,
  PeerActivity,
  SectorCall,
} from "@/lib/types";
import { fmtMoneyM, portfolioMix } from "@/lib/utils";

export type GpKpi = {
  id: string;
  label: string;
  value: string;
  note: string;
  tone: "signal" | "deep" | "warn" | "ok" | "muted";
  href?: string;
};

export type GpQueueItem = {
  id: string;
  kind: "deal" | "alert" | "ic" | "insight" | "founder" | "stale" | "miss";
  urgency: "now" | "this_week" | "monitor";
  title: string;
  subtitle: string;
  meta: string[];
  href?: string;
  score?: number | null;
  recommendation?: string | null;
};

export type GpBreakdownRow = {
  key: string;
  label: string;
  count: number;
  pct: number;
  tone?: "signal" | "deep" | "warn" | "muted";
};

export type GpSurfaceLink = {
  href: string;
  group: "Decide" | "Research" | "Operate" | "External";
  label: string;
  blurb: string;
};

export type GpDeskPack = {
  generated_at: string;
  headline: string;
  counsel: string;
  last_refreshed: string;
  live_signals: string;
  kpis: GpKpi[];
  attention: GpQueueItem[];
  hot_deals: Company[];
  recommendation: GpBreakdownRow[];
  themes: GpBreakdownRow[];
  stages: GpBreakdownRow[];
  score_bands: GpBreakdownRow[];
  tier1_quality: GpBreakdownRow[];
  capital: {
    deep_dive_round_sum_m: number;
    avg_deep_dive_score: number;
    avg_tier1_on_deep: number;
    median_yoy_deep: number | null;
  };
  mix: ReturnType<typeof portfolioMix> & { status: string; counsel: string };
  alerts_high: AlertItem[];
  sectors: SectorCall[];
  peer_pulse: {
    thesis_shifts: number;
    on_thesis: number;
    off_thesis: number;
    recent: PeerActivity[];
  };
  golden: {
    now: GoldenInsight[];
    proprietary: GoldenPack["proprietary_deals"];
    whitespace: number;
    races: number;
    must_do: string[];
    watch: string[];
  };
  judgment: {
    founder_radar: FounderHit[];
    misses: MissCase[];
    stale_freshness: number;
    overrides: number;
    digest_winner: string;
  };
  ic: {
    active: number;
    needing_meeting: number;
    by_stage: GpBreakdownRow[];
    trails: { name: string; stage: string; sponsor: string; href?: string; dd: string }[];
  };
  library: {
    news: NewsItem[];
    news_count: number;
    commentary_count: number;
    stale_companies: Company[];
  };
  digest: DigestRow | null;
  surfaces: GpSurfaceLink[];
  brief_md: string;
};

function pct(n: number, total: number) {
  if (!total) return 0;
  return Math.round((100 * n) / total);
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function companyHref(c: { id: string; slug?: string | null }) {
  return `/company/${c.slug || c.id}`;
}

function breakdown(
  rows: { key: string; label: string; count: number; tone?: GpBreakdownRow["tone"] }[],
  total: number,
): GpBreakdownRow[] {
  return rows
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((r) => ({ ...r, pct: pct(r.count, total) }));
}

export const GP_SURFACES: GpSurfaceLink[] = [
  {
    href: "/meeting",
    group: "Decide",
    label: "Partner Meeting OS",
    blurb: "90-minute agenda — decide, diligence, intel, firm.",
  },
  {
    href: "/ic",
    group: "Decide",
    label: "IC Decision Trail",
    blurb: "Stages, DD checklists, votes, Pass spine.",
  },
  {
    href: "/compare",
    group: "Decide",
    label: "Deal compare",
    blurb: "Side-by-side thesis dims before partner hours.",
  },
  {
    href: "/work",
    group: "Decide",
    label: "Work queue",
    blurb: "Associate handoffs + kind-no drafts (never auto-send).",
  },
  {
    href: "/pipeline",
    group: "Decide",
    label: "Full pipeline",
    blurb: "Filterable scored table — relative rank intact.",
  },
  {
    href: "/digest",
    group: "Decide",
    label: "M/W/F digest",
    blurb: "Hard-capped selectivity preview before it hits inbox.",
  },
  {
    href: "/search",
    group: "Research",
    label: "Company research",
    blurb: "Type any name → full IC brief + stress pack.",
  },
  {
    href: "/atlas",
    group: "Research",
    label: "Signal Atlas",
    blurb: "Market maps, warm paths, growth bands, pulse, raise windows.",
  },
  {
    href: "/os",
    group: "Research",
    label: "Signal AI OS",
    blurb: "War rooms, alpha feed, pwMOIC, thesis autopilot.",
  },
  {
    href: "/edge",
    group: "Research",
    label: "Partner Edge",
    blurb: "Anti consensus, clocks, twin, refs, what if, pre mortem.",
  },
  {
    href: "/peers",
    group: "Research",
    label: "Competitor intel",
    blurb: "Golden insights, syndicate unlocks, battle cards.",
  },
  {
    href: "/sectors",
    group: "Research",
    label: "Sector of Tomorrow",
    blurb: "Contrarian + emerging before consensus.",
  },
  {
    href: "/judgment",
    group: "Operate",
    label: "Judgment OS",
    blurb: "Overrides, miss retros, freshness SLA, mix drift.",
  },
  {
    href: "/library",
    group: "Operate",
    label: "Partner library",
    blurb: "News, commentary, watchlist, stale queue.",
  },
  {
    href: "/chat",
    group: "Operate",
    label: "Ask Signal",
    blurb: "Grounded Q&A over the same store (⌘K).",
  },
  {
    href: "/lp",
    group: "External",
    label: "LP Dashboard",
    blurb: "AI-in-process narrative LPs can diligence.",
  },
];

export function buildGpDeskPack(
  companies: Company[],
  peers: PeerActivity[],
  commentary: Commentary[],
  news: NewsItem[],
  alerts: AlertItem[],
  sectors: SectorCall[],
  trails: DealTrail[],
  digest: DigestRow | null,
  lastRefreshed: string,
  liveSignals: string,
  overrides: PartnerOverride[] = [],
): GpDeskPack {
  const judgment: JudgmentPack = buildJudgmentPack(
    companies,
    peers,
    commentary,
    news,
    alerts,
    overrides,
  );
  const intel = buildPeerIntelligence(companies, peers);
  const golden = buildGoldenPack(intel, companies);
  const mixBase = portfolioMix(companies);

  const deep = companies.filter((c) => c.recommendation === "Deep Dive");
  const watch = companies.filter((c) => c.recommendation === "Watch");
  const pass = companies.filter((c) => c.recommendation === "Pass");
  const staleCompanies = companies.filter(
    (c) => c.is_stale || c.review_status === "Pending Partner Review",
  );
  const highAlerts = alerts.filter((a) => a.severity === "high");
  const needing = trailsNeedingMeeting(trails);
  const activeIc = trails.filter((t) =>
    ["deep_dive", "diligence", "partner_meeting", "ic_vote", "term_sheet"].includes(t.stage),
  );

  const thesisShifts = peers.filter((p) => p.thesis_shift).length;
  const onThesis = peers.filter((p) => p.on_thesis_flag).length;
  const offThesis = peers.filter((p) => p.on_thesis_flag === false).length;

  const avgDeep =
    deep.length > 0
      ? deep.reduce((s, c) => s + (c.thesis_score || 0), 0) / deep.length
      : 0;
  const avgT1 =
    deep.length > 0
      ? deep.reduce((s, c) => s + (c.tier1_count || 0), 0) / deep.length
      : 0;
  const deepRoundSum = deep.reduce((s, c) => s + (c.last_round_size_m || 0), 0);
  const medianYoy = median(
    deep.map((c) => c.yoy_growth_pct).filter((v): v is number => v != null),
  );

  const hot = companies
    .filter((c) => c.recommendation === "Deep Dive" || (c.thesis_score || 0) >= 78)
    .slice(0, 8);

  const attention: GpQueueItem[] = [];

  for (const a of highAlerts.slice(0, 4)) {
    attention.push({
      id: `alert_${a.id}`,
      kind: "alert",
      urgency: "now",
      title: a.title || "High-severity alert",
      subtitle: a.body || "",
      meta: [a.alert_type || "alert", a.severity || "high"],
      href: a.company_id ? `/company/${a.company_id}` : undefined,
    });
  }

  for (const t of needing.slice(0, 5)) {
    const prog = diligenceProgress(t.diligence);
    attention.push({
      id: `ic_${t.company_id}`,
      kind: "ic",
      urgency:
        t.stage === "ic_vote" || t.stage === "term_sheet" ? "now" : "this_week",
      title: t.company_name,
      subtitle: `${STAGE_LABEL[t.stage]} · sponsor ${t.sponsor}`,
      meta: [
        `DD ${prog.done}/${prog.total}`,
        t.votes.length ? `${t.votes.length} vote(s)` : "No votes",
        ...(t.check_size_m ? [`$${t.check_size_m}M check`] : []),
      ],
      href: t.slug ? `/company/${t.slug}` : "/ic",
    });
  }

  for (const g of golden.insights.filter((i) => i.urgency === "now").slice(0, 4)) {
    attention.push({
      id: `ins_${g.id}`,
      kind: "insight",
      urgency: "now",
      title: g.title,
      subtitle: g.action,
      meta: [g.kind, `score ${g.score}`],
      href: g.hrefs?.[0]?.href,
    });
  }

  for (const f of judgment.founder_radar.filter((h) => h.urgency === "now").slice(0, 3)) {
    attention.push({
      id: `founder_${f.id}`,
      kind: "founder",
      urgency: "now",
      title: f.founder,
      subtitle: f.signal,
      meta: [f.source, f.action],
      href: f.company_slug ? `/company/${f.company_slug}` : "/judgment",
    });
  }

  for (const m of judgment.misses.filter((x) => x.severity === "high").slice(0, 2)) {
    attention.push({
      id: `miss_${m.id}`,
      kind: "miss",
      urgency: "this_week",
      title: `Miss review · ${m.company_name}`,
      subtitle: m.gap,
      meta: [m.then_rec, m.action],
      href: m.slug ? `/company/${m.slug}` : "/judgment",
    });
  }

  for (const c of staleCompanies.slice(0, 3)) {
    attention.push({
      id: `stale_${c.id}`,
      kind: "stale",
      urgency: "monitor",
      title: c.name,
      subtitle: "≥90d no signal — partner review",
      meta: [c.recommendation || "—", `score ${c.thesis_score?.toFixed(0) ?? "—"}`],
      href: companyHref(c),
    });
  }

  const urgencyRank = (u: GpQueueItem["urgency"]) =>
    u === "now" ? 0 : u === "this_week" ? 1 : 2;
  attention.sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency));

  const recRows = breakdown(
    [
      { key: "deep", label: "Deep Dive", count: deep.length, tone: "signal" },
      { key: "watch", label: "Watch", count: watch.length, tone: "deep" },
      { key: "pass", label: "Pass", count: pass.length, tone: "muted" },
    ],
    companies.length,
  );

  const themeMap = new Map<string, number>();
  for (const c of companies) {
    const t = c.subsector || c.sector_theme || "Uncategorized";
    themeMap.set(t, (themeMap.get(t) || 0) + 1);
  }
  const themes = breakdown(
    [...themeMap.entries()].map(([label, count]) => ({
      key: label,
      label,
      count,
      tone: "signal" as const,
    })),
    companies.length,
  ).slice(0, 8);

  const stageMap = new Map<string, number>();
  for (const c of companies) {
    const s = c.stage || "Unknown";
    stageMap.set(s, (stageMap.get(s) || 0) + 1);
  }
  const stages = breakdown(
    [...stageMap.entries()].map(([label, count]) => ({
      key: label,
      label,
      count,
      tone: "deep" as const,
    })),
    companies.length,
  );

  const bands = [
    { key: "90+", label: "90–100", min: 90, max: 101, tone: "signal" as const },
    { key: "80-89", label: "80–89", min: 80, max: 90, tone: "signal" as const },
    { key: "70-79", label: "70–79", min: 70, max: 80, tone: "deep" as const },
    { key: "60-69", label: "60–69", min: 60, max: 70, tone: "warn" as const },
    { key: "<60", label: "Below 60", min: 0, max: 60, tone: "muted" as const },
  ];
  const score_bands = breakdown(
    bands.map((b) => ({
      key: b.key,
      label: b.label,
      count: companies.filter(
        (c) => (c.thesis_score ?? -1) >= b.min && (c.thesis_score ?? -1) < b.max,
      ).length,
      tone: b.tone,
    })),
    companies.length,
  );

  const t1Bands = [
    { key: "3+", label: "3–4+ Tier-1", min: 3, tone: "signal" as const },
    { key: "2", label: "2 Tier-1", min: 2, max: 3, tone: "deep" as const },
    { key: "1", label: "1 Tier-1", min: 1, max: 2, tone: "warn" as const },
    { key: "0", label: "No Tier-1", min: 0, max: 1, tone: "muted" as const },
  ];
  const tier1_quality = breakdown(
    t1Bands.map((b) => ({
      key: b.key,
      label: b.label,
      count: companies.filter((c) => {
        const n = c.tier1_count || 0;
        if (b.max == null) return n >= b.min;
        return n >= b.min && n < b.max!;
      }).length,
      tone: b.tone,
    })),
    companies.length,
  );

  const icStageCounts = new Map<IcStage, number>();
  for (const t of trails) {
    icStageCounts.set(t.stage, (icStageCounts.get(t.stage) || 0) + 1);
  }
  const icByStage = breakdown(
    [...icStageCounts.entries()].map(([stage, count]) => ({
      key: stage,
      label: STAGE_LABEL[stage],
      count,
      tone:
        stage === "ic_vote" || stage === "term_sheet"
          ? ("warn" as const)
          : stage === "pass"
            ? ("muted" as const)
            : ("deep" as const),
    })),
    trails.length || 1,
  );

  const mustFromJudgment = judgment.summary.must_do.slice(0, 3);
  const mustFromGolden = golden.weekly_brief.must_do.slice(0, 3);
  const must_do = [...new Set([...mustFromJudgment, ...mustFromGolden])].slice(0, 5);

  const headline =
    highAlerts.length || needing.some((t) => t.stage === "ic_vote" || t.stage === "term_sheet")
      ? "Partner attention required"
      : deep.length
        ? `${deep.length} Deep Dives holding the line`
        : "Pipeline quiet — research or refresh";

  const counselParts = [
    judgment.mix_drift.alarm || judgment.mix_drift.counsel,
    judgment.summary.headline,
    highAlerts.length ? `${highAlerts.length} high-severity alert(s)` : null,
    needing.length ? `${needing.length} IC item(s) for meeting` : null,
  ].filter(Boolean);

  const kpis: GpKpi[] = [
    {
      id: "pipeline",
      label: "Pipeline",
      value: String(companies.length),
      note: "Living scored set",
      tone: "signal",
      href: "/pipeline",
    },
    {
      id: "deep",
      label: "Deep Dive",
      value: String(deep.length),
      note: "Precision focus, not recall",
      tone: "signal",
      href: "/pipeline",
    },
    {
      id: "mix",
      label: "Mix D / T",
      value: `${mixBase.dominantPct}/${mixBase.tacticalPct}`,
      note: `Target 60/40 · ${judgment.mix_drift.status.replace("_", " ")}`,
      tone:
        judgment.mix_drift.status === "hard_drift"
          ? "warn"
          : judgment.mix_drift.status === "soft_drift"
            ? "warn"
            : "ok",
      href: "/judgment",
    },
    {
      id: "alerts",
      label: "High alerts",
      value: String(highAlerts.length),
      note: "Instant — not digest",
      tone: highAlerts.length ? "warn" : "muted",
    },
    {
      id: "ic",
      label: "Active IC",
      value: String(activeIc.length),
      note: `${needing.length} need meeting time`,
      tone: "deep",
      href: "/ic",
    },
    {
      id: "stale",
      label: "Stale review",
      value: String(staleCompanies.length),
      note: "Partner review",
      tone: staleCompanies.length ? "warn" : "muted",
      href: "/library?tab=stale",
    },
    {
      id: "signals",
      label: "Live signals",
      value: liveSignals || "0",
      note: "Last ingest pulse",
      tone: "deep",
    },
    {
      id: "avg",
      label: "Avg Deep score",
      value: avgDeep ? avgDeep.toFixed(0) : "—",
      note: `Median YoY ${medianYoy != null ? `${medianYoy.toFixed(0)}%` : "—"}`,
      tone: "signal",
    },
  ];

  const brief_md = [
    `# GP Desk — Thirdbase`,
    ``,
    `**${headline}**`,
    ``,
    counselParts.join(" · "),
    ``,
    `Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · Refresh ${lastRefreshed || "—"}`,
    ``,
    `## Snapshot`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| Pipeline | ${companies.length} |`,
    `| Deep Dive / Watch / Pass | ${deep.length} / ${watch.length} / ${pass.length} |`,
    `| Mix (D/T) | ${mixBase.dominantPct}/${mixBase.tacticalPct} (${judgment.mix_drift.status}) |`,
    `| High alerts | ${highAlerts.length} |`,
    `| Active IC | ${activeIc.length} |`,
    `| Stale reviews | ${staleCompanies.length} |`,
    `| Thesis shifts (peers) | ${thesisShifts} |`,
    `| Proprietary windows | ${golden.proprietary_deals.length} |`,
    ``,
    `## Must-do`,
    ``,
    ...must_do.map((m) => `- ${m}`),
    ``,
    `## Hot Deals`,
    ``,
    ...hot.slice(0, 6).map(
      (c) =>
        `- **${c.name}** (${c.thesis_score?.toFixed(0) ?? "—"}) — ${c.recommendation} · ${c.why_now || c.one_liner || ""}`,
    ),
    ``,
    `## Attention queue`,
    ``,
    ...attention.slice(0, 10).map(
      (a) => `- [${a.urgency}] **${a.title}** — ${a.subtitle}${a.href ? ` → ${a.href}` : ""}`,
    ),
    ``,
    `## Capital on Deep Dives`,
    ``,
    `- Last-round sum (Deep Dive set): ${fmtMoneyM(deepRoundSum)}`,
    `- Avg Tier-1 count: ${avgT1.toFixed(1)}`,
    `- Avg thesis score: ${avgDeep.toFixed(0)}`,
    ``,
    `## Surfaces`,
    ``,
    ...GP_SURFACES.map((s) => `- [${s.group}] ${s.label}: ${s.href}`),
    ``,
    `_Signal · attention allocation OS_`,
  ].join("\n");

  return {
    generated_at: new Date().toISOString(),
    headline,
    counsel: counselParts.join(" · "),
    last_refreshed: lastRefreshed,
    live_signals: liveSignals,
    kpis,
    attention: attention.slice(0, 14),
    hot_deals: hot,
    recommendation: recRows,
    themes,
    stages,
    score_bands,
    tier1_quality,
    capital: {
      deep_dive_round_sum_m: deepRoundSum,
      avg_deep_dive_score: avgDeep,
      avg_tier1_on_deep: avgT1,
      median_yoy_deep: medianYoy,
    },
    mix: {
      ...mixBase,
      status: judgment.mix_drift.status,
      counsel: judgment.mix_drift.counsel,
    },
    alerts_high: highAlerts.slice(0, 6),
    sectors: sectors.slice(0, 5),
    peer_pulse: {
      thesis_shifts: thesisShifts,
      on_thesis: onThesis,
      off_thesis: offThesis,
      recent: peers.slice(0, 6),
    },
    golden: {
      now: golden.insights.filter((i) => i.urgency === "now").slice(0, 5),
      proprietary: golden.proprietary_deals.slice(0, 4),
      whitespace: golden.stats.whitespace_themes,
      races: golden.stats.crowded_races,
      must_do,
      watch: golden.weekly_brief.watch.slice(0, 4),
    },
    judgment: {
      founder_radar: judgment.founder_radar.slice(0, 5),
      misses: judgment.misses.slice(0, 4),
      stale_freshness: judgment.freshness.filter(
        (f) => f.overall === "stale" || f.overall === "aging",
      ).length,
      overrides: judgment.overrides.length,
      digest_winner: judgment.digest_selectivity.winner,
    },
    ic: {
      active: activeIc.length,
      needing_meeting: needing.length,
      by_stage: icByStage,
      trails: activeIc.slice(0, 8).map((t) => {
        const prog = diligenceProgress(t.diligence);
        return {
          name: t.company_name,
          stage: STAGE_LABEL[t.stage],
          sponsor: t.sponsor,
          href: t.slug ? `/company/${t.slug}` : "/ic",
          dd: `${prog.done}/${prog.total}`,
        };
      }),
    },
    library: {
      news: news.slice(0, 5),
      news_count: news.length,
      commentary_count: commentary.length,
      stale_companies: staleCompanies.slice(0, 6),
    },
    digest,
    surfaces: GP_SURFACES,
    brief_md,
  };
}
