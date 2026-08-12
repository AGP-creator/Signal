/**
 * Signal Atlas — competitive response to Harmonic Scout (NL market maps + talent),
 * Affinity Ascend (warm paths), Meridia/VCOS Pulse (portfolio board prep),
 * and Bessemer Atlas (growth benchmark bands).
 * Deterministic, grounded in pipeline facts — demo network is labeled as simulated.
 */

import { THEME_HINTS } from "@/lib/thesis";
import type {
  AlertItem,
  Commentary,
  Company,
  NewsItem,
  PeerActivity,
  SectorCall,
} from "@/lib/types";

/* ─── types ─────────────────────────────────────────────────────────────── */

export type MapNode = {
  company_id: string;
  name: string;
  slug?: string | null;
  stage: string;
  subsector: string;
  theme: string;
  thesis_score: number;
  recommendation: string;
  x: number;
  y: number;
  size: number;
  hiring_velocity: number;
  peer_heat: number;
  tag: "leader" | "challenger" | "emerging" | "watch";
  why: string;
};

export type MapCluster = {
  id: string;
  label: string;
  count: number;
  avg_score: number;
  white_space: boolean;
  note: string;
};

export type MarketMap = {
  query: string;
  interpreted_as: string;
  filters: string[];
  nodes: MapNode[];
  clusters: MapCluster[];
  shortlist: MapNode[];
  white_space: string[];
  counsel: string;
  inspired_by: string;
};

export type WarmPathHop = {
  person: string;
  role: string;
  firm: string;
  strength: number;
  why: string;
};

export type WarmPath = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  target: string;
  target_role: string;
  strength: number;
  grade: "A" | "B" | "C";
  hops: WarmPathHop[];
  draft_ask: string;
  provenance: string;
};

export type PulseSeverity = "critical" | "high" | "medium" | "watch";

export type PortfolioPulseItem = {
  id: string;
  company_id: string;
  company_name: string;
  slug?: string | null;
  kind: "hiring" | "runway" | "competitive" | "product" | "board" | "talent";
  severity: PulseSeverity;
  title: string;
  body: string;
  board_ask: string;
  age_label: string;
};

export type GrowthBand = {
  stage: string;
  yoy_floor: number;
  yoy_median: number;
  yoy_top: number;
  headcount_median: number;
  label: string;
};

export type BandPlacement = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  stage: string;
  yoy: number | null;
  headcount: number | null;
  band: GrowthBand;
  posture: "above_top" | "above_median" | "on_band" | "below_floor" | "unknown";
  pct_of_median: number | null;
  counsel: string;
};

export type TalentNode = {
  id: string;
  name: string;
  prior: string;
  signal: string;
  company_id?: string;
  company_name?: string;
  slug?: string | null;
  heat: number;
  action: string;
};

export type RaiseWindow = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  window: "open_now" | "30_60d" | "60_120d" | "quiet" | "oversubscribed";
  score: number;
  runway_months: number | null;
  months_since_round: number | null;
  drivers: string[];
  counsel: string;
};

export type OwnershipScenario = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  pre_money_m: number | null;
  check_m: number;
  ownership_pct: number;
  post_money_m: number | null;
  diluted_next_round_pct: number;
  target_ownership: number;
  gap_to_target: number;
  counsel: string;
  assumptions: string[];
};

export type AtlasPack = {
  summary: {
    headline: string;
    must_do: string[];
    map_count: number;
    warm_a_paths: number;
    pulse_critical: number;
    raise_open: number;
  };
  default_map: MarketMap;
  warm_paths: WarmPath[];
  pulse: PortfolioPulseItem[];
  bands: BandPlacement[];
  talent: TalentNode[];
  raise_windows: RaiseWindow[];
  ownership: OwnershipScenario[];
};

/* ─── helpers ───────────────────────────────────────────────────────────── */

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function monthsSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24 * 30.4));
}

function stageKey(stage?: string | null): string {
  const s = (stage || "").toLowerCase();
  if (s.includes("seed") || s.includes("pre")) return "Seed";
  if (s.includes("a") && !s.includes("b")) return "Series A";
  if (s.includes("b")) return "Series B";
  if (s.includes("c") || s.includes("growth") || s.includes("d")) return "Growth";
  return stage || "Unknown";
}

