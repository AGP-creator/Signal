/** Demo-grade financial + analytics packs for showcase companies.
 *  Keyed by company slug / id so demos work without a DB schema change. */

export type QuarterPoint = {
  q: string;
  arr_m: number;
  burn_m: number;
  cash_m: number;
  headcount: number;
  customers?: number;
  nrr_pct?: number;
};

export type CapRow = {
  holder: string;
  ownership_pct: number;
  type: "founder" | "employee" | "investor" | "option_pool";
  preference?: string;
};

export type ArrBridgeStep = {
  label: string;
  value_m: number;
  kind: "total" | "delta" | "subtotal";
};

export const CAP_TYPE_COLORS: Record<CapRow["type"], string> = {
  founder: "var(--signal)",
  employee: "var(--deep)",
  option_pool: "var(--deep)",
  investor: "var(--ok)",
};

export type RatioRow = {
  key: string;
  label: string;
  value: string;
  benchmark?: string;
  status: "strong" | "watch" | "weak" | "neutral";
  hint: string;
};

export type VcTerm = {
  term: string;
  value: string;
  definition: string;
};

export type UnitEcon = {
  ltv_usd: number;
  cac_usd: number;
  ltv_cac: number;
  payback_months: number;
  gross_margin_pct: number;
  contribution_margin_pct: number;
  magic_number: number;
};

export type DemoFinancialPack = {
  slug: string;
  company_id: string;
  name: string;
  tagline: string;
  currency: "USD";
  as_of: string;
  /** Highlight KPIs for hero strip */
  kpis: {
    arr_m: number;
    arr_growth_yoy_pct: number;
    nrr_pct: number;
    gross_margin_pct: number;
    burn_m: number;
    runway_months: number;
    cash_m: number;
    rule_of_40: number;
    arr_multiple: number;
    fcf_margin_pct: number;
  };
  quarters: QuarterPoint[];
  revenue_mix: { label: string; pct: number; color: string }[];
  cohort_retention: { month: number; pct: number }[];
  unit_econ: UnitEcon;
  ratios: RatioRow[];
  cap_table: CapRow[];
  round_history: {
    round: string;
    date: string;
    amount_m: number;
    post_m: number;
    lead: string;
  }[];
  vc_terms: VcTerm[];
  narrative: {
    bull: string;
    bear: string;
    underwrite: string;
  };
  score_radar?: Record<string, number>;
  /** Optional ARR movement bridge (start → new → expand → churn → end). */
  arr_bridge?: ArrBridgeStep[];
  /** Illustrative exit proceeds scenarios ($M enterprise value). */
  exit_scenarios?: { label: string; exit_m: number }[];
};

const VC_GLOSSARY_BASE: Omit<VcTerm, "value">[] = [
  {
    term: "ARR",
    definition: "Annual Recurring Revenue — contracted SaaS revenue annualized.",
  },
  {
    term: "NRR",
    definition: "Net Revenue Retention — expansion minus churn on the existing base.",
  },
  {
    term: "Rule of 40",
    definition: "Growth % + FCF margin %; elite SaaS clears 40.",
  },
  {
    term: "LTV / CAC",
    definition: "Lifetime value over customer acquisition cost; >3× is healthy.",
  },
  {
    term: "Payback",
    definition: "Months to recover CAC from gross profit on a new customer.",
  },
  {
    term: "Magic Number",
    definition: "Net new ARR / prior-period sales & marketing spend.",
  },
  {
    term: "ARR Multiple",
    definition: "Post-money valuation ÷ ARR — growth-adjusted SaaS pricing.",
  },
  {
    term: "Burn Multiple",
    definition: "Net burn ÷ net new ARR; <1.5× is efficient growth.",
  },
  {
    term: "Liquidation Pref",
    definition: "Order and multiple at which preferred gets paid on exit.",
  },
  {
    term: "Participation",
    definition: "Whether preferred also shares residual with common after pref.",
  },
];

function pack(
  partial: Omit<DemoFinancialPack, "vc_terms"> & { vc_term_values: Record<string, string> },
): DemoFinancialPack {
  const { vc_term_values, ...rest } = partial;
  return {
    ...rest,
    vc_terms: VC_GLOSSARY_BASE.map((g) => ({
      ...g,
      value: vc_term_values[g.term] ?? "—",
    })),
  };
}

export const DEMO_FINANCIAL_SLUGS = [
  "agentgate",
  "latticeeval",
  "swarmguard",
  "synthforge",
  "vectorloom",
] as const;

export const DEMO_SHOWCASE = [
  {
    name: "AgentGate",
    slug: "agentgate",
    blurb: "Agent identity · full financials desk",
    stage: "Series A",
  },
  {
    name: "LatticeEval",
    slug: "latticeeval",
    blurb: "Eval infra · ARR bridge + ratios",
    stage: "Series B",
  },
  {
    name: "SwarmGuard",
    slug: "swarmguard",
    blurb: "Defence autonomy · contract book",
    stage: "Series B",
  },
  {
    name: "SynthForge",
    slug: "synthforge",
    blurb: "RL envs · unit economics deep dive",
    stage: "Series A",
  },
  {
    name: "VectorLoom",
    slug: "vectorloom",
    blurb: "Enterprise RAG · NRR & multiples",
    stage: "Series C",
  },
] as const;

