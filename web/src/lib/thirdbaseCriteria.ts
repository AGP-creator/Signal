/**
 * Partner-facing Thirdbase investment criteria checklist.
 * Mirrors config/thesis_policy.yaml thresholds used by the Python scorer.
 */

export type CriteriaStatus = "met" | "partial" | "miss" | "unknown";

export type CriteriaItem = {
  id: string;
  label: string;
  target: string;
  status: CriteriaStatus;
  evidence: string;
  /** Score-dimension key when this criterion maps to score_breakdown */
  dim?: string;
};

export type CriteriaSummary = {
  items: CriteriaItem[];
  met: number;
  partial: number;
  miss: number;
  unknown: number;
  scored: number;
  /** 0–100 share of known criteria that are met (partial counts half) */
  fit_pct: number;
};

export type SourceCategory = {
  id: string;
  label: string;
  examples: string[];
  matched: string[];
};

/** Dimension keys → partner-readable labels (and weight share of thesis score). */
export const SCORE_DIM_META: Record<
  string,
  { label: string; weight: number; criterion: string }
> = {
  thesis_fit: {
    label: "Thesis fit",
    weight: 0.2,
    criterion: "Dominant tech (60%) / tactical (40%) bucket fit",
  },
  team_quality: {
    label: "Team quality",
    weight: 0.15,
    criterion: "Founding / technical pedigree",
  },
  cap_table: {
    label: "Tier-1 cap table",
    weight: 0.15,
    criterion: "3–4 Tier-1 investors",
  },
  traction: {
    label: "Growth / traction",
    weight: 0.15,
    criterion: "40%+ YoY at growth stage",
  },
  moat: {
    label: "Moat / defensibility",
    weight: 0.1,
    criterion: "Technical moat / innovation edge",
  },
  valuation: {
    label: "Entry valuation",
    weight: 0.1,
    criterion: "Attractive vs sector × stage",
  },
  runway: {
    label: "Runway",
    weight: 0.05,
    criterion: "~3 years safe runway",
  },
  tam_exit: {
    label: "TAM + exit",
    weight: 0.05,
    criterion: "TAM >$1B · 3–5yr exit",
  },
  timing: {
    label: "Signal freshness",
    weight: 0.05,
    criterion: "Recent evidence / not stale",
  },
};

/** Canonical ingest taxonomy Thirdbase monitors. */
export const SOURCE_TAXONOMY: {
  id: string;
  label: string;
  examples: string[];
  matchers: RegExp[];
}[] = [
  {
    id: "deal_databases",
    label: "Deal databases",
    examples: ["PitchBook", "Crunchbase", "Harmonic", "Dealroom"],
    matchers: [/pitchbook/i, /crunchbase/i, /harmonic/i, /dealroom/i],
  },
  {
    id: "regulatory",
    label: "Regulatory filings",
    examples: ["SEC Form D", "EDGAR"],
    matchers: [/form\s*d/i, /edgar/i, /\bsec\b/i, /filing/i],
  },
  {
    id: "gp_signals",
    label: "GP & firm signals",
    examples: ["GP Twitter/X", "LinkedIn partner posts", "Coresignal"],
    matchers: [/coresignal/i, /linkedin/i, /\bx\b/i, /twitter/i, /gp.?watch/i],
  },
  {
    id: "long_form",
    label: "Long-form analysis",
    examples: ["Stratechery", "The Information", "Newcomer", "Not Boring", "The Generalist"],
    matchers: [
      /stratechery/i,
      /the information/i,
      /newcomer/i,
      /not boring/i,
      /generalist/i,
      /byrne hobart/i,
      /diff\b/i,
    ],
  },
  {
    id: "news",
    label: "News feeds",
    examples: ["TechCrunch", "Axios Pro Rata", "Bloomberg", "Reuters", "FT"],
    matchers: [
      /techcrunch/i,
      /axios/i,
      /bloomberg/i,
      /reuters/i,
      /\bft\b/i,
      /financial times/i,
      /rss/i,
      /news/i,
    ],
  },
  {
    id: "commentary",
    label: "Investor & operator commentary",
    examples: ["HN", "Reddit", "Blind", "podcasts", "Substack"],
    matchers: [
      /\bhn\b/i,
      /hacker.?news/i,
      /reddit/i,
      /blind/i,
      /podcast/i,
      /substack/i,
      /commentary/i,
      /seed/i,
    ],
  },
  {
    id: "technical",
    label: "Technical signals",
    examples: ["GitHub", "arXiv"],
    matchers: [/github/i, /arxiv/i, /commit/i, /stars/i],
  },
  {
    id: "hiring",
    label: "Hiring signals",
    examples: ["LinkedIn headcount", "careers pages"],
    matchers: [/hiring/i, /headcount/i, /careers/i, /job.?req/i],
  },
  {
    id: "company_surface",
    label: "Company surface area",
    examples: ["Website", "pricing", "customer logos"],
    matchers: [/site/i, /website/i, /domain/i, /pricing/i, /product/i],
  },
  {
    id: "press",
    label: "Press releases",
    examples: ["PR RSS", "web search"],
    matchers: [/press/i, /pr\b/i, /announcement/i, /web.?search/i, /scout/i],
  },
];

