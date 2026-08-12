/**
 * LP Dashboard — what sophisticated LPs need when diligence-ing process & judgment.
 *
 * Not fake NAV/IRR theater. Pipeline analytics, thesis adherence, governance health,
 * selectivity, peer context, and a one-pager you can send after the meeting.
 */

import { buildJudgmentPack, type PartnerOverride } from "@/lib/judgment";
import {
  diligenceProgress,
  STAGE_LABEL,
  voteSummary,
  type DealTrail,
  type IcStage,
} from "@/lib/icTrail";
import type {
  AlertItem,
  Commentary,
  Company,
  NewsItem,
  PeerActivity,
  SectorCall,
} from "@/lib/types";
import { portfolioMix } from "@/lib/utils";

export type LpPrinciple = {
  id: string;
  title: string;
  for_lp: string;
  evidence: string;
};

export type LpMetric = {
  label: string;
  value: string;
  note: string;
  tone?: "signal" | "deep" | "ok" | "warn";
};

export type ProcessStep = {
  step: number;
  title: string;
  owner: string;
  ai_role: string;
  human_role: string;
};

export type GovernanceCase = {
  company_name: string;
  company_slug?: string | null;
  stage: string;
  outcome: string;
  paper_trail: string[];
  lp_why_it_matters: string;
};

export type FunnelStep = {
  label: string;
  count: number;
  pct: number;
  href: string;
};

export type SectorSlice = {
  name: string;
  count: number;
  pct: number;
  deepDive: number;
  avgScore: number | null;
};

export type StageSlice = {
  stage: string;
  count: number;
  pct: number;
};

export type QualityStat = {
  label: string;
  value: string;
  detail: string;
  href?: string;
};

export type ScoreBand = {
  band: string;
  count: number;
  pct: number;
};

export type PeerSnapshot = {
  firm: string;
  moves: number;
  offThesis: number;
  latest?: string | null;
};

export type LpLink = {
  label: string;
  href: string;
  blurb: string;
  group: "process" | "pipeline" | "governance" | "intel";
};

export type ValueAdd = {
  title: string;
  for_lp: string;
  proof: string;
};

export type LpDeskPack = {
  generated_at: string;
  headline: string;
  elevator: string;
  principles: LpPrinciple[];
  metrics: LpMetric[];
  kpis: LpMetric[];
  funnel: FunnelStep[];
  sectors: SectorSlice[];
  stages: StageSlice[];
  score_bands: ScoreBand[];
  quality: QualityStat[];
  peer_snapshot: PeerSnapshot[];
  emerging_sectors: { name: string; heat: number; consensus: string; why: string }[];
  process: ProcessStep[];
  governance: GovernanceCase[];
  ic_stage_counts: { stage: string; count: number }[];
  risks_and_controls: { risk: string; control: string }[];
  value_adds: ValueAdd[];
  links: LpLink[];
  talking_points: string[];
  one_pager_md: string;
  health: {
    mix_status: string;
    mix_counsel: string;
    freshness_aging: number;
    overrides: number;
    misses: number;
    documented_passes: number;
    high_alerts: number;
  };
};

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function pctOf(n: number, total: number) {
  if (!total) return 0;
  return Math.round((100 * n) / total);
}