const PACKS: Record<string, DemoFinancialPack> = {
  agentgate: pack({
    slug: "agentgate",
    company_id: "c_agentgate",
    name: "AgentGate",
    tagline: "Identity & authz plane for enterprise AI agents",
    currency: "USD",
    as_of: "2026-08-01",
    kpis: {
      arr_m: 18.4,
      arr_growth_yoy_pct: 168,
      nrr_pct: 148,
      gross_margin_pct: 82,
      burn_m: 1.9,
      runway_months: 32,
      cash_m: 61,
      rule_of_40: 142,
      arr_multiple: 17.4,
      fcf_margin_pct: -26,
    },
    quarters: [
      { q: "Q1'25", arr_m: 4.2, burn_m: 1.1, cash_m: 22, headcount: 28, customers: 12, nrr_pct: 122 },
      { q: "Q2'25", arr_m: 5.8, burn_m: 1.3, cash_m: 28, headcount: 36, customers: 19, nrr_pct: 128 },
      { q: "Q3'25", arr_m: 8.1, burn_m: 1.5, cash_m: 24, headcount: 48, customers: 31, nrr_pct: 134 },
      { q: "Q4'25", arr_m: 11.2, burn_m: 1.7, cash_m: 19, headcount: 58, customers: 44, nrr_pct: 140 },
      { q: "Q1'26", arr_m: 14.6, burn_m: 1.8, cash_m: 64, headcount: 66, customers: 58, nrr_pct: 144 },
      { q: "Q2'26", arr_m: 18.4, burn_m: 1.9, cash_m: 61, headcount: 72, customers: 74, nrr_pct: 148 },
    ],
    revenue_mix: [
      { label: "Platform seats", pct: 54, color: "var(--signal)" },
      { label: "Usage / API", pct: 28, color: "var(--deep)" },
      { label: "Enterprise support", pct: 12, color: "var(--ok)" },
      { label: "Professional svc", pct: 6, color: "var(--warn)" },
    ],
    cohort_retention: [
      { month: 1, pct: 100 },
      { month: 3, pct: 97 },
      { month: 6, pct: 104 },
      { month: 9, pct: 118 },
      { month: 12, pct: 132 },
      { month: 18, pct: 148 },
    ],
    unit_econ: {
      ltv_usd: 186000,
      cac_usd: 42000,
      ltv_cac: 4.4,
      payback_months: 11,
      gross_margin_pct: 82,
      contribution_margin_pct: 61,
      magic_number: 1.35,
    },
    ratios: [
      { key: "ltv_cac", label: "LTV / CAC", value: "4.4×", benchmark: ">3×", status: "strong", hint: "Efficient land-and-expand in banks" },
      { key: "payback", label: "CAC payback", value: "11 mo", benchmark: "<18 mo", status: "strong", hint: "Sales cycle compressing" },
      { key: "burn_mult", label: "Burn multiple", value: "0.9×", benchmark: "<1.5×", status: "strong", hint: "Net new ARR outruns burn" },
      { key: "magic", label: "Magic number", value: "1.35", benchmark: ">0.75", status: "strong", hint: "S&M efficiency elite" },
      { key: "grr", label: "GRR", value: "96%", benchmark: ">90%", status: "strong", hint: "Logo churn under control" },
      { key: "nrr", label: "NRR", value: "148%", benchmark: ">120%", status: "strong", hint: "Seat expansion + usage upsell" },
      { key: "gm", label: "Gross margin", value: "82%", benchmark: ">75%", status: "strong", hint: "Software-heavy mix" },
      { key: "rule40", label: "Rule of 40", value: "142", benchmark: ">40", status: "strong", hint: "Growth-weighted" },
      { key: "arr_mult", label: "ARR multiple", value: "17.4×", benchmark: "12–20×", status: "neutral", hint: "In-band for 150%+ growth" },
      { key: "cash_conv", label: "Cash conversion", value: "74%", benchmark: ">70%", status: "strong", hint: "Annual prepay common" },
    ],
    cap_table: [
      { holder: "Founders", ownership_pct: 38, type: "founder" },
      { holder: "Employee pool", ownership_pct: 14, type: "option_pool" },
      { holder: "Greylock", ownership_pct: 18, type: "investor", preference: "1× non-participating" },
      { holder: "Sequoia Capital", ownership_pct: 12, type: "investor", preference: "1× non-participating" },
      { holder: "Spark Capital", ownership_pct: 9, type: "investor", preference: "1× non-participating" },
      { holder: "Unusual Ventures", ownership_pct: 5, type: "investor", preference: "1× non-participating" },
      { holder: "Angels / other", ownership_pct: 4, type: "investor", preference: "1× non-participating" },
    ],
    round_history: [
      { round: "Seed", date: "2024-09", amount_m: 8, post_m: 42, lead: "Unusual Ventures" },
      { round: "Series A", date: "2026-06", amount_m: 48, post_m: 320, lead: "Greylock" },
    ],
    vc_term_values: {
      ARR: "$18.4M",
      NRR: "148%",
      "Rule of 40": "142",
      "LTV / CAC": "4.4×",
      Payback: "11 months",
      "Magic Number": "1.35",
      "ARR Multiple": "17.4× post / ARR",
      "Burn Multiple": "0.9×",
      "Liquidation Pref": "1× non-participating (all rounds)",
      Participation: "None — clean stack",
    },
    narrative: {
      bull: "Category-defining agent identity with bank design partners, elite NRR, and a clean 1× pref stack — rare Series A underwriting quality.",
      bear: "Category still forming; large identity incumbents (Okta, CrowdStrike) could bundle; sales cycles in FS are long.",
      underwrite: "Underwrite to $55–70M ARR in 24 months at 130%+ NRR; entry ownership 8–12% for a $25–40M check into an extension.",
    },
    score_radar: {
      growth: 92,
      efficiency: 88,
      retention: 94,
      margin: 85,
      runway: 90,
      capital: 82,
    },
  }),

  latticeeval: pack({
    slug: "latticeeval",
    company_id: "c_latticeeval",
    name: "LatticeEval",
    tagline: "Eval harnesses & adversarial suites for frontier labs",
    currency: "USD",
    as_of: "2026-08-01",
    kpis: {
      arr_m: 42,
      arr_growth_yoy_pct: 95,
      nrr_pct: 136,
      gross_margin_pct: 78,
      burn_m: 2.4,
      runway_months: 34,
      cash_m: 82,
      rule_of_40: 88,
      arr_multiple: 17.1,
      fcf_margin_pct: -7,
    },
    quarters: [
      { q: "Q1'25", arr_m: 14.2, burn_m: 1.8, cash_m: 48, headcount: 78, customers: 6, nrr_pct: 118 },
      { q: "Q2'25", arr_m: 18.5, burn_m: 2.0, cash_m: 44, headcount: 92, customers: 8, nrr_pct: 122 },
      { q: "Q3'25", arr_m: 24.1, burn_m: 2.1, cash_m: 40, headcount: 110, customers: 9, nrr_pct: 126 },
      { q: "Q4'25", arr_m: 30.8, burn_m: 2.2, cash_m: 36, headcount: 128, customers: 11, nrr_pct: 130 },
      { q: "Q1'26", arr_m: 36.4, burn_m: 2.3, cash_m: 86, headcount: 140, customers: 12, nrr_pct: 133 },
      { q: "Q2'26", arr_m: 42.0, burn_m: 2.4, cash_m: 82, headcount: 148, customers: 14, nrr_pct: 136 },
    ],
    revenue_mix: [
      { label: "Lab platform", pct: 62, color: "var(--signal)" },
      { label: "Dataset license", pct: 22, color: "var(--deep)" },
      { label: "Red-team retainer", pct: 16, color: "var(--ok)" },
    ],
    cohort_retention: [
      { month: 1, pct: 100 },
      { month: 3, pct: 100 },
      { month: 6, pct: 108 },
      { month: 9, pct: 118 },
      { month: 12, pct: 128 },
      { month: 18, pct: 136 },
    ],
    unit_econ: {
      ltv_usd: 2400000,
      cac_usd: 380000,
      ltv_cac: 6.3,
      payback_months: 8,
      gross_margin_pct: 78,
      contribution_margin_pct: 58,
      magic_number: 1.1,
    },
    ratios: [
      { key: "ltv_cac", label: "LTV / CAC", value: "6.3×", benchmark: ">3×", status: "strong", hint: "ACV is multi-million" },
      { key: "payback", label: "CAC payback", value: "8 mo", benchmark: "<18 mo", status: "strong", hint: "Concentrated lab buyers" },
      { key: "burn_mult", label: "Burn multiple", value: "1.1×", benchmark: "<1.5×", status: "strong", hint: "Healthy efficiency" },
      { key: "magic", label: "Magic number", value: "1.10", benchmark: ">0.75", status: "strong", hint: "Founder-led enterprise" },
      { key: "grr", label: "GRR", value: "99%", benchmark: ">90%", status: "strong", hint: "Near-zero logo churn" },
      { key: "nrr", label: "NRR", value: "136%", benchmark: ">120%", status: "strong", hint: "Suite expansion" },
      { key: "gm", label: "Gross margin", value: "78%", benchmark: ">75%", status: "strong", hint: "Some human red-team mix" },
      { key: "rule40", label: "Rule of 40", value: "88", benchmark: ">40", status: "strong", hint: "Growth + near-breakeven" },
      { key: "arr_mult", label: "ARR multiple", value: "17.1×", benchmark: "12–20×", status: "neutral", hint: "Frontier-lab concentration risk priced in" },
      { key: "conc", label: "Top-3 ARR", value: "61%", benchmark: "<40%", status: "watch", hint: "Buyer concentration" },
    ],
    cap_table: [
      { holder: "Founders", ownership_pct: 32, type: "founder" },
      { holder: "Employee pool", ownership_pct: 12, type: "option_pool" },
      { holder: "a16z", ownership_pct: 22, type: "investor", preference: "1× non-participating" },
      { holder: "Sequoia Capital", ownership_pct: 14, type: "investor", preference: "1× non-participating" },
      { holder: "Lux Capital", ownership_pct: 10, type: "investor", preference: "1× non-participating" },
      { holder: "Conviction", ownership_pct: 6, type: "investor", preference: "1× non-participating" },
      { holder: "Other", ownership_pct: 4, type: "investor", preference: "1× non-participating" },
    ],
    round_history: [
      { round: "Seed", date: "2023-11", amount_m: 12, post_m: 55, lead: "Lux Capital" },
      { round: "Series A", date: "2025-02", amount_m: 35, post_m: 220, lead: "Sequoia Capital" },
      { round: "Series B", date: "2026-06", amount_m: 65, post_m: 720, lead: "a16z" },
    ],
    vc_term_values: {
      ARR: "$42M",
      NRR: "136%",
      "Rule of 40": "88",
      "LTV / CAC": "6.3×",
      Payback: "8 months",
      "Magic Number": "1.10",
      "ARR Multiple": "17.1×",
      "Burn Multiple": "1.1×",
      "Liquidation Pref": "1× non-participating",
      Participation: "None",
    },
    narrative: {
      bull: "Embedded in weekly release gates at frontier labs — switching costs are organizational, not just technical.",
      bear: "Customer concentration; labs may build internal eval; valuation assumes continued frontier spend.",
      underwrite: "Path to $100M ARR via second-wave labs + enterprise model risk desks; watch top-3 concentration.",
    },
    score_radar: {
      growth: 84,
      efficiency: 86,
      retention: 96,
      margin: 80,
      runway: 92,
      capital: 88,
    },
  }),

  swarmguard: pack({
    slug: "swarmguard",
    company_id: "c_swarmguard",
    name: "SwarmGuard",
    tagline: "Counter-UAS autonomy for base & convoy protection",
    currency: "USD",
    as_of: "2026-08-01",
    kpis: {
      arr_m: 86,
      arr_growth_yoy_pct: 90,
      nrr_pct: 122,
      gross_margin_pct: 54,
      burn_m: 3.1,
      runway_months: 36,
      cash_m: 118,
      rule_of_40: 72,
      arr_multiple: 11.0,
      fcf_margin_pct: -18,
    },
    quarters: [
      { q: "Q1'25", arr_m: 28, burn_m: 2.4, cash_m: 55, headcount: 180, customers: 4, nrr_pct: 110 },
      { q: "Q2'25", arr_m: 36, burn_m: 2.6, cash_m: 50, headcount: 210, customers: 5, nrr_pct: 112 },
      { q: "Q3'25", arr_m: 48, burn_m: 2.8, cash_m: 44, headcount: 245, customers: 6, nrr_pct: 115 },
      { q: "Q4'25", arr_m: 62, burn_m: 2.9, cash_m: 38, headcount: 275, customers: 7, nrr_pct: 118 },
      { q: "Q1'26", arr_m: 74, burn_m: 3.0, cash_m: 124, headcount: 295, customers: 8, nrr_pct: 120 },
      { q: "Q2'26", arr_m: 86, burn_m: 3.1, cash_m: 118, headcount: 310, customers: 9, nrr_pct: 122 },
    ],
    revenue_mix: [
      { label: "DoD contracts", pct: 58, color: "var(--signal)" },
      { label: "Allied gov", pct: 24, color: "var(--deep)" },
      { label: "Hardware kits", pct: 12, color: "var(--warn)" },
      { label: "Training / ops", pct: 6, color: "var(--ok)" },
    ],
    cohort_retention: [
      { month: 1, pct: 100 },
      { month: 6, pct: 100 },
      { month: 12, pct: 108 },
      { month: 18, pct: 115 },
      { month: 24, pct: 122 },
    ],
    unit_econ: {
      ltv_usd: 18500000,
      cac_usd: 2100000,
      ltv_cac: 8.8,
      payback_months: 14,
      gross_margin_pct: 54,
      contribution_margin_pct: 38,
      magic_number: 0.95,
    },
    ratios: [
      { key: "bk", label: "Booked backlog", value: "$210M", benchmark: ">2× ARR", status: "strong", hint: "Multi-year PoR path" },
      { key: "gm", label: "Gross margin", value: "54%", benchmark: ">50% defence", status: "neutral", hint: "Hardware dilutes" },
      { key: "nrr", label: "Contract NRR", value: "122%", benchmark: ">110%", status: "strong", hint: "Option years exercising" },
      { key: "burn_mult", label: "Burn multiple", value: "1.3×", benchmark: "<2× defence", status: "strong", hint: "Acceptable for hardware" },
      { key: "rule40", label: "Rule of 40", value: "72", benchmark: ">40", status: "strong", hint: "Growth carries it" },
      { key: "arr_mult", label: "Rev multiple", value: "11.0×", benchmark: "8–14×", status: "neutral", hint: "Defence comps band" },
      { key: "cash", label: "Cash / burn", value: "38 mo", benchmark: ">24 mo", status: "strong", hint: "War chest post-B" },
      { key: "conc", label: "USG share", value: "58%", benchmark: "—", status: "watch", hint: "Single-buyer risk" },
      { key: "ltv_cac", label: "LTV / CAC", value: "8.8×", benchmark: ">4×", status: "strong", hint: "Long program life" },
      { key: "payback", label: "Payback", value: "14 mo", benchmark: "<24 mo", status: "strong", hint: "BD-heavy but sticky" },
    ],
    cap_table: [
      { holder: "Founders", ownership_pct: 28, type: "founder" },
      { holder: "Employee pool", ownership_pct: 11, type: "option_pool" },
      { holder: "Founders Fund", ownership_pct: 24, type: "investor", preference: "1× non-participating" },
      { holder: "8VC", ownership_pct: 14, type: "investor", preference: "1× non-participating" },
      { holder: "Shield Capital", ownership_pct: 12, type: "investor", preference: "1× non-participating" },
      { holder: "Lux Capital", ownership_pct: 8, type: "investor", preference: "1× non-participating" },
      { holder: "Other", ownership_pct: 3, type: "investor", preference: "1× non-participating" },
    ],
    round_history: [
      { round: "Seed", date: "2023-04", amount_m: 15, post_m: 70, lead: "Shield Capital" },
      { round: "Series A", date: "2024-10", amount_m: 45, post_m: 280, lead: "8VC" },
      { round: "Series B", date: "2026-05", amount_m: 100, post_m: 950, lead: "Founders Fund" },
    ],
    vc_term_values: {
      ARR: "$86M (run-rate revenue)",
      NRR: "122% contract",
      "Rule of 40": "72",
      "LTV / CAC": "8.8×",
      Payback: "14 months",
      "Magic Number": "0.95",
      "ARR Multiple": "11.0×",
      "Burn Multiple": "1.3×",
      "Liquidation Pref": "1× non-participating",
      Participation: "None",
    },
    narrative: {
      bull: "Program-of-record trajectory with live deployments and allied pull-through — scarce autonomous defence asset.",
      bear: "Procurement timing risk; hardware margin pressure; export controls limit TAM speed.",
      underwrite: "Underwrite backlog conversion and software mix lift to 60%+ GM over 3 years.",
    },
    score_radar: {
      growth: 86,
      efficiency: 72,
      retention: 88,
      margin: 62,
      runway: 94,
      capital: 90,
    },
  }),

  synthforge: pack({
    slug: "synthforge",
    company_id: "c_synthforge",
    name: "SynthForge",
    tagline: "RL environment factories for agent training",
    currency: "USD",
    as_of: "2026-08-01",
    kpis: {
      arr_m: 9.6,
      arr_growth_yoy_pct: 120,
      nrr_pct: 141,
      gross_margin_pct: 74,
      burn_m: 1.4,
      runway_months: 30,
      cash_m: 38,
      rule_of_40: 98,
      arr_multiple: 29.2,
      fcf_margin_pct: -32,
    },
    quarters: [
      { q: "Q1'25", arr_m: 2.1, burn_m: 0.8, cash_m: 14, headcount: 22, customers: 4, nrr_pct: 115 },
      { q: "Q2'25", arr_m: 3.2, burn_m: 0.9, cash_m: 18, headcount: 30, customers: 7, nrr_pct: 122 },
      { q: "Q3'25", arr_m: 4.6, burn_m: 1.1, cash_m: 16, headcount: 40, customers: 11, nrr_pct: 128 },
      { q: "Q4'25", arr_m: 6.2, burn_m: 1.2, cash_m: 14, headcount: 50, customers: 16, nrr_pct: 134 },
      { q: "Q1'26", arr_m: 7.8, burn_m: 1.3, cash_m: 40, headcount: 60, customers: 22, nrr_pct: 138 },
      { q: "Q2'26", arr_m: 9.6, burn_m: 1.4, cash_m: 38, headcount: 67, customers: 28, nrr_pct: 141 },
    ],
    revenue_mix: [
      { label: "Env platform", pct: 48, color: "var(--signal)" },
      { label: "Trajectory packs", pct: 32, color: "var(--deep)" },
      { label: "Sim partnerships", pct: 20, color: "var(--ok)" },
    ],
    cohort_retention: [
      { month: 1, pct: 100 },
      { month: 3, pct: 98 },
      { month: 6, pct: 110 },
      { month: 9, pct: 124 },
      { month: 12, pct: 135 },
      { month: 18, pct: 141 },
    ],
    unit_econ: {
      ltv_usd: 420000,
      cac_usd: 95000,
      ltv_cac: 4.4,
      payback_months: 10,
      gross_margin_pct: 74,
      contribution_margin_pct: 52,
      magic_number: 1.2,
    },
    ratios: [
      { key: "ltv_cac", label: "LTV / CAC", value: "4.4×", benchmark: ">3×", status: "strong", hint: "Design-partner ACV rising" },
      { key: "payback", label: "CAC payback", value: "10 mo", benchmark: "<18 mo", status: "strong", hint: "PLG + enterprise hybrid" },
      { key: "burn_mult", label: "Burn multiple", value: "1.4×", benchmark: "<1.5×", status: "strong", hint: "Borderline elite" },
      { key: "magic", label: "Magic number", value: "1.20", benchmark: ">0.75", status: "strong", hint: "Efficient GTM" },
      { key: "nrr", label: "NRR", value: "141%", benchmark: ">120%", status: "strong", hint: "Env pack upsell" },
      { key: "gm", label: "Gross margin", value: "74%", benchmark: ">70%", status: "strong", hint: "Compute pass-through managed" },
      { key: "rule40", label: "Rule of 40", value: "98", benchmark: ">40", status: "strong", hint: "Growth-led" },
      { key: "arr_mult", label: "ARR multiple", value: "29×", benchmark: "15–25×", status: "watch", hint: "Rich vs stage ARR" },
      { key: "runway", label: "Runway", value: "30 mo", benchmark: ">18 mo", status: "strong", hint: "Post-A cushion" },
      { key: "grr", label: "GRR", value: "94%", benchmark: ">90%", status: "strong", hint: "Early churn acceptable" },
    ],
    cap_table: [
      { holder: "Founders", ownership_pct: 42, type: "founder" },
      { holder: "Employee pool", ownership_pct: 15, type: "option_pool" },
      { holder: "Conviction", ownership_pct: 16, type: "investor", preference: "1× non-participating" },
      { holder: "Lux Capital", ownership_pct: 10, type: "investor", preference: "1× non-participating" },
      { holder: "Initialized", ownership_pct: 8, type: "investor", preference: "1× non-participating" },
      { holder: "Felicis", ownership_pct: 6, type: "investor", preference: "1× non-participating" },
      { holder: "Other", ownership_pct: 3, type: "investor", preference: "1× non-participating" },
    ],
    round_history: [
      { round: "Seed", date: "2024-08", amount_m: 6, post_m: 32, lead: "Initialized Capital" },
      { round: "Series A", date: "2026-05", amount_m: 42, post_m: 280, lead: "Conviction" },
    ],
    vc_term_values: {
      ARR: "$9.6M",
      NRR: "141%",
      "Rule of 40": "98",
      "LTV / CAC": "4.4×",
      Payback: "10 months",
      "Magic Number": "1.20",
      "ARR Multiple": "29× (rich)",
      "Burn Multiple": "1.4×",
      "Liquidation Pref": "1× non-participating",
      Participation: "None",
    },
    narrative: {
      bull: "Picks-and-shovels for agent training with robotics sim exclusives — expands with every new agent lab.",
      bear: "Multiple rich vs ARR; compute costs could pressure GM; competitive synthetic-data noise.",
      underwrite: "Need clear path to $30M ARR before next round or multiple compresses.",
    },
    score_radar: {
      growth: 90,
      efficiency: 84,
      retention: 90,
      margin: 76,
      runway: 86,
      capital: 78,
    },
  }),

  vectorloom: pack({
    slug: "vectorloom",
    company_id: "c_vectorloom",
    name: "VectorLoom",
    tagline: "Multimodal retrieval fabric with enterprise governance",
    currency: "USD",
    as_of: "2026-08-01",
    kpis: {
      arr_m: 128,
      arr_growth_yoy_pct: 55,
      nrr_pct: 140,
      gross_margin_pct: 80,
      burn_m: 2.8,
      runway_months: 36,
      cash_m: 210,
      rule_of_40: 68,
      arr_multiple: 12.5,
      fcf_margin_pct: 13,
    },
    quarters: [
      { q: "Q1'25", arr_m: 68, burn_m: 3.4, cash_m: 140, headcount: 310, customers: 180, nrr_pct: 128 },
      { q: "Q2'25", arr_m: 78, burn_m: 3.2, cash_m: 132, headcount: 340, customers: 210, nrr_pct: 132 },
      { q: "Q3'25", arr_m: 90, burn_m: 3.0, cash_m: 125, headcount: 370, customers: 245, nrr_pct: 135 },
      { q: "Q4'25", arr_m: 102, burn_m: 2.9, cash_m: 118, headcount: 395, customers: 280, nrr_pct: 137 },
      { q: "Q1'26", arr_m: 115, burn_m: 2.8, cash_m: 215, headcount: 410, customers: 310, nrr_pct: 139 },
      { q: "Q2'26", arr_m: 128, burn_m: 2.8, cash_m: 210, headcount: 420, customers: 340, nrr_pct: 140 },
    ],
    revenue_mix: [
      { label: "Cloud platform", pct: 70, color: "var(--signal)" },
      { label: "Private cloud", pct: 18, color: "var(--deep)" },
      { label: "Governance add-on", pct: 12, color: "var(--ok)" },
    ],
    cohort_retention: [
      { month: 1, pct: 100 },
      { month: 3, pct: 99 },
      { month: 6, pct: 106 },
      { month: 12, pct: 122 },
      { month: 18, pct: 134 },
      { month: 24, pct: 140 },
    ],
    unit_econ: {
      ltv_usd: 520000,
      cac_usd: 78000,
      ltv_cac: 6.7,
      payback_months: 9,
      gross_margin_pct: 80,
      contribution_margin_pct: 64,
      magic_number: 0.88,
    },
    ratios: [
      { key: "nrr", label: "NRR", value: "140%", benchmark: ">120%", status: "strong", hint: "Regulated vertical expand" },
      { key: "ltv_cac", label: "LTV / CAC", value: "6.7×", benchmark: ">3×", status: "strong", hint: "Mature GTM" },
      { key: "payback", label: "CAC payback", value: "9 mo", benchmark: "<18 mo", status: "strong", hint: "Enterprise motion dialed" },
      { key: "gm", label: "Gross margin", value: "80%", benchmark: ">75%", status: "strong", hint: "Cloud mix healthy" },
      { key: "fcf", label: "FCF margin", value: "+13%", benchmark: ">0%", status: "strong", hint: "Approaching scale profitability" },
      { key: "rule40", label: "Rule of 40", value: "68", benchmark: ">40", status: "strong", hint: "Balanced growth + profit" },
      { key: "arr_mult", label: "ARR multiple", value: "12.5×", benchmark: "10–15×", status: "neutral", hint: "Fair for Series C" },
      { key: "burn_mult", label: "Burn multiple", value: "0.7×", benchmark: "<1×", status: "strong", hint: "Efficient at scale" },
      { key: "magic", label: "Magic number", value: "0.88", benchmark: ">0.75", status: "strong", hint: "Solid S&M ROI" },
      { key: "grr", label: "GRR", value: "97%", benchmark: ">90%", status: "strong", hint: "Sticky governance layer" },
    ],
    cap_table: [
      { holder: "Founders", ownership_pct: 18, type: "founder" },
      { holder: "Employee pool", ownership_pct: 10, type: "option_pool" },
      { holder: "IVP", ownership_pct: 16, type: "investor", preference: "1× non-participating" },
      { holder: "Tiger Global", ownership_pct: 14, type: "investor", preference: "1× non-participating" },
      { holder: "Index Ventures", ownership_pct: 12, type: "investor", preference: "1× non-participating" },
      { holder: "Greylock", ownership_pct: 12, type: "investor", preference: "1× non-participating" },
      { holder: "Accel", ownership_pct: 10, type: "investor", preference: "1× non-participating" },
      { holder: "Earlier / other", ownership_pct: 8, type: "investor", preference: "1× non-participating" },
    ],
    round_history: [
      { round: "Series A", date: "2022-06", amount_m: 28, post_m: 140, lead: "Greylock" },
      { round: "Series B", date: "2024-03", amount_m: 75, post_m: 620, lead: "Index Ventures" },
      { round: "Series C", date: "2025-11", amount_m: 120, post_m: 1600, lead: "IVP" },
    ],
    vc_term_values: {
      ARR: "$128M",
      NRR: "140%",
      "Rule of 40": "68",
      "LTV / CAC": "6.7×",
      Payback: "9 months",
      "Magic Number": "0.88",
      "ARR Multiple": "12.5×",
      "Burn Multiple": "0.7×",
      "Liquidation Pref": "1× non-participating (clean)",
      Participation: "None",
    },
    narrative: {
      bull: "Governance moat inside Fortune 100 security reviews; FCF-positive trajectory with 140% NRR.",
      bear: "Growth decelerating vs earlier stages; vector DB commoditization risk; crowded Series C tape.",
      underwrite: "Scale buy — underwrite durability of NRR and private-cloud attach in regulated verticals.",
    },
    score_radar: {
      growth: 72,
      efficiency: 90,
      retention: 94,
      margin: 88,
      runway: 96,
      capital: 92,
    },
  }),
};

