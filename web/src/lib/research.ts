import type { Commentary, Company, PeerActivity } from "@/lib/types";
import {
  gatherAgenticSignals,
  type ScoutGatherResult,
  type ScoutStep,
} from "@/lib/agenticScout";
import {
  resolveFundingRounds,
  resolveProductNotes,
} from "@/lib/companyBrief";
import { buildComparables } from "@/lib/peerIntel";
import {
  classifyInvestors,
  inferTheme,
  scoreResearchDraft,
} from "@/lib/thesis";
import { criteriaOpenQuestions } from "@/lib/thirdbaseCriteria";
import { sanitizeBriefDomain, sanitizeSourceUrl } from "@/lib/externalLinks";
import { fmtMoneyM, fmtPct } from "@/lib/utils";

export type ResearchSource = {
  title: string;
  url?: string;
  snippet?: string;
  provider: string;
};

export type ResearchNewsItem = {
  title: string;
  url?: string;
  source?: string;
  published?: string;
};

export type CompanyBrief = {
  query: string;
  in_pipeline: boolean;
  company_id?: string;
  slug?: string;
  name: string;
  domain?: string | null;
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
  funding_rounds?: {
    round: string;
    date?: string | null;
    amount_m?: number | null;
    post_m?: number | null;
    lead?: string | null;
    confidence?: string | null;
  }[];
  headcount?: number | null;
  headcount_6m_growth_pct?: number | null;
  yoy_growth_pct?: number | null;
  runway_months_est?: number | null;
  tam_usd_b?: number | null;
  team_notes?: string | null;
  traction_notes?: string | null;
  moat_notes?: string | null;
  product_notes?: string | null;
  commentary_summary?: string | null;
  commentary?: Commentary[];
  peers?: PeerActivity[];
  comparables?: string[];
  comparable_rows?: {
    name: string;
    company_id?: string;
    slug?: string;
    thesis_score?: number | null;
    recommendation?: string | null;
    why?: string;
  }[];
  recent_news?: ResearchNewsItem[];
  sources?: ResearchSource[];
  agent_trace?: ScoutStep[];
  research_depth?: "pipeline" | "agentic_scout" | "heuristic_scout";
  confidence: "high" | "medium" | "low";
  provenance: string;
  open_questions: string[];
};

export type ResearchProgressEvent =
  | { type: "step"; step: ScoutStep }
  | { type: "brief"; brief: CompanyBrief }
  | { type: "error"; error: string };

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
    // Block portfolio/ops phrases that aren't company names
    if (/\b(deals?|deep dive|watchlist|agenda|tomorrow|overweight|underweight)\b/i.test(q)) {
      return false;
    }
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

  // Prefer strong name/slug prefixes over loose substring matches
  const starts = companies
    .filter(
      (c) =>
        c.name.toLowerCase().startsWith(needle) ||
        (c.slug || "").toLowerCase().startsWith(needle),
    )
    .sort((a, b) => a.name.length - b.name.length);
  if (starts[0]) return starts[0];

  // Only allow reverse includes for longer needles (avoid "ai" → "Molera AI")
  if (needle.length >= 4) {
    const partial = companies
      .filter((c) => {
        const name = c.name.toLowerCase();
        const domain = (c.domain || "").toLowerCase().replace(/\s+/g, "");
        const compact = needle.replace(/\s+/g, "");
        return (
          name.includes(needle) ||
          (name.length >= 4 && needle.includes(name)) ||
          (domain && domain.includes(compact))
        );
      })
      .sort((a, b) => a.name.length - b.name.length);
    return partial[0] || null;
  }
  return null;
}

export function briefFromPipeline(
  company: Company,
  commentary: Commentary[] = [],
  peers: PeerActivity[] = [],
  allCompanies: Company[] = [],
): CompanyBrief {
  const companyPeers = peers.filter((p) => p.company_id === company.id);
  const comps =
    allCompanies.length > 0
      ? buildComparables(allCompanies)[company.id] || []
      : [];
  const fundingRounds = resolveFundingRounds(company);
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
    tier2_names: company.tier2_names || [],
    tier3_count: company.tier3_count,
    tier3_names: company.tier3_names || [],
    funding_rounds: fundingRounds,
    headcount: company.headcount,
    headcount_6m_growth_pct: company.headcount_6m_growth_pct,
    yoy_growth_pct: company.yoy_growth_pct,
    runway_months_est: company.runway_months_est,
    tam_usd_b: company.tam_usd_b,
    team_notes: company.team_notes,
    traction_notes: company.traction_notes,
    moat_notes: company.moat_notes,
    product_notes: resolveProductNotes(company),
    commentary_summary: company.commentary_summary,
    commentary,
    peers: companyPeers,
    comparables: comps.map((c) => c.name),
    comparable_rows: comps.map((c) => ({
      name: c.name,
      company_id: c.company_id,
      slug: c.slug ?? undefined,
      thesis_score: c.thesis_score,
      recommendation: c.recommendation,
      why: c.why,
    })),
    domain: sanitizeBriefDomain(company.domain, company.name, true),
    sources: (company.sources || []).map((s) => ({
      title: s,
      provider: "pipeline",
    })),
    research_depth: "pipeline",
    confidence: "high",
    provenance: "Grounded in Signal pipeline (scored against Thirdbase thesis).",
    open_questions: [
      ...criteriaOpenQuestions(company, 3),
      "Diligence: customer references and retention?",
      "Synergies with existing Thirdbase portfolio?",
    ].slice(0, 5),
  };
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

