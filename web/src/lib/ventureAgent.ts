/**
 * Venture Agent — Core Intelligence Expectations from the Thirdbase brief.
 * Deterministic packs grounded in pipeline / sectors / news / commentary.
 * Headings mirror the brief language partners already use.
 */

import {
  evaluateThirdbaseCriteria,
  SCORE_DIM_META,
  type CriteriaSummary,
} from "@/lib/thirdbaseCriteria";
import { buildGreatDealPack } from "@/lib/greatDeal";
import type {
  Commentary,
  Company,
  NewsItem,
  PeerActivity,
  SectorCall,
} from "@/lib/types";

export const VENTURE_AGENT_MANDATE =
  "We are looking for an intelligent agent that understands the venture market, knows what a great deal looks like, knows what sectors will matter in 12–36 months, and can hold its own in a conversation with a partner about why a particular company matters.";

export type GreatDealFacet = {
  id: "founder" | "market" | "investors" | "traction" | "valuation";
  label: string;
  score: number;
  evidence: string;
};

export type GreatDealCase = {
  company: Company;
  outstanding: boolean;
  relative_story: string;
  why_now: string;
  facets: GreatDealFacet[];
  criteria: CriteriaSummary;
  cohort_peers: { name: string; score: number; rank?: string | null; id: string }[];
  partner_line: string;
  radar: Record<string, number>;
};

export type SectorHorizon = {
  id: string;
  subsector: string;
  parent_theme?: string;
  horizon: "12m" | "24m" | "36m";
  heat_score: number;
  consensus_level: string;
  posture: "contrarian" | "emerging" | "early consensus" | "crowded";
  why_matters: string;
  evidence: string[];
  evidence_mix: { label: string; weight: number }[];
  best_companies: {
    id: string;
    name: string;
    slug?: string | null;
    score: number;
    rec: string;
    why: string;
  }[];
  partner_prompt: string;
};

export type CuratedNews = {
  id: string;
  title: string;
  source?: string;
  url?: string | null;
  why_thirdbase: string;
  themes: string[];
  relevance: number;
};

export type CommentaryCluster = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  sentiment_mix: { bullish: number; mixed: number; bearish: number; unknown: number };
  qualitative: string;
  quotes: {
    id: string;
    source?: string;
    quote: string;
    sentiment?: string;
    credibility?: string;
  }[];
  partner_read: string;
};

export type PartnerWhy = {
  company: Company;
  opening: string;
  bullets: string[];
  kill_risk: string;
  next_question: string;
  chat_prompt: string;
};

