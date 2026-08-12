/**
 * Sector Scanner — on-demand thesis scans, proactive momentum, contrarian edges.
 * Deterministic, grounded in pipeline + sector_calls (mirrors scripts/sector_scan.py).
 */

import { THEME_HINTS } from "@/lib/thesis";
import type { Commentary, Company, PeerActivity, SectorCall } from "@/lib/types";

/* ─── types ─────────────────────────────────────────────────────────────── */

export type ThesisPillar = {
  id: string;
  label: string;
  value: string;
  weight: number; // 0–100 display weight in blueprint
  source: "theme" | "stage" | "signal" | "posture" | "bucket";
};

export type MatchFacet = {
  key: string;
  label: string;
  hit: boolean;
  detail: string;
};

export type RankedHit = {
  company_id: string;
  name: string;
  slug?: string | null;
  one_liner?: string | null;
  sector_theme?: string | null;
  subsector?: string | null;
  stage?: string | null;
  thesis_score: number;
  recommendation: string;
  relative_rank?: string | null;
  relevance: number; // 0–100 thesis-match strength
  composite: number; // ranked sort key
  why: string[];
  facets: MatchFacet[];
  x: number; // constellation coords 0–100
  y: number;
  size: number;
  tag: "prime" | "emerging" | "watch" | "stretch";
};

export type ThesisScan = {
  query: string;
  interpreted_as: string;
  pillars: ThesisPillar[];
  filters: string[];
  theme_id: string | null;
  theme_name: string | null;
  stage_hints: string[];
  signal_flags: string[];
  posture: "contrarian" | "emerging" | "crowded" | "open";
  hits: RankedHit[];
  shortlist: RankedHit[];
  coverage: Record<string, number>; // radar: theme fit dims
  stage_mix: { label: string; pct: number; color: string }[];
  sector_overlap: { subsector: string; heat: number; consensus: string }[];
  funnel: { label: string; value: number }[];
  counsel: string;
  build_steps: { id: string; label: string; detail: string }[];
};

export type MomentumSector = {
  id: string;
  subsector: string;
  parent_theme?: string;
  heat_score: number;
  momentum: number; // derived acceleration proxy
  consensus_level?: string;
  why: string;
  evidence: string[];
  top_companies: string[];
  best_deals: RankedHit[];
  spark: number[]; // fake-ish but deterministic sparkline
};

export type MomentumPack = {
  headline: string;
  sectors: MomentumSector[];
  rising_deals: RankedHit[];
  counsel: string;
};

export type ContrarianCall = {
  id: string;
  kind: "sector" | "deal";
  title: string;
  subtitle: string;
  heat_or_score: number;
  consensus_vs: string;
  insight: string;
  action: string;
  evidence: string[];
  company_id?: string;
  slug?: string | null;
  recommendation?: string;
};

export type ContrarianPack = {
  headline: string;
  calls: ContrarianCall[];
  sector_count: number;
  deal_count: number;
  counsel: string;
};

export type EvidenceChannelId =
  | "gp_commentary"
  | "frontier_hiring"
  | "founder_migration"
  | "fund_formation"
  | "research_velocity";

export type EvidenceChannelMeta = {
  id: EvidenceChannelId;
  label: string;
  short: string;
  hint: string;
};

export const EVIDENCE_CHANNELS: EvidenceChannelMeta[] = [
  {
    id: "gp_commentary",
    label: "GP commentary",
    short: "GP",
    hint: "Partner essays, watchlists, LP letters",
  },
  {
    id: "frontier_hiring",
    label: "Frontier lab hiring",
    short: "Hire",
    hint: "Role velocity at OpenAI / Anthropic / DeepMind-class labs",
  },
  {
    id: "founder_migration",
    label: "Founder migration",
    short: "Founder",
    hint: "Operators leaving incumbents into newcos",
  },
  {
    id: "fund_formation",
    label: "Fund formation",
    short: "Funds",
    hint: "New vehicles & mandate language before consensus",
  },
  {
    id: "research_velocity",
    label: "Research / OSS velocity",
    short: "Research",
    hint: "arXiv, HN, open-source contributor speed",
  },
];

export type ChannelScore = {
  id: EvidenceChannelId;
  label: string;
  short: string;
  score: number;
  hits: string[];
};

export type FlowLane = {
  id: "capital" | "talent" | "founder";
  label: string;
  score: number;
  delta: number;
  series: { label: string; value: number }[];
  detail: string;
  drivers: string[];
};

export type EmergingCall = {
  rank: number;
  id: string;
  subsector: string;
  parent_theme?: string;
  heat_score: number;
  stealth_score: number;
  consensus_level?: string;
  why: string;
  why_pre_consensus: string;
  action: string;
  evidence: string[];
  channel_scores: ChannelScore[];
  channel_radar: Record<string, number>;
  best_companies: RankedHit[];
  spark: number[];
};

export type ForesightPack = {
  question: string;
  headline: string;
  counsel: string;
  quarter_label: string;
  parent_filter: string;
  top_three: EmergingCall[];
  flows: FlowLane[];
  channel_totals: ChannelScore[];
  /** rows = top sectors, cols = evidence channels (0–100) */
  channel_matrix: {
    sector_labels: string[];
    channel_labels: string[];
    channel_shorts: string[];
    cells: number[][];
  };
  attention: {
    label: string;
    capital: number;
    talent: number;
    founder: number;
  }[];
  must_diligence: RankedHit[];
};

export type SectorScanPack = {
  summary: {
    headline: string;
    must_do: string[];
    sector_count: number;
    contrarian_count: number;
    hot_count: number;
  };
  foresight: ForesightPack;
  default_scan: ThesisScan;
  momentum: MomentumPack;
  contrarian: ContrarianPack;
};

/* ─── presets ───────────────────────────────────────────────────────────── */

export const CANONICAL_FORESIGHT_QUESTION =
  "What are the three most important sub-sectors emerging in AI infrastructure this quarter that nobody is talking about yet?";

export const PRESET_THESES = [
  CANONICAL_FORESIGHT_QUESTION,
  "Quiet defence tech Series A with hiring velocity and thin Tier-1",
  "AI infra inference / eval layer before peer FOMO",
  "Robotics & physical AI challengers with real YoY traction",
  "Contrarian energy-as-a-service names peers are ignoring",
  "Cybersecurity identity / zero-trust Watch skeletons",
  "Fintech rails with Tier-1 circling but room for a check",
];

/* ─── helpers ───────────────────────────────────────────────────────────── */

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function stageKey(stage?: string | null): string {
  const s = (stage || "").toLowerCase();
  if (s.includes("seed") || s.includes("pre")) return "Seed";
  if (s.includes("a") && !s.includes("b")) return "Series A";
  if (s.includes("b")) return "Series B";
  if (s.includes("c") || s.includes("growth") || s.includes("d")) return "Growth";
  return stage || "Unknown";
}

