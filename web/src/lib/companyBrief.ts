/** Canonical company intelligence brief — IC one-pager decision object.
 *
 * Sections: funding history, cap table quality (T1/T2/T3), team & hiring,
 * product traction, thesis fit, comps, commentary, Pass / Watch / Deep Dive.
 *
 * Built on demand (search / chat / API) or auto-triggered when a deal scores
 * above Watch / Deep Dive threshold on refresh.
 */

import type { Commentary, Company, PeerActivity } from "@/lib/types";
import { getDemoFinancials } from "@/lib/demoFinancials";
import { buildComparables, type CompRow } from "@/lib/peerIntel";
import { fmtMoneyM, fmtPct } from "@/lib/utils";

export type FundingRound = {
  round: string;
  date?: string | null;
  amount_m?: number | null;
  post_m?: number | null;
  lead?: string | null;
  confidence?: string | null;
};

export type HiringSignal = "strong hiring inflection" | "solid hiring" | "moderate hiring" | "flat / slow hiring";

export type IntelligenceBrief = {
  brief_id: string;
  company_id: string;
  slug?: string;
  name: string;
  domain?: string | null;
  one_liner?: string | null;
  recommendation?: string | null;
  thesis_score?: number | null;
  relative_rank?: string | null;
  score_breakdown?: Record<string, number>;
  confidence: "high" | "medium" | "low";
  trigger: "on_demand" | "threshold_auto" | "scout";
  generated_at: string;
  funding_history: {
    stage?: string | null;
    last_round_size_m?: number | null;
    last_round_date?: string | null;
    valuation_est_m?: number | null;
    valuation_confidence?: string | null;
    lead_investor?: string | null;
    rounds: FundingRound[];
  };
  cap_table_quality: {
    tier1_count: number;
    tier1_names: string[];
    tier2_count: number;
    tier2_names: string[];
    tier3_count: number;
    tier3_names: string[];
    investors: string[];
    lead_investor?: string | null;
  };
  team_and_hiring: {
    notes: string;
    headcount?: number | null;
    headcount_6m_growth_pct?: number | null;
    hiring_signal?: HiringSignal | null;
  };
  product_traction: {
    product_notes: string;
    traction_notes: string;
    yoy_growth_pct?: number | null;
    runway_months_est?: number | null;
    tam_usd_b?: number | null;
  };
  thesis_fit: {
    sector_theme?: string | null;
    subsector?: string | null;
    pipeline_bucket?: string | null;
    moat_notes: string;
    why_now: string;
    score_breakdown: Record<string, number>;
  };
  comparables: CompRow[];
  commentary: { summary: string; items: Commentary[] };
  peer_activity: PeerActivity[];
  open_questions: string[];
  provenance: string;
};

function hiringSignal(growth: number | null | undefined): HiringSignal | null {
  if (growth == null) return null;
  if (growth >= 40) return "strong hiring inflection";
  if (growth >= 20) return "solid hiring";
  if (growth < 5) return "flat / slow hiring";
  return "moderate hiring";
}