const RESEARCH_JSON_SCHEMA = `Return ONLY compact JSON:
{"name":"","one_liner":"","sector_theme":"","subsector":"","stage":"","pipeline_bucket":"dominant_tech_growth"|"tactical_sector_agnostic","last_round_size_m":null,"last_round_date":null,"valuation_est_m":null,"valuation_confidence":"estimated"|"reported"|"unknown","lead_investor":null,"investors":[],"headcount":null,"headcount_6m_growth_pct":null,"yoy_growth_pct":null,"runway_months_est":null,"tam_usd_b":null,"team_notes":"","traction_notes":"","moat_notes":"","product_notes":"","why_now":"","commentary_summary":"","comparables":[],"open_questions":[],"team_strength":0,"traction_strength":0,"moat_strength":0}
Rules: use ONLY the evidence provided; never invent private valuations as fact; mark estimated/unknown; be thorough but concise; fill product_notes from site/news; invent nothing not supported by evidence.`;

function evidenceCharBudget(): number {
  return Math.min(
    14000,
    Math.max(2000, Number(process.env.SIGNAL_GEMINI_EVIDENCE_CHARS || 8000) || 8000),
  );
}

function maxOutputTokens(): number {
  return Math.min(
    2048,
    Math.max(512, Number(process.env.SIGNAL_GEMINI_MAX_OUTPUT_TOKENS || 1024) || 1024),
  );
}

function parseBriefJson(text: string): (Partial<CompanyBrief> & {
  team_strength?: number;
  traction_strength?: number;
  moat_strength?: number;
}) | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

/** True when Gemini and/or Anthropic is configured for research synthesis. */
export function isResearchAiEnabled(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.ANTHROPIC_API_KEY,
  );
}

export function researchAiProvider(): "gemini" | "anthropic" | "none" {
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "none";
}

type BudgetState = { day: string; count: number };

function budgetFile(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path");
  return path.join(process.cwd(), ".signal-cache", "gemini-budget.json");
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function readBudget(): BudgetState {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    const p = budgetFile();
    if (!fs.existsSync(p)) return { day: todayUtc(), count: 0 };
    const raw = JSON.parse(fs.readFileSync(p, "utf8")) as BudgetState;
    if (raw.day !== todayUtc()) return { day: todayUtc(), count: 0 };
    return { day: raw.day, count: Number(raw.count) || 0 };
  } catch {
    return { day: todayUtc(), count: 0 };
  }
}

function writeBudget(state: BudgetState) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const p = budgetFile();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(state), "utf8");
  } catch {
    /* ignore */
  }
}

function dailyCap(): number {
  const n = Number(process.env.SIGNAL_GEMINI_DAILY_CAP || 15);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 15;
}

function canSpendGeminiCall(): boolean {
  const b = readBudget();
  return b.count < dailyCap();
}

function recordGeminiCall() {
  const b = readBudget();
  writeBudget({ day: todayUtc(), count: b.count + 1 });
}

const researchCache = new Map<string, { at: number; brief: Partial<CompanyBrief> }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — demo-friendly, avoids re-spend after restart

function cacheKey(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").slice(0, 80) || "unknown";
}

function researchCacheFile(name: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path");
  return path.join(process.cwd(), ".signal-cache", "research", `${cacheKey(name)}.json`);
}

function cacheGet(name: string): Partial<CompanyBrief> | null {
  const key = name.toLowerCase();
  const hit = researchCache.get(key);
  if (hit) {
    if (Date.now() - hit.at > CACHE_TTL_MS) {
      researchCache.delete(key);
    } else {
      return hit.brief;
    }
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    const p = researchCacheFile(name);
    if (!fs.existsSync(p)) return null;
    const raw = JSON.parse(fs.readFileSync(p, "utf8")) as { at: number; brief: Partial<CompanyBrief> };
    if (!raw?.brief || Date.now() - Number(raw.at) > CACHE_TTL_MS) return null;
    researchCache.set(key, { at: Number(raw.at), brief: raw.brief });
    return raw.brief;
  } catch {
    return null;
  }
}