function detectTheme(q: string): (typeof THEME_HINTS)[number] | null {
  const lower = q.toLowerCase();
  let best: (typeof THEME_HINTS)[number] | null = null;
  let score = 0;
  for (const t of THEME_HINTS) {
    let s = 0;
    if (lower.includes(t.name.toLowerCase().slice(0, 12))) s += 5;
    for (const kw of t.keywords) if (lower.includes(kw)) s += 2;
    if (s > score) {
      score = s;
      best = t;
    }
  }
  return score > 0 ? best : null;
}

function companyBlob(c: Company): string {
  return [
    c.name,
    c.one_liner,
    c.sector_theme,
    c.subsector,
    c.moat_notes,
    c.team_notes,
    c.traction_notes,
    c.why_now,
    ...(c.investors || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function tokenHits(query: string, blob: string): string[] {
  const toks = query
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
  const hits: string[] = [];
  for (const t of toks) {
    if (blob.includes(t) && !hits.includes(t)) hits.push(t);
  }
  return hits;
}

const STOP = new Set([
  "the",
  "and",
  "with",
  "for",
  "that",
  "this",
  "from",
  "into",
  "before",
  "after",
  "names",
  "deals",
  "companies",
  "sector",
  "thesis",
  "looking",
  "want",
  "need",
  "best",
  "most",
  "relevant",
  "emerging",
]);

function tagFor(relevance: number, score: number, rec: string): RankedHit["tag"] {
  if (relevance >= 72 && (rec === "Deep Dive" || score >= 75)) return "prime";
  if (relevance >= 55 && score >= 65) return "emerging";
  if (relevance >= 40 || score >= 58) return "watch";
  return "stretch";
}

function peersFor(id: string, peers: PeerActivity[]) {
  return peers.filter((p) => p.company_id === id);
}

/* ─── On-demand thesis scan ─────────────────────────────────────────────── */

export function runThesisScan(
  query: string,
  companies: Company[],
  peers: PeerActivity[],
  sectors: SectorCall[],
): ThesisScan {
  const q = query.trim() || PRESET_THESES[0];
  const lower = q.toLowerCase();
  const theme = detectTheme(q);

  const stageHints: string[] = [];
  if (/seed|pre[- ]?seed/.test(lower)) stageHints.push("Seed");
  if (/series a|\ba\b/.test(lower) && !/series b/.test(lower)) stageHints.push("Series A");
  if (/series b|\bb\b/.test(lower)) stageHints.push("Series B");
  if (/growth|series c/.test(lower)) stageHints.push("Growth");

  const wantHiring = /hir(e|ing)|velocity|headcount|talent/.test(lower);
  const wantNoTier = /no tier|without tier|unbacked|under.?radar|quiet|thin tier|thin t1/.test(lower);
  const wantTier = /tier[- ]?1|sequoia|a16z|circling|crowded/.test(lower) && !wantNoTier;
  const wantTraction = /traction|yoy|growth|revenue/.test(lower);
  const wantContrarian = /contrarian|nobody|anti.?consensus|against|ignored|overlook/.test(lower);
  const wantWatch = /watch|skeleton|early/.test(lower);

  const signalFlags: string[] = [];
  if (wantHiring) signalFlags.push("Hiring velocity");
  if (wantNoTier) signalFlags.push("Thin / no Tier-1");
  if (wantTier) signalFlags.push("Tier-1 present");
  if (wantTraction) signalFlags.push("Traction / YoY");
  if (wantContrarian) signalFlags.push("Contrarian posture");
  if (wantWatch) signalFlags.push("Watch skeletons");

  let posture: ThesisScan["posture"] = "open";
  if (wantContrarian) posture = "contrarian";
  else if (/emerging|early|before consensus|before peer/.test(lower)) posture = "emerging";
  else if (wantTier || /crowded|race|bake.?off/.test(lower)) posture = "crowded";

  const pillars: ThesisPillar[] = [];
  if (theme) {
    pillars.push({
      id: "theme",
      label: "Theme",
      value: theme.name,
      weight: 92,
      source: "theme",
    });
  } else {
    pillars.push({
      id: "theme",
      label: "Theme",
      value: "Cross-theme (keyword match)",
      weight: 55,
      source: "theme",
    });
  }
  pillars.push({
    id: "stage",
    label: "Stage band",
    value: stageHints.length ? stageHints.join(" · ") : "Any stage",
    weight: stageHints.length ? 78 : 40,
    source: "stage",
  });
  pillars.push({
    id: "signals",
    label: "Signal filters",
    value: signalFlags.length ? signalFlags.join(" · ") : "Thesis language only",
    weight: signalFlags.length ? 70 + signalFlags.length * 5 : 35,
    source: "signal",
  });
  pillars.push({
    id: "posture",
    label: "Market posture",
    value: posture === "contrarian" ? "Against consensus" : posture === "emerging" ? "Pre-consensus" : posture === "crowded" ? "Crowded tape" : "Open search",
    weight: posture === "open" ? 45 : 85,
    source: "posture",
  });
  pillars.push({
    id: "bucket",
    label: "Mix lane",
    value: theme?.id?.startsWith("ai") || theme?.id === "defence" || theme?.id === "cybersecurity"
      ? "Dominant tech / growth lean"
      : "Tactical / opportunistic lean",
    weight: 62,
    source: "bucket",
  });

  const filters: string[] = [];
  if (theme) filters.push(`Theme: ${theme.name}`);
  if (stageHints.length) filters.push(`Stage: ${stageHints.join(", ")}`);
  for (const f of signalFlags) filters.push(f);
  if (posture !== "open") filters.push(`Posture: ${posture}`);

  // Score every company for relevance
  const scored: RankedHit[] = [];
  for (const c of companies) {
    const blob = companyBlob(c);
    const toks = tokenHits(q, blob);
    const score = c.thesis_score || 0;
    const rec = c.recommendation || "Watch";
    const peerCount = peersFor(c.id, peers).length;

    let relevance = 0;
    const why: string[] = [];
    const facets: MatchFacet[] = [];

    // Theme
    let themeHit = false;
    if (theme) {
      themeHit =
        c.theme_id === theme.id ||
        theme.keywords.some((kw) => blob.includes(kw)) ||
        (c.sector_theme || "").toLowerCase().includes(theme.name.toLowerCase().slice(0, 8));
      if (themeHit) {
        relevance += 34;
        why.push(`Theme fit · ${c.sector_theme || theme.name}`);
      }
      facets.push({
        key: "theme",
        label: "Theme",
        hit: themeHit,
        detail: themeHit ? c.subsector || c.sector_theme || theme.name : "Off theme",
      });
    } else {
      const soft = toks.length >= 2;
      if (soft) relevance += 18;
      facets.push({
        key: "theme",
        label: "Keywords",
        hit: soft,
        detail: toks.slice(0, 4).join(", ") || "Weak keyword overlap",
      });
    }

    // Tokens
    relevance += Math.min(22, toks.length * 4);
    if (toks.length) why.push(`Matched: ${toks.slice(0, 4).join(", ")}`);

    // Stage
    const sk = stageKey(c.stage);
    const stageHit = !stageHints.length || stageHints.includes(sk);
    if (stageHints.length) {
      if (stageHit) {
        relevance += 14;
        why.push(`Stage ${sk}`);
      } else {
        relevance -= 8;
      }
      facets.push({
        key: "stage",
        label: "Stage",
        hit: stageHit,
        detail: sk,
      });
    } else {
      facets.push({ key: "stage", label: "Stage", hit: true, detail: sk });
    }

    // Hiring
    const hiring = c.headcount_6m_growth_pct || 0;
    if (wantHiring) {
      const hit = hiring >= 20;
      if (hit) {
        relevance += 12;
        why.push(`Hiring +${hiring.toFixed(0)}% 6m`);
      }
      facets.push({
        key: "hiring",
        label: "Hiring",
        hit,
        detail: hiring ? `+${hiring.toFixed(0)}% 6m` : "No headcount signal",
      });
    }

    // Tier posture
    const t1 = c.tier1_count || 0;
    if (wantNoTier) {
      const hit = t1 <= 1;
      if (hit) {
        relevance += 12;
        why.push(t1 === 0 ? "No Tier-1 yet" : "Thin Tier-1");
      } else relevance -= 10;
      facets.push({
        key: "tier",
        label: "Cap table",
        hit,
        detail: `${t1} Tier-1`,
      });
    } else if (wantTier) {
      const hit = t1 >= 1;
      if (hit) {
        relevance += 10;
        why.push(`${t1} Tier-1 on cap`);
      }
      facets.push({
        key: "tier",
        label: "Cap table",
        hit,
        detail: `${t1} Tier-1`,
      });
    }

    // Traction
    if (wantTraction) {
      const yoy = c.yoy_growth_pct || 0;
      const hit = yoy >= 40;
      if (hit) {
        relevance += 10;
        why.push(`YoY ${yoy.toFixed(0)}%`);
      }
      facets.push({
        key: "traction",
        label: "Traction",
        hit,
        detail: yoy ? `${yoy.toFixed(0)}% YoY` : "No YoY",
      });
    }

    // Contrarian / quiet tape
    if (wantContrarian || posture === "contrarian" || posture === "emerging") {
      const quiet = peerCount <= 1;
      if (quiet && score >= 60) {
        relevance += 10;
        why.push("Quiet peer tape");
      }
      facets.push({
        key: "quiet",
        label: "Peer heat",
        hit: quiet,
        detail: `${peerCount} peer move${peerCount === 1 ? "" : "s"}`,
      });
    }

    // Watch filter
    if (wantWatch) {
      const hit = rec === "Watch" || (score >= 55 && score < 78);
      if (hit) relevance += 6;
      else relevance -= 4;
    }

    // Soft boost from absolute thesis quality
    relevance += clamp(score * 0.12, 0, 12);

    relevance = clamp(Math.round(relevance), 0, 100);
    if (relevance < 18 && !themeHit && toks.length < 1) continue;

    const composite = relevance * 0.62 + score * 0.38;
    const tag = tagFor(relevance, score, rec);

    // Constellation: x = relevance, y = thesis score (jittered)
    const jx = ((hash(c.id) % 7) - 3) * 1.2;
    const jy = ((hash(c.name) % 7) - 3) * 1.1;
    const x = clamp(8 + relevance * 0.84 + jx, 4, 96);
    const y = clamp(92 - score * 0.84 + jy, 6, 96);
    const size = 6 + (tag === "prime" ? 6 : tag === "emerging" ? 4 : 2);

    if (!why.length) why.push(c.why_now?.slice(0, 90) || c.one_liner || "Pipeline match");

    scored.push({
      company_id: c.id,
      name: c.name,
      slug: c.slug,
      one_liner: c.one_liner,
      sector_theme: c.sector_theme,
      subsector: c.subsector,
      stage: c.stage,
      thesis_score: Math.round(score),
      recommendation: rec,
      relative_rank: c.relative_rank,
      relevance,
      composite,
      why: why.slice(0, 4),
      facets,
      x,
      y,
      size,
      tag,
    });
  }

  scored.sort((a, b) => b.composite - a.composite || b.relevance - a.relevance);
  const hits = scored.slice(0, 24);
  const shortlist = hits.filter((h) => h.tag === "prime" || h.tag === "emerging").slice(0, 8);
  const displayShort = shortlist.length ? shortlist : hits.slice(0, 6);

  // Coverage radar — average facet hit rates + score dims from top hits
  const top = hits.slice(0, 8);
  const avg = (fn: (h: RankedHit) => number) =>
    top.length ? Math.round(top.reduce((s, h) => s + fn(h), 0) / top.length) : 0;
  const coverage: Record<string, number> = {
    Theme: avg((h) => (h.facets.find((f) => f.key === "theme")?.hit ? 85 : 35)),
    Stage: avg((h) => (h.facets.find((f) => f.key === "stage")?.hit ? 80 : 40)),
    Relevance: avg((h) => h.relevance),
    Thesis: avg((h) => h.thesis_score),
    Quiet: avg((h) => {
      const f = h.facets.find((x) => x.key === "quiet");
      if (!f) return 55;
      return f.hit ? 88 : 30;
    }),
    Traction: avg((h) => {
      const f = h.facets.find((x) => x.key === "traction" || x.key === "hiring");
      if (!f) return clamp(h.thesis_score * 0.7, 30, 90);
      return f.hit ? 82 : 38;
    }),
  };

  // Stage mix of hits
  const stageCounts = new Map<string, number>();
  for (const h of hits) {
    const k = stageKey(h.stage);
    stageCounts.set(k, (stageCounts.get(k) || 0) + 1);
  }
  const stageColors: Record<string, string> = {
    Seed: "var(--deep)",
    "Series A": "var(--signal)",
    "Series B": "var(--ok)",
    Growth: "var(--warn)",
    Unknown: "var(--faint)",
  };
  const totalStages = hits.length || 1;
  const stage_mix = [...stageCounts.entries()]
    .map(([label, n]) => ({
      label,
      pct: Math.round((n / totalStages) * 100),
      color: stageColors[label] || "var(--faint)",
    }))
    .sort((a, b) => b.pct - a.pct);

  // Sector overlap
  const sector_overlap = sectors
    .map((s) => {
      const blob = `${s.subsector} ${s.parent_theme} ${(s.top_companies || []).join(" ")}`.toLowerCase();
      let heat = s.heat_score || 0;
      if (theme && (s.parent_theme || "").toLowerCase().includes(theme.name.toLowerCase().slice(0, 6))) {
        heat += 8;
      }
      if (tokenHits(q, blob).length) heat += 6;
      return {
        subsector: s.subsector,
        heat: clamp(heat, 0, 100),
        consensus: s.consensus_level || "Emerging",
      };
    })
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 5);

  const funnel = [
    { label: "Pipeline", value: companies.length },
    { label: "Matched", value: scored.length },
    { label: "Shortlist", value: displayShort.length },
    { label: "Prime", value: hits.filter((h) => h.tag === "prime").length },
  ];

  const build_steps = [
    {
      id: "interpret",
      label: "Interpret thesis",
      detail: theme
        ? `Locked theme to ${theme.name}${stageHints.length ? ` · ${stageHints.join("/")}` : ""}`
        : "Cross-theme keyword parse — no single parent theme dominated",
    },
    {
      id: "blueprint",
      label: "Build blueprint",
      detail: `${pillars.length} pillars · posture ${posture}${signalFlags.length ? ` · ${signalFlags.length} signal filters` : ""}`,
    },
    {
      id: "match",
      label: "Match pipeline",
      detail: `${scored.length} companies cleared relevance floor from ${companies.length} scored names`,
    },
    {
      id: "rank",
      label: "Rank & counsel",
      detail: displayShort[0]
        ? `Lead: ${displayShort[0].name} (${displayShort[0].tag}, relevance ${displayShort[0].relevance})`
        : "No strong matches — widen thesis language or Refresh",
    },
  ];

  const counsel = displayShort[0]
    ? `Lead with ${displayShort[0].name} — relevance ${displayShort[0].relevance}, thesis ${displayShort[0].thesis_score}. ${
        hits.filter((h) => h.tag === "prime").length
      } prime fits on this thesis; ${
        sector_overlap[0] ? `nearest Sector of Tomorrow call is ${sector_overlap[0].subsector}.` : "no hot sector call overlap yet."
      }`
    : "Widen the thesis or Refresh the pipeline — nothing cleared the relevance floor.";

  return {
    query: q,
    interpreted_as: theme
      ? `Thesis scan · ${theme.name}${stageHints.length ? ` · ${stageHints.join("/")}` : ""}`
      : `Thesis scan · keyword landscape${stageHints.length ? ` · ${stageHints.join("/")}` : ""}`,
    pillars,
    filters: filters.length ? filters : ["Open keyword match ≥ relevance floor"],
    theme_id: theme?.id || null,
    theme_name: theme?.name || null,
    stage_hints: stageHints,
    signal_flags: signalFlags,
    posture,
    hits,
    shortlist: displayShort,
    coverage,
    stage_mix,
    sector_overlap,
    funnel,
    counsel,
    build_steps,
  };
}

/* ─── Proactive momentum ────────────────────────────────────────────────── */

function sparkFor(id: string, heat: number): number[] {
  const base = heat * 0.7;
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const wobble = ((hash(id + String(i)) % 21) - 10) * 0.9;
    return clamp(Math.round(base * (0.55 + i * 0.09) + wobble), 20, 100);
  });
}