const GROWTH_YOY_TARGET = 40;
const RUNWAY_IDEAL = 36;
const RUNWAY_MIN = 18;
const TAM_MIN_B = 1;
const TIER1_MIN = 3;
const TIER1_MAX = 4;
const EXIT_MIN = 3;
const EXIT_MAX = 5;

const VALUATION_BANDS: { match: string; lo: number; hi: number }[] = [
  { match: "pre-seed", lo: 10, hi: 40 },
  { match: "seed", lo: 20, hi: 80 },
  { match: "series a", lo: 80, hi: 350 },
  { match: "series b", lo: 300, hi: 1000 },
  { match: "series c", lo: 800, hi: 2500 },
  { match: "series d", lo: 1000, hi: 5000 },
  { match: "growth", lo: 1000, hi: 5000 },
];

export type CriteriaCompany = {
  pipeline_bucket?: string | null;
  stage?: string | null;
  valuation_est_m?: number | null;
  valuation_confidence?: string | null;
  yoy_growth_pct?: number | null;
  headcount_6m_growth_pct?: number | null;
  runway_months_est?: number | null;
  tier1_count?: number | null;
  tier1_names?: string[];
  moat_notes?: string | null;
  tam_usd_b?: number | null;
  exit_horizon_years?: number | null;
  score_breakdown?: Record<string, number> | null;
  sources?: Array<string | { provider?: string; title?: string }> | null;
  sector_theme?: string | null;
  last_round_size_m?: number | null;
};

function dimScore(c: CriteriaCompany, key: string): number | null {
  const v = c.score_breakdown?.[key];
  return typeof v === "number" ? v : null;
}

function valuationBand(stage?: string | null): { lo: number; hi: number } {
  const s = (stage || "").toLowerCase();
  for (const b of VALUATION_BANDS) {
    if (s.includes(b.match)) return { lo: b.lo, hi: b.hi };
  }
  return { lo: 50, hi: 2000 };
}

function inferExitYears(c: CriteriaCompany): number {
  if (c.exit_horizon_years != null) return c.exit_horizon_years;
  const stage = (c.stage || "").toLowerCase();
  if (stage.includes("growth") || stage.includes("series d") || stage.includes("series c")) {
    return EXIT_MIN + 1;
  }
  if (stage.includes("series b")) return 4;
  return 5;
}

function statusFromDim(score: number | null, metAt = 75, partialAt = 55): CriteriaStatus {
  if (score == null) return "unknown";
  if (score >= metAt) return "met";
  if (score >= partialAt) return "partial";
  return "miss";
}

