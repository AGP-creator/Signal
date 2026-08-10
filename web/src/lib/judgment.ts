/**
 * Judgment OS — the X-factor layer competitors copying the brief won't ship.
 *
 * Coverage tools maximize companies seen. Judgment OS maximizes *correct attention*
 * and turns partner disagreements into institutional edge:
 *   Override ledger · Miss retrospective · Mix drift · Freshness SLA ·
 *   Founder radar · Digest selectivity · IC packet
 */

import type { AlertItem, Commentary, Company, NewsItem, PeerActivity } from "@/lib/types";
import { portfolioMix } from "@/lib/utils";

export type OverrideRec = "Deep Dive" | "Watch" | "Pass";

export type PartnerOverride = {
  id: string;
  company_id: string;
  company_name: string;
  slug?: string | null;
  signal_rec: OverrideRec | string;
  partner_rec: OverrideRec;
  partner: string;
  reason: string;
  dimension_hint?: string | null;
  created_at: string;
};

export type PolicyFuel = {
  dimension: string;
  override_count: number;
  direction: "raise_bar" | "lower_bar" | "reweight" | "clarify";
  counsel: string;
  evidence: string[];
};

export type MissCase = {
  id: string;
  company_id: string;
  company_name: string;
  slug?: string | null;
  then_rec: string;
  then_score: number | null;
  now_signal: string;
  severity: "high" | "medium" | "watch";
  gap: string;
  lesson: string;
  action: string;
  evidence: string[];
};

export type MixDrift = {
  dominantPct: number;
  tacticalPct: number;
  targetDominant: number;
  targetTactical: number;
  status: "on_target" | "soft_drift" | "hard_drift";
  band: string;
  alarm: string | null;
  counsel: string;
};

export type FreshnessField = {
  field: string;
  label: string;
  value: string;
  age_days: number | null;
  sla_days: number;
  status: "fresh" | "aging" | "stale" | "unknown";
  confidence_haircut: number;
};

export type CompanyFreshness = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  overall: "fresh" | "aging" | "stale" | "unknown";
  score_confidence: number;
  fields: FreshnessField[];
  note: string;
};

export type FounderHit = {
  id: string;
  founder: string;
  prior: string;
  signal: string;
  source: string;
  urgency: "now" | "this_week" | "monitor";
  theme?: string | null;
  company_hint?: string | null;
  company_id?: string | null;
  company_slug?: string | null;
  action: string;
  gp_flagged_by?: string | null;
};

export type DigestVariant = {
  id: "tight" | "standard" | "loose";
  deal_cap: number;
  deals: { name: string; score: number | null; recommendation: string | null; slug?: string | null }[];
  precision_proxy: number;
  partner_minutes: number;
  note: string;
};

export type DigestSelectivity = {
  winner: DigestVariant["id"];
  variants: DigestVariant[];
  counsel: string;
};

export type JudgmentPack = {
  generated_at: string;
  mix_drift: MixDrift;
  overrides: PartnerOverride[];
  policy_fuel: PolicyFuel[];
  misses: MissCase[];
  freshness: CompanyFreshness[];
  founder_radar: FounderHit[];
  digest_selectivity: DigestSelectivity;
  summary: {
    headline: string;
    must_do: string[];
    edge_note: string;
  };
};

const FIELD_SLA: { field: keyof Company | string; label: string; sla_days: number }[] = [
  { field: "last_signal_date", label: "Last market signal", sla_days: 21 },
  { field: "last_round_date", label: "Last round date", sla_days: 180 },
  { field: "valuation_est_m", label: "Valuation estimate", sla_days: 90 },
  { field: "headcount", label: "Headcount", sla_days: 60 },
  { field: "yoy_growth_pct", label: "YoY growth", sla_days: 90 },
  { field: "runway_months_est", label: "Runway", sla_days: 60 },
  { field: "commentary_summary", label: "Commentary", sla_days: 45 },
];