export function buildMomentumPack(
  companies: Company[],
  peers: PeerActivity[],
  commentary: Commentary[],
  sectors: SectorCall[],
): MomentumPack {
  const peerHeat = new Map<string, number>();
  for (const p of peers) {
    if (!p.company_id) continue;
    peerHeat.set(p.company_id, (peerHeat.get(p.company_id) || 0) + 1);
  }
  const commentHeat = new Map<string, number>();
  for (const c of commentary) {
    if (!c.company_id) continue;
    commentHeat.set(c.company_id, (commentHeat.get(c.company_id) || 0) + 1);
  }

  const byName = new Map(companies.map((c) => [c.name.toLowerCase(), c]));

  const sectorsRanked: MomentumSector[] = sectors
    .map((s) => {
      const heat = s.heat_score || 0;
      const evidenceN = (s.evidence || []).length;
      const isContrarian = (s.consensus_level || "").toLowerCase() === "contrarian";
      // Momentum proxy: heat + evidence density + contrarian premium + hiring in named cos
      let mom = heat * 0.55 + evidenceN * 6 + (isContrarian ? 8 : 0);
      const named = (s.top_companies || [])
        .map((n) => byName.get(n.toLowerCase()))
        .filter(Boolean) as Company[];
      const avgHire =
        named.length
          ? named.reduce((a, c) => a + (c.headcount_6m_growth_pct || 0), 0) / named.length
          : 0;
      mom += clamp(avgHire * 0.15, 0, 12);
      mom += named.reduce((a, c) => a + (peerHeat.get(c.id) || 0) * 2, 0);

      const best_deals: RankedHit[] = named
        .map((c) => {
          const score = c.thesis_score || 0;
          const relevance = clamp(
            Math.round(score * 0.5 + (c.headcount_6m_growth_pct || 0) * 0.25 + heat * 0.15),
            0,
            100,
          );
          return {
            company_id: c.id,
            name: c.name,
            slug: c.slug,
            one_liner: c.one_liner,
            sector_theme: c.sector_theme,
            subsector: c.subsector,
            stage: c.stage,
            thesis_score: Math.round(score),
            recommendation: c.recommendation || "Watch",
            relative_rank: c.relative_rank,
            relevance,
            composite: relevance * 0.5 + score * 0.5,
            why: [
              c.why_now?.slice(0, 100) || `${s.subsector} momentum`,
              (c.headcount_6m_growth_pct || 0) >= 15
                ? `Hiring +${(c.headcount_6m_growth_pct || 0).toFixed(0)}% 6m`
                : null,
            ].filter(Boolean) as string[],
            facets: [],
            x: 50,
            y: 50,
            size: 8,
            tag: tagFor(relevance, score, c.recommendation || "Watch"),
          };
        })
        .sort((a, b) => b.composite - a.composite)
        .slice(0, 4);

      // Fill from theme-adjacent pipeline if named cos thin
      if (best_deals.length < 2) {
        const extras = companies
          .filter((c) => {
            const blob = `${c.sector_theme} ${c.subsector}`.toLowerCase();
            return (
              blob.includes((s.subsector || "").toLowerCase().slice(0, 8)) ||
              blob.includes((s.parent_theme || "").toLowerCase().slice(0, 8))
            );
          })
          .sort((a, b) => (b.thesis_score || 0) - (a.thesis_score || 0))
          .slice(0, 3 - best_deals.length);
        for (const c of extras) {
          if (best_deals.some((d) => d.company_id === c.id)) continue;
          const score = c.thesis_score || 0;
          best_deals.push({
            company_id: c.id,
            name: c.name,
            slug: c.slug,
            one_liner: c.one_liner,
            sector_theme: c.sector_theme,
            subsector: c.subsector,
            stage: c.stage,
            thesis_score: Math.round(score),
            recommendation: c.recommendation || "Watch",
            relative_rank: c.relative_rank,
            relevance: clamp(Math.round(score * 0.7 + heat * 0.2), 0, 100),
            composite: score,
            why: [c.why_now?.slice(0, 90) || `Adjacent to ${s.subsector}`],
            facets: [],
            x: 50,
            y: 50,
            size: 7,
            tag: tagFor(score, score, c.recommendation || "Watch"),
          });
        }
      }

      return {
        id: s.id,
        subsector: s.subsector,
        parent_theme: s.parent_theme,
        heat_score: heat,
        momentum: clamp(Math.round(mom), 0, 100),
        consensus_level: s.consensus_level,
        why: s.why_thirdbase_cares || "Heat rising on evidence density.",
        evidence: s.evidence || [],
        top_companies: s.top_companies || [],
        best_deals,
        spark: sparkFor(s.id, heat),
      };
    })
    .sort((a, b) => b.momentum - a.momentum);

  // Rising deals: high thesis + recent signal / hiring / commentary
  const rising_deals: RankedHit[] = companies
    .filter((c) => (c.thesis_score || 0) >= 60)
    .map((c) => {
      const score = c.thesis_score || 0;
      const hire = c.headcount_6m_growth_pct || 0;
      const ph = peerHeat.get(c.id) || 0;
      const ch = commentHeat.get(c.id) || 0;
      const velocity = clamp(hire * 0.4 + ph * 8 + ch * 5 + (score >= 75 ? 10 : 0), 0, 100);
      const relevance = Math.round(velocity);
      return {
        company_id: c.id,
        name: c.name,
        slug: c.slug,
        one_liner: c.one_liner,
        sector_theme: c.sector_theme,
        subsector: c.subsector,
        stage: c.stage,
        thesis_score: Math.round(score),
        recommendation: c.recommendation || "Watch",
        relative_rank: c.relative_rank,
        relevance,
        composite: velocity * 0.55 + score * 0.45,
        why: [
          hire >= 15 ? `Hiring +${hire.toFixed(0)}% 6m` : null,
          ph ? `${ph} peer move${ph === 1 ? "" : "s"}` : null,
          ch ? `${ch} commentary hit${ch === 1 ? "" : "s"}` : null,
          c.why_now?.slice(0, 80) || null,
        ].filter(Boolean) as string[],
        facets: [],
        x: 50,
        y: 50,
        size: 8,
        tag: tagFor(relevance, score, c.recommendation || "Watch"),
      };
    })
    .sort((a, b) => b.composite - a.composite)
    .slice(0, 10);

  const top = sectorsRanked[0];
  return {
    headline: top
      ? `${top.subsector} leading momentum (${top.momentum}) — ${rising_deals[0]?.name || "pipeline"} heating on tape`
      : "No sector calls yet — Refresh to populate Sector of Tomorrow.",
    sectors: sectorsRanked,
    rising_deals,
    counsel: top
      ? `Prioritize ${top.subsector}: ${top.best_deals[0]?.name || top.top_companies[0] || "named cos"} first. Momentum is evidence + hiring + peer heat — not vibes.`
      : "Seed sector_calls via refresh before proactive scan is useful.",
  };
}

