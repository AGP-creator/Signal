import type { Commentary, Company, PeerActivity } from "@/lib/types";
import {
  classifyInvestors,
  inferTheme,
  scoreResearchDraft,
} from "@/lib/thesis";
import { fmtMoneyM, fmtPct } from "@/lib/utils";

export type ResearchSource = {
  title: string;
  url?: string;
  snippet?: string;
  provider: string;
};

export type CompanyBrief = {
  query: string;
  in_pipeline: boolean;
  company_id?: string;
  slug?: string;
  name: string;
  one_liner?: string | null;
  sector_theme?: string | null;
  subsector?: string | null;
  stage?: string | null;
  pipeline_bucket?: string | null;
  recommendation?: string | null;
  thesis_score?: number | null;
  relative_rank?: string | null;
  score_breakdown?: Record<string, number>;
  why_now?: string | null;
  last_round_size_m?: number | null;
  last_round_date?: string | null;
  valuation_est_m?: number | null;
  valuation_confidence?: string | null;
  lead_investor?: string | null;
  investors?: string[];
  tier1_count?: number | null;
  tier1_names?: string[];
  tier2_count?: number | null;
  tier2_names?: string[];
  tier3_count?: number | null;
  tier3_names?: string[];
  headcount?: number | null;
  headcount_6m_growth_pct?: number | null;
  yoy_growth_pct?: number | null;
  runway_months_est?: number | null;
  tam_usd_b?: number | null;
  team_notes?: string | null;
  traction_notes?: string | null;
  moat_notes?: string | null;
  commentary_summary?: string | null;
  commentary?: Commentary[];
  peers?: PeerActivity[];
  comparables?: string[];
  sources?: ResearchSource[];
  confidence: "high" | "medium" | "low";
  provenance: string;
  open_questions: string[];
};

