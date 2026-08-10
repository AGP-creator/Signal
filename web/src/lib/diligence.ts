/**
 * Diligence Stress Pack — judgment agents inspired by Decile (bear case),
 * VCOS Clarity / Auryn (deck flags + work orders), Affinity Ascend (meeting prep).
 * Deterministic structure + rule-based fill; never invents missing facts.
 */

import type { Commentary, Company, PeerActivity } from "@/lib/types";
import type { CompanyBrief } from "@/lib/research";

export type DiligenceSubject = {
  id?: string;
  name: string;
  one_liner?: string | null;
  sector_theme?: string | null;
  subsector?: string | null;
  stage?: string | null;
  recommendation?: string | null;
  thesis_score?: number | null;
  relative_rank?: string | null;
  why_now?: string | null;
  last_round_size_m?: number | null;
  valuation_est_m?: number | null;
  valuation_confidence?: string | null;
  lead_investor?: string | null;
  investors?: string[];
  tier1_count?: number | null;
  tier1_names?: string[];
  yoy_growth_pct?: number | null;
  runway_months_est?: number | null;
  tam_usd_b?: number | null;
  headcount?: number | null;
  headcount_6m_growth_pct?: number | null;
  team_notes?: string | null;
  traction_notes?: string | null;
  moat_notes?: string | null;
  commentary_summary?: string | null;
  open_questions?: string[];
  score_breakdown?: Record<string, number>;
};

export type KillArgument = {
  title: string;
  argument: string;
  severity: "high" | "medium" | "low";
  evidence: string;
};

export type AssumptionStress = {
  assumption: string;
  if_wrong: string;
  how_to_test: string;
};

export type BearCase = {
  company_name: string;
  headline: string;
  kill_arguments: KillArgument[];
  assumptions_to_stress: AssumptionStress[];
  what_would_have_to_be_true: string[];
  bull_counterpoints: string[];
  conviction_gate: string;
  confidence: "high" | "medium" | "low";
  provenance: string;
};

export type DeckClaim = {
  field: string;
  value: string;
  source: string;
  origin: "machine" | "blank";
};

export type RedFlag = {
  id: string;
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
  citation?: string;
  confidence: "high" | "medium" | "low";
};

export type DeckAnalysis = {
  company_hint?: string;
  claims: DeckClaim[];
  red_flags: RedFlag[];
  missing_fields: string[];
  thesis_notes: string[];
  provenance: string;
};

export type DiligenceArea =
  | "Technical"
  | "Financial"
  | "Legal"
  | "Market"
  | "Team";

export type DiligenceTask = {
  id: string;
  area: DiligenceArea;
  title: string;
  documents: string[];
  procedure: string;
  closes_when: string;
  risk_if_open: "high" | "medium" | "low";
  required_before_close: boolean;
};

export type DiligencePlan = {
  company_name: string;
  tasks: DiligenceTask[];
  founder_only_questions: string[];
  founder_email_draft: string;
  area_risk: Record<DiligenceArea, "high" | "medium" | "low">;
  provenance: string;
};

export type MeetingPrep = {
  company_name: string;
  headline: string;
  context_bullets: string[];
  relationship_notes: string[];
  must_ask: string[];
  landmines: string[];
  listen_for: string[];
  post_call_actions: string[];
  provenance: string;
};

export type DiligencePack = {
  subject: DiligenceSubject;
  bear: BearCase;
  plan: DiligencePlan;
  meeting: MeetingPrep;
  deck?: DeckAnalysis | null;
};

export function companyToSubject(c: Company): DiligenceSubject {
  return {
    id: c.id,
    name: c.name,
    one_liner: c.one_liner,
    sector_theme: c.sector_theme,
    subsector: c.subsector,
    stage: c.stage,
    recommendation: c.recommendation,
    thesis_score: c.thesis_score,
    relative_rank: c.relative_rank,
    why_now: c.why_now,
    last_round_size_m: c.last_round_size_m,
    valuation_est_m: c.valuation_est_m,
    valuation_confidence: c.valuation_confidence,
    lead_investor: c.lead_investor,
    investors: c.investors,
    tier1_count: c.tier1_count,
    tier1_names: c.tier1_names,
    yoy_growth_pct: c.yoy_growth_pct,
    runway_months_est: c.runway_months_est,
    tam_usd_b: c.tam_usd_b,
    headcount: c.headcount,
    headcount_6m_growth_pct: c.headcount_6m_growth_pct,
    team_notes: c.team_notes,
    traction_notes: c.traction_notes,
    moat_notes: c.moat_notes,
    commentary_summary: c.commentary_summary,
    score_breakdown: c.score_breakdown,
  };
}