/* ─── Contrarian ────────────────────────────────────────────────────────── */

export function buildContrarianPack(
  companies: Company[],
  peers: PeerActivity[],
  sectors: SectorCall[],
): ContrarianPack {
  const calls: ContrarianCall[] = [];

  for (const s of sectors.filter((x) => (x.consensus_level || "").toLowerCase() === "contrarian")) {
    calls.push({
      id: `sec_${s.id}`,
      kind: "sector",
      title: s.subsector,
      subtitle: s.parent_theme || "Theme",
      heat_or_score: s.heat_score || 0,
      consensus_vs: "Market consensus is elsewhere — heat without crowd",
      insight: s.why_thirdbase_cares || "Contrarian sector call with evidence.",
      action: "Scan Watch skeletons here before peer capital floods.",
      evidence: (s.evidence || []).slice(0, 3),
    });
  }

  // Emerging-but-hot as soft contrarian
  for (const s of sectors
    .filter((x) => (x.consensus_level || "").toLowerCase() === "emerging" && (x.heat_score || 0) >= 80)
    .slice(0, 2)) {
    if (calls.some((c) => c.id === `sec_${s.id}`)) continue;
    calls.push({
      id: `sec_${s.id}`,
      kind: "sector",
      title: s.subsector,
      subtitle: `${s.parent_theme || "Theme"} · Emerging`,
      heat_or_score: s.heat_score || 0,
      consensus_vs: "Emerging — consensus not formed yet",
      insight: s.why_thirdbase_cares || "Pre-consensus heat.",
      action: "Treat as Sector of Tomorrow — diligence one named company this week.",
      evidence: (s.evidence || []).slice(0, 3),
    });
  }

  // Quiet high-conviction deals
  for (const c of companies) {
    const score = c.thesis_score || 0;
    const rec = c.recommendation || "";
    if (score < 70 && rec !== "Deep Dive") continue;
    const peerCount = peers.filter((p) => p.company_id === c.id).length;
    if (peerCount > 1) continue;
    calls.push({
      id: `deal_${c.id}`,
      kind: "deal",
      title: c.name,
      subtitle: `${c.subsector || c.sector_theme || "Deal"} · ${c.stage || "stage?"}`,
      heat_or_score: Math.round(score),
      consensus_vs: peerCount === 0 ? "Zero peer moves logged" : "Single peer — still quiet tape",
      insight:
        c.why_now ||
        `High conviction (${score}) with almost no peer FOMO — proprietary window vs consensus.`,
      action: "Protect the window: partner touch this week before the tape heats.",
      evidence: [
        `Thesis ${score} · ${rec}`,
        c.relative_rank || "Unranked in theme×stage",
        `${c.tier1_count || 0} Tier-1 on cap`,
      ],
      company_id: c.id,
      slug: c.slug,
      recommendation: rec,
    });
  }

  // Crowded traps as "against your own FOMO"
  for (const c of companies) {
    const score = c.thesis_score || 0;
    const peerCount = peers.filter((p) => p.company_id === c.id).length;
    if (peerCount < 3) continue;
    if (score >= 78) continue; // real conviction ok
    if (score < 55) continue;
    calls.push({
      id: `trap_${c.id}`,
      kind: "deal",
      title: c.name,
      subtitle: "Consensus trap risk",
      heat_or_score: Math.round(score),
      consensus_vs: `${peerCount} peers circling — crowd ≠ thesis`,
      insight: `Peer heat outruns thesis score (${score}). Contrarian move may be Pass / kind-no.`,
      action: "Name the kill argument before chasing the bake-off.",
      evidence: [
        `${peerCount} peer firms on activity log`,
        `Rec ${c.recommendation || "—"}`,
        c.one_liner || "Pipeline name",
      ],
      company_id: c.id,
      slug: c.slug,
      recommendation: c.recommendation || undefined,
    });
  }

  calls.sort((a, b) => b.heat_or_score - a.heat_or_score);
  const sector_count = calls.filter((c) => c.kind === "sector").length;
  const deal_count = calls.filter((c) => c.kind === "deal").length;
  const lead = calls[0];

  return {
    headline: lead
      ? `Contrarian board: ${lead.title} (${lead.kind}) — ${sector_count} sectors, ${deal_count} deal edges`
      : "No contrarian edges yet — need sector_calls + quiet Deep Dives.",
    calls: calls.slice(0, 16),
    sector_count,
    deal_count,
    counsel: lead
      ? `Start with ${lead.title}: ${lead.action}`
      : "Refresh pipeline and sector enrichment to surface anti-consensus tape.",
  };
}