export function getDemoFinancials(slugOrId?: string | null): DemoFinancialPack | null {
  if (!slugOrId) return null;
  const key = slugOrId.toLowerCase().replace(/^c_/, "");
  return PACKS[key] || PACKS[slugOrId.toLowerCase()] || null;
}

export function hasDemoFinancials(slugOrId?: string | null): boolean {
  return Boolean(getDemoFinancials(slugOrId));
}

export function listDemoFinancials(): DemoFinancialPack[] {
  return DEMO_FINANCIAL_SLUGS.map((s) => PACKS[s]).filter(Boolean);
}

/** QoQ ARR growth % from quarterly series. */
export function deriveQoqGrowth(pack: DemoFinancialPack) {
  const qs = pack.quarters;
  return qs.slice(1).map((q, i) => {
    const prev = qs[i].arr_m;
    const pct = prev > 0 ? ((q.arr_m - prev) / prev) * 100 : 0;
    return { label: q.q.replace("Q", "Q").replace("'2", "'"), value: Math.round(pct) };
  });
}

/** YoY growth at each quarter that has a prior-year peer (index >= 4 in a 6Q pack). */
export function deriveYoyGrowth(pack: DemoFinancialPack) {
  const qs = pack.quarters;
  return qs
    .map((q, i) => {
      if (i < 4) return null;
      const prev = qs[i - 4];
      if (!prev || prev.arr_m <= 0) return null;
      return {
        label: q.q,
        value: Math.round(((q.arr_m - prev.arr_m) / prev.arr_m) * 100),
      };
    })
    .filter(Boolean) as { label: string; value: number }[];
}