export type VentureAgentPack = {
  mandate: string;
  headline: string;
  stats: {
    outstanding_deals: number;
    horizon_sectors: number;
    news_items: number;
    commentary_clusters: number;
    deep_dives: number;
  };
  great_deals: GreatDealCase[];
  sector_tomorrow: SectorHorizon[];
  news: CuratedNews[];
  commentary: CommentaryCluster[];
  partner_whys: PartnerWhy[];
  markdown: string;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function scoreOf(c: Company) {
  return typeof c.thesis_score === "number" ? c.thesis_score : 0;
}

function dim(c: Company, key: string, fallback = 50) {
  const v = c.score_breakdown?.[key];
  return typeof v === "number" ? v : fallback;
}

function cohortPeers(c: Company, all: Company[]) {
  const theme = (c.sector_theme || "").toLowerCase();
  const stage = (c.stage || "").toLowerCase();
  return all
    .filter((x) => x.id !== c.id)
    .filter((x) => {
      const sameTheme = theme && (x.sector_theme || "").toLowerCase() === theme;
      const sameStage = !stage || !x.stage || (x.stage || "").toLowerCase() === stage;
      return sameTheme && sameStage;
    })
    .sort((a, b) => scoreOf(b) - scoreOf(a))
    .slice(0, 4)
    .map((x) => ({
      id: x.id,
      name: x.name,
      score: Math.round(scoreOf(x)),
      rank: x.relative_rank ?? null,
    }));
}

/** Shared with Great Deal Desk — same grade / pillar rules, venture-agent case shape. */
function buildGreatDeals(companies: Company[]): GreatDealCase[] {
  const pack = buildGreatDealPack(companies);
  const byId = new Map(companies.map((c) => [c.id, c]));
  const picks = [...pack.outstanding, ...pack.promising].slice(0, 10);
  const cases: GreatDealCase[] = [];

  for (const card of picks) {
    const c = byId.get(card.company_id);
    if (!c) continue;
    const facets: GreatDealFacet[] = card.pillars.map((p) => ({
      id: p.id,
      label:
        p.label === "Founder"
          ? "Founder / team"
          : p.label === "Investors"
            ? "Investors already in"
            : p.label,
      score: p.score,
      evidence: p.evidence,
    }));
    const criteria = evaluateThirdbaseCriteria(c);
    const peers = cohortPeers(c, companies);
    const radar: Record<string, number> = {};
    for (const [k, meta] of Object.entries(SCORE_DIM_META)) {
      radar[meta.label] = Math.round(dim(c, k));
    }
    const outstanding = card.grade === "outstanding";
    const why =
      c.why_now?.trim() ||
      card.why_best[0] ||
      `Relative ${c.relative_rank || "unranked"} in ${c.sector_theme || "theme"} × ${c.stage || "stage"} with thesis score ${Math.round(scoreOf(c))}.`;
    const partner_line = outstanding
      ? `${c.name} clears the “outstanding vs noisy” bar: ${facets
          .filter((f) => f.score >= 70)
          .map((f) => f.label.toLowerCase())
          .slice(0, 3)
          .join(", ") || "multi-dim strength"} — ranked ${c.relative_rank || "vs cohort"}, not in isolation.`
      : `${c.name} is interesting but not yet outstanding vs ${c.sector_theme || "cohort"} — ${c.relative_rank || "mid-pack"} keeps it ${c.recommendation || "Watch"}.`;

    cases.push({
      company: c,
      outstanding,
      relative_story:
        c.relative_rank ||
        `Unranked in ${(c.sector_theme || "theme") + " × " + (c.stage || "stage")}`,
      why_now: why,
      facets,
      criteria,
      cohort_peers: peers,
      partner_line,
      radar,
    });
  }

  return cases;
}

function horizonFor(call: SectorCall): SectorHorizon["horizon"] {
  const heat = call.heat_score ?? 50;
  const cons = (call.consensus_level || "").toLowerCase();
  if (cons.includes("contrarian") || heat < 45) return "36m";
  if (cons.includes("emerging") || heat < 65) return "24m";
  return "12m";
}

function postureFor(call: SectorCall): SectorHorizon["posture"] {
  const cons = (call.consensus_level || "").toLowerCase();
  if (cons.includes("contrarian")) return "contrarian";
  if (cons.includes("crowd") || cons.includes("consensus")) return "crowded";
  if (cons.includes("early")) return "early consensus";
  return "emerging";
}

function evidenceMix(evidence: string[]): { label: string; weight: number }[] {
  const buckets = [
    { label: "GP commentary", re: /gp|partner|chatter|twitter|x\.com|watchlist/i },
    { label: "Hiring / talent", re: /hir(e|ing)|headcount|talent|lab|frontier/i },
    { label: "Founder migration", re: /founder|operator|stealth|newco/i },
    { label: "Fund formation", re: /fund|formation|raise|lp|vehicle/i },
    { label: "Research velocity", re: /arxiv|paper|research|github|open.?source|commit/i },
  ];
  const counts = buckets.map((b) => ({
    label: b.label,
    weight: evidence.filter((e) => b.re.test(e)).length,
  }));
  const hit = counts.filter((c) => c.weight > 0);
  if (!hit.length) {
    return [
      { label: "GP commentary", weight: 22 },
      { label: "Hiring / talent", weight: 20 },
      { label: "Research velocity", weight: 18 },
      { label: "Fund formation", weight: 15 },
      { label: "Founder migration", weight: 12 },
    ];
  }
  const sum = hit.reduce((s, c) => s + c.weight, 0) || 1;
  return hit.map((c) => ({ label: c.label, weight: Math.round((c.weight / sum) * 100) }));
}

function buildSectorTomorrow(sectors: SectorCall[], companies: Company[]): SectorHorizon[] {
  const sorted = [...sectors].sort((a, b) => (b.heat_score ?? 0) - (a.heat_score ?? 0));
  return sorted.slice(0, 8).map((s) => {
    const evidence = (s.evidence || []).filter(Boolean);
    const names = new Set((s.top_companies || []).map((n) => n.toLowerCase()));
    const theme = (s.parent_theme || "").toLowerCase();
    const sub = s.subsector.toLowerCase();
    const matches = companies
      .filter((c) => {
        const hay = `${c.name} ${c.sector_theme || ""} ${c.subsector || ""}`.toLowerCase();
        if (names.has(c.name.toLowerCase())) return true;
        return hay.includes(sub) || (theme && (c.sector_theme || "").toLowerCase().includes(theme));
      })
      .sort((a, b) => scoreOf(b) - scoreOf(a))
      .slice(0, 4);

    const posture = postureFor(s);
    const horizon = horizonFor(s);
    const why =
      s.why_thirdbase_cares?.trim() ||
      (posture === "contrarian"
        ? `${s.subsector} is still non-consensus — capital and talent are early; 12–36m window before crowded tape.`
        : `${s.subsector} is accumulating heat from evidence hooks partners already track.`);

    return {
      id: s.id,
      subsector: s.subsector,
      parent_theme: s.parent_theme,
      horizon,
      heat_score: Math.round(s.heat_score ?? 50),
      consensus_level: s.consensus_level || "emerging",
      posture,
      why_matters: why,
      evidence: evidence.slice(0, 5),
      evidence_mix: evidenceMix(evidence),
      best_companies: matches.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        score: Math.round(scoreOf(c)),
        rec: c.recommendation || "Watch",
        why: c.why_now?.slice(0, 100) || c.one_liner || `${s.subsector} exposure`,
      })),
      partner_prompt: `What are the best companies in ${s.subsector} right now, and why will this matter in ${horizon === "12m" ? "12" : horizon === "24m" ? "24" : "36"} months?`,
    };
  });
}