function extractCompanyQuery(raw: string): string {
  const q = raw.trim();
  const patterns = [
    /^(?:research|lookup|look up|search|analyze|analyse|brief|draft(?: an)? ic(?: one[- ]?pager)?(?: for)?|tell me about|what about|who is|who's)\s+(.+)$/i,
    /^(?:summarize|summarise)(?: what people are saying about)?\s+(.+)$/i,
    /^(.+?)(?:\s+ic(?: one[- ]?pager)?|\s+brief|\s+one[- ]?pager)$/i,
  ];
  for (const p of patterns) {
    const m = q.match(p);
    if (m?.[1]) return m[1].replace(/[?.!]+$/, "").trim();
  }
  return q.replace(/[?.!]+$/, "").trim();
}

export function looksLikeCompanyQuery(question: string): boolean {
  const q = question.trim();
  if (!q) return false;
  const lower = q.toLowerCase();
  const blocked = [
    "best deals",
    "sector",
    "tomorrow",
    "quietly investing",
    "overweight",
    "rebalance",
    "60/40",
    "peer",
    "digest",
    "hot deals",
    "pipeline",
    "thesis shift",
    "off-thesis",
    "nobody is talking",
    "sub-sector",
    "subsector",
    "co-invest",
    "heatmap",
    "syndicate",
    "white space",
    "whitespace",
    "proprietary",
    "golden",
    "battle card",
    "who should i call",
  ];
  if (blocked.some((b) => lower.includes(b))) return false;

  if (
    /^(research|lookup|look up|search|analyze|analyse|tell me about|what about)\s+.+/i.test(q)
  ) {
    return true;
  }
  if (/^(who is|who's)\s+[A-Z0-9]/i.test(q) && !/investing|funding|backing/i.test(q)) {
    return true;
  }
  if (/\b(ic one[- ]?pager|one[- ]?pager|company brief)\b/i.test(q)) return true;
  if (/^draft(?: an)? ic(?: one[- ]?pager)?(?: for)?\s+.+/i.test(q)) return true;
  if (/^summarize(?: what people are saying about)?\s+.+/i.test(q)) return true;

  // Short proper-noun-ish queries: "Stripe", "Anthropic", "AgentGate"
  const words = q.split(/\s+/);
  if (words.length <= 4 && !/[?]/.test(q)) {
    return true;
  }
  return false;
}

export function matchCompany(query: string, companies: Company[]): Company | null {
  const needle = extractCompanyQuery(query).toLowerCase();
  if (!needle) return null;
  const exact = companies.find((c) => c.name.toLowerCase() === needle);
  if (exact) return exact;
  const slug = companies.find((c) => (c.slug || "").toLowerCase() === needle);
  if (slug) return slug;
  const partial = companies
    .filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        needle.includes(c.name.toLowerCase()) ||
        (c.domain || "").toLowerCase().includes(needle.replace(/\s+/g, "")),
    )
    .sort((a, b) => a.name.length - b.name.length);
  return partial[0] || null;
}

export function briefFromPipeline(
  company: Company,
  commentary: Commentary[] = [],
  peers: PeerActivity[] = [],
): CompanyBrief {
  const companyPeers = peers.filter((p) => p.company_id === company.id);
  return {
    query: company.name,
    in_pipeline: true,
    company_id: company.id,
    slug: company.slug,
    name: company.name,
    one_liner: company.one_liner,
    sector_theme: company.sector_theme,
    subsector: company.subsector,
    stage: company.stage,
    pipeline_bucket: company.pipeline_bucket,
    recommendation: company.recommendation,
    thesis_score: company.thesis_score,
    relative_rank: company.relative_rank,
    score_breakdown: company.score_breakdown,
    why_now: company.why_now,
    last_round_size_m: company.last_round_size_m,
    last_round_date: company.last_round_date,
    valuation_est_m: company.valuation_est_m,
    valuation_confidence: company.valuation_confidence,
    lead_investor: company.lead_investor,
    investors: company.investors || [],
    tier1_count: company.tier1_count,
    tier1_names: company.tier1_names || [],
    tier2_count: company.tier2_count,
    tier2_names: (company as Company & { tier2_names?: string[] }).tier2_names || [],
    tier3_count: (company as Company & { tier3_count?: number }).tier3_count,
    tier3_names: (company as Company & { tier3_names?: string[] }).tier3_names || [],
    headcount: company.headcount,
    headcount_6m_growth_pct: company.headcount_6m_growth_pct,
    yoy_growth_pct: company.yoy_growth_pct,
    runway_months_est: company.runway_months_est,
    tam_usd_b: company.tam_usd_b,
    team_notes: company.team_notes,
    traction_notes: company.traction_notes,
    moat_notes: company.moat_notes,
    commentary_summary: company.commentary_summary,
    commentary,
    peers: companyPeers,
    comparables: [],
    sources: (company.sources || []).map((s) => ({
      title: s,
      provider: "pipeline",
    })),
    confidence: "high",
    provenance: "Grounded in Signal pipeline (scored against Thirdbase thesis).",
    open_questions: [
      "What is true entry valuation vs last marked round?",
      "Diligence: customer references and retention?",
      "Synergies with existing Thirdbase portfolio?",
    ],
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: "application/json",
        "User-Agent": "Signal-Thirdbase-Research/1.0",
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type WikiSummary = {
  title?: string;
  extract?: string;
  description?: string;
  content_urls?: { desktop?: { page?: string } };
};

type DdgResponse = {
  AbstractText?: string;
  AbstractURL?: string;
  Heading?: string;
  RelatedTopics?: { Text?: string; FirstURL?: string }[];
  Results?: { Text?: string; FirstURL?: string }[];
};

type HnHit = {
  title?: string;
  url?: string;
  points?: number;
  num_comments?: number;
  objectID?: string;
};

async function gatherPublicSignals(name: string) {
  const q = encodeURIComponent(name);
  const [wiki, ddg, hn] = await Promise.all([
    fetchJson<WikiSummary>(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/\s+/g, "_"))}`,
    ),
    fetchJson<DdgResponse>(
      `https://api.duckduckgo.com/?q=${q}+startup+company&format=json&no_redirect=1&no_html=1`,
    ),
    fetchJson<{ hits?: HnHit[] }>(
      `https://hn.algolia.com/api/v1/search?query=${q}&tags=story&hitsPerPage=5`,
    ),
  ]);

  const sources: ResearchSource[] = [];
  const snippets: string[] = [];

  if (wiki?.extract) {
    snippets.push(wiki.extract);
    sources.push({
      title: wiki.title || `${name} — Wikipedia`,
      url: wiki.content_urls?.desktop?.page,
      snippet: wiki.extract.slice(0, 280),
      provider: "wikipedia",
    });
  }
  if (ddg?.AbstractText) {
    snippets.push(ddg.AbstractText);
    sources.push({
      title: ddg.Heading || `${name} — DuckDuckGo`,
      url: ddg.AbstractURL,
      snippet: ddg.AbstractText.slice(0, 280),
      provider: "duckduckgo",
    });
  }
  for (const topic of (ddg?.RelatedTopics || []).slice(0, 4)) {
    if (topic.Text) {
      snippets.push(topic.Text);
      sources.push({
        title: topic.Text.slice(0, 80),
        url: topic.FirstURL,
        snippet: topic.Text,
        provider: "duckduckgo",
      });
    }
  }
  for (const hit of hn?.hits || []) {
    if (!hit.title) continue;
    const snippet = `${hit.title} (${hit.points || 0} pts, ${hit.num_comments || 0} comments)`;
    snippets.push(snippet);
    sources.push({
      title: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      snippet,
      provider: "hackernews",
    });
  }

  return { snippets, sources, wiki, ddg, hnHits: hn?.hits || [] };
}