function cacheSet(name: string, brief: Partial<CompanyBrief>) {
  const at = Date.now();
  researchCache.set(name.toLowerCase(), { at, brief });
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const p = researchCacheFile(name);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify({ at, brief }), "utf8");
  } catch {
    /* ignore */
  }
}

export function geminiBudgetStatus(): { used: number; cap: number; remaining: number } {
  const used = readBudget().count;
  const cap = dailyCap();
  return { used, cap, remaining: Math.max(0, cap - used) };
}

/** Skip paid calls when free sources returned almost nothing — heuristic is enough for MVP. */
function evidenceWorthSynthesizing(evidence: string, name: string): boolean {
  const cleaned = evidence
    .replace(new RegExp(`No public snippets for ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"), "")
    .trim();
  return cleaned.length >= 120;
}

async function synthesizeWithGemini(
  name: string,
  evidence: string,
  pipelinePeers: string[],
): Promise<Partial<CompanyBrief> | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const cached = cacheGet(name);
  if (cached) return cached;

  if (!evidenceWorthSynthesizing(evidence, name)) {
    console.warn(`[signal] Skipping Gemini for "${name}" — evidence too thin (save tokens).`);
    return null;
  }

  if (!canSpendGeminiCall()) {
    console.warn(`[signal] Gemini daily cap reached (${dailyCap()}). Using heuristic brief.`);
    return null;
  }

  // Cheapest default: flash-lite alias (2.5-flash blocked for many new Google accounts).
  const model = process.env.SIGNAL_GEMINI_MODEL || "gemini-flash-lite-latest";
  const maxOut = maxOutputTokens();
  const evidenceCap = evidenceCharBudget();
  const shortEvidence = evidence.slice(0, evidenceCap);
  const peers = pipelinePeers.slice(0, 4).join(", ") || "n/a";

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: `Signal VC agentic scout. Synthesize a comprehensive partner brief from multi-source web evidence. ${RESEARCH_JSON_SCHEMA}`,
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Company: ${name}\nEvidence (agentic web gather):\n${shortEvidence}\nPeers: ${peers}\nFill JSON comprehensively from evidence. If thin, say so and leave unknowns null.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: maxOut,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(45000),
      },
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[signal] Gemini HTTP ${res.status}: ${errText.slice(0, 240)}`);
      return null;
    }
    recordGeminiCall();
    const data = await res.json();
    const text = (data.candidates || [])
      .flatMap((c: { content?: { parts?: { text?: string }[] } }) => c.content?.parts || [])
      .map((p: { text?: string }) => p.text || "")
      .join("\n");
    const parsed = parseBriefJson(text);
    if (parsed) cacheSet(name, parsed);
    return parsed;
  } catch (e) {
    console.warn("[signal] Gemini request failed", e instanceof Error ? e.message : e);
    return null;
  }
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
        system: `You are Signal, Thirdbase's agentic deal intelligence agent. Produce a comprehensive structured company brief from multi-source public web evidence.
${RESEARCH_JSON_SCHEMA}`,
        messages: [
          {
            role: "user",
            content: `Research company: ${name}\n\nAGENTIC WEB EVIDENCE:\n${evidence.slice(0, evidenceCharBudget())}\n\nPIPELINE PEERS FOR RELATIVE CONTEXT:\n${pipelinePeers.join(", ") || "n/a"}\n\nFill the JSON brief comprehensively. If evidence is thin, say so in notes and leave unknowns null.`,
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
    return parseBriefJson(text);
  } catch {
    return null;
  }
}

/** Prefer Gemini when configured; Claude only if no Gemini key (never double-call). */
async function synthesizeResearchBrief(
  name: string,
  evidence: string,
  pipelinePeers: string[],
): Promise<Partial<CompanyBrief> | null> {
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    return synthesizeWithGemini(name, evidence, pipelinePeers);
  }
  return synthesizeWithClaude(name, evidence, pipelinePeers);
}

