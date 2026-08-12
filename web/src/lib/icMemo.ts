/**
 * Formal IC Memo — Meridia-style 9-section investment memo from pipeline evidence.
 * Never invents blanks; marks unknowns explicitly. Human-in-the-loop before IC.
 */

import {
  buildDiligencePack,
  companyToSubject,
  type BearCase,
} from "@/lib/diligence";
import { computeCompanyFreshness, type PartnerOverride } from "@/lib/judgment";
import type { Commentary, Company, PeerActivity } from "@/lib/types";

export type IcMemoSection = {
  id: string;
  title: string;
  body: string[];
  confidence: "high" | "medium" | "low" | "blank";
};

export type IcMemo = {
  company_name: string;
  slug?: string | null;
  recommendation: string;
  thesis_score: number | null;
  generated_at: string;
  sections: IcMemoSection[];
  blanks: string[];
  markdown: string;
  provenance: string;
};

function blank(msg: string): IcMemoSection["body"] {
  return [`_[Blank — not in Signal store]_ ${msg}`];
}

function conf(
  has: boolean,
  freshness?: "fresh" | "aging" | "stale" | "unknown",
): IcMemoSection["confidence"] {
  if (!has) return "blank";
  if (freshness === "stale") return "low";
  if (freshness === "aging" || freshness === "unknown") return "medium";
  return "high";
}

