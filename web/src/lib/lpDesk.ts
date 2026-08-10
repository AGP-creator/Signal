/**
 * LP Process Desk — what sophisticated LPs actually want to see about "AI in the process."
 *
 * Not fake NAV/IRR theater. Process, governance, edge narrative, auditability.
 */

import { buildJudgmentPack, type PartnerOverride } from "@/lib/judgment";
import {
  diligenceProgress,
  STAGE_LABEL,
  voteSummary,
  type DealTrail,
} from "@/lib/icTrail";
import type { AlertItem, Commentary, Company, NewsItem, PeerActivity } from "@/lib/types";
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
  stage: string;
  outcome: string;
  paper_trail: string[];
  lp_why_it_matters: string;
};

export type LpDeskPack = {
  generated_at: string;
  headline: string;
  elevator: string;
  principles: LpPrinciple[];
  metrics: LpMetric[];
  process: ProcessStep[];
  governance: GovernanceCase[];
  risks_and_controls: { risk: string; control: string }[];
  talking_points: string[];
  one_pager_md: string;
};

export function buildLpDeskPack(
  companies: Company[],
  peers: PeerActivity[],
  commentary: Commentary[],
  news: NewsItem[],
  alerts: AlertItem[],
  trails: DealTrail[],
  overrides: PartnerOverride[] = [],
): LpDeskPack {
  const judgment = buildJudgmentPack(companies, peers, commentary, news, alerts, overrides);
  const mix = portfolioMix(companies);
  const deep = companies.filter((c) => c.recommendation === "Deep Dive").length;
  const watch = companies.filter((c) => c.recommendation === "Watch").length;
  const pass = companies.filter((c) => c.recommendation === "Pass").length;
  const stale = companies.filter((c) => c.is_stale || c.review_status === "Pending Partner Review")
    .length;
  const withVotes = trails.filter((t) => t.votes.length > 0);
  const documentedPasses = trails.filter((t) => t.stage === "pass");

  const principles: LpPrinciple[] = [
    {
      id: "attention",
      title: "Attention allocation, not coverage vanity",
      for_lp:
        "Partner hours are the scarce asset. Signal hard-caps what reaches the partnership so false positives don't burn weeks.",
      evidence: `Pipeline ${companies.length} · Deep Dive ${deep} · Watch ${watch} · Pass ${pass} (selectivity is intentional)`,
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
      evidence: `${stale} pending stale reviews · ${judgment.overrides.length} logged overrides · ${judgment.misses.length} miss retros`,
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

  const metrics: LpMetric[] = [
    {
      label: "Deep Dive precision focus",
      value: String(deep),
      note: "Optimize for correct attention, not recall of every rumor",
    },
    {
      label: "Thesis mix (D/T)",
      value: `${mix.dominantPct}/${mix.tacticalPct}`,
      note: judgment.mix_drift.counsel,
    },
    {
      label: "Partner overrides",
      value: String(judgment.overrides.length),
      note: "Disagreement → institutional preference data",
    },
    {
      label: "IC trails active",
      value: String(trails.filter((t) => !["pass", "watch", "sourced"].includes(t.stage)).length),
      note: "Living decision objects, not Slack archaeology",
    },
  ];

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
      ai_role: "Hard-capped M/W/F digest + Monday agenda",
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

  const governance: GovernanceCase[] = trails.slice(0, 5).map((t) => {
    const prog = diligenceProgress(t.diligence);
    const tally = voteSummary(t.votes);
    return {
      company_name: t.company_name,
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

  const risks_and_controls = [
    {
      risk: "Model hallucination of funding / valuation",
      control: "Facts from stored signals with provenance; estimated fields labeled; human skim before digest send in early months",
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
      control: "This desk — encoded thesis, override ledger, IC trails, human stale review",
    },
  ];

  const talking_points = [
    "Edge is faster, more consistent application of Thirdbase's stated strategy — with a paper trail — not a proprietary LLM.",
    "When LPs ask how AI shows up in the investment process, show a living system: thesis policy, selective digest, IC trails, overrides.",
    "False positives are expensive; Signal optimizes Hot Deal precision under thesis, not coverage vanity.",
    "ILPA-grade reporting (NAV, capital calls, CAS) remains fund admin — Signal is the judgment & governance layer that feeds the investment narrative.",
  ];

  const headline = "AI in the investment process — with governance LPs can diligence";
  const elevator =
    "Signal is Thirdbase's judgment OS: thesis-encoded scoring, selective partner rituals, human-in-the-loop controls, and an IC decision trail. Models assist; partners convict.";

  const one_pager_md = [
    `# Signal — LP Process One-Pager`,
    "",
    elevator,
    "",
    "## Principles",
    ...principles.map((p) => `- **${p.title}** — ${p.for_lp} (${p.evidence})`),
    "",
    "## Controls",
    ...risks_and_controls.map((r) => `- **Risk:** ${r.risk} → **Control:** ${r.control}`),
    "",
    "## Live snapshot",
    ...metrics.map((m) => `- ${m.label}: **${m.value}** — ${m.note}`),
    "",
    "## Talking points",
    ...talking_points.map((t) => `- ${t}`),
  ].join("\n");

  return {
    generated_at: new Date().toISOString(),
    headline,
    elevator,
    principles,
    metrics,
    process,
    governance,
    risks_and_controls,
    talking_points,
    one_pager_md,
  };
}