const GROWTH_BANDS: GrowthBand[] = [
  { stage: "Seed", yoy_floor: 80, yoy_median: 150, yoy_top: 300, headcount_median: 18, label: "Seed · find PMF" },
  { stage: "Series A", yoy_floor: 60, yoy_median: 120, yoy_top: 200, headcount_median: 45, label: "A · scale GTM" },
  { stage: "Series B", yoy_floor: 40, yoy_median: 80, yoy_top: 140, headcount_median: 120, label: "B · category race" },
  { stage: "Growth", yoy_floor: 25, yoy_median: 45, yoy_top: 80, headcount_median: 280, label: "Growth · efficiency" },
];

export function bandForStage(stage?: string | null): GrowthBand {
  const key = stageKey(stage);
  return GROWTH_BANDS.find((b) => b.stage === key) || GROWTH_BANDS[2];
}

/** Simulated Thirdbase relationship graph for demo warm paths (Affinity Ascend response). */
const FIRM_NETWORK: { person: string; role: string; firm: string; themes: string[]; peers: string[] }[] = [
  { person: "Priya Shah", role: "Partner", firm: "Thirdbase", themes: ["ai_infra", "ai_native_stack"], peers: ["a16z", "Sequoia", "Greylock"] },
  { person: "Marcus Chen", role: "Partner", firm: "Thirdbase", themes: ["cybersecurity", "defence"], peers: ["Founders Fund", "Lux Capital", "8VC"] },
  { person: "Elena Vargas", role: "Principal", firm: "Thirdbase", themes: ["fintech", "ai_copilots"], peers: ["Ribbit Capital", "Index Ventures", "Bessemer"] },
  { person: "Jordan Hale", role: "Partner", firm: "Thirdbase", themes: ["robotics", "energy", "materials"], peers: ["Lux Capital", "Breakthrough", "Coatue"] },
  { person: "Sam Okonkwo", role: "Principal", firm: "Thirdbase", themes: ["biotech", "voice_multimodal"], peers: ["a16z", "GV", "Thrive Capital"] },
  { person: "Alex Rivera", role: "Venture Partner", firm: "Thirdbase", themes: ["ai_infra", "cybersecurity"], peers: ["Lightspeed", "Insight Partners", "NEA"] },
];

const PRESET_MAP_QUERIES = [
  "Map AI infra with hiring velocity and no Tier-1 yet",
  "Cybersecurity Series A–B with Tier-1 circling",
  "Defence tech quiet tape before peer FOMO",
  "Fintech growth names above Bessemer median YoY",
  "Robotics / physical AI emerging challengers",
];

export { PRESET_MAP_QUERIES };

/* ─── Market Map (Harmonic Scout) ───────────────────────────────────────── */

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

/** Prefer explicit theme tags — avoid keyword bleed (e.g. OpenAI → defence via "autonomous"). */
function companyMatchesTheme(c: Company, theme: (typeof THEME_HINTS)[number]): boolean {
  if (c.theme_id === theme.id) return true;
  const sector = (c.sector_theme || "").toLowerCase();
  if (sector.includes(theme.name.toLowerCase().slice(0, 8))) return true;
  if (c.theme_id && c.theme_id !== theme.id) return false;
  const blob = `${c.subsector || ""} ${c.one_liner || ""}`.toLowerCase();
  return theme.keywords.some((kw) => blob.includes(kw));
}