export function evaluateThirdbaseCriteria(company: CriteriaCompany): CriteriaSummary {
  const items: CriteriaItem[] = [];

  // 1. Pipeline bucket (60/40 posture)
  const bucket = company.pipeline_bucket || "";
  if (bucket === "dominant_tech_growth") {
    items.push({
      id: "bucket",
      label: "Dominant tech + growth focus",
      target: "60% of pipeline · core themes",
      status: "met",
      evidence: `${company.sector_theme || "Theme"} · dominant_tech_growth bucket`,
      dim: "thesis_fit",
    });
  } else if (bucket === "tactical_sector_agnostic") {
    items.push({
      id: "bucket",
      label: "Tactical sector-agnostic",
      target: "40% of pipeline · opportunistic",
      status: "met",
      evidence: `${company.sector_theme || "Theme"} · tactical_sector_agnostic bucket`,
      dim: "thesis_fit",
    });
  } else {
    items.push({
      id: "bucket",
      label: "Pipeline bucket (60/40)",
      target: "Dominant tech (60%) or tactical (40%)",
      status: "unknown",
      evidence: "Bucket not assigned",
      dim: "thesis_fit",
    });
  }

  // 2. Entry valuation (stage-aware)
  const val = company.valuation_est_m;
  const { lo, hi } = valuationBand(company.stage);
  const valDim = dimScore(company, "valuation");
  if (val == null) {
    items.push({
      id: "valuation",
      label: "Entry valuation",
      target: `Attractive vs ${company.stage || "stage"} comps ($${lo}–$${hi}M band)`,
      status: statusFromDim(valDim),
      evidence:
        valDim != null
          ? `No mark captured · valuation dim ${valDim.toFixed(0)}`
          : "Valuation not captured",
      dim: "valuation",
    });
  } else if (val < lo) {
    items.push({
      id: "valuation",
      label: "Entry valuation",
      target: `Attractive vs ${company.stage || "stage"} comps ($${lo}–$${hi}M band)`,
      status: "met",
      evidence: `$${val}M — below stage band (potentially attractive)${
        company.valuation_confidence ? ` · ${company.valuation_confidence}` : ""
      }`,
      dim: "valuation",
    });
  } else if (val <= hi) {
    items.push({
      id: "valuation",
      label: "Entry valuation",
      target: `Attractive vs ${company.stage || "stage"} comps ($${lo}–$${hi}M band)`,
      status: "met",
      evidence: `$${val}M — inside stage band${
        company.valuation_confidence ? ` · ${company.valuation_confidence}` : ""
      }`,
      dim: "valuation",
    });
  } else {
    const over = ((val - hi) / hi) * 100;
    items.push({
      id: "valuation",
      label: "Entry valuation",
      target: `Attractive vs ${company.stage || "stage"} comps ($${lo}–$${hi}M band)`,
      status: over > 50 ? "miss" : "partial",
      evidence: `$${val}M — ~${over.toFixed(0)}% above stage band`,
      dim: "valuation",
    });
  }

  // 3. YoY growth
  const yoy = company.yoy_growth_pct;
  const stageLower = (company.stage || "").toLowerCase();
  const isGrowthStage =
    stageLower.includes("growth") ||
    stageLower.includes("series b") ||
    stageLower.includes("series c") ||
    stageLower.includes("series d");
  const yoyTarget = isGrowthStage ? GROWTH_YOY_TARGET : Math.round(GROWTH_YOY_TARGET * 0.7);
  if (yoy != null) {
    items.push({
      id: "growth",
      label: "Year-on-year growth",
      target: isGrowthStage
        ? `40%+ YoY (growth-stage bar)`
        : `Strong early traction (proxy bar ~${yoyTarget}%+)`,
      status: yoy >= GROWTH_YOY_TARGET ? "met" : yoy >= yoyTarget ? "partial" : "miss",
      evidence: `${yoy}% YoY · stage ${company.stage || "—"}`,
      dim: "traction",
    });
  } else if (company.headcount_6m_growth_pct != null) {
    const hc = company.headcount_6m_growth_pct;
    items.push({
      id: "growth",
      label: "Year-on-year growth",
      target: "40%+ YoY (or headcount proxy when revenue unknown)",
      status: hc >= 50 ? "met" : hc >= 30 ? "partial" : "miss",
      evidence: `Headcount 6m growth ${hc}% (revenue YoY unknown)`,
      dim: "traction",
    });
  } else {
    items.push({
      id: "growth",
      label: "Year-on-year growth",
      target: "40%+ YoY at growth stage",
      status: statusFromDim(dimScore(company, "traction")),
      evidence: "Growth not captured",
      dim: "traction",
    });
  }

  // 4. Runway ~3 years
  const runway = company.runway_months_est;
  if (runway == null) {
    items.push({
      id: "runway",
      label: "Safe runway",
      target: `~${RUNWAY_IDEAL} months (~3 years); floor ${RUNWAY_MIN} mo`,
      status: statusFromDim(dimScore(company, "runway")),
      evidence: "Runway not captured",
      dim: "runway",
    });
  } else {
    items.push({
      id: "runway",
      label: "Safe runway",
      target: `~${RUNWAY_IDEAL} months (~3 years); floor ${RUNWAY_MIN} mo`,
      status:
        runway >= RUNWAY_IDEAL ? "met" : runway >= RUNWAY_MIN ? "partial" : "miss",
      evidence: `${runway} months estimated`,
      dim: "runway",
    });
  }

  // 5. Tier-1 cap table
  const t1 = company.tier1_count ?? company.tier1_names?.length ?? 0;
  const t1Names = (company.tier1_names || []).slice(0, 4).join(", ");
  if (t1 >= TIER1_MIN && t1 <= TIER1_MAX + 1) {
    items.push({
      id: "tier1",
      label: "Tier-1 investors",
      target: `${TIER1_MIN}–${TIER1_MAX} Tier-1 on cap table`,
      status: "met",
      evidence: `${t1} Tier-1${t1Names ? ` · ${t1Names}` : ""}`,
      dim: "cap_table",
    });
  } else if (t1 >= 2) {
    items.push({
      id: "tier1",
      label: "Tier-1 investors",
      target: `${TIER1_MIN}–${TIER1_MAX} Tier-1 on cap table`,
      status: "partial",
      evidence: `${t1} Tier-1${t1Names ? ` · ${t1Names}` : ""} — below preferred density`,
      dim: "cap_table",
    });
  } else if (t1 === 1) {
    items.push({
      id: "tier1",
      label: "Tier-1 investors",
      target: `${TIER1_MIN}–${TIER1_MAX} Tier-1 on cap table`,
      status: "partial",
      evidence: `1 Tier-1${t1Names ? ` · ${t1Names}` : ""}`,
      dim: "cap_table",
    });
  } else {
    items.push({
      id: "tier1",
      label: "Tier-1 investors",
      target: `${TIER1_MIN}–${TIER1_MAX} Tier-1 on cap table`,
      status: "miss",
      evidence: "No Tier-1 investors classified",
      dim: "cap_table",
    });
  }

  // 6. Moat / defensibility
  const moatNotes = (company.moat_notes || "").toLowerCase();
  const moatDim = dimScore(company, "moat");
  const weakMoat =
    /weak|none|no moat|eroding/.test(moatNotes) || (moatDim != null && moatDim < 45);
  const strongMoat =
    /proprietary|patent|regulatory|clearance|data moat|network|defensib|integration/.test(
      moatNotes,
    ) || (moatDim != null && moatDim >= 70);
  items.push({
    id: "moat",
    label: "Moat / technical defensibility",
    target: "High moat · clear innovation edge",
    status: weakMoat
      ? "miss"
      : strongMoat
        ? "met"
        : moatNotes
          ? "partial"
          : statusFromDim(moatDim, 70, 50),
    evidence: company.moat_notes
      ? company.moat_notes.slice(0, 120) + (company.moat_notes.length > 120 ? "…" : "")
      : moatDim != null
        ? `Moat dim ${moatDim.toFixed(0)}`
        : "Moat notes not captured",
    dim: "moat",
  });

  // 7. Large TAM
  const tam = company.tam_usd_b;
  if (tam == null) {
    items.push({
      id: "tam",
      label: "Large TAM",
      target: `>$${TAM_MIN_B}B addressable market`,
      status: statusFromDim(dimScore(company, "tam_exit")),
      evidence: "TAM not captured",
      dim: "tam_exit",
    });
  } else {
    items.push({
      id: "tam",
      label: "Large TAM",
      target: `>$${TAM_MIN_B}B addressable market`,
      status: tam >= TAM_MIN_B * 2 ? "met" : tam >= TAM_MIN_B ? "met" : tam >= 0.5 ? "partial" : "miss",
      evidence: `$${tam}B TAM`,
      dim: "tam_exit",
    });
  }

  // 8. Exit horizon 3–5 years
  const exitYears = inferExitYears(company);
  const exitInferred = company.exit_horizon_years == null;
  items.push({
    id: "exit",
    label: "Exit horizon",
    target: `${EXIT_MIN}–${EXIT_MAX} year path`,
    status:
      exitYears >= EXIT_MIN && exitYears <= EXIT_MAX
        ? "met"
        : exitYears < EXIT_MIN
          ? "partial"
          : "partial",
    evidence: exitInferred
      ? `~${exitYears}yr inferred from ${company.stage || "stage"}`
      : `${exitYears} years`,
    dim: "tam_exit",
  });

  const met = items.filter((i) => i.status === "met").length;
  const partial = items.filter((i) => i.status === "partial").length;
  const miss = items.filter((i) => i.status === "miss").length;
  const unknown = items.filter((i) => i.status === "unknown").length;
  const scored = items.length - unknown;
  const fit_pct =
    scored <= 0
      ? 0
      : Math.round(((met + partial * 0.5) / scored) * 100);

  return { items, met, partial, miss, unknown, scored, fit_pct };
}