const DEMO_OVERRIDES: PartnerOverride[] = [
  {
    id: "ov_demo_1",
    company_id: "c_revpilot",
    company_name: "RevPilot",
    slug: "revpilot",
    signal_rec: "Watch",
    partner_rec: "Pass",
    partner: "GP (demo)",
    reason:
      "Category is crowded and valuation full — CRM replacement narrative doesn't clear our moat bar even at 65% YoY.",
    dimension_hint: "moat",
    created_at: "2026-08-04T10:00:00Z",
  },
  {
    id: "ov_demo_2",
    company_id: "c_quietrobot",
    company_name: "QuietPath Robotics",
    slug: "quietpath",
    signal_rec: "Watch",
    partner_rec: "Deep Dive",
    partner: "Principal (demo)",
    reason:
      "Ex-Locus team + Lux lead + quiet tape in logistics AMR — white-space access window before consensus.",
    dimension_hint: "timing",
    created_at: "2026-08-06T14:00:00Z",
  },
  {
    id: "ov_demo_3",
    company_id: "c_pipelinecloud",
    company_name: "PipelineCloud",
    slug: "pipelinecloud",
    signal_rec: "Pass",
    partner_rec: "Pass",
    partner: "GP (demo)",
    reason: "Agree with Signal — horizontal SaaS wrapper, no technical moat for Thirdbase.",
    dimension_hint: "thesis_fit",
    created_at: "2026-08-07T09:00:00Z",
  },
];

/** Watched operators — founder radar prior art (mirrors config intent). */
export const WATCHED_OPERATORS = [
  { name: "ex-DeepMind RL", prior: "DeepMind RL research", themes: ["ai_infra", "robotics"] },
  { name: "ex-Locus", prior: "Locus Robotics", themes: ["robotics"] },
  { name: "ex-Outreach", prior: "Outreach", themes: ["ai_copilots"] },
  { name: "ex-OpenAI", prior: "OpenAI", themes: ["ai_infra", "ai_native_stack"] },
  { name: "ex-Scale", prior: "Scale AI", themes: ["ai_infra"] },
  { name: "ex-Anduril", prior: "Anduril", themes: ["defence"] },
  { name: "ex-Palantir", prior: "Palantir", themes: ["defence", "cybersecurity"] },
  { name: "ex-Stripe", prior: "Stripe", themes: ["fintech"] },
  { name: "ex-Databricks", prior: "Databricks", themes: ["ai_infra"] },
];

function daysSince(iso?: string | null, asOf = new Date("2026-08-10")): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.round((asOf.getTime() - d.getTime()) / 86_400_000));
}

function statusForAge(age: number | null, sla: number): FreshnessField["status"] {
  if (age == null) return "unknown";
  if (age <= sla * 0.6) return "fresh";
  if (age <= sla) return "aging";
  return "stale";
}

export function computeMixDrift(companies: Company[]): MixDrift {
  const mix = portfolioMix(companies);
  const delta = Math.abs(mix.tacticalPct - 40);
  let status: MixDrift["status"] = "on_target";
  if (delta >= 12) status = "hard_drift";
  else if (delta >= 6) status = "soft_drift";

  const overweightTactical = mix.tacticalPct > 40;
  const alarm =
    status === "hard_drift"
      ? overweightTactical
        ? `HARD DRIFT — tactical at ${mix.tacticalPct}% (target ≤40%). Partner attention is leaking into sector-agnostic bets.`
        : `HARD DRIFT — dominant only ${mix.dominantPct}% (target 60%). Underweight core tech/growth.`
      : status === "soft_drift"
        ? overweightTactical
          ? `Soft mix drift — tactical ${mix.tacticalPct}% vs 40% band.`
          : `Soft mix drift — dominant ${mix.dominantPct}% vs 60% target.`
        : null;

  const counsel =
    status === "on_target"
      ? "Mix within band. Keep the next Hot Deals cohort balanced — don't let one crowded theme tip the ledger."
      : overweightTactical
        ? "Bias next Deep Dives toward AI infra / cyber / defense / robotics. Raise the Pass bar on tactical copilots and horizontal SaaS."
        : "Allow 1–2 high-conviction tactical names only if relative rank is #1 in theme × stage.";

  return {
    dominantPct: mix.dominantPct,
    tacticalPct: mix.tacticalPct,
    targetDominant: 60,
    targetTactical: 40,
    status,
    band: "60/40 ±6 soft · ±12 hard",
    alarm,
    counsel,
  };
}