export function briefToSubject(b: CompanyBrief): DiligenceSubject {
  return {
    id: b.company_id,
    name: b.name,
    one_liner: b.one_liner,
    sector_theme: b.sector_theme,
    subsector: b.subsector,
    stage: b.stage,
    recommendation: b.recommendation,
    thesis_score: b.thesis_score,
    relative_rank: b.relative_rank,
    why_now: b.why_now,
    last_round_size_m: b.last_round_size_m,
    valuation_est_m: b.valuation_est_m,
    valuation_confidence: b.valuation_confidence,
    lead_investor: b.lead_investor,
    investors: b.investors,
    tier1_count: b.tier1_count,
    tier1_names: b.tier1_names,
    yoy_growth_pct: b.yoy_growth_pct,
    runway_months_est: b.runway_months_est,
    tam_usd_b: b.tam_usd_b,
    headcount: b.headcount,
    headcount_6m_growth_pct: b.headcount_6m_growth_pct,
    team_notes: b.team_notes,
    traction_notes: b.traction_notes,
    moat_notes: b.moat_notes,
    commentary_summary: b.commentary_summary,
    open_questions: b.open_questions,
    score_breakdown: b.score_breakdown,
  };
}

function lowestScoreDims(breakdown?: Record<string, number>, n = 3): [string, number][] {
  if (!breakdown) return [];
  return Object.entries(breakdown)
    .filter(([, v]) => typeof v === "number")
    .sort((a, b) => a[1] - b[1])
    .slice(0, n);
}