export function buildMarketMap(
  query: string,
  companies: Company[],
  peers: PeerActivity[],
  sectors: SectorCall[],
): MarketMap {
  const q = query.trim() || PRESET_MAP_QUERIES[0];
  const lower = q.toLowerCase();
  const theme = detectTheme(q);
  const wantHiring = /hir(e|ing)|velocity|headcount|talent/.test(lower);
  const wantNoTier = /no tier|without tier|unbacked|under.?radar|quiet|thin tier|thin t1/.test(lower);
  const wantTier = /tier[- ]?1|sequoia|a16z|circling|crowded/.test(lower) && !wantNoTier;
  const wantGrowth = /growth|yoy|bessemer|median|above/.test(lower);
  const stageHints: string[] = [];
  if (/seed|pre[- ]?seed/.test(lower)) stageHints.push("Seed");
  if (/series a|\ba\b/.test(lower) && !/series b/.test(lower)) stageHints.push("Series A");
  if (/series b|\bb\b/.test(lower)) stageHints.push("Series B");
  if (/growth|series c/.test(lower)) stageHints.push("Growth");

  const filters: string[] = [];
  if (theme) filters.push(`Theme: ${theme.name}`);
  if (stageHints.length) filters.push(`Stage: ${stageHints.join(", ")}`);
  if (wantHiring) filters.push("Hiring velocity prioritized");
  if (wantNoTier) filters.push("No / low Tier-1");
  if (wantTier) filters.push("Tier-1 present or circling");
  if (wantGrowth) filters.push("YoY vs growth bands");

  const peerHeat = new Map<string, number>();
  for (const p of peers) {
    if (!p.company_id) continue;
    peerHeat.set(p.company_id, (peerHeat.get(p.company_id) || 0) + 1);
  }

  let pool = companies.filter((c) => (c.thesis_score || 0) >= 55);
  let quietRelaxed = false;
  if (theme) {
    const themed = pool.filter((c) => companyMatchesTheme(c, theme));
    if (themed.length >= 1) pool = themed;
  }
  if (stageHints.length) {
    const staged = pool.filter((c) => stageHints.includes(stageKey(c.stage)));
    if (staged.length >= 2) pool = staged;
  }
  if (wantNoTier) {
    const quiet = pool.filter((c) => (c.tier1_count || 0) <= 1);
    if (quiet.length >= 2) pool = quiet;
    else quietRelaxed = quiet.length < pool.length;
  } else if (wantTier) {
    const t = pool.filter((c) => (c.tier1_count || 0) >= 1 || (peerHeat.get(c.id) || 0) >= 1);
    if (t.length >= 2) pool = t;
  }

  const scored = pool
    .map((c) => {
      const hiring = c.headcount_6m_growth_pct ?? 0;
      const heat = peerHeat.get(c.id) || 0;
      const score = c.thesis_score || 0;
      let rank = score + hiring * 0.15 + heat * 4;
      if (wantHiring) rank += hiring * 0.35;
      if (wantGrowth && (c.yoy_growth_pct || 0) > bandForStage(c.stage).yoy_median) rank += 12;
      if (wantNoTier && (c.tier1_count || 0) === 0) rank += 8;
      if (wantNoTier && (c.tier1_count || 0) <= 1) rank += 6;
      const relevance = clamp(
        Math.round(
          (theme && companyMatchesTheme(c, theme) ? 34 : 0) +
            (wantNoTier && (c.tier1_count || 0) <= 1 ? 14 : 0) +
            Math.min(22, score * 0.22) +
            Math.min(12, hiring * 0.12),
        ),
        0,
        100,
      );
      return { c, rank, hiring, heat, relevance, score };
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 24);

  const subsectors = Array.from(
    new Set(scored.map((s) => s.c.subsector || s.c.sector_theme || "General")),
  );
  const clusters: MapCluster[] = subsectors.map((label, i) => {
    const members = scored.filter(
      (s) => (s.c.subsector || s.c.sector_theme || "General") === label,
    );
    const avg = members.reduce((a, m) => a + (m.c.thesis_score || 0), 0) / Math.max(1, members.length);
    const white = members.every((m) => (peerHeat.get(m.c.id) || 0) === 0);
    return {
      id: `cl_${i}`,
      label,
      count: members.length,
      avg_score: Math.round(avg),
      white_space: white,
      note: white
        ? "Quiet tape — peers not yet crowded"
        : `${members.filter((m) => (peerHeat.get(m.c.id) || 0) > 0).length} with peer heat`,
    };
  });

  const nodes: MapNode[] = scored.map((s) => {
    const sub = s.c.subsector || s.c.sector_theme || "General";
    const jx = ((hash(s.c.id) % 7) - 3) * 1.4;
    const jy = ((hash(s.c.name) % 7) - 3) * 1.2;
    const x = clamp(8 + s.relevance * 0.84 + jx, 6, 94);
    const y = clamp(92 - s.score * 0.78 + jy, 8, 92);
    const score = s.score;
    let tag: MapNode["tag"] = "watch";
    if (score >= 82 && s.heat === 0) tag = "leader";
    else if (score >= 75) tag = "challenger";
    else if (s.hiring >= 25 || score >= 68) tag = "emerging";
    return {
      company_id: s.c.id,
      name: s.c.name,
      slug: s.c.slug,
      stage: stageKey(s.c.stage),
      subsector: sub,
      theme: s.c.sector_theme || theme?.name || "Thesis",
      thesis_score: score,
      recommendation: s.c.recommendation || "Watch",
      x,
      y,
      size: clamp(10 + score / 8 + s.hiring / 20, 12, 28),
      hiring_velocity: s.hiring,
      peer_heat: s.heat,
      tag,
      why:
        s.c.why_now ||
        s.c.one_liner ||
        `${s.c.relative_rank || "Unranked"} · Tier-1 ${s.c.tier1_count || 0}`,
    };
  });

  const shortlist = [...nodes]
    .sort((a, b) => b.thesis_score - a.thesis_score)
    .slice(0, 8);

  const white_space = clusters.filter((c) => c.white_space).map((c) => c.label);
  const sectorBoost = sectors
    .filter((s) => !theme || (s.parent_theme || "").toLowerCase().includes((theme.name || "").toLowerCase().slice(0, 6)))
    .slice(0, 2)
    .map((s) => s.subsector);

  return {
    query: q,
    interpreted_as: theme
      ? `Thesis map · ${theme.name}${stageHints.length ? ` · ${stageHints.join("/")}` : ""}`
      : `Cross-thesis map${stageHints.length ? ` · ${stageHints.join("/")}` : ""}`,
    filters: filters.length ? filters : ["All active pipeline ≥55"],
    nodes,
    clusters,
    shortlist,
    white_space: white_space.length ? white_space : sectorBoost,
    counsel: shortlist[0]
      ? `Lead with ${shortlist[0].name} (${shortlist[0].tag}) — ${shortlist.filter((n) => n.tag === "leader" || n.tag === "emerging").length} proprietary-leaning nodes on this map.${
          quietRelaxed
            ? " Quiet-tape filter had no matches — showing full theme pool (Tier-1 present on book)."
            : ""
        }`
      : quietRelaxed
        ? "Quiet-tape filter removed all matches — widen stage band or Refresh pipeline."
        : "Widen the query or Refresh the pipeline.",
    inspired_by: "Harmonic Scout · Affinity Market Map skill",
  };
}

/* ─── Warm Paths (Affinity Ascend) ──────────────────────────────────────── */

export function buildWarmPaths(
  companies: Company[],
  peers: PeerActivity[],
): WarmPath[] {
  const deep = companies
    .filter((c) => c.recommendation === "Deep Dive" || (c.thesis_score || 0) >= 72)
    .slice(0, 12);

  const paths: WarmPath[] = [];
  for (const c of deep) {
    const themeId =
      THEME_HINTS.find((t) => t.id === c.theme_id)?.id ||
      THEME_HINTS.find((t) =>
        (c.sector_theme || "").toLowerCase().includes(t.name.toLowerCase().slice(0, 8)),
      )?.id;

    const partners = FIRM_NETWORK.filter(
      (p) => !themeId || p.themes.includes(themeId) || p.themes.some((t) => (c.theme_id || "").includes(t)),
    );
    const investorHits = [...(c.tier1_names || []), ...(c.investors || [])].slice(0, 4);
    const peerHits = peers.filter((p) => p.company_id === c.id).map((p) => p.firm);

    const bridgePartner = partners[hash(c.id) % Math.max(1, partners.length)] || FIRM_NETWORK[0];
    const coInvest = investorHits[0] || peerHits[0] || bridgePartner.peers[0];

    const hops: WarmPathHop[] = [
      {
        person: bridgePartner.person,
        role: bridgePartner.role,
        firm: "Thirdbase",
        strength: 92,
        why: `Owns ${c.sector_theme || "this theme"} at Thirdbase`,
      },
      {
        person: coInvest.includes(" ") ? `${coInvest.split(" ")[0]} contact` : `${coInvest} partner`,
        role: "Partner",
        firm: coInvest,
        strength: investorHits.length ? 78 : peerHits.length ? 70 : 55,
        why: investorHits.length
          ? `Already on ${c.name} cap table / circling`
          : peerHits.length
            ? `Peer activity on ${c.name}`
            : `Known ${c.sector_theme || "sector"} overlap`,
      },
      {
        person: c.team_notes?.match(/[A-Z][a-z]+ [A-Z][a-z]+/)?.[0] || "Founding CEO",
        role: "Founder",
        firm: c.name,
        strength: 88,
        why: "Decision maker for process / data room",
      },
    ];

    const strength = Math.round(
      hops.reduce((a, h) => a + h.strength, 0) / hops.length +
        (c.tier1_count || 0) * 2 +
        (peerHits.length ? 4 : 0),
    );
    const grade: WarmPath["grade"] = strength >= 82 ? "A" : strength >= 70 ? "B" : "C";

    paths.push({
      company_id: c.id,
      company_name: c.name,
      slug: c.slug,
      target: hops[hops.length - 1].person,
      target_role: "Founder / CEO",
      strength: clamp(strength, 40, 98),
      grade,
      hops,
      draft_ask: [
        `Hi ${hops[1].person.split(" ")[0]} —`,
        ``,
        `We're deep on ${c.name} (${c.sector_theme || "thesis fit"}, score ${c.thesis_score}).`,
        `Would you be open to a warm intro to ${hops[2].person}? Happy to share our IC brief + diligence questions first.`,
        ``,
        `— ${bridgePartner.person}`,
      ].join("\n"),
      provenance:
        "Simulated Thirdbase relationship graph for demo · Affinity writeback is Phase 2 (never auto-sends)",
    });
  }

  return paths.sort((a, b) => b.strength - a.strength);
}

/* ─── Portfolio Pulse (Meridia / VCOS) ──────────────────────────────────── */

export function buildPortfolioPulse(
  companies: Company[],
  commentary: Commentary[],
  alerts: AlertItem[],
  peers: PeerActivity[],
): PortfolioPulseItem[] {
  // Demo "active book": top Deep Dives + high Watch act as portcos
  const book = companies
    .filter((c) => c.recommendation === "Deep Dive" || ((c.thesis_score || 0) >= 78 && c.recommendation === "Watch"))
    .slice(0, 8);

  const items: PortfolioPulseItem[] = [];
  for (const c of book) {
    const runway = c.runway_months_est;
    if (runway != null && runway < 14) {
      items.push({
        id: `pulse_runway_${c.id}`,
        company_id: c.id,
        company_name: c.name,
        slug: c.slug,
        kind: "runway",
        severity: runway < 9 ? "critical" : "high",
        title: `${c.name} runway ~${runway} mo`,
        body: `Board should pressure-test burn vs raise window. Last signal ${c.last_signal_date || "n/a"}.`,
        board_ask: "Confirm cash plan + raise timeline before next board.",
        age_label: "this week",
      });
    }
    const hiring = c.headcount_6m_growth_pct ?? 0;
    if (hiring >= 40) {
      items.push({
        id: `pulse_hire_${c.id}`,
        company_id: c.id,
        company_name: c.name,
        slug: c.slug,
        kind: "hiring",
        severity: "medium",
        title: `${c.name} hiring +${hiring}% / 6m`,
        body: `Headcount momentum is a leading indicator — watch quality of eng vs GTM mix.`,
        board_ask: "Ask for org chart + key hire slate.",
        age_label: "rolling",
      });
    }
    const peerN = peers.filter((p) => p.company_id === c.id).length;
    if (peerN >= 2) {
      items.push({
        id: `pulse_comp_${c.id}`,
        company_id: c.id,
        company_name: c.name,
        slug: c.slug,
        kind: "competitive",
        severity: "high",
        title: `${peerN} peer moves near ${c.name}`,
        body: `Competitive heat rising — revisit pricing / category narrative.`,
        board_ask: "What's the win/loss vs named competitors this quarter?",
        age_label: "recent",
      });
    }
    const notes = commentary.filter((x) => x.company_id === c.id).slice(0, 1);
    if (notes[0]) {
      items.push({
        id: `pulse_prod_${c.id}`,
        company_id: c.id,
        company_name: c.name,
        slug: c.slug,
        kind: "product",
        severity: notes[0].sentiment === "negative" ? "high" : "watch",
        title: `Commentary on ${c.name}`,
        body: (notes[0].quote_or_summary || "").slice(0, 160),
        board_ask: "Validate or refute in next founder sync.",
        age_label: notes[0].captured_at?.slice(0, 10) || "recent",
      });
    }
  }

  for (const a of alerts.filter((x) => x.severity === "high").slice(0, 4)) {
    const co = companies.find((c) => c.id === a.company_id);
    if (!co) continue;
    items.push({
      id: `pulse_alert_${a.id}`,
      company_id: co.id,
      company_name: co.name,
      slug: co.slug,
      kind: "board",
      severity: "critical",
      title: a.title || "High-severity alert",
      body: (a.body || "").slice(0, 180),
      board_ask: "Surface on partner agenda.",
      age_label: "alert",
    });
  }

  const order: Record<PulseSeverity, number> = { critical: 0, high: 1, medium: 2, watch: 3 };
  return items.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 16);
}