export function computeCompanyFreshness(company: Company): CompanyFreshness {
  const anchor = company.last_signal_date;
  const fieldValue = (field: string): unknown => {
    switch (field) {
      case "last_signal_date":
        return company.last_signal_date;
      case "last_round_date":
        return company.last_round_date;
      case "valuation_est_m":
        return company.valuation_est_m;
      case "headcount":
        return company.headcount;
      case "yoy_growth_pct":
        return company.yoy_growth_pct;
      case "runway_months_est":
        return company.runway_months_est;
      case "commentary_summary":
        return company.commentary_summary;
      default:
        return undefined;
    }
  };
  const fields: FreshnessField[] = FIELD_SLA.map((spec) => {
    const raw = fieldValue(spec.field);
    const age =
      spec.field === "last_signal_date" || spec.field === "last_round_date"
        ? daysSince(typeof raw === "string" ? raw : null)
        : daysSince(anchor);
    const status = statusForAge(age, spec.sla_days);
    const haircut =
      status === "stale" ? 0.25 : status === "aging" ? 0.1 : status === "unknown" ? 0.15 : 0;
    let value = "—";
    if (raw == null) value = "missing";
    else if (typeof raw === "number") value = String(raw);
    else if (typeof raw === "string") value = raw.slice(0, 48);
    return {
      field: spec.field,
      label: spec.label,
      value,
      age_days: age,
      sla_days: spec.sla_days,
      status,
      confidence_haircut: haircut,
    };
  });

  const worst = fields.some((f) => f.status === "stale")
    ? "stale"
    : fields.some((f) => f.status === "aging")
      ? "aging"
      : fields.every((f) => f.status === "unknown")
        ? "unknown"
        : "fresh";
  const haircut = Math.min(
    0.45,
    fields.reduce((s, f) => s + f.confidence_haircut, 0) / Math.max(1, fields.length),
  );
  const score_confidence = Math.round(100 * (1 - haircut));

  return {
    company_id: company.id,
    company_name: company.name,
    slug: company.slug,
    overall: worst,
    score_confidence,
    fields,
    note:
      worst === "stale"
        ? `Evidence SLA breach — treat thesis score ${company.thesis_score?.toFixed(0) ?? "—"} as provisional until refreshed.`
        : worst === "aging"
          ? "Evidence aging — confidence haircut applied; associate should refresh before IC."
          : "Evidence within SLA — score usable for Monday debate.",
  };
}

export function computeFreshnessBoard(companies: Company[]): CompanyFreshness[] {
  return companies
    .map(computeCompanyFreshness)
    .sort((a, b) => {
      const rank = { stale: 0, aging: 1, unknown: 2, fresh: 3 };
      return rank[a.overall] - rank[b.overall] || a.score_confidence - b.score_confidence;
    });
}