/** Multi-round history: company.funding_rounds → demo pack → synthesized ladder. */
export function resolveFundingRounds(company: Company): FundingRound[] {
  const existing = company.funding_rounds;
  if (Array.isArray(existing) && existing.length) return existing;

  const pack = getDemoFinancials(company.slug) || getDemoFinancials(company.id);
  if (pack?.round_history?.length) {
    return pack.round_history.map((r) => ({
      round: r.round,
      date: r.date,
      amount_m: r.amount_m,
      post_m: r.post_m,
      lead: r.lead,
      confidence: "estimated",
    }));
  }

  const stage = (company.stage || "").trim();
  const lastSize = company.last_round_size_m;
  if (lastSize == null && !stage) return [];

  const size = Number(lastSize ?? 10);
  const post = Number(company.valuation_est_m ?? size * 5);
  const date = (company.last_round_date || "").slice(0, 10);
  const lead = company.lead_investor || null;
  const investors = company.investors || [];

  let ladder: [string, number, number][] = [];
  const stageL = stage.toLowerCase();
  if (stageL.includes("seed") && !stageL.includes("series")) {
    ladder = [["Seed", size, post]];
  } else if (stageL.includes("series a")) {
    ladder = [
      ["Seed", Math.round(size * 0.28 * 10) / 10, Math.round(post * 0.22 * 10) / 10],
      ["Series A", size, post],
    ];
  } else if (stageL.includes("series b")) {
    ladder = [
      ["Seed", Math.round(size * 0.12 * 10) / 10, Math.round(post * 0.08 * 10) / 10],
      ["Series A", Math.round(size * 0.35 * 10) / 10, Math.round(post * 0.28 * 10) / 10],
      ["Series B", size, post],
    ];
  } else if (
    stageL.includes("series c") ||
    stageL.includes("series d") ||
    stageL.includes("growth")
  ) {
    ladder = [
      ["Seed", Math.round(size * 0.06 * 10) / 10, Math.round(post * 0.04 * 10) / 10],
      ["Series A", Math.round(size * 0.18 * 10) / 10, Math.round(post * 0.12 * 10) / 10],
      ["Series B", Math.round(size * 0.4 * 10) / 10, Math.round(post * 0.35 * 10) / 10],
      [stage || "Series C", size, post],
    ];
  } else {
    ladder = [[stage || "Latest", size, post]];
  }

  let year: number | null = null;
  let month: number | null = null;
  let day = 15;
  if (date.length >= 7) {
    year = Number(date.slice(0, 4));
    month = Number(date.slice(5, 7));
    if (date.length >= 10) day = Number(date.slice(8, 10)) || 15;
  }

  const n = ladder.length;
  return ladder.map(([label, amt, postM], i) => {
    let rDate: string | null = i === n - 1 ? date || null : null;
    if (year && month && i < n - 1) {
      const back = (n - 1 - i) * 14;
      let m = month - (back % 12);
      let y = year - Math.floor(back / 12);
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      rDate = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(Math.min(day, 28)).padStart(2, "0")}`;
    }
    const isLast = i === n - 1;
    return {
      round: label,
      date: rDate,
      amount_m: amt,
      post_m: postM,
      lead: isLast ? lead : investors[0] || null,
      confidence:
        isLast && company.valuation_confidence === "reported" ? "reported" : "estimated",
    };
  });
}

export function resolveProductNotes(company: Company): string {
  if (company.product_notes?.trim()) return company.product_notes.trim();
  const bits: string[] = [];
  if (company.one_liner?.trim()) bits.push(company.one_liner.trim());
  if (company.moat_notes?.trim()) bits.push(`Differentiation: ${company.moat_notes.trim()}`);
  return bits.join(" ");
}

export function buildIntelligenceBrief(
  company: Company,
  opts: {
    commentary?: Commentary[];
    peers?: PeerActivity[];
    companies?: Company[];
    comparables?: CompRow[];
    trigger?: IntelligenceBrief["trigger"];
  } = {},
): IntelligenceBrief {
  const commentary = (opts.commentary || []).filter((c) => c.company_id === company.id);
  const peers = (opts.peers || []).filter((p) => p.company_id === company.id);
  const comps =
    opts.comparables ||
    (opts.companies ? buildComparables(opts.companies)[company.id] || [] : []);

  return {
    brief_id: company.brief_id || `brief_${company.id}`,
    company_id: company.id,
    slug: company.slug,
    name: company.name,
    domain: company.domain,
    one_liner: company.one_liner,
    recommendation: company.recommendation,
    thesis_score: company.thesis_score,
    relative_rank: company.relative_rank,
    score_breakdown: company.score_breakdown,
    confidence: "high",
    trigger: opts.trigger || "on_demand",
    generated_at: new Date().toISOString(),
    funding_history: {
      stage: company.stage,
      last_round_size_m: company.last_round_size_m,
      last_round_date: company.last_round_date,
      valuation_est_m: company.valuation_est_m,
      valuation_confidence: company.valuation_confidence,
      lead_investor: company.lead_investor,
      rounds: resolveFundingRounds(company),
    },
    cap_table_quality: {
      tier1_count: company.tier1_count ?? 0,
      tier1_names: company.tier1_names || [],
      tier2_count: company.tier2_count ?? 0,
      tier2_names: company.tier2_names || [],
      tier3_count: company.tier3_count ?? 0,
      tier3_names: company.tier3_names || [],
      investors: company.investors || [],
      lead_investor: company.lead_investor,
    },
    team_and_hiring: {
      notes: company.team_notes || "",
      headcount: company.headcount,
      headcount_6m_growth_pct: company.headcount_6m_growth_pct,
      hiring_signal: hiringSignal(company.headcount_6m_growth_pct),
    },
    product_traction: {
      product_notes: resolveProductNotes(company),
      traction_notes: company.traction_notes || "",
      yoy_growth_pct: company.yoy_growth_pct,
      runway_months_est: company.runway_months_est,
      tam_usd_b: company.tam_usd_b,
    },
    thesis_fit: {
      sector_theme: company.sector_theme,
      subsector: company.subsector,
      pipeline_bucket: company.pipeline_bucket,
      moat_notes: company.moat_notes || "",
      why_now: company.why_now || "",
      score_breakdown: company.score_breakdown || {},
    },
    comparables: comps,
    commentary: {
      summary: company.commentary_summary || "",
      items: commentary,
    },
    peer_activity: peers,
    open_questions: [
      "What is true entry valuation vs last marked round?",
      "Diligence: customer references and retention?",
      "Synergies with existing Thirdbase portfolio?",
    ],
    provenance: "Grounded in Signal pipeline (scored against Thirdbase thesis).",
  };
}

export function intelligenceBriefToMarkdown(brief: IntelligenceBrief): string {
  const fh = brief.funding_history;
  const cap = brief.cap_table_quality;
  const team = brief.team_and_hiring;
  const pt = brief.product_traction;
  const tf = brief.thesis_fit;

  const lines: string[] = [
    `# IC Brief — ${brief.name}`,
    `**Recommendation:** ${brief.recommendation || "—"} · **Score:** ${brief.thesis_score ?? "—"} · **Rank:** ${brief.relative_rank || "—"}`,
    `_Trigger: ${brief.trigger} · ${brief.generated_at}_`,
    "",
    "## One-liner",
    brief.one_liner || "—",
    "",
    "## Funding history",
    `Stage ${fh.stage || "—"}; last round ${fmtMoneyM(fh.last_round_size_m)} on ${fh.last_round_date || "—"}; valuation ${fmtMoneyM(fh.valuation_est_m)} (${fh.valuation_confidence || "unknown"}); lead ${fh.lead_investor || "—"}.`,
  ];
  for (const r of fh.rounds) {
    lines.push(
      `- ${r.round}: ${fmtMoneyM(r.amount_m)}` +
        (r.post_m != null ? ` · ${fmtMoneyM(r.post_m)} post` : "") +
        (r.date ? ` · ${r.date}` : "") +
        (r.lead ? ` · lead ${r.lead}` : "") +
        (r.confidence ? ` · ${r.confidence}` : ""),
    );
  }
  lines.push(
    "",
    "## Cap table quality",
    `Tier-1: ${cap.tier1_count} (${cap.tier1_names.join(", ") || "—"}). Tier-2: ${cap.tier2_count} (${cap.tier2_names.join(", ") || "—"}). Tier-3: ${cap.tier3_count} (${cap.tier3_names.slice(0, 6).join(", ") || "—"}). Investors: ${cap.investors.join(", ") || "—"}.`,
    "",
    "## Team & hiring",
    team.notes || "—",
    `Headcount ${team.headcount ?? "—"}; 6m growth ${fmtPct(team.headcount_6m_growth_pct)}${team.hiring_signal ? `; signal: ${team.hiring_signal}` : ""}.`,
    "",
    "## Product traction",
    `**Product:** ${pt.product_notes || "—"}`,
    `**Traction:** ${pt.traction_notes || "—"}`,
    `YoY ${fmtPct(pt.yoy_growth_pct)}; runway ~${pt.runway_months_est ?? "—"} months; TAM ${pt.tam_usd_b != null ? `$${pt.tam_usd_b}B` : "—"}.`,
    "",
    "## Thesis fit",
    `${tf.sector_theme || "—"} / ${tf.subsector || "—"} · ${tf.pipeline_bucket || "—"}`,
    tf.moat_notes || "",
    "",
    "## Why now",
    tf.why_now || "—",
    "",
    "## Comparable companies",
  );
  if (brief.comparables.length) {
    for (const c of brief.comparables) {
      lines.push(
        `- ${c.name}${c.recommendation ? ` · ${c.recommendation}` : ""}${c.thesis_score != null ? ` · ${c.thesis_score}` : ""}${c.why ? ` — ${c.why}` : ""}`,
      );
    }
  } else {
    lines.push("- None in pipeline cohort yet.");
  }
  lines.push("", "## Investor & operator commentary", brief.commentary.summary || "—");
  for (const cm of brief.commentary.items) {
    lines.push(`- (${cm.source}, ${cm.sentiment}): ${cm.quote_or_summary}`);
  }
  lines.push("", "## Open questions");
  for (const q of brief.open_questions) lines.push(`- ${q}`);
  lines.push("", `_${brief.provenance}_`);
  return lines.join("\n");
}