function newsRelevance(n: NewsItem, companies: Company[]): number {
  const themes = (n.related_themes || []).map((t) => t.toLowerCase());
  let score = 55;
  if (n.why_it_matters) score += 15;
  const themeHits = companies.filter((c) =>
    themes.some((t) => (c.sector_theme || "").toLowerCase().includes(t) || (c.theme_id || "").toLowerCase().includes(t)),
  ).length;
  score += Math.min(20, themeHits * 3);
  score += hash(n.id) % 8;
  return clamp(score, 40, 98);
}

function buildNews(news: NewsItem[], companies: Company[]): CuratedNews[] {
  return [...news]
    .map((n) => ({
      id: n.id,
      title: n.title,
      source: n.source,
      url: n.url,
      why_thirdbase:
        n.why_it_matters?.trim() ||
        "Relevant to Thirdbase themes — review for digest inclusion.",
      themes: n.related_themes || [],
      relevance: newsRelevance(n, companies),
    }))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5);
}

function sentimentBucket(s?: string): keyof CommentaryCluster["sentiment_mix"] {
  const v = (s || "").toLowerCase();
  if (/bull|positive|love|beloved|strong/.test(v)) return "bullish";
  if (/bear|negative|skeptic|churn|concern/.test(v)) return "bearish";
  if (/mix|neutral|cautious/.test(v)) return "mixed";
  return "unknown";
}

function buildCommentary(commentary: Commentary[], companies: Company[]): CommentaryCluster[] {
  const byCo = new Map<string, Commentary[]>();
  for (const row of commentary) {
    if (!row.company_id) continue;
    const list = byCo.get(row.company_id) || [];
    list.push(row);
    byCo.set(row.company_id, list);
  }

  const clusters: CommentaryCluster[] = [];
  for (const [company_id, rows] of byCo) {
    const co = companies.find((c) => c.id === company_id);
    const mix = { bullish: 0, mixed: 0, bearish: 0, unknown: 0 };
    for (const r of rows) mix[sentimentBucket(r.sentiment)] += 1;
    const total = rows.length || 1;
    const bull = mix.bullish / total;
    const bear = mix.bearish / total;
    let qualitative = "Signal sparse — treat as directional, not consensus.";
    if (bull >= 0.5) qualitative = "Engineers / operators lean constructive — qualitative heat above the funding headline.";
    else if (bear >= 0.4) qualitative = "Credible skepticism showing up — dig before chasing the round.";
    else if (mix.mixed + mix.unknown >= total * 0.6) {
      qualitative = "Mixed board — funding number alone is not the signal.";
    }

    clusters.push({
      company_id,
      company_name: co?.name || rows[0]?.company_name || "Company",
      slug: co?.slug,
      sentiment_mix: mix,
      qualitative,
      quotes: rows.slice(0, 4).map((r) => ({
        id: r.id,
        source: r.source,
        quote: r.quote_or_summary || "",
        sentiment: r.sentiment,
        credibility: r.credibility_tier,
      })),
      partner_read:
        co?.commentary_summary?.slice(0, 180) ||
        `${rows.length} commentary hit${rows.length === 1 ? "" : "s"} — ${qualitative}`,
    });
  }

  return clusters
    .sort((a, b) => {
      const aN = a.sentiment_mix.bullish + a.sentiment_mix.bearish + a.sentiment_mix.mixed;
      const bN = b.sentiment_mix.bullish + b.sentiment_mix.bearish + b.sentiment_mix.mixed;
      return bN - aN;
    })
    .slice(0, 8);
}