/* ─── Growth Bands (Bessemer Atlas) ─────────────────────────────────────── */

export function buildBandPlacements(companies: Company[]): BandPlacement[] {
  return companies
    .filter((c) => c.recommendation === "Deep Dive" || (c.thesis_score || 0) >= 70)
    .slice(0, 20)
    .map((c) => {
      const band = bandForStage(c.stage);
      const yoy = c.yoy_growth_pct ?? null;
      let posture: BandPlacement["posture"] = "unknown";
      let pct: number | null = null;
      if (yoy != null) {
        pct = Math.round((yoy / band.yoy_median) * 100);
        if (yoy >= band.yoy_top) posture = "above_top";
        else if (yoy >= band.yoy_median) posture = "above_median";
        else if (yoy >= band.yoy_floor) posture = "on_band";
        else posture = "below_floor";
      }
      const counsel =
        posture === "above_top"
          ? "Outrunning stage band — lean into category leadership diligence."
          : posture === "above_median"
            ? "Healthy vs Bessemer-style median for stage."
            : posture === "on_band"
              ? "On band — demand efficiency + cohort quality."
              : posture === "below_floor"
                ? "Below stage floor — stress growth quality before IC."
                : "YoY missing — do not invent; request founder metric.";
      return {
        company_id: c.id,
        company_name: c.name,
        slug: c.slug,
        stage: band.stage,
        yoy,
        headcount: c.headcount ?? null,
        band,
        posture,
        pct_of_median: pct,
        counsel,
      };
    });
}