/** Decile-style counterfactual: strongest honest case against the deal. */
export function buildBearCase(subject: DiligenceSubject): BearCase {
  const kills: KillArgument[] = [];
  const stresses: AssumptionStress[] = [];
  const mustBeTrue: string[] = [];
  const bulls: string[] = [];

  const score = subject.thesis_score ?? 50;
  const tier1 = subject.tier1_count ?? 0;
  const yoy = subject.yoy_growth_pct;
  const runway = subject.runway_months_est;
  const tam = subject.tam_usd_b;
  const valConf = (subject.valuation_confidence || "").toLowerCase();
  const weak = lowestScoreDims(subject.score_breakdown);

  if (tam != null && tam >= 50) {
    kills.push({
      title: "TAM theater",
      argument: `Stated TAM of $${tam}B is large enough to invite narrative inflation. Without bottoms-up customer × ACV math, this is a slide, not a market.`,
      severity: tam >= 100 ? "high" : "medium",
      evidence: `TAM field = $${tam}B`,
    });
    stresses.push({
      assumption: "Top-down TAM is investable",
      if_wrong: "Addressable spend is a thin wedge; growth stalls after early design partners",
      how_to_test: "Demand bottoms-up: named ICP count × realistic ACV × win rate",
    });
  }

  if (yoy == null) {
    kills.push({
      title: "Growth is asserted, not measured",
      argument: "No YoY growth figure on file. At growth stage, missing velocity is a diligence failure waiting to happen.",
      severity: "high",
      evidence: "yoy_growth_pct blank",
    });
  } else if (yoy < 40) {
    kills.push({
      title: "Below Thirdbase growth bar",
      argument: `YoY ~${yoy}% sits under the ~40%+ growth-stage target encoded in thesis policy.`,
      severity: yoy < 25 ? "high" : "medium",
      evidence: `yoy_growth_pct = ${yoy}%`,
    });
    mustBeTrue.push(`Either growth re-accelerates above 40% or the check is explicitly tactical (40% bucket).`);
  } else {
    bulls.push(`Reported YoY ${yoy}% clears the growth bar.`);
  }

  if (runway != null && runway < 18) {
    kills.push({
      title: "Short runway forces a bad raise",
      argument: `~${runway} months runway compresses negotiating power; next round may price survival, not strength.`,
      severity: runway < 12 ? "high" : "medium",
      evidence: `runway_months_est = ${runway}`,
    });
    stresses.push({
      assumption: "Company can extend runway without punitive terms",
      if_wrong: "Down round or bridge crushes ownership and optionality",
      how_to_test: "Confirm burn, cash, and committed pipeline for next 2 quarters",
    });
  } else if (runway != null && runway >= 24) {
    bulls.push(`Runway ~${runway} mo buys time for judgment.`);
  }

  if (tier1 < 2) {
    kills.push({
      title: "Thin Tier-1 validation",
      argument: `Only ${tier1} Tier-1 name(s) on the tape. Sparse institutional co-sign increases adverse-selection risk.`,
      severity: tier1 === 0 ? "high" : "medium",
      evidence: `tier1_count = ${tier1}; ${(subject.tier1_names || []).join(", ") || "none"}`,
    });
  } else {
    bulls.push(`Tier-1 present: ${(subject.tier1_names || []).slice(0, 3).join(", ")}.`);
  }

  if (valConf.includes("estim") || valConf.includes("unknown") || !subject.valuation_est_m) {
    kills.push({
      title: "Valuation opacity",
      argument: "Entry valuation is estimated or missing. Attractive entry vs sector×stage comps cannot be verified — a Pass risk under thesis policy.",
      severity: "medium",
      evidence: `valuation_est_m=${subject.valuation_est_m ?? "—"} (${subject.valuation_confidence || "unknown"})`,
    });
    stresses.push({
      assumption: "Implied entry is attractive vs comps",
      if_wrong: "You overpay for a crowded theme and compress MOIC",
      how_to_test: "Get last-round post + option pool; mark vs 3–5 stage comps",
    });
  }

  const moat = (subject.moat_notes || "").toLowerCase();
  if (!moat || moat.includes("unclear") || moat.length < 40) {
    kills.push({
      title: "Moat underspecified",
      argument: "Defensibility notes are thin. Without switching costs, data network effects, or hard IP, this is a feature race.",
      severity: "medium",
      evidence: subject.moat_notes || "moat_notes empty",
    });
  } else {
    bulls.push(`Moat narrative on file: ${subject.moat_notes!.slice(0, 120)}…`);
  }

  for (const [dim, v] of weak) {
    if (v >= 55) continue;
    kills.push({
      title: `Weak score dimension: ${dim}`,
      argument: `${dim} scores ${v.toFixed(0)}/100 — this is where IC should spend airtime, not celebration of the headline thesis score.`,
      severity: v < 40 ? "high" : "medium",
      evidence: `score_breakdown.${dim} = ${v.toFixed(0)}`,
    });
  }

  if (subject.recommendation === "Pass") {
    kills.unshift({
      title: "Signal already recommends Pass",
      argument: "The scoring system already wants out. Reopening requires a partner override with an explicit reason — not vibe.",
      severity: "high",
      evidence: `recommendation = Pass · score ${score}`,
    });
  }

  if (!kills.length) {
    kills.push({
      title: "Power-law miss risk",
      argument: "Even clean deals fail silently. The bear case is execution + timing, not an obvious red flag on the sheet.",
      severity: "low",
      evidence: "No hard policy violations detected",
    });
  }

  mustBeTrue.push(
    "Founders can show retention / expansion that survive a 20% price cut by the nearest peer.",
    "Next 12 months of hiring does not blow burn past a 24-month cash plan.",
  );
  if (subject.why_now) {
    bulls.push(`Why-now narrative: ${subject.why_now.slice(0, 140)}`);
  }

  const highCount = kills.filter((k) => k.severity === "high").length;
  const headline =
    highCount >= 2
      ? `Strong bear case — ${highCount} high-severity kill arguments on ${subject.name}`
      : highCount === 1
        ? `Credible kill shot exists on ${subject.name} — stress before Deep Dive`
        : `No single fatal flaw; pressure-test assumptions on ${subject.name}`;

  return {
    company_name: subject.name,
    headline,
    kill_arguments: kills.slice(0, 6),
    assumptions_to_stress: stresses.slice(0, 5),
    what_would_have_to_be_true: mustBeTrue.slice(0, 5),
    bull_counterpoints: bulls.slice(0, 5),
    conviction_gate:
      highCount >= 2
        ? "Do not Deep Dive until at least two high-severity kills are closed or consciously accepted in writing."
        : "Proceed only if partner can name the asymmetric upside that outweighs the top kill argument.",
    confidence: highCount >= 2 ? "high" : kills.length >= 3 ? "medium" : "low",
    provenance: "BearCaseAgent · thesis_policy heuristics · no invented metrics",
  };
}