/* ─── Sector of Tomorrow foresight ──────────────────────────────────────── */

const CHANNEL_RULES: { id: EvidenceChannelId; patterns: RegExp[] }[] = [
  {
    id: "gp_commentary",
    patterns: [
      /\bgp\b/,
      /partner/,
      /watchlist/,
      /essay/,
      /chatter/,
      /elad/,
      /deedy/,
      /lp letter/,
      /commentary/,
    ],
  },
  {
    id: "frontier_hiring",
    patterns: [
      /frontier lab/,
      /hiring/,
      /headcount/,
      /roles?/,
      /talent/,
      /openai|anthropic|deepmind|lab(s)? posting/,
      /oem/,
    ],
  },
  {
    id: "founder_migration",
    patterns: [
      /founder/,
      /migration/,
      /leaving/,
      /operators?/,
      /ex[- ]/,
      /spin[- ]?out/,
      /newco/,
    ],
  },
  {
    id: "fund_formation",
    patterns: [
      /fund formation/,
      /mandate/,
      /vehicle/,
      /quiet fund/,
      /new fund/,
      /formation language/,
      /loi/,
      /capital/,
    ],
  },
  {
    id: "research_velocity",
    patterns: [
      /arxiv/,
      /research/,
      /open[- ]?source/,
      /oss/,
      /hn\b/,
      /contributor/,
      /paper/,
      /repo/,
      /quantization/,
      /methodology/,
    ],
  },
];

