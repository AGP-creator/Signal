/**
 * News Worth Reading — curated 3–5 partner reads with Thirdbase-specific why.
 * Not a firehose: earnings, regulatory, essays, contrarian takes, geopolitics.
 */

import type { Company, DigestNewsItem, NewsItem } from "@/lib/types";

export type NewsKind =
  | "earnings"
  | "regulatory"
  | "essay"
  | "contrarian"
  | "geopolitical"
  | "market";

export const NEWS_KIND_META: Record<
  NewsKind,
  { label: string; short: string; tone: "now" | "this_week" | "monitor" | "block"; color: string }
> = {
  earnings: {
    label: "Earnings & read-through",
    short: "Earnings",
    tone: "this_week",
    color: "var(--signal)",
  },
  regulatory: {
    label: "Regulatory shift",
    short: "Regulatory",
    tone: "now",
    color: "var(--warn)",
  },
  essay: {
    label: "Long-form analysis",
    short: "Essay",
    tone: "monitor",
    color: "var(--ok)",
  },
  contrarian: {
    label: "Contrarian take",
    short: "Contrarian",
    tone: "block",
    color: "var(--danger)",
  },
  geopolitical: {
    label: "Geopolitics / markets",
    short: "Geopolitics",
    tone: "now",
    color: "var(--warn)",
  },
  market: {
    label: "Market / sector",
    short: "Market",
    tone: "monitor",
    color: "var(--muted)",
  },
};

const CREDIBLE_SOURCES = [
  /stratechery/i,
  /the information/i,
  /newcomer/i,
  /not boring/i,
  /generalist/i,
  /bloomberg/i,
  /reuters/i,
  /\bft\b/i,
  /financial times/i,
  /axios/i,
  /wsj/i,
  /economist/i,
  /foreign affairs/i,
  /arxiv/i,
];

const KIND_PATTERNS: { kind: NewsKind; re: RegExp }[] = [
  { kind: "earnings", re: /\b(earnings|capex|guidance|read[- ]?through|10[- ]?q|10[- ]?k|hyperscaler)\b/i },
  {
    kind: "regulatory",
    re: /\b(regulat|sec\b|form\s*d|attestation|compliance|eu cyber|doj|ftc|antitrust|budget signal)\b/i,
  },
  { kind: "contrarian", re: /\b(contrarian|most .+ will fail|skeptic|overhyped|against the grain)\b/i },
  {
    kind: "geopolitical",
    re: /\b(geopolitic|dod\b|defence|defense|china|taiwan|sanction|war|nato|export control)\b/i,
  },
  {
    kind: "essay",
    re: /\b(why |essay|framework|deep dive|long[- ]?form|thesis|playbook)\b/i,
  },
];

export type CuratedRead = {
  id: string;
  title: string;
  source?: string;
  url?: string | null;
  published_at?: string;
  why: string;
  themes: string[];
  kind: NewsKind;
  rank: number;
  /** Pipeline names that share a related theme */
  pipeline_hits: { id: string; name: string; slug?: string }[];
  score: number;
};

function blobOf(n: Pick<NewsItem, "title" | "source" | "why_it_matters" | "related_themes">) {
  return `${n.title || ""} ${n.source || ""} ${n.why_it_matters || ""} ${(n.related_themes || []).join(" ")}`;
}

export function classifyNewsKind(
  n: Pick<NewsItem, "title" | "source" | "why_it_matters" | "related_themes">,
): NewsKind {
  const blob = blobOf(n);
  for (const { kind, re } of KIND_PATTERNS) {
    if (re.test(blob)) return kind;
  }
  const src = n.source || "";
  if (/stratechery|generalist|not boring|newcomer|the information/i.test(src)) return "essay";
  return "market";
}

function sourceScore(source?: string): number {
  if (!source) return 0;
  return CREDIBLE_SOURCES.some((re) => re.test(source)) ? 18 : 6;
}

function freshnessScore(published_at?: string, asOf = Date.now()): number {
  if (!published_at) return 4;
  const t = Date.parse(published_at);
  if (Number.isNaN(t)) return 4;
  const days = (asOf - t) / 86_400_000;
  if (days <= 3) return 20;
  if (days <= 10) return 14;
  if (days <= 21) return 8;
  if (days <= 45) return 4;
  return 1;
}