const CLAIM_PATTERNS: { field: string; re: RegExp; group?: number }[] = [
  { field: "ARR / revenue", re: /\$?\s*([\d.,]+)\s*(m|mm|million|b|bn|billion)?\s*(arr|arr\.|annual recurring)/i },
  { field: "ARR / revenue", re: /(arr|revenue)\s*(of|:)?\s*\$?\s*([\d.,]+)\s*(m|mm|million)?/i, group: 3 },
  { field: "YoY growth", re: /([\d.]{1,3})\s*%\s*(yoy|year[- ]over[- ]year|y\/y)/i },
  { field: "Customers", re: /([\d,]+)\s*\+?\s*(customers|logos|enterprises)/i },
  { field: "TAM", re: /\$?\s*([\d.,]+)\s*(b|bn|billion|t|trillion)\s*(tam|sam|som|market)/i },
  { field: "Raise size", re: /(raising|raise|round of)\s*\$?\s*([\d.,]+)\s*(m|mm|million)/i, group: 2 },
  { field: "Valuation", re: /(pre[- ]?money|post[- ]?money|valuation)\s*(of|:)?\s*\$?\s*([\d.,]+)\s*(m|mm|million|b)?/i, group: 3 },
  { field: "Team size", re: /([\d,]+)\s*(employees|headcount|people on the team)/i },
  { field: "NRR / NDR", re: /([\d.]{2,3})\s*%\s*(nrr|ndr|net dollar|net revenue retention)/i },
  { field: "Gross margin", re: /([\d.]{2,3})\s*%\s*(gross margin)/i },
];