function classifyEvidenceLine(line: string): EvidenceChannelId[] {
  const lower = line.toLowerCase();
  const hits: EvidenceChannelId[] = [];
  for (const rule of CHANNEL_RULES) {
    if (rule.patterns.some((p) => p.test(lower))) hits.push(rule.id);
  }
  return hits.length ? hits : ["gp_commentary"];
}

function channelScoresForSector(
  sector: SectorCall,
  named: Company[],
): ChannelScore[] {
  const buckets = new Map<EvidenceChannelId, string[]>();
  for (const ch of EVIDENCE_CHANNELS) buckets.set(ch.id, []);

  for (const line of sector.evidence || []) {
    for (const id of classifyEvidenceLine(line)) {
      buckets.get(id)!.push(line);
    }
  }

  const avgHire =
    named.length
      ? named.reduce((a, c) => a + (c.headcount_6m_growth_pct || 0), 0) / named.length
      : 0;

  return EVIDENCE_CHANNELS.map((meta) => {
    const hits = buckets.get(meta.id) || [];
    let score = hits.length * 28;
    if (meta.id === "frontier_hiring") score += clamp(avgHire * 0.55, 0, 28);
    if (meta.id === "gp_commentary" && hits.length) score += 8;
    if (meta.id === "research_velocity" && hits.length >= 2) score += 10;
    // Soft floor so radar still reads when evidence is thin
    if (!hits.length && meta.id === "frontier_hiring" && avgHire >= 15) {
      score = clamp(avgHire * 0.7, 20, 55);
      hits.push(`Named cos hiring +${avgHire.toFixed(0)}% 6m (pipeline proxy)`);
    }
    return {
      id: meta.id,
      label: meta.label,
      short: meta.short,
      score: clamp(Math.round(score), 0, 100),
      hits: hits.slice(0, 3),
    };
  });
}

function stealthScore(sector: SectorCall): number {
  const c = (sector.consensus_level || "").toLowerCase();
  const heat = sector.heat_score || 0;
  let stealth = 40;
  if (c === "contrarian") stealth = 92;
  else if (c === "emerging") stealth = 74;
  else if (c === "consensus" || c === "crowded") stealth = 28;
  // High heat + contrarian/emerging = pre-consensus alpha
  stealth = clamp(Math.round(stealth * 0.7 + heat * 0.3), 0, 100);
  return stealth;
}

function dealsForSector(
  sector: SectorCall,
  companies: Company[],
  peers: PeerActivity[],
): RankedHit[] {
  const byName = new Map(companies.map((c) => [c.name.toLowerCase(), c]));
  const named = (sector.top_companies || [])
    .map((n) => byName.get(n.toLowerCase()))
    .filter(Boolean) as Company[];

  const hits: RankedHit[] = named.map((c) => {
    const score = c.thesis_score || 0;
    const peerN = peersFor(c.id, peers).length;
    const hire = c.headcount_6m_growth_pct || 0;
    const relevance = clamp(
      Math.round(score * 0.45 + hire * 0.25 + (sector.heat_score || 0) * 0.2 + (peerN === 0 ? 8 : 0)),
      0,
      100,
    );
    return {
      company_id: c.id,
      name: c.name,
      slug: c.slug,
      one_liner: c.one_liner,
      sector_theme: c.sector_theme,
      subsector: c.subsector || sector.subsector,
      stage: c.stage,
      thesis_score: Math.round(score),
      recommendation: c.recommendation || "Watch",
      relative_rank: c.relative_rank,
      relevance,
      composite: relevance * 0.55 + score * 0.45,
      why: [
        c.why_now?.slice(0, 100) || `${sector.subsector} — Sector of Tomorrow`,
        hire >= 15 ? `Hiring +${hire.toFixed(0)}% 6m` : null,
        peerN <= 1 ? "Quiet peer tape" : `${peerN} peers circling`,
      ].filter(Boolean) as string[],
      facets: [],
      x: 50,
      y: 50,
      size: 8,
      tag: tagFor(relevance, score, c.recommendation || "Watch"),
    };
  });

  // Theme-adjacent fill
  if (hits.length < 3) {
    const extras = companies
      .filter((c) => {
        const blob = `${c.sector_theme} ${c.subsector} ${c.one_liner}`.toLowerCase();
        const parent = (sector.parent_theme || "").toLowerCase().slice(0, 10);
        const sub = (sector.subsector || "").toLowerCase().slice(0, 10);
        return (
          (parent && blob.includes(parent)) ||
          (sub && blob.includes(sub)) ||
          blob.includes("ai infra") ||
          blob.includes("eval") ||
          blob.includes("agent")
        );
      })
      .filter((c) => !hits.some((h) => h.company_id === c.id))
      .sort((a, b) => (b.thesis_score || 0) - (a.thesis_score || 0))
      .slice(0, 3 - hits.length);

    for (const c of extras) {
      const score = c.thesis_score || 0;
      hits.push({
        company_id: c.id,
        name: c.name,
        slug: c.slug,
        one_liner: c.one_liner,
        sector_theme: c.sector_theme,
        subsector: c.subsector || sector.subsector,
        stage: c.stage,
        thesis_score: Math.round(score),
        recommendation: c.recommendation || "Watch",
        relative_rank: c.relative_rank,
        relevance: clamp(Math.round(score * 0.75), 0, 100),
        composite: score,
        why: [c.why_now?.slice(0, 90) || `Adjacent to ${sector.subsector}`],
        facets: [],
        x: 50,
        y: 50,
        size: 7,
        tag: tagFor(score, score, c.recommendation || "Watch"),
      });
    }
  }

  return hits.sort((a, b) => b.composite - a.composite).slice(0, 4);
}