/* ─── Talent Graph (Harmonic) ───────────────────────────────────────────── */

const OPERATOR_PRIORS = [
  "Google DeepMind",
  "OpenAI",
  "Meta FAIR",
  "Stripe",
  "Databricks",
  "Palantir",
  "Anduril",
  "SpaceX",
  "Jane Street",
  "McKinsey",
];

export function buildTalentGraph(companies: Company[], commentary: Commentary[]): TalentNode[] {
  const nodes: TalentNode[] = [];
  const pool = companies
    .filter((c) => (c.thesis_score || 0) >= 65)
    .slice(0, 14);

  for (const c of pool) {
    const prior = OPERATOR_PRIORS[hash(c.id) % OPERATOR_PRIORS.length];
    const named = c.team_notes?.match(/[A-Z][a-z]+ [A-Z][a-z]+/g)?.[0];
    const heat =
      40 +
      (c.headcount_6m_growth_pct || 0) / 2 +
      (c.tier1_count || 0) * 5 +
      (commentary.some((x) => x.company_id === c.id) ? 8 : 0);
    nodes.push({
      id: `tal_${c.id}`,
      name: named || `${c.name.split(" ")[0]} founding team`,
      prior,
      signal:
        c.team_notes?.slice(0, 120) ||
        `Operator DNA from ${prior} · ${c.relative_rank || "unranked"} in cohort`,
      company_id: c.id,
      company_name: c.name,
      slug: c.slug,
      heat: clamp(Math.round(heat), 20, 99),
      action:
        (c.recommendation === "Pass"
          ? "Watch operator for next newco — Pass on logo, not on talent"
          : "Reference prior company peers + map alumni graph before IC"),
    });
  }

  // Stealth-ish: high hiring Watch names without Tier-1
  for (const c of companies.filter(
    (x) =>
      x.recommendation === "Watch" &&
      (x.tier1_count || 0) === 0 &&
      (x.headcount_6m_growth_pct || 0) >= 30,
  ).slice(0, 4)) {
    nodes.push({
      id: `stealth_${c.id}`,
      name: `Stealth orbit · ${c.name}`,
      prior: OPERATOR_PRIORS[hash(c.name) % OPERATOR_PRIORS.length],
      signal: "Hiring velocity without Tier-1 — Harmonic-style early talent tell",
      company_id: c.id,
      company_name: c.name,
      slug: c.slug,
      heat: clamp(55 + (c.headcount_6m_growth_pct || 0) / 2, 50, 95),
      action: "Add to founder radar · request warm path before announcement",
    });
  }

  return nodes.sort((a, b) => b.heat - a.heat).slice(0, 16);
}