function buildPartnerWhys(deals: GreatDealCase[]): PartnerWhy[] {
  return deals.slice(0, 6).map((d) => {
    const c = d.company;
    const strong = d.facets.filter((f) => f.score >= 70);
    const weak = d.facets.filter((f) => f.score < 55);
    const opening = d.outstanding
      ? `${c.name} matters now because it is one of the best ${c.stage || "stage"} names in ${c.sector_theme || "the book"} — not because it raised.`
      : `${c.name} is on the desk because ${c.relative_rank || "relative rank"} keeps optionality open, even if it is not yet a Deep Dive.`;

    const bullets = [
      d.why_now,
      strong.length
        ? `Strong on ${strong.map((f) => f.label.toLowerCase()).join(", ")}.`
        : `Score ${Math.round(scoreOf(c))} with room to prove outstanding dims.`,
      (c.tier1_count || 0) > 0
        ? `Cap table: ${c.tier1_count} Tier-1${c.lead_investor ? ` · lead ${c.lead_investor}` : ""}.`
        : "Cap table still thin on Tier-1 — access may be the edge.",
      d.cohort_peers.length
        ? `Vs cohort: ahead of ${d.cohort_peers.filter((p) => p.score < scoreOf(c)).map((p) => p.name).slice(0, 2).join(", ") || "mid-pack"} on thesis score.`
        : "Thin same-stage cohort on file — relative rank is the spine.",
    ].filter(Boolean);

    const kill =
      weak[0]
        ? `Kill risk if ${weak[0].label.toLowerCase()} stays weak (${weak[0].evidence}).`
        : c.recommendation === "Pass"
          ? "Already a Pass — reopening needs an explicit partner override."
          : "Kill risk if relative rank slips while peers crowd the theme.";

    return {
      company: c,
      opening,
      bullets: bullets.slice(0, 4),
      kill_risk: kill,
      next_question: `What would make you Pass on ${c.name} this week?`,
      chat_prompt: `Why does ${c.name} matter for Thirdbase right now? Argue founder, market, investors, traction, and entry — then the kill risk.`,
    };
  });
}

function formatMarkdown(pack: Omit<VentureAgentPack, "markdown">): string {
  const lines: string[] = [
    "# Venture Agent — Core Intelligence",
    "",
    `> ${pack.mandate}`,
    "",
    `## Knows what a great deal looks like`,
    ...pack.great_deals.slice(0, 5).map(
      (d) =>
        `- **${d.company.name}** · ${d.company.recommendation} · ${Math.round(scoreOf(d.company))} · ${d.relative_story}\n  ${d.partner_line}`,
    ),
    "",
    `## Knows the sector of tomorrow`,
    ...pack.sector_tomorrow.slice(0, 5).map(
      (s) =>
        `- **${s.subsector}** (${s.horizon}, ${s.posture}, heat ${s.heat_score}) — ${s.why_matters}`,
    ),
    "",
    `## Surfaces news worth reading`,
    ...pack.news.map((n) => `- **${n.title}** (${n.source || "—"}) — ${n.why_thirdbase}`),
    "",
    `## Captures investor and operator commentary`,
    ...pack.commentary.slice(0, 5).map((c) => `- **${c.company_name}** — ${c.partner_read}`),
    "",
  ];
  return lines.join("\n");
}

export function buildVentureAgentPack(ctx: {
  companies: Company[];
  sectors: SectorCall[];
  news: NewsItem[];
  commentary: Commentary[];
  peers?: PeerActivity[];
}): VentureAgentPack {
  const great_deals = buildGreatDeals(ctx.companies);
  const sector_tomorrow = buildSectorTomorrow(ctx.sectors, ctx.companies);
  const news = buildNews(ctx.news, ctx.companies);
  const commentary = buildCommentary(ctx.commentary, ctx.companies);
  const partner_whys = buildPartnerWhys(great_deals);

  const outstanding = great_deals.filter((d) => d.outstanding).length;
  const deep = ctx.companies.filter((c) => c.recommendation === "Deep Dive").length;

  const base = {
    mandate: VENTURE_AGENT_MANDATE,
    headline:
      outstanding > 0
        ? `${outstanding} outstanding deal${outstanding === 1 ? "" : "s"} · ${sector_tomorrow.length} sector horizons · partner-ready why on tap`
        : `Thesis-ranked book ready — sector horizons and curated news for partner debate`,
    stats: {
      outstanding_deals: outstanding,
      horizon_sectors: sector_tomorrow.length,
      news_items: news.length,
      commentary_clusters: commentary.length,
      deep_dives: deep,
    },
    great_deals,
    sector_tomorrow,
    news,
    commentary,
    partner_whys,
  };

  return { ...base, markdown: formatMarkdown(base) };
}

export function formatVentureAgentMarkdown(pack: VentureAgentPack): string {
  return pack.markdown;
}