function slideRef(text: string, matchIndex: number): string {
  const before = text.slice(0, matchIndex);
  const slides = before.split(/\n\s*(?:slide\s*\d+|#{1,3}\s+)/i).length;
  const line = before.split(/\n/).length;
  return slides > 1 ? `near slide/section ~${slides}` : `line ~${line}`;
}

/** VCOS Clarity / Auryn lite: extract claims, never invent blanks, flag risks. */
export function analyzeDeckText(raw: string, subjectHint?: DiligenceSubject): DeckAnalysis {
  const text = raw.replace(/\r\n/g, "\n").trim();
  const claims: DeckClaim[] = [];
  const seen = new Set<string>();

  for (const pat of CLAIM_PATTERNS) {
    const m = text.match(pat.re);
    if (!m) continue;
    const g = pat.group ?? 1;
    const val = (m[g] || m[1] || "").trim();
    if (!val) continue;
    const key = `${pat.field}:${val}`;
    if (seen.has(key)) continue;
    seen.add(key);
    claims.push({
      field: pat.field,
      value: m[0].slice(0, 80),
      source: slideRef(text, m.index ?? 0),
      origin: "machine",
    });
  }

  const expected = [
    "ARR / revenue",
    "YoY growth",
    "Customers",
    "Unit economics",
    "Team",
    "Competitive landscape",
  ];
  const missing_fields = expected.filter((f) => !claims.some((c) => c.field.startsWith(f.split(" ")[0]) || c.field === f));

  // Unit economics often absent
  if (!/ltv|cac|payback|unit econom/i.test(text)) {
    if (!missing_fields.includes("Unit economics")) missing_fields.push("Unit economics");
  }

  const red_flags: RedFlag[] = [];
  const tamClaim = claims.find((c) => c.field === "TAM");
  if (tamClaim && /\$?\s*([\d.]+)\s*(t|trillion|b|bn|billion)/i.test(tamClaim.value)) {
    const huge = /trillion|\bt\b|\$?\s*([5-9]\d|\d{3,})\s*(b|bn|billion)/i.test(tamClaim.value);
    if (huge) {
      red_flags.push({
        id: "tam-inflated",
        title: "Inflated TAM math",
        detail: `Deck claims a very large market (${tamClaim.value}). Demand bottoms-up reconciliation before trusting.`,
        severity: "high",
        citation: tamClaim.source,
        confidence: "medium",
      });
    }
  }

  if (/fortune\s*500|all\s+fortune|every\s+enterprise/i.test(text) && !/\bnamed\b|include[sd]?:/i.test(text)) {
    red_flags.push({
      id: "unverifiable-customers",
      title: "Unverifiable customer claims",
      detail: "Broad enterprise claims without named logos or case studies — treat as unverified until contracts/logos confirmed.",
      severity: "high",
      citation: "customer narrative",
      confidence: "medium",
    });
  }

  if (/no\s+competition|no\s+competitors|unique\s+with\s+no|only\s+player/i.test(text)) {
    red_flags.push({
      id: "no-competition",
      title: "“No competition” claim",
      detail: "Decks that deny competition usually redefine the category. Map substitutes and big-tech adjacency.",
      severity: "medium",
      citation: "competition section",
      confidence: "high",
    });
  }

  if (!/cac|ltv|payback|gross margin|unit econom/i.test(text)) {
    red_flags.push({
      id: "missing-unit-econ",
      title: "Missing unit economics",
      detail: "No LTV/CAC, payback, or gross margin language found. Financial diligence cannot close on narrative alone.",
      severity: "high",
      confidence: "high",
    });
  }

  const years = [...text.matchAll(/\b(20[1-3]\d)\b/g)].map((m) => Number(m[1]));
  if (years.length >= 2) {
    const max = Math.max(...years);
    const min = Math.min(...years);
    if (max - min >= 8 && /founded|since|started/i.test(text)) {
      red_flags.push({
        id: "timeline-odd",
        title: "Timeline inconsistency risk",
        detail: `Deck spans years ${min}–${max}. Reconcile founding / launch / revenue start dates with LinkedIn and filings.`,
        severity: "low",
        confidence: "low",
      });
    }
  }

  if (/ai[- ]?(powered|driven|native)|proprietary\s+model|gpt|llm/i.test(text) && !/eval|benchmark|latency|cost per/i.test(text)) {
    red_flags.push({
      id: "ai-handwave",
      title: "AI capability hand-wave",
      detail: "AI claims without evals, latency, or cost-per-task. Ask for benchmarks vs alternatives.",
      severity: "medium",
      confidence: "medium",
    });
  }

  const thesis_notes: string[] = [];
  if (subjectHint) {
    if (subjectHint.yoy_growth_pct != null) {
      const deckYoy = claims.find((c) => c.field === "YoY growth");
      if (deckYoy) {
        thesis_notes.push(`Pipeline YoY ${subjectHint.yoy_growth_pct}% vs deck claim “${deckYoy.value}” — reconcile.`);
      }
    }
    thesis_notes.push(
      `Screen lens: Thirdbase thesis (growth ~40%+, Tier-1 preference, runway, moat) — deck does not override policy.`,
    );
  }

  const nameMatch = text.match(/(?:company|about)\s*[:\-]\s*([A-Z][A-Za-z0-9 .&]{2,40})/);
  return {
    company_hint: subjectHint?.name || nameMatch?.[1]?.trim(),
    claims,
    red_flags,
    missing_fields,
    thesis_notes,
    provenance: "DeckRedFlagAgent · regex extract · blanks left blank · not LLM invention",
  };
}

function areaRiskFromTasks(tasks: DiligenceTask[]): Record<DiligenceArea, "high" | "medium" | "low"> {
  const areas: DiligenceArea[] = ["Technical", "Financial", "Legal", "Market", "Team"];
  const out = {} as Record<DiligenceArea, "high" | "medium" | "low">;
  for (const a of areas) {
    const subset = tasks.filter((t) => t.area === a);
    if (subset.some((t) => t.risk_if_open === "high")) out[a] = "high";
    else if (subset.some((t) => t.risk_if_open === "medium")) out[a] = "medium";
    else out[a] = "low";
  }
  return out;
}

/** Auryn-style diligence work orders + founder-only questions. */
export function buildDiligencePlan(
  subject: DiligenceSubject,
  bear?: BearCase,
  deck?: DeckAnalysis | null,
): DiligencePlan {
  const tasks: DiligenceTask[] = [];
  let n = 0;
  const tid = (area: DiligenceArea) => `${area.slice(0, 3).toLowerCase()}-${++n}`;

  tasks.push({
    id: tid("Technical"),
    area: "Technical",
    title: "Validate product differentiation vs nearest 2 competitors",
    documents: ["Architecture overview", "Product demo recording", "Roadmap"],
    procedure: "Map claimed moat to observable switching costs; time a bake-off criteria list.",
    closes_when: "Partner can state why a buyer would not rip-and-replace in 18 months",
    risk_if_open: "high",
    required_before_close: true,
  });

  tasks.push({
    id: tid("Financial"),
    area: "Financial",
    title: "Reconcile revenue / ARR claims to billing export",
    documents: ["ARR bridge", "Billing export", "Cohort retention"],
    procedure: "Tie deck ARR to invoices within 5%; flag channel vs product-led mix.",
    closes_when: "ARR ties to billing within 5% or variance explained in writing",
    risk_if_open: subject.yoy_growth_pct == null ? "high" : "medium",
    required_before_close: true,
  });

  if ((subject.runway_months_est ?? 36) < 24 || subject.runway_months_est == null) {
    tasks.push({
      id: tid("Financial"),
      area: "Financial",
      title: "Cash, burn, and runway attestation",
      documents: ["Bank balance", "Monthly burn", "Hiring plan"],
      procedure: "Compute months of runway at current burn; stress +20% hire plan.",
      closes_when: "Runway math signed by founder CFO/CEO with date stamp",
      risk_if_open: "high",
      required_before_close: true,
    });
  }

  tasks.push({
    id: tid("Market"),
    area: "Market",
    title: "Bottoms-up TAM / ICP validation",
    documents: ["ICP definition", "Win/loss notes", "Pipeline snapshot"],
    procedure: "Rebuild SAM from named accounts × ACV; discard top-down slide.",
    closes_when: "Partner accepts a SAM figure with explicit account math",
    risk_if_open: (subject.tam_usd_b ?? 0) >= 50 ? "high" : "medium",
    required_before_close: (subject.tam_usd_b ?? 0) >= 50,
  });

  tasks.push({
    id: tid("Team"),
    area: "Team",
    title: "Founder reference set (operators + ex-reports)",
    documents: ["Reference list", "Org chart"],
    procedure: "2 operator refs + 1 ex-report; probe rate of learning and conflict style.",
    closes_when: "At least 2 independent refs logged with notes",
    risk_if_open: "high",
    required_before_close: true,
  });

  tasks.push({
    id: tid("Legal"),
    area: "Legal",
    title: "Cap table + prior round docs",
    documents: ["Cap table", "SAFE/SPA", "Option pool"],
    procedure: "Confirm ownership, preference stack, and option pool post-money.",
    closes_when: "Counsel confirms no surprise prefs or toxic side letters",
    risk_if_open: "medium",
    required_before_close: true,
  });

  if (deck?.red_flags.some((f) => f.id === "ai-handwave")) {
    tasks.push({
      id: tid("Technical"),
      area: "Technical",
      title: "AI eval harness and cost-per-task",
      documents: ["Eval suite", "Latency/cost dashboard"],
      procedure: "Reproduce claimed quality on held-out tasks; measure $/1k calls.",
      closes_when: "Eval delta vs baseline documented with confidence interval",
      risk_if_open: "high",
      required_before_close: true,
    });
  }

  for (const k of (bear?.kill_arguments || []).filter((x) => x.severity === "high").slice(0, 2)) {
    tasks.push({
      id: tid("Market"),
      area: "Market",
      title: `Close bear kill: ${k.title}`,
      documents: ["Founder response", "Supporting data"],
      procedure: k.argument,
      closes_when: `Partner accepts or rejects: ${k.title}`,
      risk_if_open: "high",
      required_before_close: true,
    });
  }

  const founder_only_questions: string[] = [
    "What is the single metric that would make you raise the next round 6 months earlier — and what is it today?",
    "Which customer would hurt most if they churned next quarter, and why are they still here?",
    "Where have you been wrong in the last 12 months, and what changed in how you decide?",
  ];
  if (subject.open_questions?.length) {
    for (const q of subject.open_questions.slice(0, 3)) {
      if (!founder_only_questions.includes(q)) founder_only_questions.push(q);
    }
  }
  if ((subject.tier1_count ?? 0) < 2) {
    founder_only_questions.push("Who is leading the round, and what is still open on the allocation?");
  }
  if (deck?.missing_fields.includes("Unit economics")) {
    founder_only_questions.push("What are CAC, payback months, and gross margin on your last 20 closed deals?");
  }

  const founder_email_draft = [
    `Subject: Follow-ups on ${subject.name} — diligence questions`,
    ``,
    `Hi — thanks for the materials. Before we go deeper, a few questions only you can answer cleanly:`,
    ``,
    ...founder_only_questions.map((q, i) => `${i + 1}. ${q}`),
    ``,
    `Happy to jump on a short call if easier. We won’t re-ask anything already clear in the deck.`,
    ``,
    `— Thirdbase`,
  ].join("\n");

  return {
    company_name: subject.name,
    tasks,
    founder_only_questions,
    founder_email_draft,
    area_risk: areaRiskFromTasks(tasks),
    provenance: "DiligencePlanAgent · Auryn-style work orders · human send only",
  };
}

/** Affinity Ascend-lite meeting prep one-pager. */
export function buildMeetingPrep(
  subject: DiligenceSubject,
  opts?: {
    bear?: BearCase;
    plan?: DiligencePlan;
    commentary?: Commentary[];
    peers?: PeerActivity[];
  },
): MeetingPrep {
  const bear = opts?.bear || buildBearCase(subject);
  const plan = opts?.plan || buildDiligencePlan(subject, bear);
  const peers = (opts?.peers || []).filter(
    (p) => p.company_id === subject.id || (p.company_name || "").toLowerCase() === subject.name.toLowerCase(),
  );
  const cms = opts?.commentary || [];

  const context_bullets = [
    `${subject.recommendation || "—"} · score ${subject.thesis_score?.toFixed(0) ?? "—"} · ${subject.relative_rank || "unranked"}`,
    subject.one_liner || "—",
    `${subject.sector_theme || "—"} / ${subject.subsector || "—"} · ${subject.stage || "—"}`,
    `Lead ${subject.lead_investor || "—"} · Tier-1×${subject.tier1_count ?? 0}`,
  ];

  const relationship_notes: string[] = [];
  if (peers.length) {
    for (const p of peers.slice(0, 4)) {
      relationship_notes.push(`${p.firm} tagged ${p.round || "activity"} (${p.date || "—"})${p.thesis_shift ? " · THESIS SHIFT" : ""}`);
    }
  } else {
    relationship_notes.push("No peer-set activity rows on file — assume cold unless partner has prior.");
  }
  if ((subject.investors || []).length) {
    relationship_notes.push(`Cap table touchpoints: ${(subject.investors || []).slice(0, 5).join(", ")}`);
  }

  const landmines = bear.kill_arguments.slice(0, 4).map((k) => `${k.title}: ${k.argument.slice(0, 140)}`);
  const must_ask = plan.founder_only_questions.slice(0, 5);
  const listen_for = [
    "Hesitation on retention or logo concentration",
    "Vague answers on competitive displacement",
    "Blame external (market/macro) without a learning loop",
    ...cms.slice(0, 2).map((c) => `Commentary (${c.source}): ${(c.quote_or_summary || "").slice(0, 100)}`),
  ];

  return {
    company_name: subject.name,
    headline: `Pre-call sheet — ${subject.name}`,
    context_bullets,
    relationship_notes,
    must_ask,
    landmines,
    listen_for: listen_for.slice(0, 5),
    post_call_actions: [
      "Update open questions with what was answered vs dodged",
      "Mark diligence tasks closed only with evidence, not vibes",
      "If high-severity bear kill still open → keep Watch, not Deep Dive",
    ],
    provenance: "MeetingPrepAgent · Affinity Ascend-lite · read-only artifact",
  };
}

export function buildDiligencePack(
  subject: DiligenceSubject,
  opts?: {
    deckText?: string;
    commentary?: Commentary[];
    peers?: PeerActivity[];
  },
): DiligencePack {
  const deck = opts?.deckText?.trim() ? analyzeDeckText(opts.deckText, subject) : null;
  const bear = buildBearCase(subject);
  const plan = buildDiligencePlan(subject, bear, deck);
  const meeting = buildMeetingPrep(subject, {
    bear,
    plan,
    commentary: opts?.commentary,
    peers: opts?.peers,
  });
  return { subject, bear, plan, meeting, deck };
}

export function formatBearCaseMarkdown(bear: BearCase): string {
  return [
    `# Bear case — ${bear.company_name}`,
    ``,
    `**${bear.headline}**`,
    ``,
    `Conviction gate: ${bear.conviction_gate}`,
    ``,
    `## Kill arguments`,
    ...bear.kill_arguments.map(
      (k) => `- **[${k.severity}] ${k.title}** — ${k.argument} _(evidence: ${k.evidence})_`,
    ),
    ``,
    `## Assumptions to stress`,
    ...bear.assumptions_to_stress.map(
      (a) => `- **${a.assumption}** → if wrong: ${a.if_wrong}. Test: ${a.how_to_test}`,
    ),
    ``,
    `## What would have to be true`,
    ...bear.what_would_have_to_be_true.map((w) => `- ${w}`),
    ``,
    `## Fair bull counters`,
    ...bear.bull_counterpoints.map((b) => `- ${b}`),
    ``,
    `_${bear.provenance} · confidence ${bear.confidence}_`,
  ].join("\n");
}

export function formatDiligencePlanMarkdown(plan: DiligencePlan): string {
  return [
    `# Diligence plan — ${plan.company_name}`,
    ``,
    `## Area risk`,
    ...Object.entries(plan.area_risk).map(([a, r]) => `- ${a}: **${r}**`),
    ``,
    `## Work orders`,
    ...plan.tasks.map(
      (t) =>
        `- **[${t.area}${t.required_before_close ? " · required" : ""}] ${t.title}** (${t.risk_if_open})\n  Docs: ${t.documents.join(", ")}\n  Close when: ${t.closes_when}`,
    ),
    ``,
    `## Founder-only questions`,
    ...plan.founder_only_questions.map((q, i) => `${i + 1}. ${q}`),
    ``,
    `## Email draft (do not auto-send)`,
    "```",
    plan.founder_email_draft,
    "```",
    ``,
    `_${plan.provenance}_`,
  ].join("\n");
}

export function formatMeetingPrepMarkdown(prep: MeetingPrep): string {
  return [
    `# ${prep.headline}`,
    ``,
    `## Context`,
    ...prep.context_bullets.map((b) => `- ${b}`),
    ``,
    `## Relationship / peer tape`,
    ...prep.relationship_notes.map((b) => `- ${b}`),
    ``,
    `## Must ask`,
    ...prep.must_ask.map((q, i) => `${i + 1}. ${q}`),
    ``,
    `## Landmines (from bear case)`,
    ...prep.landmines.map((l) => `- ${l}`),
    ``,
    `## Listen for`,
    ...prep.listen_for.map((l) => `- ${l}`),
    ``,
    `## After the call`,
    ...prep.post_call_actions.map((a) => `- ${a}`),
    ``,
    `_${prep.provenance}_`,
  ].join("\n");
}

export function formatDeckAnalysisMarkdown(deck: DeckAnalysis): string {
  return [
    `# Deck analysis${deck.company_hint ? ` — ${deck.company_hint}` : ""}`,
    ``,
    `## Extracted claims (machine only — blanks stay blank)`,
    ...(deck.claims.length
      ? deck.claims.map((c) => `- **${c.field}**: ${c.value} _(source: ${c.source})_`)
      : ["- No structured metrics extracted"]),
    ``,
    `## Missing fields`,
    ...deck.missing_fields.map((m) => `- ${m}`),
    ``,
    `## Red flags`,
    ...(deck.red_flags.length
      ? deck.red_flags.map(
          (f) =>
            `- **[${f.severity}] ${f.title}** — ${f.detail}${f.citation ? ` (${f.citation})` : ""}`,
        )
      : ["- None triggered"]),
    ``,
    `## Thesis notes`,
    ...deck.thesis_notes.map((t) => `- ${t}`),
    ``,
    `_${deck.provenance}_`,
  ].join("\n");
}

export function formatDiligencePackMarkdown(pack: DiligencePack): string {
  return [
    formatBearCaseMarkdown(pack.bear),
    ``,
    `---`,
    ``,
    formatDiligencePlanMarkdown(pack.plan),
    ``,
    `---`,
    ``,
    formatMeetingPrepMarkdown(pack.meeting),
    pack.deck
      ? [`---`, ``, formatDeckAnalysisMarkdown(pack.deck)].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function appendDiligenceToIcPacket(baseMarkdown: string, pack: DiligencePack): string {
  return [
    baseMarkdown,
    ``,
    `---`,
    ``,
    `## Diligence Stress Pack`,
    ``,
    `### Bear case`,
    pack.bear.headline,
    ...pack.bear.kill_arguments.map((k) => `- **${k.title}** (${k.severity}): ${k.argument}`),
    ``,
    `Gate: ${pack.bear.conviction_gate}`,
    ``,
    `### Diligence work orders`,
    ...pack.plan.tasks
      .filter((t) => t.required_before_close)
      .map((t) => `- [${t.area}] ${t.title} — closes when: ${t.closes_when}`),
    ``,
    `### Founder-only questions`,
    ...pack.plan.founder_only_questions.map((q, i) => `${i + 1}. ${q}`),
    pack.deck?.red_flags.length
      ? [
          ``,
          `### Deck red flags`,
          ...pack.deck.red_flags.map((f) => `- **${f.title}**: ${f.detail}`),
        ].join("\n")
      : "",
    ``,
    `### Meeting prep headline`,
    pack.meeting.headline,
    ...pack.meeting.must_ask.slice(0, 3).map((q) => `- Ask: ${q}`),
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}