function extractInvestors(text: string): string[] {
  const found: string[] = [];
  const hay = text;
  for (const firm of [
    ...[
      "Andreessen Horowitz",
      "a16z",
      "Sequoia",
      "Lux Capital",
      "Founders Fund",
      "Lightspeed",
      "Index Ventures",
      "Bessemer",
      "Insight Partners",
      "Coatue",
      "Tiger Global",
      "Thrive",
      "Khosla",
      "Benchmark",
      "Greylock",
      "Accel",
      "General Catalyst",
      "Y Combinator",
      "SoftBank",
      "GV",
    ],
  ]) {
    if (new RegExp(`\\b${firm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(hay)) {
      if (!found.includes(firm)) found.push(firm);
    }
  }
  return found;
}

function extractMoneyMs(text: string): number | null {
  const m = text.match(/\$?\s*(\d+(?:\.\d+)?)\s*(billion|bn|million|m)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  if (unit.startsWith("b")) return Math.round(n * 1000);
  return Math.round(n);
}

async function synthesizeWithClaude(
  name: string,
  evidence: string,
  pipelinePeers: string[],
): Promise<Partial<CompanyBrief> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.SIGNAL_MODEL || "claude-sonnet-4-20250514",
        max_tokens: 1600,
        system: `You are Signal, Thirdbase's deal intelligence agent. Produce structured company intelligence for partners.
Return ONLY valid JSON matching this schema:
{
  "name": string,
  "one_liner": string,
  "sector_theme": string,
  "subsector": string,
  "stage": string,
  "pipeline_bucket": "dominant_tech_growth" | "tactical_sector_agnostic",
  "last_round_size_m": number|null,
  "last_round_date": string|null,
  "valuation_est_m": number|null,
  "valuation_confidence": "estimated"|"reported"|"unknown",
  "lead_investor": string|null,
  "investors": string[],
  "headcount": number|null,
  "headcount_6m_growth_pct": number|null,
  "yoy_growth_pct": number|null,
  "runway_months_est": number|null,
  "tam_usd_b": number|null,
  "team_notes": string,
  "traction_notes": string,
  "moat_notes": string,
  "why_now": string,
  "commentary_summary": string,
  "comparables": string[],
  "open_questions": string[],
  "team_strength": number,
  "traction_strength": number,
  "moat_strength": number
}
Rules: never invent private valuations as fact — mark estimated/unknown. Prefer Pass/Watch/Deep Dive framing in why_now. Be concise.`,
        messages: [
          {
            role: "user",
            content: `Research company: ${name}\n\nPUBLIC EVIDENCE:\n${evidence}\n\nPIPELINE PEERS FOR RELATIVE CONTEXT:\n${pipelinePeers.join(", ") || "n/a"}\n\nFill the JSON brief. If evidence is thin, say so in notes and lower confidence fields.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.content || [])
      .map((b: { text?: string }) => b.text || "")
      .join("\n");
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as Partial<CompanyBrief> & {
      team_strength?: number;
      traction_strength?: number;
      moat_strength?: number;
    };
  } catch {
    return null;
  }
}

function heuristicBrief(
  name: string,
  gathered: Awaited<ReturnType<typeof gatherPublicSignals>>,
  pipelineCompanies: Company[],
): CompanyBrief {
  const blob = gathered.snippets.join("\n");
  const theme = inferTheme(`${name}\n${blob}`);
  const investors = extractInvestors(blob);
  const caps = classifyInvestors(investors);
  const money = extractMoneyMs(blob);
  const hnSignal = gathered.hnHits.length;
  const hasWiki = Boolean(gathered.wiki?.extract);

  const team_strength = hasWiki ? 58 : 45;
  const traction_strength = Math.min(85, 40 + hnSignal * 8);
  const moat_strength = /proprietary|patent|moat|defensib|network/i.test(blob) ? 70 : 52;

  const scored = scoreResearchDraft({
    themeFit: true,
    tier1Count: caps.tier1_count,
    hasLead: investors.length > 0,
    teamStrength: team_strength,
    tractionStrength: traction_strength,
    moatStrength: moat_strength,
  });

  const one_liner =
    gathered.wiki?.description ||
    gathered.wiki?.extract?.slice(0, 160) ||
    gathered.ddg?.AbstractText?.slice(0, 160) ||
    `${name} — public signals gathered; limited structured data in free sources.`;

  const commentary_summary =
    gathered.hnHits.length > 0
      ? `HN chatter: ${gathered.hnHits
          .slice(0, 3)
          .map((h) => h.title)
          .join("; ")}`
      : "Limited public commentary captured from free sources.";

  const comparables = pipelineCompanies
    .filter((c) => (c.sector_theme || "").includes(theme.name.split(" ")[0]) || (c.theme_id || "") === theme.id)
    .slice(0, 4)
    .map((c) => c.name);

  const thin = gathered.snippets.length < 2;
  return {
    query: name,
    in_pipeline: false,
    name,
    one_liner,
    sector_theme: theme.name,
    subsector: theme.keywords[0],
    stage: money && money >= 50 ? "Series B+" : "Unknown",
    pipeline_bucket: "dominant_tech_growth",
    recommendation: scored.recommendation,
    thesis_score: scored.thesis_score,
    relative_rank: thin ? "Insufficient comps" : `vs ${comparables[0] || "theme peers"}`,
    score_breakdown: scored.score_breakdown,
    why_now: thin
      ? `${name} is not in the Signal pipeline yet. Public evidence is thin — treat this as a Watchlist scout, not IC-ready.`
      : `${name} surfaced outside the maintained pipeline. Early public signals suggest ${theme.name.toLowerCase()} exposure; verify funding, Tier-1 quality, and 40%+ growth before Deep Dive.`,
    last_round_size_m: money,
    last_round_date: null,
    valuation_est_m: null,
    valuation_confidence: "unknown",
    lead_investor: investors[0] || null,
    investors,
    tier1_count: caps.tier1_count,
    tier1_names: caps.tier1_names,
    tier2_count: caps.tier2_count,
    tier2_names: caps.tier2_names,
    tier3_count: caps.tier3_count,
    tier3_names: caps.tier3_names,
    team_notes: hasWiki
      ? "Team details inferred from public encyclopedia/news snippets — verify via LinkedIn / careers."
      : "Team unknown from free sources — diligence required.",
    traction_notes: commentary_summary,
    moat_notes: /moat|proprietary|patent|defensib/i.test(blob)
      ? "Public text hints at technical defensibility; validate with product diligence."
      : "Moat not clearly evidenced in public snippets.",
    commentary_summary,
    commentary: gathered.hnHits.slice(0, 4).map((h, i) => ({
      id: `ext_hn_${i}`,
      company_id: "",
      company_name: name,
      source: "Hacker News",
      quote_or_summary: h.title || "",
      sentiment: "mixed",
      credibility_tier: "medium",
    })),
    peers: [],
    comparables,
    sources: gathered.sources,
    confidence: thin ? "low" : hasWiki || investors.length ? "medium" : "low",
    provenance:
      "External research (Wikipedia / DuckDuckGo / HN). Not yet in Signal pipeline — scores are estimated.",
    open_questions: [
      "Confirm latest round size, valuation, and lead investor.",
      "Map Tier-1 / Tier-2 / Tier-3 cap table accurately.",
      "Validate YoY growth, runway (~36 mo target), and TAM > $1B.",
      "Should we add this to Watchlist after partner review?",
    ],
  };
}

export async function researchCompany(
  rawQuery: string,
  ctx: {
    companies: Company[];
    commentary: Commentary[];
    peers: PeerActivity[];
  },
): Promise<CompanyBrief> {
  const name = extractCompanyQuery(rawQuery);
  const matched = matchCompany(name, ctx.companies);
  if (matched) {
    const commentary = ctx.commentary.filter((c) => c.company_id === matched.id);
    return briefFromPipeline(matched, commentary, ctx.peers);
  }

  const gathered = await gatherPublicSignals(name);
  const evidence = gathered.snippets.join("\n\n").slice(0, 6000);
  const peerNames = ctx.companies.slice(0, 20).map((c) => c.name);
  const llm = await synthesizeWithClaude(name, evidence || `No public snippets for ${name}`, peerNames);

  if (llm?.name) {
    const investors = Array.isArray(llm.investors) ? llm.investors : [];
    const caps = classifyInvestors(investors);
    const theme = inferTheme(`${llm.sector_theme || ""} ${llm.one_liner || ""} ${llm.subsector || ""}`);
    const scored = scoreResearchDraft({
      themeFit: Boolean(llm.sector_theme),
      tier1Count: caps.tier1_count,
      hasLead: Boolean(llm.lead_investor),
      teamStrength: Number((llm as { team_strength?: number }).team_strength ?? 55),
      tractionStrength: Number((llm as { traction_strength?: number }).traction_strength ?? 55),
      moatStrength: Number((llm as { moat_strength?: number }).moat_strength ?? 55),
      yoyGrowth: llm.yoy_growth_pct,
      runwayMonths: llm.runway_months_est,
      tamUsdB: llm.tam_usd_b,
    });
    const comparables =
      llm.comparables?.length
        ? llm.comparables
        : ctx.companies
            .filter((c) => c.theme_id === theme.id)
            .slice(0, 4)
            .map((c) => c.name);

    return {
      query: name,
      in_pipeline: false,
      name: llm.name || name,
      one_liner: llm.one_liner,
      sector_theme: llm.sector_theme || theme.name,
      subsector: llm.subsector,
      stage: llm.stage,
      pipeline_bucket: llm.pipeline_bucket || "dominant_tech_growth",
      recommendation: scored.recommendation,
      thesis_score: scored.thesis_score,
      relative_rank: comparables[0] ? `vs ${comparables[0]}` : "External scout",
      score_breakdown: scored.score_breakdown,
      why_now: llm.why_now,
      last_round_size_m: llm.last_round_size_m,
      last_round_date: llm.last_round_date,
      valuation_est_m: llm.valuation_est_m,
      valuation_confidence: llm.valuation_confidence || "estimated",
      lead_investor: llm.lead_investor,
      investors,
      tier1_count: caps.tier1_count,
      tier1_names: caps.tier1_names,
      tier2_count: caps.tier2_count,
      tier2_names: caps.tier2_names,
      tier3_count: caps.tier3_count,
      tier3_names: caps.tier3_names,
      headcount: llm.headcount,
      headcount_6m_growth_pct: llm.headcount_6m_growth_pct,
      yoy_growth_pct: llm.yoy_growth_pct,
      runway_months_est: llm.runway_months_est,
      tam_usd_b: llm.tam_usd_b,
      team_notes: llm.team_notes,
      traction_notes: llm.traction_notes,
      moat_notes: llm.moat_notes,
      commentary_summary: llm.commentary_summary,
      commentary: [],
      peers: [],
      comparables,
      sources: gathered.sources,
      confidence: gathered.snippets.length ? "medium" : "low",
      provenance:
        "AI-synthesized from public web evidence. Not yet in Signal pipeline — partner review before Excel add.",
      open_questions:
        llm.open_questions?.length
          ? llm.open_questions
          : [
              "Confirm funding and valuation with primary sources.",
              "Should we promote to Watchlist after partner review?",
            ],
    };
  }

  return heuristicBrief(name, gathered, ctx.companies);
}

export function briefToMarkdown(brief: CompanyBrief): string {
  const lines = [
    `# IC Brief — ${brief.name}`,
    `**${brief.recommendation || "—"}** · score ${brief.thesis_score ?? "—"} · ${brief.relative_rank || "—"}`,
    brief.in_pipeline ? "_In Signal pipeline_" : "_External research — not yet in pipeline_",
    "",
    "## One-liner",
    brief.one_liner || "—",
    "",
    "## Funding history",
    `Stage ${brief.stage || "—"}; last round ${fmtMoneyM(brief.last_round_size_m)} on ${brief.last_round_date || "—"}; valuation ${fmtMoneyM(brief.valuation_est_m)} (${brief.valuation_confidence || "unknown"}); lead ${brief.lead_investor || "—"}.`,
    "",
    "## Cap table quality",
    `Tier-1: ${brief.tier1_count ?? 0} (${(brief.tier1_names || []).join(", ") || "—"}). Tier-2: ${brief.tier2_count ?? 0} (${(brief.tier2_names || []).join(", ") || "—"}). Tier-3: ${brief.tier3_count ?? 0} (${(brief.tier3_names || []).join(", ") || "—"}). Investors: ${(brief.investors || []).join(", ") || "—"}.`,
    "",
    "## Team & hiring",
    brief.team_notes || "—",
    `Headcount ${brief.headcount ?? "—"}; 6m growth ${fmtPct(brief.headcount_6m_growth_pct)}.`,
    "",
    "## Product traction",
    brief.traction_notes || "—",
    `YoY ${fmtPct(brief.yoy_growth_pct)}; runway ~${brief.runway_months_est ?? "—"} months; TAM ${brief.tam_usd_b != null ? `$${brief.tam_usd_b}B` : "—"}.`,
    "",
    "## Thesis fit",
    `${brief.sector_theme || "—"} / ${brief.subsector || "—"} · ${brief.pipeline_bucket || "—"}`,
    brief.moat_notes || "",
    "",
    "## Why now",
    brief.why_now || "—",
    "",
    "## Investor & operator commentary",
    brief.commentary_summary || "—",
  ];
  for (const cm of brief.commentary || []) {
    lines.push(`- (${cm.source}, ${cm.sentiment}): ${cm.quote_or_summary}`);
  }
  if (brief.comparables?.length) {
    lines.push("", "## Comparable companies", brief.comparables.join(", "));
  }
  if (brief.peers?.length) {
    lines.push("", "## Peer activity");
    for (const p of brief.peers) {
      lines.push(`- ${p.firm} · ${p.round} · ${p.notes || ""}`);
    }
  }
  lines.push("", "## Open questions");
  for (const q of brief.open_questions) lines.push(`- ${q}`);
  lines.push("", `_${brief.provenance}_ · confidence ${brief.confidence}`);
  return lines.join("\n");
}