function quarterLabel(d = new Date()): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

function isAiInfraParent(theme?: string | null): boolean {
  const t = (theme || "").toLowerCase();
  return t.includes("ai infrastructure") || t.includes("ai-native") || t.includes("compute stack");
}

export function buildForesightPack(
  companies: Company[],
  peers: PeerActivity[],
  commentary: Commentary[],
  sectors: SectorCall[],
  question?: string,
): ForesightPack {
  const q = (question || CANONICAL_FORESIGHT_QUESTION).trim();
  const byName = new Map(companies.map((c) => [c.name.toLowerCase(), c]));
  const peerHeat = new Map<string, number>();
  for (const p of peers) {
    if (!p.company_id) continue;
    peerHeat.set(p.company_id, (peerHeat.get(p.company_id) || 0) + 1);
  }

  const aiPool = sectors.filter((s) => isAiInfraParent(s.parent_theme));
  const pool = aiPool.length >= 3 ? aiPool : sectors;

  const ranked = [...pool]
    .map((s) => {
      const named = (s.top_companies || [])
        .map((n) => byName.get(n.toLowerCase()))
        .filter(Boolean) as Company[];
      const channels = channelScoresForSector(s, named);
      const channelAvg =
        channels.reduce((a, c) => a + c.score, 0) / Math.max(channels.length, 1);
      const stealth = stealthScore(s);
      const heat = s.heat_score || 0;
      const preConsensusBoost =
        (s.consensus_level || "").toLowerCase() === "contrarian"
          ? 18
          : (s.consensus_level || "").toLowerCase() === "emerging"
            ? 10
            : 0;
      const foresight = clamp(
        Math.round(stealth * 0.4 + heat * 0.35 + channelAvg * 0.25 + preConsensusBoost),
        0,
        100,
      );
      return { sector: s, named, channels, stealth, foresight };
    })
    .sort((a, b) => b.foresight - a.foresight || b.stealth - a.stealth);

  const top = ranked.slice(0, 3);

  const top_three: EmergingCall[] = top.map((row, i) => {
      const best = dealsForSector(row.sector, companies, peers);
    const radar: Record<string, number> = {};
    for (const ch of row.channels) radar[ch.short] = ch.score;
    return {
      rank: i + 1,
      id: row.sector.id,
      subsector: row.sector.subsector,
      parent_theme: row.sector.parent_theme,
      heat_score: row.sector.heat_score || 0,
      stealth_score: row.stealth,
      consensus_level: row.sector.consensus_level,
      why: row.sector.why_thirdbase_cares || "Pre-consensus heat with multi-channel evidence.",
      why_pre_consensus:
        (row.sector.consensus_level || "").toLowerCase() === "contrarian"
          ? "Contrarian consensus label — capital narrative still elsewhere."
          : "Emerging — peer FOMO not yet formed; evidence density rising.",
      action: best[0]
        ? `Diligence ${best[0].name} this week as the wedge into ${row.sector.subsector}.`
        : `Map Watch skeletons in ${row.sector.subsector} before Tier-1 floods.`,
      evidence: row.sector.evidence || [],
      channel_scores: row.channels,
      channel_radar: radar,
      best_companies: best,
      spark: sparkFor(row.sector.id, row.sector.heat_score || 50),
    };
  });

  // Attention flows across capital / talent / founder
  const flowSource = ranked.slice(0, 6);
  let capitalRaw = 0;
  let talentRaw = 0;
  let founderRaw = 0;
  const attention = flowSource.map((row) => {
    const ch = row.channels;
    const fund = ch.find((c) => c.id === "fund_formation")?.score || 0;
    const gp = ch.find((c) => c.id === "gp_commentary")?.score || 0;
    const hire = ch.find((c) => c.id === "frontier_hiring")?.score || 0;
    const mig = ch.find((c) => c.id === "founder_migration")?.score || 0;
    const peerBoost = row.named.reduce((a, c) => a + (peerHeat.get(c.id) || 0) * 6, 0);
    const capital = clamp(
      Math.round(fund * 0.55 + gp * 0.25 + peerBoost + (row.sector.heat_score || 0) * 0.15),
      0,
      100,
    );
    const talent = clamp(
      Math.round(
        hire * 0.65 +
          (row.named.reduce((a, c) => a + (c.headcount_6m_growth_pct || 0), 0) /
            Math.max(row.named.length, 1)) *
            0.35,
      ),
      0,
      100,
    );
    const founder = clamp(Math.round(mig * 0.7 + gp * 0.2 + (commentary.length ? 8 : 0)), 0, 100);
    capitalRaw += capital;
    talentRaw += talent;
    founderRaw += founder;
    return {
      label: row.sector.subsector,
      capital,
      talent,
      founder,
    };
  });

  const n = Math.max(attention.length, 1);
  const capitalScore = Math.round(capitalRaw / n);
  const talentScore = Math.round(talentRaw / n);
  const founderScore = Math.round(founderRaw / n);

  const seriesFor = (base: number, seed: string) =>
    ["W-8", "W-6", "W-4", "W-2", "Now"].map((label, i) => ({
      label,
      value: clamp(
        Math.round(base * (0.55 + i * 0.1) + ((hash(seed + label) % 17) - 8)),
        15,
        100,
      ),
    }));

  const flows: FlowLane[] = [
    {
      id: "capital",
      label: "Capital",
      score: capitalScore,
      delta: clamp(Math.round((capitalScore - 55) * 0.4), -12, 18),
      series: seriesFor(capitalScore, "cap"),
      detail: "Fund formation language + peer checks + GP watchlist heat",
      drivers: attention
        .slice(0, 3)
        .sort((a, b) => b.capital - a.capital)
        .map((a) => a.label),
    },
    {
      id: "talent",
      label: "Talent",
      score: talentScore,
      delta: clamp(Math.round((talentScore - 52) * 0.45), -12, 18),
      series: seriesFor(talentScore, "tal"),
      detail: "Frontier-lab role velocity + named-company headcount growth",
      drivers: attention
        .slice(0, 3)
        .sort((a, b) => b.talent - a.talent)
        .map((a) => a.label),
    },
    {
      id: "founder",
      label: "Founder attention",
      score: founderScore,
      delta: clamp(Math.round((founderScore - 48) * 0.5), -12, 18),
      series: seriesFor(founderScore, "fou"),
      detail: "Founder migration patterns + GP chatter on who is spinning out",
      drivers: attention
        .slice(0, 3)
        .sort((a, b) => b.founder - a.founder)
        .map((a) => a.label),
    },
  ];

  const channel_totals: ChannelScore[] = EVIDENCE_CHANNELS.map((meta) => {
    const scores = top_three.map(
      (t) => t.channel_scores.find((c) => c.id === meta.id)?.score || 0,
    );
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const hits = top_three
      .flatMap((t) => t.channel_scores.find((c) => c.id === meta.id)?.hits || [])
      .slice(0, 3);
    return {
      id: meta.id,
      label: meta.label,
      short: meta.short,
      score: avg,
      hits,
    };
  });

  const channel_matrix = {
    sector_labels: top_three.map((t) => t.subsector),
    channel_labels: EVIDENCE_CHANNELS.map((c) => c.label),
    channel_shorts: EVIDENCE_CHANNELS.map((c) => c.short),
    cells: top_three.map((t) =>
      EVIDENCE_CHANNELS.map((c) => t.channel_scores.find((x) => x.id === c.id)?.score || 0),
    ),
  };

  const must_diligence = top_three
    .flatMap((t) => t.best_companies.slice(0, 1))
    .filter((h, i, arr) => arr.findIndex((x) => x.company_id === h.company_id) === i)
    .slice(0, 5);

  const lead = top_three[0];
  const headline = lead
    ? `${quarterLabel()} · Top emerging: ${top_three.map((t) => t.subsector).join(" · ")}`
    : "No sector calls yet — Refresh to populate Sector of Tomorrow.";

  const counsel = lead
    ? `Nobody-talking filter on AI infra: lead with ${lead.subsector} (stealth ${lead.stealth_score}). Best wedge: ${
        lead.best_companies[0]?.name || lead.subsector
      }. Evidence blends GP commentary, frontier hiring, founder migration, fund formation, and research velocity — not vibes.`
    : "Seed sector_calls via Refresh before foresight is useful.";

  return {
    question: q,
    headline,
    counsel,
    quarter_label: quarterLabel(),
    parent_filter: aiPool.length >= 3 ? "AI Infrastructure & Compute Stack" : "All themes",
    top_three,
    flows,
    channel_totals,
    channel_matrix,
    attention,
    must_diligence,
  };
}