function whyQuality(why?: string): number {
  if (!why) return 0;
  const w = why.trim();
  if (!w) return 0;
  // Penalize live template copy
  if (/live signal maps to thirdbase theme/i.test(w)) return 4;
  if (/worth a 2-minute partner skim/i.test(w)) return 4;
  let s = 10;
  if (/\b(thirdbase|pipeline|thesis|deep dive|watch|ic)\b/i.test(w)) s += 8;
  if (w.length >= 40 && w.length <= 220) s += 6;
  if (/\b(agentgate|idforge|swarmguard|lattice|kilowatt|gpumesh|synthforge)\b/i.test(w)) s += 6;
  return s;
}

function pipelineHitsFor(
  themes: string[],
  companies: Company[],
  limit = 3,
): CuratedRead["pipeline_hits"] {
  if (!themes.length || !companies.length) return [];
  const keys = themes.map((t) => t.toLowerCase());
  const hits: CuratedRead["pipeline_hits"] = [];
  const seen = new Set<string>();
  for (const c of companies) {
    const theme = (c.sector_theme || "").toLowerCase();
    const sub = (c.subsector || "").toLowerCase();
    if (!keys.some((k) => theme.includes(k) || k.includes(theme) || sub.includes(k))) continue;
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    hits.push({ id: c.id, name: c.name, slug: c.slug });
    if (hits.length >= limit) break;
  }
  return hits;
}

function scoreItem(
  n: NewsItem,
  companies: Company[],
  asOf: number,
): { score: number; kind: NewsKind; hits: CuratedRead["pipeline_hits"] } {
  const kind = classifyNewsKind(n);
  const themes = n.related_themes || [];
  const hits = pipelineHitsFor(themes, companies);
  let score =
    sourceScore(n.source) +
    freshnessScore(n.published_at, asOf) +
    whyQuality(n.why_it_matters) +
    Math.min(12, themes.length * 4) +
    Math.min(10, hits.length * 4);

  // Soft preference for kind diversity later; slight boost for high-signal kinds
  if (kind === "regulatory" || kind === "earnings" || kind === "contrarian") score += 3;
  if (kind === "essay" || kind === "geopolitical") score += 2;

  return { score, kind, hits };
}

function toCurated(
  row: { n: NewsItem; score: number; kind: NewsKind; hits: CuratedRead["pipeline_hits"] },
  rank: number,
): CuratedRead {
  return {
    id: row.n.id,
    title: row.n.title,
    source: row.n.source,
    url: row.n.url,
    published_at: row.n.published_at,
    why: (row.n.why_it_matters || "").trim() || defaultWhy(row.kind, row.n.related_themes),
    themes: row.n.related_themes || [],
    kind: row.kind,
    rank,
    pipeline_hits: row.hits,
    score: row.score,
  };
}

function scoreAll(news: NewsItem[], companies: Company[], asOf: number) {
  return news
    .filter((n) => n.title?.trim())
    .map((n) => {
      const { score, kind, hits } = scoreItem(n, companies, asOf);
      return { n, score, kind, hits };
    })
    .sort((a, b) => b.score - a.score);
}

/** Full ranked shelf (no hard cap) for Library filters. */
export function rankNewsWorthReading(
  news: NewsItem[],
  companies: Company[] = [],
  asOf = Date.now(),
): CuratedRead[] {
  return scoreAll(news, companies, asOf).map((row, i) => toCurated(row, i + 1));
}

/**
 * Hard-capped 3–5 set with kind diversity when possible.
 */
export function selectNewsWorthReading(
  news: NewsItem[],
  companies: Company[] = [],
  opts?: { min?: number; max?: number; asOf?: number },
): CuratedRead[] {
  const max = opts?.max ?? 5;
  const asOf = opts?.asOf ?? Date.now();
  const scored = scoreAll(news, companies, asOf);
  if (!scored.length) return [];

  const picked: typeof scored = [];
  const kindCount = new Map<NewsKind, number>();

  // Pass 1 — prefer kind diversity (at most one of each until we fill)
  for (const row of scored) {
    if (picked.length >= max) break;
    if ((kindCount.get(row.kind) || 0) >= 1) continue;
    picked.push(row);
    kindCount.set(row.kind, 1);
  }

  // Pass 2 — fill remaining slots by score
  for (const row of scored) {
    if (picked.length >= max) break;
    if (picked.some((p) => p.n.id === row.n.id)) continue;
    picked.push(row);
  }

  return picked.slice(0, max).map((row, i) => toCurated(row, i + 1));
}