export function classifySources(
  sources: Array<string | { provider?: string; title?: string }> | null | undefined,
): SourceCategory[] {
  const raw = (sources || []).map((s) =>
    typeof s === "string" ? s : [s.provider, s.title].filter(Boolean).join(" "),
  );
  return SOURCE_TAXONOMY.map((tax) => {
    const matched = raw.filter((s) => tax.matchers.some((re) => re.test(s)));
    return {
      id: tax.id,
      label: tax.label,
      examples: tax.examples,
      matched: Array.from(new Set(matched)),
    };
  });
}

export function statusLabel(status: CriteriaStatus): string {
  switch (status) {
    case "met":
      return "Met";
    case "partial":
      return "Partial";
    case "miss":
      return "Miss";
    default:
      return "Unknown";
  }
}

/** Diligence questions derived from criteria misses / unknowns. */
export function criteriaOpenQuestions(company: CriteriaCompany, limit = 4): string[] {
  const { items } = evaluateThirdbaseCriteria(company);
  const qs: string[] = [];
  for (const item of items) {
    if (item.status === "miss" || item.status === "unknown") {
      qs.push(`Close the gap on “${item.label}”: ${item.target}.`);
    } else if (item.status === "partial") {
      qs.push(`Strengthen “${item.label}” toward bar: ${item.target}.`);
    }
    if (qs.length >= limit) break;
  }
  return qs;
}