function heuristicBrief(
  name: string,
  gathered: ScoutGatherResult,
  pipelineCompanies: Company[],
): CompanyBrief {
  const blob = gathered.snippets.join("\n");
  const theme = inferTheme(`${name}\n${blob}`);
  const investors = extractInvestors(blob);
  const caps = classifyInvestors(investors);
  const money = extractMoneyMs(blob);
  const hnSignal = gathered.hnHits.length;
  const hasWiki = Boolean(gathered.wiki?.extract);
  const newsN = gathered.news.length;
  const siteHit = gathered.sources.some((s) => s.provider === "site");

  const team_strength = hasWiki || siteHit ? 60 : 45;
  const traction_strength = Math.min(88, 38 + hnSignal * 6 + newsN * 3 + (siteHit ? 8 : 0));
  const moat_strength = /proprietary|patent|moat|defensib|network/i.test(blob) ? 72 : 52;

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
    gathered.wiki?.extract?.slice(0, 180) ||
    gathered.news[0]?.title ||
    `${name}${gathered.domain ? ` (${gathered.domain})` : ""} — agentic public-web scout; structured fields still thin.`;

  const commentary_summary =
    gathered.hnHits.length > 0 || newsN > 0
      ? [
          gathered.hnHits.length
            ? `HN: ${gathered.hnHits
                .slice(0, 3)
                .map((h) => h.title)
                .join("; ")}`
            : null,
          newsN
            ? `News: ${gathered.news
                .slice(0, 3)
                .map((n) => n.title)
                .join("; ")}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "Limited public commentary captured from free sources.";

  const comparables = pipelineCompanies
    .filter(
      (c) =>
        (c.sector_theme || "").includes(theme.name.split(" ")[0]) ||
        (c.theme_id || "") === theme.id,
    )
    .slice(0, 4)
    .map((c) => c.name);

  const thin = gathered.snippets.length < 3;
  const aiEnabled = isResearchAiEnabled();
  const confidence: CompanyBrief["confidence"] = thin
    ? "low"
    : hasWiki || investors.length || siteHit || newsN >= 2
      ? "medium"
      : "low";
  const recommendation: CompanyBrief["recommendation"] =
    confidence === "low" || scored.recommendation === "Pass" ? "Pass" : "Watch";

  const productFromSite = gathered.sources.find((s) => s.provider === "site")?.snippet;

  return {
    query: name,
    in_pipeline: false,
    name,
    domain: sanitizeBriefDomain(gathered.domain, name, false),
    one_liner,
    sector_theme: theme.name,
    subsector: theme.keywords[0],
    stage: money && money >= 50 ? "Series B+" : money ? "Seed–B" : "Unknown",
    pipeline_bucket: "dominant_tech_growth",
    recommendation,
    thesis_score: scored.thesis_score,
    relative_rank: thin ? "Insufficient comps" : `vs ${comparables[0] || "theme peers"}`,
    score_breakdown: scored.score_breakdown,
    why_now: thin
      ? `${name} is not in the Signal pipeline yet. Agentic web sweep found thin evidence — Watchlist scout only, not IC-ready.`
      : `${name} surfaced outside the maintained pipeline. Agentic gather across identity, news, forums, and ${gathered.domain || "unknown domain"} suggests ${theme.name.toLowerCase()} exposure; verify funding, Tier-1 quality, and growth before Deep Dive.`,
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
    team_notes: hasWiki || siteHit
      ? "Team/hiring inferred from public pages and encyclopedia — verify via LinkedIn / careers."
      : "Team unknown from free sources — diligence required.",
    traction_notes: commentary_summary,
    moat_notes: /moat|proprietary|patent|defensib/i.test(blob)
      ? "Public text hints at technical defensibility; validate with product diligence."
      : "Moat not clearly evidenced in public snippets.",
    product_notes: (() => {
      const cleaned = (productFromSite || "")
        .replace(/(?:^|[\s;])(?:\.|#)?[a-zA-Z_-][\w-]*(?:\s+[.#]?[a-zA-Z_-][\w-]*)*\s*\{[^}]{0,800}\}/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      const cssHeavy =
        (cleaned.match(/[{};]/g) || []).length > 6 ||
        (cleaned.match(/\.[a-zA-Z_-][\w-]*\s*[{\s]/g) || []).length >= 2;
      if (cleaned.length >= 40 && !cssHeavy) return cleaned.slice(0, 420);
      return "Product surface inferred from public indexes — open primary site for depth.";
    })(),
    commentary_summary,
    commentary: [
      ...gathered.hnHits.slice(0, 4).map((h, i) => ({
        id: `ext_hn_${i}`,
        company_id: "",
        company_name: name,
        source: "Hacker News",
        quote_or_summary: h.title || "",
        sentiment: "mixed" as const,
        credibility_tier: "medium" as const,
      })),
      ...gathered.news.slice(0, 4).map((n, i) => ({
        id: `ext_news_${i}`,
        company_id: "",
        company_name: name,
        source: n.source || "News",
        quote_or_summary: n.title,
        sentiment: "mixed" as const,
        credibility_tier: "medium" as const,
      })),
    ],
    peers: [],
    comparables,
    recent_news: gathered.news.slice(0, 8),
    sources: gathered.sources,
    agent_trace: gathered.steps,
    research_depth: "heuristic_scout",
    confidence,
    provenance: aiEnabled
      ? `Agentic public-web scout (${gathered.sources.length} sources: identity, news, HN, Reddit, GitHub, SEC, site crawl). Synthesis fell back to heuristics. Recommendation capped at Watch.`
      : `Agentic public-web scout (${gathered.sources.length} sources). Set GEMINI_API_KEY for AI synthesis. Recommendation capped at Watch until pipeline add.`,
    open_questions: [
      ...criteriaOpenQuestions(
        {
          pipeline_bucket: "dominant_tech_growth",
          stage: money && money >= 50 ? "Series B+" : money ? "Seed–B" : "Unknown",
          valuation_est_m: null,
          yoy_growth_pct: null,
          runway_months_est: null,
          tier1_count: caps.tier1_count,
          tier1_names: caps.tier1_names,
          moat_notes: /moat|proprietary|patent|defensib/i.test(blob)
            ? "Public text hints at technical defensibility; validate with product diligence."
            : "Moat not clearly evidenced in public snippets.",
          tam_usd_b: null,
          score_breakdown: scored.score_breakdown,
          sources: gathered.sources,
          sector_theme: theme.name,
          last_round_size_m: money,
        },
        3,
      ),
      "Confirm latest round size, valuation, and lead investor.",
      "Should we add this to Watchlist after partner review?",
    ].slice(0, 5),
  };
}

function normalizeStrength(n: unknown, fallback = 55): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  // Models sometimes return 0–10 instead of 0–100
  if (v >= 0 && v <= 10) return Math.round(v * 10);
  return Math.max(0, Math.min(100, Math.round(v)));
}

function sanitizeMoneyM(n: unknown): number | null {
  if (n == null || n === "") return null;
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  // Cap absurd round sizes (>$50B almost never a single private round in our units)
  if (v > 50_000) return null;
  return Math.round(v);
}

function sanitizeValuationM(n: unknown): number | null {
  if (n == null || n === "") return null;
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  // Allow mega-valuations up to ~$2T in millions
  if (v > 2_000_000) return null;
  return Math.round(v);
}

function briefFromLlm(
  name: string,
  llm: Partial<CompanyBrief> & {
    team_strength?: number;
    traction_strength?: number;
    moat_strength?: number;
  },
  gathered: ScoutGatherResult,
  pipelineCompanies: Company[],
): CompanyBrief {
  const investors = Array.isArray(llm.investors) ? llm.investors : extractInvestors(gathered.snippets.join("\n"));
  const caps = classifyInvestors(investors);
  const theme = inferTheme(`${llm.sector_theme || ""} ${llm.one_liner || ""} ${llm.subsector || ""}`);
  const scored = scoreResearchDraft({
    themeFit: Boolean(llm.sector_theme),
    tier1Count: caps.tier1_count,
    hasLead: Boolean(llm.lead_investor) || investors.length > 0,
    teamStrength: normalizeStrength(llm.team_strength, 55),
    tractionStrength: normalizeStrength(llm.traction_strength, 55),
    moatStrength: normalizeStrength(llm.moat_strength, 55),
    yoyGrowth: llm.yoy_growth_pct,
    runwayMonths: llm.runway_months_est,
    tamUsdB: llm.tam_usd_b,
  });
  const comparables =
    llm.comparables?.length
      ? llm.comparables
      : pipelineCompanies
          .filter((c) => c.theme_id === theme.id)
          .slice(0, 4)
          .map((c) => c.name);

  const rich =
    gathered.snippets.length >= 4 ||
    gathered.sources.some((s) => s.provider === "site") ||
    gathered.news.length >= 2;
  const confidence: CompanyBrief["confidence"] = gathered.snippets.length
    ? rich
      ? "medium"
      : "low"
    : "low";

  let lastRound = sanitizeMoneyM(llm.last_round_size_m) ?? extractMoneyMs(gathered.snippets.join("\n"));
  const valuation = sanitizeValuationM(llm.valuation_est_m);
  // Don't treat mega-valuation as round size when model conflates the two
  if (lastRound != null && valuation != null && lastRound === valuation && lastRound > 5_000) {
    lastRound = null;
  }

  const recommendation: CompanyBrief["recommendation"] =
    confidence === "low" ? "Pass" : "Watch";

  return {
    query: name,
    in_pipeline: false,
    name: llm.name || name,
    domain: sanitizeBriefDomain(gathered.domain, name, false),
    one_liner: llm.one_liner,
    sector_theme: llm.sector_theme || theme.name,
    subsector: llm.subsector,
    stage: llm.stage,
    pipeline_bucket: llm.pipeline_bucket || "dominant_tech_growth",
    recommendation,
    thesis_score: scored.thesis_score,
    relative_rank: comparables[0] ? `vs ${comparables[0]}` : "External scout",
    score_breakdown: scored.score_breakdown,
    why_now:
      llm.why_now ||
      `${name} is an external agentic scout — verify primary sources before Deep Dive or IC packet.`,
    last_round_size_m: lastRound,
    last_round_date: llm.last_round_date,
    valuation_est_m: valuation,
    valuation_confidence: llm.valuation_confidence || "estimated",
    lead_investor: llm.lead_investor || investors[0] || null,
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
    product_notes: (() => {
      const raw = typeof llm.product_notes === "string" ? llm.product_notes : "";
      const cleaned = raw
        .replace(/(?:^|[\s;])(?:\.|#)?[a-zA-Z_-][\w-]*(?:\s+[.#]?[a-zA-Z_-][\w-]*)*\s*\{[^}]{0,800}\}/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      const cssHeavy =
        (cleaned.match(/[{};]/g) || []).length > 6 ||
        (cleaned.match(/\.[a-zA-Z_-][\w-]*\s*[{\s]/g) || []).length >= 2;
      return cleaned.length >= 24 && !cssHeavy ? cleaned.slice(0, 500) : null;
    })(),
    commentary_summary: llm.commentary_summary,
    commentary: [
      ...gathered.hnHits.slice(0, 4).map((h, i) => ({
        id: `ext_hn_${i}`,
        company_id: "",
        company_name: name,
        source: "Hacker News",
        quote_or_summary: h.title || "",
        sentiment: "mixed" as const,
        credibility_tier: "medium" as const,
      })),
      ...gathered.news.slice(0, 4).map((n, i) => ({
        id: `ext_news_${i}`,
        company_id: "",
        company_name: name,
        source: n.source || "News",
        quote_or_summary: n.title,
        sentiment: "mixed" as const,
        credibility_tier: "medium" as const,
      })),
    ],
    peers: [],
    comparables,
    recent_news: gathered.news.slice(0, 8),
    sources: gathered.sources,
    agent_trace: gathered.steps,
    research_depth: "agentic_scout",
    confidence,
    provenance:
      researchAiProvider() === "gemini"
        ? `Agentic AI scout (Gemini) from ${gathered.sources.length} public sources across identity, news, forums, filings, and site crawl. Not in pipeline — recommendation capped at Watch.`
        : `Agentic AI scout from ${gathered.sources.length} public sources. Not in pipeline — recommendation capped at Watch until partner add.`,
    open_questions: [
      ...(llm.open_questions?.length ? llm.open_questions.slice(0, 2) : []),
      ...criteriaOpenQuestions(
        {
          pipeline_bucket: llm.pipeline_bucket || "dominant_tech_growth",
          stage: llm.stage,
          valuation_est_m: llm.valuation_est_m,
          valuation_confidence: llm.valuation_confidence,
          yoy_growth_pct: llm.yoy_growth_pct,
          headcount_6m_growth_pct: llm.headcount_6m_growth_pct,
          runway_months_est: llm.runway_months_est,
          tier1_count: caps.tier1_count,
          tier1_names: caps.tier1_names,
          moat_notes: llm.moat_notes,
          tam_usd_b: llm.tam_usd_b,
          score_breakdown: scored.score_breakdown,
          sources: gathered.sources,
          sector_theme: llm.sector_theme || theme.name,
          last_round_size_m: llm.last_round_size_m,
        },
        3,
      ),
      "Should we promote to Watchlist after partner review?",
    ].slice(0, 5),
  };
}

type ResearchCtx = {
  companies: Company[];
  commentary: Commentary[];
  peers: PeerActivity[];
};

async function researchExternal(
  name: string,
  ctx: ResearchCtx,
  onStep?: (step: ScoutStep) => void,
): Promise<CompanyBrief> {
  onStep?.({
    id: "synthesize",
    label: "Waiting on web gather",
    detail: "Identity → indexes → site crawl",
    status: "pending",
    provider: "agent",
  });

  const gathered = await gatherAgenticSignals(name, onStep);
  const evidence = gathered.snippets.join("\n\n").slice(0, evidenceCharBudget());
  const peerNames = ctx.companies.slice(0, 8).map((c) => c.name);

  onStep?.({
    id: "synthesize",
    label: "Synthesizing partner brief",
    detail: isResearchAiEnabled()
      ? `AI synthesis over ${gathered.sources.length} sources`
      : "Heuristic synthesis (no AI key)",
    status: "running",
    provider: researchAiProvider(),
  });

  const llm = await synthesizeResearchBrief(
    name,
    evidence || `No public snippets for ${name}`,
    peerNames,
  );

  if (llm?.name || llm?.one_liner) {
    const brief = briefFromLlm(name, llm, gathered, ctx.companies);
    onStep?.({
      id: "synthesize",
      label: "Brief ready",
      detail: `${brief.confidence} confidence · ${brief.sources?.length || 0} sources`,
      status: "done",
      provider: researchAiProvider(),
      hits: brief.sources?.length,
    });
    brief.agent_trace = [
      ...(gathered.steps || []),
      {
        id: "synthesize",
        label: "Brief ready",
        detail: `${brief.confidence} confidence · ${brief.sources?.length || 0} sources`,
        status: "done",
        provider: researchAiProvider(),
        hits: brief.sources?.length,
      },
    ];
    return brief;
  }

  const brief = heuristicBrief(name, gathered, ctx.companies);
  onStep?.({
    id: "synthesize",
    label: "Heuristic brief ready",
    detail: `${brief.sources?.length || 0} sources · no AI fill`,
    status: "done",
    provider: "heuristic",
    hits: brief.sources?.length,
  });
  return brief;
}

export async function researchCompany(
  rawQuery: string,
  ctx: ResearchCtx,
  onStep?: (step: ScoutStep) => void,
): Promise<CompanyBrief> {
  const name = extractCompanyQuery(rawQuery);
  onStep?.({
    id: "pipeline",
    label: "Checking Signal pipeline",
    detail: name,
    status: "running",
    provider: "pipeline",
  });

  const matched = matchCompany(name, ctx.companies);
  if (matched) {
    onStep?.({
      id: "pipeline",
      label: "Pipeline hit",
      detail: matched.name,
      status: "done",
      provider: "pipeline",
      hits: 1,
    });
    const commentary = ctx.commentary.filter((c) => c.company_id === matched.id);
    const brief = briefFromPipeline(matched, commentary, ctx.peers, ctx.companies);
    brief.agent_trace = [
      {
        id: "pipeline",
        label: "Pipeline hit",
        detail: matched.name,
        status: "done",
        provider: "pipeline",
        hits: 1,
      },
    ];
    return brief;
  }

  onStep?.({
    id: "pipeline",
    label: "Not in pipeline — launching agentic scout",
    detail: name,
    status: "done",
    provider: "pipeline",
    hits: 0,
  });

  return researchExternal(name, ctx, onStep);
}

/** NDJSON-friendly async generator for live search/chat UX. */
export async function* researchCompanyStream(
  rawQuery: string,
  ctx: ResearchCtx,
): AsyncGenerator<ResearchProgressEvent> {
  const name = extractCompanyQuery(rawQuery);

  yield {
    type: "step",
    step: {
      id: "pipeline",
      label: "Checking Signal pipeline",
      detail: name,
      status: "running",
      provider: "pipeline",
    },
  };

  const matched = matchCompany(name, ctx.companies);
  if (matched) {
    yield {
      type: "step",
      step: {
        id: "pipeline",
        label: "Pipeline hit",
        detail: matched.name,
        status: "done",
        provider: "pipeline",
        hits: 1,
      },
    };
    const commentary = ctx.commentary.filter((c) => c.company_id === matched.id);
    const brief = briefFromPipeline(matched, commentary, ctx.peers, ctx.companies);
    brief.agent_trace = [
      {
        id: "pipeline",
        label: "Pipeline hit",
        detail: matched.name,
        status: "done",
        provider: "pipeline",
        hits: 1,
      },
    ];
    yield { type: "brief", brief };
    return;
  }

  yield {
    type: "step",
    step: {
      id: "pipeline",
      label: "Not in pipeline — launching agentic scout",
      detail: name,
      status: "done",
      provider: "pipeline",
      hits: 0,
    },
  };

  const pending: ScoutStep[] = [];
  let resolveWait: (() => void) | null = null;
  let gatherDone = false;
  let gatherError: unknown = null;

  const gatherPromise = gatherAgenticSignals(name, (step) => {
    pending.push(step);
    resolveWait?.();
  })
    .then((g) => {
      gatherDone = true;
      resolveWait?.();
      return g;
    })
    .catch((e) => {
      gatherDone = true;
      gatherError = e;
      resolveWait?.();
      throw e;
    });

  while (!gatherDone || pending.length) {
    if (!pending.length && !gatherDone) {
      await new Promise<void>((r) => {
        resolveWait = r;
      });
      resolveWait = null;
    }
    while (pending.length) {
      yield { type: "step", step: pending.shift()! };
    }
    if (gatherDone && !pending.length) break;
  }

  if (gatherError) {
    yield {
      type: "error",
      error: gatherError instanceof Error ? gatherError.message : "Scout gather failed",
    };
    return;
  }

  let gathered: ScoutGatherResult;
  try {
    gathered = await gatherPromise;
  } catch (e) {
    yield { type: "error", error: e instanceof Error ? e.message : "Scout gather failed" };
    return;
  }

  yield {
    type: "step",
    step: {
      id: "synthesize",
      label: "Synthesizing partner brief",
      detail: isResearchAiEnabled()
        ? `AI synthesis over ${gathered.sources.length} sources`
        : "Heuristic synthesis (no AI key)",
      status: "running",
      provider: researchAiProvider(),
    },
  };

  const evidence = gathered.snippets.join("\n\n").slice(0, evidenceCharBudget());
  const peerNames = ctx.companies.slice(0, 8).map((c) => c.name);
  const llm = await synthesizeResearchBrief(
    name,
    evidence || `No public snippets for ${name}`,
    peerNames,
  );

  const out =
    llm?.name || llm?.one_liner
      ? briefFromLlm(name, llm, gathered, ctx.companies)
      : heuristicBrief(name, gathered, ctx.companies);

  yield {
    type: "step",
    step: {
      id: "synthesize",
      label: "Brief ready",
      detail: `${out.confidence} confidence · ${out.sources?.length || 0} sources`,
      status: "done",
      provider: researchAiProvider(),
      hits: out.sources?.length,
    },
  };
  yield { type: "brief", brief: out };
}

export function briefToMarkdown(brief: CompanyBrief): string {
  const scout = !brief.in_pipeline || brief.confidence !== "high";
  const rec =
    scout && brief.recommendation === "Deep Dive" ? "Watch" : brief.recommendation || "—";
  const lines = [
    `# ${scout ? "Agentic scout brief" : "IC Brief"} — ${brief.name}`,
    `**${rec}** · ${scout ? "est. " : ""}score ${brief.thesis_score ?? "—"} · ${brief.relative_rank || "—"}`,
    brief.domain ? `Domain: ${brief.domain}` : "",
    brief.in_pipeline ? "_In Signal pipeline_" : "_External agentic scout — not yet in pipeline_",
    scout ? "_Not IC-ready until confidence is high and name is maintained in pipeline._" : "",
    "",
    "## One-liner",
    brief.one_liner || "—",
    "",
    "## Funding history",
    `Stage ${brief.stage || "—"}; last round ${fmtMoneyM(brief.last_round_size_m)} on ${brief.last_round_date || "—"}; valuation ${fmtMoneyM(brief.valuation_est_m)} (${brief.valuation_confidence || "unknown"}); lead ${brief.lead_investor || "—"}.`,
  ];
  for (const r of brief.funding_rounds || []) {
    lines.push(
      `- ${r.round}: ${fmtMoneyM(r.amount_m)}` +
        (r.post_m != null ? ` · ${fmtMoneyM(r.post_m)} post` : "") +
        (r.date ? ` · ${r.date}` : "") +
        (r.lead ? ` · lead ${r.lead}` : ""),
    );
  }
  lines.push(
    "",
    "## Cap table quality",
    `Tier-1: ${brief.tier1_count ?? 0} (${(brief.tier1_names || []).join(", ") || "—"}). Tier-2: ${brief.tier2_count ?? 0} (${(brief.tier2_names || []).join(", ") || "—"}). Tier-3: ${brief.tier3_count ?? 0} (${(brief.tier3_names || []).join(", ") || "—"}). Investors: ${(brief.investors || []).join(", ") || "—"}.`,
    "",
    "## Team & hiring",
    brief.team_notes || "—",
    `Headcount ${brief.headcount ?? "—"}; 6m growth ${fmtPct(brief.headcount_6m_growth_pct)}.`,
    "",
    "## Product",
    brief.product_notes || "—",
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
  );
  for (const cm of brief.commentary || []) {
    lines.push(`- (${cm.source}, ${cm.sentiment}): ${cm.quote_or_summary}`);
  }
  if (brief.recent_news?.length) {
    lines.push("", "## Recent news");
    for (const n of brief.recent_news.slice(0, 6)) {
      lines.push(`- ${n.title}${n.source ? ` (${n.source})` : ""}${n.url ? ` — ${n.url}` : ""}`);
    }
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
  if (brief.sources?.length) {
    lines.push("", `## Sources (${brief.sources.length})`);
    for (const s of brief.sources.slice(0, 12)) {
      lines.push(`- [${s.provider}] ${s.title}${s.url ? ` — ${s.url}` : ""}`);
    }
  }
  lines.push("", "## Open questions");
  for (const q of brief.open_questions) lines.push(`- ${q}`);
  lines.push("", `_${brief.provenance}_ · confidence ${brief.confidence}`);
  return lines.filter((l, i, arr) => l !== "" || arr[i - 1] !== "").join("\n");
}