function defaultWhy(kind: NewsKind, themes?: string[]): string {
  const theme = themes?.[0];
  const focus = theme ? ` for Thirdbase ${theme}` : " for the Thirdbase book";
  switch (kind) {
    case "earnings":
      return `Earnings/read-through${focus} — check demand durability before the next IC.`;
    case "regulatory":
      return `Regulatory shift${focus} — may change moat and timing assumptions.`;
    case "contrarian":
      return `Contrarian take${focus} — stress-tests Pass/Watch discipline.`;
    case "geopolitical":
      return `Geopolitical / budget signal${focus} — could move dual-use and infra timing.`;
    case "essay":
      return `Long-form framing${focus} — sharpens how we talk about the category.`;
    default:
      return `Sector context${focus} — worth a two-minute partner skim.`;
  }
}

/** Map digest payload + library news into a consistent curated set. */
export function resolveDigestReads(args: {
  payloadNews?: DigestNewsItem[] | null;
  news: NewsItem[];
  companies?: Company[];
}): CuratedRead[] {
  const { payloadNews, news, companies = [] } = args;
  if (payloadNews?.length) {
    const byTitle = new Map(news.map((n) => [n.title?.toLowerCase(), n]));
    return payloadNews.slice(0, 5).map((pn, i) => {
      const match = pn.title ? byTitle.get(pn.title.toLowerCase()) : undefined;
      const themes = match?.related_themes || pn.related_themes || [];
      const synthetic: NewsItem = {
        id: match?.id || `digest-n-${i}`,
        title: pn.title || match?.title || "Untitled",
        source: pn.source || match?.source,
        url: pn.url ?? match?.url,
        why_it_matters: pn.why || match?.why_it_matters,
        related_themes: themes,
        published_at: pn.published_at || match?.published_at,
      };
      const kindList: NewsKind[] = [
        "earnings",
        "regulatory",
        "essay",
        "contrarian",
        "geopolitical",
        "market",
      ];
      const kind: NewsKind =
        pn.kind && kindList.includes(pn.kind as NewsKind)
          ? (pn.kind as NewsKind)
          : classifyNewsKind(synthetic);
      return {
        id: synthetic.id,
        title: synthetic.title,
        source: synthetic.source || pn.source,
        url: synthetic.url ?? pn.url,
        published_at: synthetic.published_at,
        why: (pn.why || synthetic.why_it_matters || "").trim() || defaultWhy(kind, themes),
        themes,
        kind,
        rank: i + 1,
        pipeline_hits: pipelineHitsFor(themes, companies),
        score: 0,
      };
    });
  }
  return selectNewsWorthReading(news, companies);
}

export function newsKindMix(reads: CuratedRead[]): { label: string; value: number; kind: NewsKind; color: string }[] {
  const counts = new Map<NewsKind, number>();
  for (const r of reads) counts.set(r.kind, (counts.get(r.kind) || 0) + 1);
  return [...counts.entries()]
    .map(([kind, value]) => ({
      kind,
      label: NEWS_KIND_META[kind].short,
      value,
      color: NEWS_KIND_META[kind].color,
    }))
    .sort((a, b) => b.value - a.value);
}

export function newsThemeMix(reads: CuratedRead[]): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const r of reads) {
    for (const t of r.themes) counts.set(t, (counts.get(t) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label: label.length > 22 ? `${label.slice(0, 20)}…` : label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

export function newsWorthCounsel(reads: CuratedRead[]): string {
  if (!reads.length) {
    return "No curated reads this cycle — Refresh pipeline or check Library after ingest.";
  }
  const kinds = new Set(reads.map((r) => r.kind));
  const bits = [
    `${reads.length} piece${reads.length === 1 ? "" : "s"} for the partner skim`,
    "not a firehose",
  ];
  if (kinds.has("contrarian")) bits.push("includes a contrarian stress-test");
  if (kinds.has("regulatory") || kinds.has("geopolitical")) bits.push("watch regulatory / geo timing");
  if (kinds.has("earnings")) bits.push("earnings read-through on demand");
  return `${bits[0]} — ${bits.slice(1).join("; ")}.`;
}