export function buildIcMemo(
  company: Company,
  opts?: {
    commentary?: Commentary[];
    peers?: PeerActivity[];
    comps?: {
      name: string;
      thesis_score?: number | null;
      recommendation?: string | null;
      why?: string;
    }[];
    competitive?: {
      on_cap_table?: { name: string }[];
      circling?: { name: string; reason?: string }[];
      syndicate_suggestions?: { firm: string; reason?: string }[];
    };
    override?: PartnerOverride | null;
  },
): IcMemo {
  const commentary = opts?.commentary || [];
  const peers = opts?.peers || [];
  const freshness = computeCompanyFreshness(company);
  const pack = buildDiligencePack(companyToSubject(company), { commentary, peers });
  const bear: BearCase = pack.bear;
  const blanks: string[] = [];

  const sections: IcMemoSection[] = [];

  // 1. Recommendation
  sections.push({
    id: "recommendation",
    title: "1. Recommendation",
    confidence: conf(!!company.recommendation, freshness.overall),
    body: [
      `**${company.recommendation || "—"}** · Thesis score **${company.thesis_score?.toFixed(0) ?? "—"}** · ${company.relative_rank || "unranked"}`,
      company.why_now || "_[Blank]_ Why-now not captured.",
      opts?.override
        ? `Partner override on file: Signal **${opts.override.signal_rec}** → Partner **${opts.override.partner_rec}** — ${opts.override.reason}`
        : "No partner override on file.",
      `Evidence confidence: ${freshness.score_confidence}% (${freshness.overall}).`,
    ],
  });
  if (!company.why_now) blanks.push("why_now");

  // 2. Company
  const hasOneLiner = !!company.one_liner;
  if (!hasOneLiner) blanks.push("one_liner");
  sections.push({
    id: "company",
    title: "2. Company",
    confidence: conf(hasOneLiner, freshness.overall),
    body: hasOneLiner
      ? [
          company.one_liner!,
          `Theme: ${company.sector_theme || "—"} / ${company.subsector || "—"} · Stage: ${company.stage || "—"} · Bucket: ${company.pipeline_bucket || "—"}`,
          company.domain ? `Domain: ${company.domain}` : "_[Blank]_ Domain not on file.",
        ]
      : blank("Add one-liner before IC."),
  });

  // 3. Market
  const hasMarket = company.tam_usd_b != null || !!company.sector_theme;
  if (company.tam_usd_b == null) blanks.push("tam_usd_b");
  sections.push({
    id: "market",
    title: "3. Market",
    confidence: conf(hasMarket, freshness.overall),
    body: [
      company.tam_usd_b != null
        ? `TAM estimate: **$${company.tam_usd_b}B** (model estimate — not a private fact).`
        : "_[Blank]_ TAM not estimated.",
      `Parent theme / subsector: ${company.sector_theme || "—"} / ${company.subsector || "—"}`,
      `Timing score: ${company.score_breakdown?.timing?.toFixed(0) ?? "—"} · TAM/exit: ${company.score_breakdown?.tam_exit?.toFixed(0) ?? "—"}`,
    ],
  });

  // 4. Product / moat
  if (!company.moat_notes) blanks.push("moat_notes");
  sections.push({
    id: "product",
    title: "4. Product & moat",
    confidence: conf(!!company.moat_notes, freshness.overall),
    body: company.moat_notes
      ? [
          company.moat_notes,
          `Moat dimension: ${company.score_breakdown?.moat?.toFixed(0) ?? "—"}`,
        ]
      : blank("Moat notes missing — diligence should force a technical defensibility write-up."),
  });

  // 5. Traction
  if (!company.traction_notes && company.yoy_growth_pct == null) blanks.push("traction");
  sections.push({
    id: "traction",
    title: "5. Traction",
    confidence: conf(
      !!company.traction_notes || company.yoy_growth_pct != null,
      freshness.overall,
    ),
    body: [
      company.traction_notes || "_[Blank]_ Traction narrative not captured.",
      `YoY: ${company.yoy_growth_pct != null ? `${company.yoy_growth_pct}%` : "—"} · Headcount: ${company.headcount ?? "—"} · 6m HC growth: ${company.headcount_6m_growth_pct != null ? `${company.headcount_6m_growth_pct}%` : "—"}`,
      `Runway est.: ${company.runway_months_est != null ? `${company.runway_months_est} mo` : "—"}`,
      `Traction dim: ${company.score_breakdown?.traction?.toFixed(0) ?? "—"}`,
    ],
  });

  // 6. Team
  if (!company.team_notes) blanks.push("team_notes");
  sections.push({
    id: "team",
    title: "6. Team",
    confidence: conf(!!company.team_notes, freshness.overall),
    body: company.team_notes
      ? [
          company.team_notes,
          `Team dim: ${company.score_breakdown?.team_quality?.toFixed(0) ?? "—"}`,
        ]
      : blank("Team notes missing — do not take to IC without founder diligence."),
  });

  // 7. Competition & comps
  const comps = opts?.comps || [];
  const competitive = opts?.competitive;
  sections.push({
    id: "competition",
    title: "7. Competition",
    confidence: comps.length || competitive?.circling?.length ? "medium" : "low",
    body: [
      `On tape: ${(competitive?.on_cap_table || []).map((x) => x.name).join(", ") || "—"}`,
      `Circling: ${(competitive?.circling || []).map((x) => `${x.name}${x.reason ? ` (${x.reason})` : ""}`).join("; ") || "—"}`,
      `Syndicate unlock: ${(competitive?.syndicate_suggestions || []).map((x) => x.firm).join(", ") || "—"}`,
      comps.length
        ? `Pipeline comps:\n${comps.map((c) => `  - ${c.name} · ${c.recommendation || "—"} · ${c.thesis_score ?? "—"} — ${c.why || ""}`).join("\n")}`
        : "_[Blank]_ No pipeline comps linked.",
      peers.filter((p) => p.company_id === company.id).length
        ? `Peer moves: ${peers
            .filter((p) => p.company_id === company.id)
            .slice(0, 4)
            .map((p) => `${p.firm} (${p.round || p.notes || "—"})`)
            .join("; ")}`
        : "No peer activity rows for this company.",
    ],
  });

  // 8. Deal / terms
  if (company.valuation_est_m == null) blanks.push("valuation_est_m");
  sections.push({
    id: "deal",
    title: "8. Deal & terms",
    confidence: conf(
      company.last_round_size_m != null || company.valuation_est_m != null,
      freshness.overall,
    ),
    body: [
      `Last round: $${company.last_round_size_m ?? "—"}M · ${company.last_round_date || "—"} · Lead: ${company.lead_investor || "—"}`,
      `Valuation est.: $${company.valuation_est_m ?? "—"}M (${company.valuation_confidence || "unmarked"} — estimates are not private facts)`,
      `Investors: ${(company.investors || []).join(", ") || "—"}`,
      `Tier-1: ${company.tier1_count ?? 0} · ${(company.tier1_names || []).join(", ") || "—"}`,
      `Cap-table dim: ${company.score_breakdown?.cap_table?.toFixed(0) ?? "—"} · Valuation dim: ${company.score_breakdown?.valuation?.toFixed(0) ?? "—"}`,
    ],
  });

  // 9. Risks / bear + diligence asks
  sections.push({
    id: "risks",
    title: "9. Risks, bear case & open diligence",
    confidence: "high",
    body: [
      `Bear headline: ${bear.headline}`,
      ...bear.kill_arguments.slice(0, 4).map(
        (k) => `- [${k.severity}] **${k.title}** — ${k.argument} _(ev: ${k.evidence})_`,
      ),
      "",
      "Founder-only questions:",
      ...pack.plan.founder_only_questions.slice(0, 5).map((q) => `- ${q}`),
      "",
      `Conviction gate: ${bear.conviction_gate}`,
    ],
  });

  const markdown = formatIcMemoMarkdown({
    company_name: company.name,
    slug: company.slug,
    recommendation: company.recommendation || "—",
    thesis_score: company.thesis_score ?? null,
    generated_at: new Date().toISOString(),
    sections,
    blanks,
    markdown: "",
    provenance:
      "Built from Signal pipeline + Diligence Stress Pack. Blanks are explicit. Partners convict.",
  });

  return {
    company_name: company.name,
    slug: company.slug,
    recommendation: company.recommendation || "—",
    thesis_score: company.thesis_score ?? null,
    generated_at: new Date().toISOString().slice(0, 10),
    sections,
    blanks,
    markdown,
    provenance:
      "Built from Signal pipeline + Diligence Stress Pack. Blanks are explicit. Partners convict.",
  };
}

export function formatIcMemoMarkdown(memo: IcMemo): string {
  const lines = [
    `# Investment Memo — ${memo.company_name}`,
    "",
    `**Thirdbase Signal** · ${memo.generated_at} · Rec: **${memo.recommendation}** · Score **${memo.thesis_score ?? "—"}**`,
    "",
    memo.blanks.length
      ? `> **${memo.blanks.length} blank field(s):** ${memo.blanks.join(", ")} — do not treat as facts.`
      : "> No critical blanks flagged in core fields.",
    "",
    ...memo.sections.flatMap((s) => [
      `## ${s.title}`,
      `_confidence: ${s.confidence}_`,
      "",
      ...s.body,
      "",
    ]),
    "---",
    `_${memo.provenance}_`,
    `_Models write. Policy decides. Partners convict._`,
  ];
  return lines.join("\n");
}