/** Build ARR bridge steps — use pack.arr_bridge or synthesize from last two quarters + NRR. */
export function deriveArrBridge(pack: DemoFinancialPack): ArrBridgeStep[] {
  if (pack.arr_bridge?.length) return pack.arr_bridge;
  const qs = pack.quarters;
  if (qs.length < 2) return [];
  const prev = qs[qs.length - 2];
  const curr = qs[qs.length - 1];
  const delta = +(curr.arr_m - prev.arr_m).toFixed(1);
  const nrr = (curr.nrr_pct ?? pack.kpis.nrr_pct) / 100;
  const expansion = +Math.max(0, prev.arr_m * (nrr - 1)).toFixed(1);
  const churn = +Math.max(0.1, prev.arr_m * 0.04).toFixed(1);
  const logos = +Math.max(0.1, delta - expansion + churn).toFixed(1);
  return [
    { label: prev.q, value_m: prev.arr_m, kind: "total" },
    { label: "New logos", value_m: logos, kind: "delta" },
    { label: "Expansion", value_m: expansion, kind: "delta" },
    { label: "Churn", value_m: -churn, kind: "delta" },
    { label: curr.q, value_m: curr.arr_m, kind: "total" },
  ];
}

export function capTableSlices(pack: DemoFinancialPack) {
  return pack.cap_table.map((r) => ({
    label: r.holder,
    pct: r.ownership_pct,
    color: CAP_TYPE_COLORS[r.type] || "var(--muted)",
  }));
}