export function detectMisses(companies: Company[], peers: PeerActivity[]): MissCase[] {
  const misses: MissCase[] = [];
  const peerByCompany = new Map<string, PeerActivity[]>();
  for (const p of peers) {
    if (!p.company_id) continue;
    const list = peerByCompany.get(p.company_id) || [];
    list.push(p);
    peerByCompany.set(p.company_id, list);
  }

  for (const c of companies) {
    const rec = c.recommendation || "Pass";
    const score = c.thesis_score ?? 0;
    const peerHits = peerByCompany.get(c.id) || [];
    const growth = c.yoy_growth_pct ?? 0;
    const hcGrowth = c.headcount_6m_growth_pct ?? 0;
    const tier1 = c.tier1_count ?? 0;

    // Breakout physics: strong growth / peer heat but Signal said Pass or low Watch
    if ((rec === "Pass" || (rec === "Watch" && score < 65)) && (growth >= 80 || hcGrowth >= 80)) {
      misses.push({
        id: `miss_growth_${c.id}`,
        company_id: c.id,
        company_name: c.name,
        slug: c.slug,
        then_rec: rec,
        then_score: c.thesis_score ?? null,
        now_signal: `Breakout velocity — YoY ${growth || "n/a"}% · HC 6m ${hcGrowth}%`,
        severity: growth >= 100 || hcGrowth >= 100 ? "high" : "medium",
        gap: "Traction / hiring inflection under-weighted relative to narrative risk.",
        lesson: "When HC 6m ≥80% on a thesis theme, force a Watch floor even if moat notes are thin.",
        action: "Open miss retrospective — decide if this is a sourcing gap or a correct Pass with luck.",
        evidence: [
          c.traction_notes || "",
          c.team_notes || "",
          `relative_rank=${c.relative_rank || "—"}`,
        ].filter(Boolean),
      });
    }

    // Peer FOMO while we were cool
    if ((rec === "Pass" || rec === "Watch") && peerHits.length >= 2 && score < 72) {
      misses.push({
        id: `miss_peer_${c.id}`,
        company_id: c.id,
        company_name: c.name,
        slug: c.slug,
        then_rec: rec,
        then_score: c.thesis_score ?? null,
        now_signal: `${peerHits.length} peer-set firms tagged this name while Signal stayed ${rec}`,
        severity: peerHits.some((p) => p.thesis_shift) ? "high" : "medium",
        gap: "Peer heat arrived before our relative-rank update — attention lag risk.",
        lesson: "Off-thesis peer entry + theme fit should bump urgency even if absolute score is mid.",
        action: "Re-score with peer heat as timing dimension; if still Pass, document spine for IC.",
        evidence: peerHits.slice(0, 3).map((p) => `${p.firm} → ${p.round || "?"} (${p.date || "?"})`),
      });
    }

    // Quiet proprietary window we almost missed (thin tape, strong team, Watch not Deep Dive)
    if (
      rec === "Watch" &&
      (c.investors || []).length <= 2 &&
      tier1 <= 1 &&
      (c.team_notes || "").toLowerCase().includes("ex-") &&
      score >= 60
    ) {
      misses.push({
        id: `miss_quiet_${c.id}`,
        company_id: c.id,
        company_name: c.name,
        slug: c.slug,
        then_rec: rec,
        then_score: c.thesis_score ?? null,
        now_signal: "Quiet tape + watched operator DNA — proprietary window may be closing",
        severity: "watch",
        gap: "Selectivity over-indexed on Tier-1 count; under-indexed on founder prior + access.",
        lesson: "For Seed/Pre-Seed on thesis themes, founder prior can outweigh empty Tier-1 count.",
        action: "Promote to Deep Dive candidate queue or explicitly Pass with founder-radar note.",
        evidence: [c.team_notes || "", `investors=${(c.investors || []).join(", ")}`],
      });
    }
  }

  // Deduplicate by company, keep highest severity
  const sev = { high: 0, medium: 1, watch: 2 };
  const byCo = new Map<string, MissCase>();
  for (const m of misses.sort((a, b) => sev[a.severity] - sev[b.severity])) {
    if (!byCo.has(m.company_id)) byCo.set(m.company_id, m);
  }
  return [...byCo.values()].slice(0, 8);
}