export function formatForesightMarkdown(pack: ForesightPack): string {
  return [
    `# Knows the sector of tomorrow — ${pack.quarter_label}`,
    "",
    `> ${pack.question}`,
    "",
    pack.counsel,
    "",
    "## Three emerging sub-sectors (pre-consensus)",
    ...pack.top_three.flatMap((t) => [
      `### ${t.rank}. ${t.subsector}`,
      `- Consensus: ${t.consensus_level || "—"} · Heat ${t.heat_score} · Stealth ${t.stealth_score}`,
      `- Why: ${t.why}`,
      `- Pre-consensus: ${t.why_pre_consensus}`,
      `- Evidence channels: ${t.channel_scores.map((c) => `${c.short} ${c.score}`).join(" · ")}`,
      `- Best companies: ${t.best_companies.map((c) => `${c.name} (${c.thesis_score})`).join(", ") || "—"}`,
      `- Action: ${t.action}`,
      "",
    ]),
    "## Attention flows",
    ...pack.flows.map(
      (f) =>
        `- **${f.label}:** ${f.score} (${f.delta >= 0 ? "+" : ""}${f.delta}) — ${f.detail}`,
    ),
    "",
    "_Signal · Knows the sector of tomorrow_",
  ].join("\n");
}

/* ─── Pack ──────────────────────────────────────────────────────────────── */

export function buildSectorScanPack(
  companies: Company[],
  peers: PeerActivity[],
  commentary: Commentary[],
  sectors: SectorCall[],
  thesisQuery?: string,
): SectorScanPack {
  const foresight = buildForesightPack(companies, peers, commentary, sectors);
  const default_scan = runThesisScan(
    thesisQuery && thesisQuery !== CANONICAL_FORESIGHT_QUESTION
      ? thesisQuery
      : PRESET_THESES[1],
    companies,
    peers,
    sectors,
  );
  const momentum = buildMomentumPack(companies, peers, commentary, sectors);
  const contrarian = buildContrarianPack(companies, peers, sectors);

  const hot = momentum.sectors.filter((s) => s.momentum >= 70).length;
  const contrarianN = sectors.filter(
    (s) => (s.consensus_level || "").toLowerCase() === "contrarian",
  ).length;

  const must_do: string[] = [];
  if (foresight.top_three[0]) {
    must_do.push(`Tomorrow: ${foresight.top_three[0].subsector}`);
  }
  if (foresight.must_diligence[0]) {
    must_do.push(`Wedge: ${foresight.must_diligence[0].name}`);
  }
  if (momentum.sectors[0]) {
    must_do.push(`Momentum: ${momentum.sectors[0].subsector}`);
  }
  if (contrarian.calls[0]) {
    must_do.push(`Contrarian: ${contrarian.calls[0].title}`);
  }
  if (!must_do.length) must_do.push("Refresh to populate Sector of Tomorrow calls");

  return {
    summary: {
      headline: foresight.top_three.length
        ? `Knows the sector of tomorrow · ${foresight.top_three.length} pre-consensus calls · ${hot} hot`
        : `Sector scan · ${sectors.length} calls · ${hot} hot · ${contrarianN} contrarian`,
      must_do: must_do.slice(0, 4),
      sector_count: sectors.length,
      contrarian_count: contrarianN,
      hot_count: hot,
    },
    foresight,
    default_scan,
    momentum,
    contrarian,
  };
}

export function formatThesisScanMarkdown(scan: ThesisScan): string {
  return [
    `# Sector scan — ${scan.interpreted_as}`,
    "",
    `> ${scan.query}`,
    "",
    scan.counsel,
    "",
    "## Blueprint",
    ...scan.pillars.map((p) => `- **${p.label}:** ${p.value}`),
    "",
    "## Ranked shortlist",
    ...scan.shortlist.map(
      (h, i) =>
        `${i + 1}. **${h.name}** — relevance ${h.relevance} · thesis ${h.thesis_score} · ${h.recommendation}\n   - ${h.why.join("; ")}`,
    ),
    "",
    "_Signal Sector Scanner · on-demand thesis → ranked emerging companies_",
  ].join("\n");
}