export function ownershipByType(pack: DemoFinancialPack) {
  const map: Record<string, number> = {};
  for (const row of pack.cap_table) {
    const key =
      row.type === "founder"
        ? "Founders"
        : row.type === "option_pool" || row.type === "employee"
          ? "Pool"
          : "Investors";
    map[key] = (map[key] || 0) + row.ownership_pct;
  }
  const colors: Record<string, string> = {
    Founders: "var(--signal)",
    Pool: "var(--deep)",
    Investors: "var(--ok)",
  };
  return Object.entries(map).map(([label, pct]) => ({
    label,
    pct: Math.round(pct * 10) / 10,
    color: colors[label],
  }));
}

/** Illustrative 1× non-participating liquidation stack at a given exit. */
export function deriveExitProceeds(pack: DemoFinancialPack, exit_m: number) {
  const invested = pack.round_history.reduce((s, r) => s + r.amount_m, 0);
  const pref = Math.min(exit_m, invested);
  const residual = Math.max(0, exit_m - pref);
  const foundersPct =
    pack.cap_table.filter((c) => c.type === "founder").reduce((s, c) => s + c.ownership_pct, 0) / 100;
  const poolPct =
    pack.cap_table
      .filter((c) => c.type === "option_pool" || c.type === "employee")
      .reduce((s, c) => s + c.ownership_pct, 0) / 100;
  const investorCommonPct = Math.max(0, 1 - foundersPct - poolPct);
  return [
    { label: "Preferred", amount_m: +pref.toFixed(0), color: "var(--ok)" },
    {
      label: "Founders",
      amount_m: +(residual * foundersPct).toFixed(0),
      color: "var(--signal)",
    },
    {
      label: "Pool",
      amount_m: +(residual * poolPct).toFixed(0),
      color: "var(--deep)",
    },
    {
      label: "Investors (common)",
      amount_m: +(residual * investorCommonPct).toFixed(0),
      color: "var(--warn)",
    },
  ];
}

export function defaultExitScenarios(pack: DemoFinancialPack) {
  if (pack.exit_scenarios?.length) return pack.exit_scenarios;
  const lastPost = pack.round_history[pack.round_history.length - 1]?.post_m || pack.kpis.arr_m * 15;
  return [
    { label: "0.5×", exit_m: Math.round(lastPost * 0.5) },
    { label: "1×", exit_m: Math.round(lastPost) },
    { label: "2×", exit_m: Math.round(lastPost * 2) },
    { label: "5×", exit_m: Math.round(lastPost * 5) },
  ];
}