/* ─── Raise Windows ─────────────────────────────────────────────────────── */

export function buildRaiseWindows(companies: Company[], peers: PeerActivity[]): RaiseWindow[] {
  return companies
    .filter((c) => (c.thesis_score || 0) >= 68)
    .slice(0, 18)
    .map((c) => {
      const runway = c.runway_months_est ?? null;
      const since = monthsSince(c.last_round_date);
      const peerN = peers.filter((p) => p.company_id === c.id).length;
      const drivers: string[] = [];
      let score = 40;
      if (runway != null && runway <= 12) {
        score += 30;
        drivers.push(`Runway ~${runway} mo`);
      } else if (runway != null && runway <= 18) {
        score += 15;
        drivers.push(`Runway ~${runway} mo — planning window`);
      }
      if (since != null && since >= 14) {
        score += 20;
        drivers.push(`${since} mo since last round`);
      } else if (since != null && since >= 9) {
        score += 10;
        drivers.push(`${since} mo since last round`);
      }
      if ((c.yoy_growth_pct || 0) >= bandForStage(c.stage).yoy_median) {
        score += 12;
        drivers.push("YoY at/above stage median");
      }
      if (peerN >= 2) {
        score += 15;
        drivers.push(`${peerN} peers circling`);
      }
      if ((c.tier1_count || 0) >= 3) {
        score += 8;
        drivers.push("Crowded Tier-1 — may be oversubscribed");
      }
      if (!drivers.length) drivers.push("Insufficient raise signals — do not invent timing");

      let window: RaiseWindow["window"] = "quiet";
      if ((c.tier1_count || 0) >= 3 && peerN >= 2) window = "oversubscribed";
      else if (score >= 75) window = "open_now";
      else if (score >= 60) window = "30_60d";
      else if (score >= 48) window = "60_120d";

      const counsel =
        window === "open_now"
          ? "Process likely live — accelerate IC or pass with spine."
          : window === "oversubscribed"
            ? "Price/access risk — only lean in with proprietary angle."
            : window === "30_60d"
              ? "Build relationship now; reference calls before the bake-off."
              : window === "60_120d"
                ? "Patience is alpha — stay on weekly pulse."
                : "No forced timing — keep Watch hygiene.";

      return {
        company_id: c.id,
        company_name: c.name,
        slug: c.slug,
        window,
        score: clamp(score, 0, 100),
        runway_months: runway,
        months_since_round: since,
        drivers,
        counsel,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/* ─── Ownership Desk ────────────────────────────────────────────────────── */

export function buildOwnershipScenarios(
  companies: Company[],
  checkM = 15,
  targetOwnership = 8,
): OwnershipScenario[] {
  return companies
    .filter((c) => c.recommendation === "Deep Dive" || (c.thesis_score || 0) >= 75)
    .slice(0, 10)
    .map((c) => {
      const pre = c.valuation_est_m ?? null;
      const post = pre != null ? pre + checkM : null;
      const ownership = pre != null && pre > 0 ? (checkM / (pre + checkM)) * 100 : 0;
      const diluted = ownership * 0.72; // assume ~28% next-round dilution
      const gap = targetOwnership - ownership;
      const assumptions = [
        pre != null
          ? `Entry uses pipeline valuation est $${pre}M (${c.valuation_confidence || "confidence n/a"})`
          : "Valuation blank — ownership not invented as fact",
        `Check size demo default $${checkM}M (adjust in UI)`,
        `Next-round dilution model ~28% (illustrative)`,
        `Target ownership ${targetOwnership}%`,
      ];
      const counsel =
        pre == null
          ? "Get a real mark before IC ownership debate."
          : gap > 2
            ? `At $${checkM}M you land ~${ownership.toFixed(1)}% — short of ${targetOwnership}% target; negotiate or upsize.`
            : gap < -2
              ? `Ownership rich vs target — confirm pro-rata + reserves.`
              : `Ownership near target — stress reserves for follow-on.`;
      return {
        company_id: c.id,
        company_name: c.name,
        slug: c.slug,
        pre_money_m: pre,
        check_m: checkM,
        ownership_pct: Math.round(ownership * 10) / 10,
        post_money_m: post,
        diluted_next_round_pct: Math.round(diluted * 10) / 10,
        target_ownership: targetOwnership,
        gap_to_target: Math.round(gap * 10) / 10,
        counsel,
        assumptions,
      };
    });
}

export function recomputeOwnership(
  base: OwnershipScenario,
  checkM: number,
  targetOwnership: number,
): OwnershipScenario {
  const pre = base.pre_money_m;
  const post = pre != null ? pre + checkM : null;
  const ownership = pre != null && pre > 0 ? (checkM / (pre + checkM)) * 100 : 0;
  const diluted = ownership * 0.72;
  const gap = targetOwnership - ownership;
  return {
    ...base,
    check_m: checkM,
    ownership_pct: Math.round(ownership * 10) / 10,
    post_money_m: post,
    diluted_next_round_pct: Math.round(diluted * 10) / 10,
    target_ownership: targetOwnership,
    gap_to_target: Math.round(gap * 10) / 10,
    counsel:
      pre == null
        ? "Get a real mark before IC ownership debate."
        : gap > 2
          ? `At $${checkM}M you land ~${ownership.toFixed(1)}% — short of ${targetOwnership}% target.`
          : gap < -2
            ? `Ownership rich vs ${targetOwnership}% target — confirm reserves.`
            : `Near ${targetOwnership}% target at $${checkM}M check.`,
    assumptions: [
      pre != null
        ? `Entry uses pipeline valuation est $${pre}M`
        : "Valuation blank — ownership not invented as fact",
      `Check size $${checkM}M`,
      `Next-round dilution model ~28% (illustrative)`,
      `Target ownership ${targetOwnership}%`,
    ],
  };
}

/* ─── Pack ──────────────────────────────────────────────────────────────── */

export function buildAtlasPack(ctx: {
  companies: Company[];
  peers: PeerActivity[];
  commentary?: Commentary[];
  news?: NewsItem[];
  alerts?: AlertItem[];
  sectors: SectorCall[];
  mapQuery?: string;
}): AtlasPack {
  const { companies, peers, sectors } = ctx;
  const commentary = ctx.commentary || [];
  const alerts = ctx.alerts || [];
  const default_map = buildMarketMap(
    ctx.mapQuery || PRESET_MAP_QUERIES[0],
    companies,
    peers,
    sectors,
  );
  const warm_paths = buildWarmPaths(companies, peers);
  const pulse = buildPortfolioPulse(companies, commentary, alerts, peers);
  const bands = buildBandPlacements(companies);
  const talent = buildTalentGraph(companies, commentary);
  const raise_windows = buildRaiseWindows(companies, peers);
  const ownership = buildOwnershipScenarios(companies);

  const warmA = warm_paths.filter((w) => w.grade === "A").length;
  const pulseCrit = pulse.filter((p) => p.severity === "critical").length;
  const raiseOpen = raise_windows.filter((r) => r.window === "open_now" || r.window === "30_60d").length;

  return {
    summary: {
      headline: `Atlas · ${default_map.nodes.length} mapped · ${warmA} A-grade warm paths · ${raiseOpen} raise windows heating`,
      must_do: [
        default_map.shortlist[0]
          ? `Market map lead: ${default_map.shortlist[0].name}`
          : "Run a market map query",
        warm_paths[0]
          ? `Warm path A/B: ${warm_paths[0].company_name} via ${warm_paths[0].hops[0].person}`
          : "No warm paths yet",
        raise_windows[0]
          ? `Raise window: ${raise_windows[0].company_name} (${raise_windows[0].window})`
          : "Raise tape quiet",
        pulse[0] ? `Pulse: ${pulse[0].title}` : "Portfolio pulse clear",
      ],
      map_count: default_map.nodes.length,
      warm_a_paths: warmA,
      pulse_critical: pulseCrit,
      raise_open: raiseOpen,
    },
    default_map,
    warm_paths,
    pulse,
    bands,
    talent,
    raise_windows,
    ownership,
  };
}

export function formatAtlasBriefMarkdown(pack: AtlasPack): string {
  return [
    `# Signal Atlas — competitive brief`,
    "",
    pack.summary.headline,
    "",
    "## Must-do",
    ...pack.summary.must_do.map((m) => `- ${m}`),
    "",
    `## Market map — ${pack.default_map.interpreted_as}`,
    pack.default_map.counsel,
    ...pack.default_map.shortlist.slice(0, 5).map(
      (n) => `- **${n.name}** (${n.tag}, ${n.thesis_score}) — ${n.why.slice(0, 100)}`,
    ),
    "",
    "## Warm paths (demo graph)",
    ...pack.warm_paths.slice(0, 4).map(
      (w) => `- **${w.grade}** ${w.company_name} via ${w.hops.map((h) => h.person).join(" → ")}`,
    ),
    "",
    "## Raise windows",
    ...pack.raise_windows.slice(0, 5).map(
      (r) => `- **${r.company_name}** ${r.window} (${r.score}) — ${r.counsel}`,
    ),
    "",
    "_Inspired by Harmonic Scout · Affinity Ascend · Bessemer bands · Meridia/VCOS Pulse_",
    "Open /atlas for interactive maps, paths, bands, talent, ownership.",
  ].join("\n");
}