export function buildLpDeskPack(
  companies: Company[],
  peers: PeerActivity[],
  commentary: Commentary[],
  news: NewsItem[],
  alerts: AlertItem[],
  trails: DealTrail[],
  overrides: PartnerOverride[] = [],
  sectorCalls: SectorCall[] = [],
): LpDeskPack {
  const judgment = buildJudgmentPack(companies, peers, commentary, news, alerts, overrides);
  const mix = portfolioMix(companies);
  const deep = companies.filter((c) => c.recommendation === "Deep Dive");
  const watch = companies.filter((c) => c.recommendation === "Watch");
  const pass = companies.filter((c) => c.recommendation === "Pass");
  const stale = companies.filter((c) => c.is_stale || c.review_status === "Pending Partner Review");
  const withVotes = trails.filter((t) => t.votes.length > 0);
  const documentedPasses = trails.filter((t) => t.stage === "pass");
  const activeIc = trails.filter((t) => !["pass", "watch", "sourced"].includes(t.stage));
  const highAlerts = alerts.filter((a) => a.severity === "high");
  const offThesisPeers = peers.filter((p) => p.thesis_shift || p.on_thesis_flag === false);
  const tier1Dense = companies.filter((c) => (c.tier1_count || 0) >= 2);
  const growthOk = companies.filter((c) => (c.yoy_growth_pct || 0) >= 40);
  const scores = companies
    .map((c) => c.thesis_score)
    .filter((s): s is number => typeof s === "number");
  const avgScore = avg(scores);
  const deepScores = deep
    .map((c) => c.thesis_score)
    .filter((s): s is number => typeof s === "number");

  const principles: LpPrinciple[] = [
    {
      id: "attention",
      title: "Attention allocation, not coverage vanity",
      for_lp:
        "Partner hours are the scarce asset. Signal hard-caps what reaches the partnership so false positives don't burn weeks.",
      evidence: `Pipeline ${companies.length} · Deep Dive ${deep.length} · Watch ${watch.length} · Pass ${pass.length} (selectivity is intentional)`,
    },
    {
      id: "thesis",
      title: "Thesis is constitution, not a prompt",
      for_lp:
        "Investment criteria live in version-controlled policy (60/40 mix, Tier-1 quality, growth, moat, runway). Models write prose; policy decides.",
      evidence: `Current mix ${mix.dominantPct}/${mix.tacticalPct} vs 60/40 target · status ${judgment.mix_drift.status}`,
    },
    {
      id: "hitl",
      title: "Human-in-the-loop on destructive actions",
      for_lp:
        "Nothing is auto-deleted. Stale names (≥90d) require partner review. Overrides are logged as policy fuel.",
      evidence: `${stale.length} pending stale reviews · ${judgment.overrides.length} logged overrides · ${judgment.misses.length} miss retros`,
    },
    {
      id: "provenance",
      title: "Provenance over eloquence",
      for_lp:
        "Material fields carry confidence and source. Estimated valuations are labeled. Hallucinated private numbers are a process failure.",
      evidence: `${judgment.freshness.filter((f) => f.overall === "stale" || f.overall === "aging").length} companies with aging/stale evidence haircuts`,
    },
    {
      id: "governance",
      title: "IC trail for every material decision",
      for_lp:
        "Stages, diligence checklists, votes, and Pass reasons are retained — the same trail LPs ask for in DD and auditors expect.",
      evidence: `${trails.length} deals on trail · ${withVotes.length} with recorded votes · ${documentedPasses.length} documented Passes`,
    },
  ];

  const funnel: FunnelStep[] = [
    {
      label: "Pipeline",
      count: companies.length,
      pct: 100,
      href: "/pipeline",
    },
    {
      label: "Watch",
      count: watch.length,
      pct: pctOf(watch.length, companies.length),
      href: "/library?tab=watchlist",
    },
    {
      label: "Deep Dive",
      count: deep.length,
      pct: pctOf(deep.length, companies.length),
      href: "/pipeline",
    },
    {
      label: "On IC trail",
      count: activeIc.length,
      pct: pctOf(activeIc.length, companies.length),
      href: "/ic",
    },
    {
      label: "Documented Pass",
      count: documentedPasses.length,
      pct: pctOf(documentedPasses.length, companies.length),
      href: "/ic",
    },
  ];

  const sectorMap = new Map<string, Company[]>();
  for (const c of companies) {
    const key = c.subsector || c.sector_theme || "Unclassified";
    const list = sectorMap.get(key) || [];
    list.push(c);
    sectorMap.set(key, list);
  }
  const sectors: SectorSlice[] = [...sectorMap.entries()]
    .map(([name, list]) => {
      const scored = list
        .map((c) => c.thesis_score)
        .filter((s): s is number => typeof s === "number");
      return {
        name,
        count: list.length,
        pct: pctOf(list.length, companies.length),
        deepDive: list.filter((c) => c.recommendation === "Deep Dive").length,
        avgScore: avg(scored),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const stageMap = new Map<string, number>();
  for (const c of companies) {
    const s = c.stage || "Unknown";
    stageMap.set(s, (stageMap.get(s) || 0) + 1);
  }
  const stages: StageSlice[] = [...stageMap.entries()]
    .map(([stage, count]) => ({
      stage,
      count,
      pct: pctOf(count, companies.length),
    }))
    .sort((a, b) => b.count - a.count);

  const score_bands: ScoreBand[] = [
    { band: "90+", count: 0, pct: 0 },
    { band: "80–89", count: 0, pct: 0 },
    { band: "70–79", count: 0, pct: 0 },
    { band: "60–69", count: 0, pct: 0 },
    { band: "<60", count: 0, pct: 0 },
  ];
  for (const s of scores) {
    const i = s >= 90 ? 0 : s >= 80 ? 1 : s >= 70 ? 2 : s >= 60 ? 3 : 4;
    score_bands[i].count += 1;
  }
  for (const b of score_bands) b.pct = pctOf(b.count, scores.length || companies.length);

  const quality: QualityStat[] = [
    {
      label: "Avg thesis score",
      value: avgScore != null ? String(avgScore) : "—",
      detail: deepScores.length
        ? `Deep Dive cohort avg ${avg(deepScores)}`
        : "Scored against encoded thesis policy",
      href: "/pipeline",
    },
    {
      label: "Tier-1 density",
      value: `${tier1Dense.length}`,
      detail: `Companies with ≥2 Tier-1 investors (${pctOf(tier1Dense.length, companies.length)}% of pipeline)`,
      href: "/peers",
    },
    {
      label: "Growth ≥40% YoY",
      value: `${growthOk.length}`,
      detail: "Names clearing the growth-stage bar in thesis policy",
      href: "/pipeline",
    },
    {
      label: "Selectivity",
      value: `${pctOf(deep.length, companies.length)}%`,
      detail: `Deep Dive share of pipeline · Pass ${pass.length} · Watch ${watch.length}`,
      href: "/judgment",
    },
    {
      label: "Evidence freshness",
      value: `${judgment.freshness.filter((f) => f.overall === "fresh").length}`,
      detail: `${judgment.freshness.filter((f) => f.overall === "aging" || f.overall === "stale").length} aging/stale with confidence haircuts`,
      href: "/judgment",
    },
    {
      label: "Stale pending review",
      value: `${stale.length}`,
      detail: "≥90d silence — partner must act",
      href: "/library?tab=stale",
    },
  ];

  const peerFirmMap = new Map<string, PeerActivity[]>();
  for (const p of peers) {
    const list = peerFirmMap.get(p.firm) || [];
    list.push(p);
    peerFirmMap.set(p.firm, list);
  }
  const peer_snapshot: PeerSnapshot[] = [...peerFirmMap.entries()]
    .map(([firm, list]) => ({
      firm,
      moves: list.length,
      offThesis: list.filter((p) => p.thesis_shift || p.on_thesis_flag === false).length,
      latest: list[0]?.company_name || list[0]?.notes || null,
    }))
    .sort((a, b) => b.moves - a.moves)
    .slice(0, 8);

  const emerging_sectors = sectorCalls
    .slice()
    .sort((a, b) => (b.heat_score || 0) - (a.heat_score || 0))
    .slice(0, 5)
    .map((s) => ({
      name: s.subsector,
      heat: s.heat_score || 0,
      consensus: s.consensus_level || "—",
      why: s.why_thirdbase_cares || (s.evidence || []).slice(0, 1).join("") || "Emerging subsector call",
    }));

  const kpis: LpMetric[] = [
    {
      label: "Pipeline",
      value: String(companies.length),
      note: "Living deal universe under thesis",
      tone: "signal",
    },
    {
      label: "Deep Dive",
      value: String(deep.length),
      note: `${pctOf(deep.length, companies.length)}% selectivity · attention is the KPI`,
      tone: "ok",
    },
    {
      label: "Thesis mix D/T",
      value: `${mix.dominantPct}/${mix.tacticalPct}`,
      note: judgment.mix_drift.alarm || "On / near 60/40 target",
      tone: judgment.mix_drift.status === "hard_drift" ? "warn" : "deep",
    },
    {
      label: "IC active",
      value: String(activeIc.length),
      note: `${withVotes.length} with votes · ${documentedPasses.length} Pass spine`,
      tone: "deep",
    },
    {
      label: "Overrides logged",
      value: String(judgment.overrides.length),
      note: "Partner disagreement → policy fuel",
      tone: "signal",
    },
    {
      label: "High alerts",
      value: String(highAlerts.length),
      note: `${offThesisPeers.length} peer off-thesis / shift flags`,
      tone: highAlerts.length ? "warn" : "ok",
    },
    {
      label: "Avg score",
      value: avgScore != null ? String(avgScore) : "—",
      note: "Across scored pipeline names",
      tone: "signal",
    },
    {
      label: "Commentary + news",
      value: `${commentary.length + news.length}`,
      note: `${commentary.length} commentary · ${news.length} curated news`,
      tone: "deep",
    },
  ];

  const metrics: LpMetric[] = kpis.slice(0, 4);

  const process: ProcessStep[] = [
    {
      step: 1,
      title: "Ingest & dedupe",
      owner: "Signal workers",
      ai_role: "Normalize market signals; never invent private valuations",
      human_role: "Set watchlists, peer set, thesis policy",
    },
    {
      step: 2,
      title: "Score under thesis",
      owner: "Scoring engine",
      ai_role: "Weighted score + relative rank within theme × stage",
      human_role: "Override when taste disagrees; log reason",
    },
    {
      step: 3,
      title: "Selective surfaces",
      owner: "Digest / Meeting OS",
      ai_role: "Hard-capped M/W/F digest + partner agenda",
      human_role: "Forward or ignore — habit is the KPI",
    },
    {
      step: 4,
      title: "Diligence & IC",
      owner: "Deal team",
      ai_role: "Draft IC packet, DD checklist, crowding/syndicate context",
      human_role: "Own conviction, votes, Pass spine",
    },
    {
      step: 5,
      title: "Learn",
      owner: "Head of AI + Partners",
      ai_role: "Miss retro + policy fuel from overrides",
      human_role: "Revise thesis_policy.yaml when pattern is real",
    },
  ];

  const governance: GovernanceCase[] = trails.slice(0, 6).map((t) => {
    const prog = diligenceProgress(t.diligence);
    const tally = voteSummary(t.votes);
    const co = companies.find((c) => c.id === t.company_id);
    return {
      company_name: t.company_name,
      company_slug: co?.slug || null,
      stage: STAGE_LABEL[t.stage],
      outcome:
        t.stage === "pass"
          ? "Documented Pass"
          : t.votes.length
            ? `Votes Y${tally.yes}/N${tally.no}/DD${tally.more_diligence}`
            : STAGE_LABEL[t.stage],
      paper_trail: [
        `Sponsor: ${t.sponsor}`,
        t.thesis_hook,
        `DD ${prog.done}/${prog.total}`,
        ...t.events.slice(0, 2).map((e) => `${STAGE_LABEL[e.stage]} — ${e.note}`),
      ],
      lp_why_it_matters:
        t.stage === "pass"
          ? "Shows the firm can say no with a paper trail — governance maturity."
          : "Demonstrates staged decisioning with diligence progress, not vibes.",
    };
  });

  const stageOrder: IcStage[] = [
    "sourced",
    "screened",
    "deep_dive",
    "diligence",
    "partner_meeting",
    "ic_vote",
    "term_sheet",
    "pass",
    "watch",
  ];
  const icCounts = new Map<string, number>();
  for (const t of trails) {
    icCounts.set(t.stage, (icCounts.get(t.stage) || 0) + 1);
  }
  const ic_stage_counts = stageOrder
    .filter((s) => icCounts.has(s))
    .map((s) => ({ stage: STAGE_LABEL[s], count: icCounts.get(s) || 0 }));

  const risks_and_controls = [
    {
      risk: "Model hallucination of funding / valuation",
      control:
        "Facts from stored signals with provenance; estimated fields labeled; human skim before digest send in early months",
    },
    {
      risk: "AI becomes a science project that distracts from investing",
      control: "Success = digest habit + Deep Dive precision + miss retros — not software ARR",
    },
    {
      risk: "Black-box auto-invest / auto-email founders",
      control: "Explicit non-goals. Signal routes attention inward; partners own external actions",
    },
    {
      risk: "Grey scraping / ToS risk",
      control: "Vendor APIs + licensed data; no authenticated scraping of Blind/LinkedIn/X",
    },
    {
      risk: "Process opacity for LPs",
      control: "This dashboard — encoded thesis, override ledger, IC trails, human stale review",
    },
  ];

  const value_adds: ValueAdd[] = [
    {
      title: "Audit-ready decision trail",
      for_lp: "Every material Pass / Deep Dive path has stages, votes, and diligence checklist state.",
      proof: `${trails.length} trails · ${documentedPasses.length} documented Passes · ${withVotes.length} vote records`,
    },
    {
      title: "Encoded strategy, not tribal memory",
      for_lp: "60/40 mix, Tier-1 bar, growth, moat, runway live in version-controlled policy LPs can read.",
      proof: `Mix ${mix.dominantPct}/${mix.tacticalPct} · status ${judgment.mix_drift.status}`,
    },
    {
      title: "Selective partner rituals",
      for_lp: "Hard-capped digests and partner agendas protect partner time — the scarce LP-funded asset.",
      proof: `${deep.length} Deep Dives from ${companies.length} · ${highAlerts.length} high-severity alerts`,
    },
    {
      title: "Learning loop",
      for_lp: "Overrides and miss retros become institutional preference data, not silent fine-tunes.",
      proof: `${judgment.overrides.length} overrides · ${judgment.misses.length} miss retros`,
    },
    {
      title: "Competitive awareness without FOMO theater",
      for_lp: "Peer moves, thesis drift, and crowding context sit next to conviction — not instead of it.",
      proof: `${peers.length} peer events · ${offThesisPeers.length} off-thesis / shift flags`,
    },
    {
      title: "Honest boundary with fund admin",
      for_lp: "TVPI, DPI, capital calls stay in fund admin. Signal owns judgment & process narrative.",
      proof: "ILPA CAS templates are not mocked here — by design",
    },
  ];

  const links: LpLink[] = [
    {
      label: "IC Decision Trail",
      href: "/ic",
      blurb: "Stages, DD checklists, votes, Pass spine",
      group: "governance",
    },
    {
      label: "Judgment OS",
      href: "/judgment",
      blurb: "Overrides, miss retros, freshness SLA, mix drift",
      group: "governance",
    },
    {
      label: "Partner Meeting OS",
      href: "/meeting",
      blurb: "Partner agenda capped to ~90 minutes",
      group: "process",
    },
    {
      label: "Digest",
      href: "/digest",
      blurb: "M/W/F selective priority email",
      group: "process",
    },
    {
      label: "Pipeline",
      href: "/pipeline",
      blurb: "Full thesis-ranked deal table",
      group: "pipeline",
    },
    {
      label: "Company search",
      href: "/search",
      blurb: "IC brief on any name — Pass / Watch / Deep Dive",
      group: "pipeline",
    },
    {
      label: "Competitor intel",
      href: "/peers",
      blurb: "Peer dossiers, heatmap, golden insights",
      group: "intel",
    },
    {
      label: "Sector of Tomorrow",
      href: "/sectors",
      blurb: "Contrarian + emerging subsector calls",
      group: "intel",
    },
    {
      label: "Partner library",
      href: "/library",
      blurb: "News, commentary, watchlist, stale queue",
      group: "intel",
    },
    {
      label: "Signal AI OS",
      href: "/os",
      blurb: "War rooms, alpha feed, thesis autopilot",
      group: "process",
    },
    {
      label: "Chat",
      href: "/chat",
      blurb: "Ask grounded questions over the same store",
      group: "process",
    },
  ];

  const talking_points = [
    "Show the living system: thesis policy, selective digest, IC trails, overrides.",
    `Snapshot: ${companies.length} pipeline · ${deep.length} Deep Dive · mix ${mix.dominantPct}/${mix.tacticalPct} · ${activeIc.length} on IC · ${documentedPasses.length} Passes.`,
    "Hot Deal precision under thesis — not coverage vanity.",
    "NAV / capital calls stay with fund admin; Signal owns the judgment trail.",
  ];

  const headline = "Process, analytics & governance";
  const elevator =
    "Thesis-encoded scoring, selective rituals, human-in-the-loop controls, IC trail. Models assist; partners convict.";

  const one_pager_md = [
    `# Signal — LP Dashboard One-Pager`,
    "",
    elevator,
    "",
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "## Live KPIs",
    ...kpis.map((m) => `- **${m.label}:** ${m.value} — ${m.note}`),
    "",
    "## Selectivity funnel",
    ...funnel.map((f) => `- ${f.label}: **${f.count}** (${f.pct}%)`),
    "",
    "## Principles",
    ...principles.map((p) => `- **${p.title}** — ${p.for_lp} (${p.evidence})`),
    "",
    "## Value for LPs",
    ...value_adds.map((v) => `- **${v.title}** — ${v.for_lp} _(${v.proof})_`),
    "",
    "## Controls",
    ...risks_and_controls.map((r) => `- **Risk:** ${r.risk} → **Control:** ${r.control}`),
    "",
    "## Talking points",
    ...talking_points.map((t) => `- ${t}`),
    "",
    "## Open in Signal",
    ...links.map((l) => `- [${l.label}](${l.href}) — ${l.blurb}`),
  ].join("\n");

  return {
    generated_at: new Date().toISOString(),
    headline,
    elevator,
    principles,
    metrics,
    kpis,
    funnel,
    sectors,
    stages,
    score_bands,
    quality,
    peer_snapshot,
    emerging_sectors,
    process,
    governance,
    ic_stage_counts,
    risks_and_controls,
    value_adds,
    links,
    talking_points,
    one_pager_md,
    health: {
      mix_status: judgment.mix_drift.status,
      mix_counsel: judgment.mix_drift.counsel,
      freshness_aging: judgment.freshness.filter(
        (f) => f.overall === "aging" || f.overall === "stale",
      ).length,
      overrides: judgment.overrides.length,
      misses: judgment.misses.length,
      documented_passes: documentedPasses.length,
      high_alerts: highAlerts.length,
    },
  };
}