export function detectFounderRadar(
  companies: Company[],
  commentary: Commentary[],
  news: NewsItem[],
  alerts: AlertItem[] = [],
): FounderHit[] {
  const hits: FounderHit[] = [];
  const blobSources: { text: string; source: string; company?: Company }[] = [];

  for (const cm of commentary) {
    blobSources.push({
      text: `${cm.source || ""} ${cm.quote_or_summary || ""}`,
      source: cm.source || "commentary",
      company: companies.find((c) => c.id === cm.company_id),
    });
  }
  for (const n of news) {
    blobSources.push({
      text: `${n.title || ""} ${n.why_it_matters || ""}`,
      source: n.source || "news",
    });
  }
  for (const a of alerts) {
    blobSources.push({
      text: `${a.title || ""} ${a.body || ""}`,
      source: "alert",
      company: companies.find((c) => c.id === a.company_id),
    });
  }
  for (const c of companies) {
    if (c.team_notes) {
      blobSources.push({ text: c.team_notes, source: "team_notes", company: c });
    }
  }

  const patterns = [
    /watched founder/i,
    /spin(?:ning|s)? up/i,
    /stealth/i,
    /leaving\s+\w+/i,
    /ex-[A-Z][A-Za-z0-9]+/i,
    /newco/i,
    /founder.+launch/i,
  ];

  let i = 0;
  for (const src of blobSources) {
    const text = src.text;
    if (!patterns.some((p) => p.test(text))) continue;

    const op = WATCHED_OPERATORS.find((o) => text.toLowerCase().includes(o.name.toLowerCase().replace("ex-", "ex-")) || text.toLowerCase().includes(o.prior.toLowerCase()));
    const gpMatch = text.match(/\b(Elad Gil|Molly O'Shea|Deedy|Packy McCormick|Keith Rabois|Delian Asparouhov)\b/i);
    const isStealth = /stealth|newco|spin/i.test(text);
    const founder =
      op?.name ||
      (text.match(/ex-[A-Za-z0-9]+(?:\s+[A-Za-z]+)?/) || [])[0] ||
      "Watched operator";

    hits.push({
      id: `fr_${i++}_${(src.company?.id || "x").slice(0, 8)}`,
      founder,
      prior: op?.prior || "Operator with GP watchlist adjacency",
      signal: text.slice(0, 220).trim(),
      source: src.source,
      urgency: isStealth || gpMatch ? "now" : "this_week",
      theme: src.company?.sector_theme || op?.themes[0] || null,
      company_hint: src.company?.name || null,
      company_id: src.company?.id || null,
      company_slug: src.company?.slug || null,
      gp_flagged_by: gpMatch?.[0] || null,
      action: isStealth
        ? "Route as immediate alert — partner intro / research agent brief within 24h."
        : "Add to founder radar board; refresh on next GP chatter.",
    });
  }

  // Deduplicate similar signals
  const seen = new Set<string>();
  return hits
    .filter((h) => {
      const key = `${h.founder}|${h.company_hint || h.signal.slice(0, 40)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const u = { now: 0, this_week: 1, monitor: 2 };
      return u[a.urgency] - u[b.urgency];
    })
    .slice(0, 10);
}

export function buildPolicyFuel(overrides: PartnerOverride[]): PolicyFuel[] {
  const byDim = new Map<string, PartnerOverride[]>();
  for (const o of overrides) {
    const dim = o.dimension_hint || inferDimension(o.reason);
    const list = byDim.get(dim) || [];
    list.push(o);
    byDim.set(dim, list);
  }

  const fuel: PolicyFuel[] = [];
  for (const [dimension, rows] of byDim) {
    const raise = rows.filter((r) => rankRec(r.partner_rec) < rankRec(String(r.signal_rec))).length;
    const lower = rows.filter((r) => rankRec(r.partner_rec) > rankRec(String(r.signal_rec))).length;
    const agree = rows.filter((r) => r.partner_rec === r.signal_rec).length;

    let direction: PolicyFuel["direction"] = "clarify";
    let counsel = "";
    if (raise > lower && raise > 0) {
      direction = "raise_bar";
      counsel = `Partners are stricter than Signal on ${dimension} — consider raising the Pass threshold or weight.`;
    } else if (lower > raise && lower > 0) {
      direction = "lower_bar";
      counsel = `Partners see more upside than Signal on ${dimension} — under-weighting this dimension risks false negatives.`;
    } else if (agree > 0 && raise + lower === 0) {
      direction = "clarify";
      counsel = `Agreement on ${dimension} — keep weight; use as calibration anchor.`;
    } else {
      direction = "reweight";
      counsel = `Mixed overrides on ${dimension} — schedule thesis workshop, don't silent-tune.`;
    }

    fuel.push({
      dimension,
      override_count: rows.length,
      direction,
      counsel,
      evidence: rows.slice(0, 3).map((r) => `${r.company_name}: Signal ${r.signal_rec} → Partner ${r.partner_rec}`),
    });
  }

  return fuel.sort((a, b) => b.override_count - a.override_count);
}

function rankRec(r: string) {
  if (r === "Deep Dive") return 2;
  if (r === "Watch") return 1;
  return 0;
}

function inferDimension(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes("moat") || r.includes("defensib")) return "moat";
  if (r.includes("valuation") || r.includes("price") || r.includes("full")) return "valuation";
  if (r.includes("team") || r.includes("founder") || r.includes("ex-")) return "team_quality";
  if (r.includes("tier") || r.includes("cap table") || r.includes("syndicate")) return "cap_table";
  if (r.includes("timing") || r.includes("window") || r.includes("now")) return "timing";
  if (r.includes("growth") || r.includes("traction") || r.includes("yoy")) return "traction";
  if (r.includes("thesis") || r.includes("theme") || r.includes("fit")) return "thesis_fit";
  return "judgment";
}

export function computeDigestSelectivity(companies: Company[]): DigestSelectivity {
  const ranked = [...companies]
    .filter((c) => c.recommendation === "Deep Dive" || (c.thesis_score || 0) >= 70)
    .sort((a, b) => (b.thesis_score || 0) - (a.thesis_score || 0));

  const mk = (id: DigestVariant["id"], cap: number, note: string): DigestVariant => {
    const deals = ranked.slice(0, cap).map((c) => ({
      name: c.name,
      score: c.thesis_score ?? null,
      recommendation: c.recommendation ?? null,
      slug: c.slug,
    }));
    // Precision proxy: average score of included deals (higher = more selective)
    const avg =
      deals.reduce((s, d) => s + (d.score || 0), 0) / Math.max(1, deals.length);
    const precision_proxy = Math.round(Math.min(98, avg * 0.92 + (5 - Math.min(5, cap)) * 3));
    const partner_minutes = Math.round(cap * 8 + (cap > 3 ? (cap - 3) * 4 : 0));
    return { id, deal_cap: cap, deals, precision_proxy, partner_minutes, note };
  };

  const variants = [
    mk("tight", 3, "Ruthless — only what a partner would forward. Highest precision, risk of false negatives."),
    mk("standard", 5, "M/W/F design default — selectivity with room for one asymmetric Watch."),
    mk("loose", 8, "Coverage creep — looks busy, dilutes Monday. Competitors ship this; we refuse it as default."),
  ];

  const winner =
    variants[0].precision_proxy >= variants[1].precision_proxy + 4 ? "tight" : "standard";

  return {
    winner,
    variants,
    counsel:
      winner === "tight"
        ? "Current Hot Deals quality supports a 3-deal digest. If partners ask for more, add one sector call — not three more names."
        : "Keep the 5-deal cap. Expanding to 8 would drop precision proxy without proven follow-through.",
  };
}

export function buildIcPacketMarkdown(
  company: Company,
  opts?: {
    commentary?: Commentary[];
    comps?: { name: string; thesis_score?: number | null; recommendation?: string | null; why?: string }[];
    freshness?: CompanyFreshness;
    competitive?: {
      on_cap_table?: { name: string }[];
      circling?: { name: string; reason?: string }[];
      syndicate_suggestions?: { firm: string; reason?: string }[];
    };
    override?: PartnerOverride | null;
  },
): string {
  const cm = opts?.commentary || [];
  const comps = opts?.comps || [];
  const fresh = opts?.freshness;
  const lines = [
    `# IC Packet — ${company.name}`,
    ``,
    `**Thirdbase Signal** · ${new Date().toISOString().slice(0, 10)}`,
    ``,
    `## Recommendation`,
    `**${company.recommendation || "—"}** · Thesis score **${company.thesis_score?.toFixed(0) ?? "—"}** · ${company.relative_rank || "unranked"}`,
    fresh
      ? `Evidence confidence: **${fresh.score_confidence}%** (${fresh.overall}) — ${fresh.note}`
      : "",
    opts?.override
      ? `Partner override: Signal said **${opts.override.signal_rec}** → Partner **${opts.override.partner_rec}** — ${opts.override.reason}`
      : "",
    ``,
    `## One-liner`,
    company.one_liner || "—",
    ``,
    `## Why now`,
    company.why_now || "—",
    ``,
    `## Snapshot`,
    `| Field | Value |`,
    `|---|---|`,
    `| Theme | ${company.sector_theme || "—"} / ${company.subsector || "—"} |`,
    `| Stage | ${company.stage || "—"} |`,
    `| Bucket | ${company.pipeline_bucket || "—"} |`,
    `| Last round | $${company.last_round_size_m ?? "—"}M · ${company.last_round_date || "—"} |`,
    `| Valuation | $${company.valuation_est_m ?? "—"}M (${company.valuation_confidence || "—"}) |`,
    `| Lead | ${company.lead_investor || "—"} |`,
    `| Tier-1 | ${company.tier1_count ?? 0} · ${(company.tier1_names || []).join(", ") || "—"} |`,
    `| YoY / Runway | ${company.yoy_growth_pct ?? "—"}% / ${company.runway_months_est ?? "—"} mo |`,
    `| TAM | $${company.tam_usd_b ?? "—"}B |`,
    ``,
    `## Team`,
    company.team_notes || "—",
    ``,
    `## Traction`,
    company.traction_notes || "—",
    ``,
    `## Moat`,
    company.moat_notes || "—",
    ``,
    `## Score breakdown`,
    ...Object.entries(company.score_breakdown || {}).map(
      ([k, v]) => `- ${k}: ${typeof v === "number" ? v.toFixed(0) : v}`,
    ),
    ``,
    `## Cap table`,
    (company.investors || []).join(", ") || "—",
    ``,
    `## Competitive context`,
    `On tape: ${(opts?.competitive?.on_cap_table || []).map((x) => x.name).join(", ") || "—"}`,
    `Circling: ${(opts?.competitive?.circling || []).map((x) => `${x.name}${x.reason ? ` (${x.reason})` : ""}`).join("; ") || "—"}`,
    `Syndicate unlock: ${(opts?.competitive?.syndicate_suggestions || []).map((x) => x.firm).join(", ") || "—"}`,
    ``,
    `## Comps`,
    ...(comps.length
      ? comps.map(
          (c) =>
            `- **${c.name}** · ${c.recommendation || "—"} · ${c.thesis_score ?? "—"} — ${c.why || ""}`,
        )
      : ["- None in pipeline"]),
    ``,
    `## Commentary`,
    ...(cm.length
      ? cm.map((c) => `- (${c.source}, ${c.sentiment}): ${c.quote_or_summary}`)
      : [company.commentary_summary || "- None captured"]),
    ``,
    `## Provenance`,
    `Sources: ${(company.sources || []).join(", ") || "—"}`,
    `Last signal: ${company.last_signal_date || "—"}`,
    `Valuations marked estimated are not private facts.`,
    ``,
    `---`,
    `_Models write. Policy decides. Partners convict._`,
  ];
  return lines.filter((l) => l !== undefined).join("\n");
}

export function mergeOverrides(
  stored: PartnerOverride[],
  includeDemo = true,
): PartnerOverride[] {
  const map = new Map<string, PartnerOverride>();
  if (includeDemo) {
    for (const o of DEMO_OVERRIDES) map.set(`${o.company_id}:${o.partner}`, o);
  }
  for (const o of stored) map.set(`${o.company_id}:${o.partner}`, o);
  return [...map.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function buildJudgmentPack(
  companies: Company[],
  peers: PeerActivity[],
  commentary: Commentary[],
  news: NewsItem[],
  alerts: AlertItem[] = [],
  overrides: PartnerOverride[] = [],
): JudgmentPack {
  const merged = mergeOverrides(overrides, true);
  const mix_drift = computeMixDrift(companies);
  const misses = detectMisses(companies, peers);
  const freshness = computeFreshnessBoard(companies).slice(0, 12);
  const founder_radar = detectFounderRadar(companies, commentary, news, alerts);
  const policy_fuel = buildPolicyFuel(merged);
  const digest_selectivity = computeDigestSelectivity(companies);

  const must_do: string[] = [];
  if (mix_drift.alarm) must_do.push(mix_drift.alarm);
  if (founder_radar[0]?.urgency === "now") {
    must_do.push(`Founder radar: ${founder_radar[0].founder} — ${founder_radar[0].action}`);
  }
  if (misses[0]?.severity === "high") {
    must_do.push(`Miss retrospective: ${misses[0].company_name} — ${misses[0].action}`);
  }
  const staleN = freshness.filter((f) => f.overall === "stale").length;
  if (staleN) must_do.push(`${staleN} Deep Dive/Hot names breaching evidence freshness SLA.`);
  if (!must_do.length) {
    must_do.push("No hard alarms — run override review on one Pass and one Deep Dive this week.");
  }

  const headline =
    founder_radar[0]?.urgency === "now"
      ? `Founder radar hot: ${founder_radar[0].founder}`
      : mix_drift.status === "hard_drift"
        ? `Mix drift alarm — ${mix_drift.dominantPct}/${mix_drift.tacticalPct}`
        : misses[0]
          ? `Miss watch: ${misses[0].company_name}`
          : "Judgment loop healthy — calibrate with overrides";

  return {
    generated_at: new Date().toISOString(),
    mix_drift,
    overrides: merged,
    policy_fuel,
    misses,
    freshness,
    founder_radar,
    digest_selectivity,
    summary: {
      headline,
      must_do: must_do.slice(0, 4),
      edge_note:
        "Edge compounds from override labels + miss postmortems — not from a bigger LLM. Competitors can copy the digest UI; they cannot copy Thirdbase preference data.",
    },
  };
}

export function formatJudgmentBriefMarkdown(pack: JudgmentPack): string {
  return [
    `# Judgment OS — ${pack.summary.headline}`,
    "",
    pack.summary.edge_note,
    "",
    "## Must do",
    ...pack.summary.must_do.map((m) => `- ${m}`),
    "",
    `## Mix · ${pack.mix_drift.dominantPct}/${pack.mix_drift.tacticalPct} (${pack.mix_drift.status})`,
    pack.mix_drift.counsel,
    "",
    "## Founder radar",
    ...(pack.founder_radar.length
      ? pack.founder_radar
          .slice(0, 4)
          .map((f) => `- **${f.founder}** (${f.urgency}) — ${f.signal.slice(0, 120)}`)
      : ["- Quiet"]),
    "",
    "## Miss retrospectives",
    ...(pack.misses.length
      ? pack.misses.slice(0, 4).map((m) => `- **${m.company_name}**: ${m.lesson}`)
      : ["- None flagged"]),
    "",
    "## Policy fuel from overrides",
    ...pack.policy_fuel.map((p) => `- **${p.dimension}** (${p.direction}): ${p.counsel}`),
    "",
    `## Digest selectivity · prefer **${pack.digest_selectivity.winner}**`,
    pack.digest_selectivity.counsel,
  ].join("\n");
}
