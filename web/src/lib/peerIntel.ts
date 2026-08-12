import { FUND_ANNOUNCEMENTS, type FundAnnouncement } from "@/lib/fundAnnouncements";
import { PEER_FIRMS, type PeerFirmConfig } from "@/lib/peerFirms";
import type { Company, PeerActivity } from "@/lib/types";

export type CompRow = {
  company_id: string;
  name: string;
  slug?: string | null;
  stage?: string | null;
  subsector?: string | null;
  thesis_score?: number | null;
  recommendation?: string | null;
  relative_rank?: string | null;
  shared_investors: string[];
  comp_score: number;
  why: string;
};

export type FirmDeal = {
  company_id: string;
  company_name?: string | null;
  slug?: string | null;
  round?: string | null;
  date?: string | null;
  theme?: string | null;
  subsector?: string | null;
  recommendation?: string | null;
  thesis_score?: number | null;
  on_thesis_flag: boolean;
  is_lead: boolean;
};

export type FirmDossier = {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  stated_focus: string;
  deal_count: number;
  lead_count: number;
  deep_dive_count: number;
  thesis_shift_count: number;
  off_thesis_count: number;
  drift_score: number;
  focus_alignment: number;
  conviction_score: number;
  watch_priority: number;
  top_themes: { theme: string; count: number }[];
  top_stages: { stage: string; count: number }[];
  top_coinvestors: { firm: string; count: number }[];
  last_activity_date: string;
  deals: FirmDeal[];
  recent_activity: PeerActivity[];
  thesis_shifts: PeerActivity[];
  intel_summary: string;
};

export type HeatRow = {
  firm_a: string;
  firm_b: string;
  coinvest_count: number;
  shared_themes: string[];
  shared_deals: string[];
  last_shared_deal: string;
  last_shared_date: string;
  syndicate_score: number;
};

/** Firm × firm adjacency for the visual co-investor heatmap. */
export type CoinvestMatrix = {
  firms: { slug: string; name: string }[];
  /** Symmetric; cell [i][j] = coinvest count (0 on diagonal). */
  cells: number[][];
  max: number;
};

export type PeerIntelligence = {
  firms: FirmDossier[];
  heatmap: HeatRow[];
  coinvest_matrix: CoinvestMatrix;
  thesis_shifts: PeerActivity[];
  sector_bets: { theme: string; count: number }[];
  fund_announcements: FundAnnouncement[];
  fund_sector_bets: { theme: string; count: number; capital_m: number }[];
  comparables: Record<string, CompRow[]>;
  matrix: {
    firms: { slug: string; name: string }[];
    companies: { id: string; name: string; slug?: string | null }[];
    cells: {
      firm_slug: string;
      firm: string;
      company_id: string;
      company: string;
      is_lead: boolean;
      on_thesis: boolean;
    }[];
  };
  stats: {
    firm_count: number;
    active_peer_count: number;
    thesis_shift_count: number;
    heatmap_pairs: number;
    fund_announcement_count: number;
    new_fund_count: number;
  };
};

function firmSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function aliasMap(firms: PeerFirmConfig[]) {
  const map = new Map<string, PeerFirmConfig & { slug: string }>();
  for (const f of firms) {
    const row = { ...f, slug: firmSlug(f.name) };
    map.set(norm(f.name), row);
    for (const a of f.aliases) map.set(norm(a), row);
  }
  return map;
}

function resolveFirm(raw: string, map: ReturnType<typeof aliasMap>) {
  const n = norm(raw);
  if (map.has(n)) return map.get(n)!;
  for (const [key, firm] of map) {
    if (key && (n.includes(key) || key.includes(n))) return firm;
  }
  return { name: raw, aliases: [] as string[], stated_focus: "", slug: firmSlug(raw) };
}

function themeTokens(focus: string) {
  const f = focus.toLowerCase();
  const mapping: Record<string, string[]> = {
    ai: ["ai", "infra", "model", "compute", "gpu", "ml"],
    bio: ["bio", "health", "life", "pharma"],
    crypto: ["crypto", "web3", "blockchain"],
    fintech: ["fintech", "finance", "payment", "bank"],
    defense: ["defence", "defense", "national security", "cyber", "space"],
    cyber: ["cyber", "security", "identity"],
    robot: ["robot", "physical ai", "automation"],
    energy: ["energy", "climate", "nuclear", "grid"],
    enterprise: ["enterprise", "saas", "software", "cloud"],
    consumer: ["consumer", "internet"],
    space: ["space", "satellite"],
    frontier: ["frontier", "deep tech", "science"],
  };
  const tokens = new Set<string>();
  for (const [key, syns] of Object.entries(mapping)) {
    if (f.includes(key) || syns.some((s) => f.includes(s))) {
      tokens.add(key);
      syns.forEach((s) => tokens.add(s));
    }
  }
  return tokens;
}

function onStatedFocus(theme: string, statedFocus: string) {
  if (!statedFocus) return true;
  const toks = themeTokens(statedFocus);
  if (!toks.size) return true;
  const t = (theme || "").toLowerCase();
  return [...toks].some((tok) => t.includes(tok));
}

function bump(counter: Map<string, number>, key: string) {
  if (!key) return;
  counter.set(key, (counter.get(key) || 0) + 1);
}

function topN(counter: Map<string, number>, n: number) {
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, count]) => ({ key: k, count }));
}

export function buildComparables(companies: Company[], limit = 4): Record<string, CompRow[]> {
  const out: Record<string, CompRow[]> = {};
  for (const c of companies) {
    const peers: CompRow[] = [];
    for (const other of companies) {
      if (other.id === c.id) continue;
      let score = 0;
      if (c.theme_id && other.theme_id === c.theme_id) score += 40;
      if (c.sector_theme && other.sector_theme === c.sector_theme) score += 20;
      if (c.subsector && other.subsector === c.subsector) score += 25;
      if (c.stage && other.stage === c.stage) score += 20;
      const shared = [...new Set((c.investors || []).filter((i) => (other.investors || []).includes(i)))];
      score += Math.min(20, shared.length * 8);
      if (Math.abs((c.thesis_score || 0) - (other.thesis_score || 0)) <= 8) score += 8;
      if (score < 35) continue;
      const whyBits: string[] = [];
      if (c.subsector && c.subsector === other.subsector) whyBits.push(`same subsector (${c.subsector})`);
      else if (c.sector_theme === other.sector_theme) whyBits.push(`same theme (${c.sector_theme})`);
      if (c.stage === other.stage) whyBits.push(`same stage (${c.stage})`);
      if (shared.length) whyBits.push(`shared investors: ${shared.slice(0, 3).join(", ")}`);
      peers.push({
        company_id: other.id,
        name: other.name,
        slug: other.slug,
        stage: other.stage,
        subsector: other.subsector,
        thesis_score: other.thesis_score,
        recommendation: other.recommendation,
        relative_rank: other.relative_rank,
        shared_investors: shared,
        comp_score: Math.round(score * 10) / 10,
        why: whyBits.join("; ") || "adjacent deal in pipeline",
      });
    }
    peers.sort((a, b) => b.comp_score - a.comp_score || (b.thesis_score || 0) - (a.thesis_score || 0));
    out[c.id] = peers.slice(0, limit);
  }
  return out;
}

export function buildHeatmap(companies: Company[]): HeatRow[] {
  const pair = new Map<
    string,
    {
      firm_a: string;
      firm_b: string;
      coinvest_count: number;
      themes: Set<string>;
      deals: string[];
      last_shared_deal: string;
      last_shared_date: string;
    }
  >();

  for (const c of companies) {
    const invs = [...new Set(c.investors || [])].sort();
    for (let i = 0; i < invs.length; i++) {
      for (let j = i + 1; j < invs.length; j++) {
        const key = `${invs[i]}||${invs[j]}`;
        const cur = pair.get(key) || {
          firm_a: invs[i],
          firm_b: invs[j],
          coinvest_count: 0,
          themes: new Set<string>(),
          deals: [] as string[],
          last_shared_deal: "",
          last_shared_date: "",
        };
        cur.coinvest_count += 1;
        if (c.sector_theme) cur.themes.add(c.sector_theme);
        if (c.name && !cur.deals.includes(c.name)) cur.deals.push(c.name);
        const d = c.last_round_date || "";
        if (d >= cur.last_shared_date) {
          cur.last_shared_date = d;
          cur.last_shared_deal = c.name;
        }
        pair.set(key, cur);
      }
    }
  }

  return [...pair.values()]
    .map((r) => ({
      firm_a: r.firm_a,
      firm_b: r.firm_b,
      coinvest_count: r.coinvest_count,
      shared_themes: [...r.themes].sort(),
      shared_deals: r.deals.slice(0, 8),
      last_shared_deal: r.last_shared_deal,
      last_shared_date: r.last_shared_date,
      syndicate_score: Math.round(Math.min(100, 40 + r.coinvest_count * 18 + r.themes.size * 6) * 10) / 10,
    }))
    .sort((a, b) => b.coinvest_count - a.coinvest_count || b.syndicate_score - a.syndicate_score);
}

/** Build a square firm×firm heat matrix from ranked co-invest pairs (top active peer firms). */
export function buildCoinvestMatrix(
  heatmap: HeatRow[],
  firms: FirmDossier[],
  limit = 14,
): CoinvestMatrix {
  const ranked = [...firms]
    .filter((f) => f.deal_count > 0)
    .sort(
      (a, b) =>
        b.deal_count - a.deal_count ||
        b.watch_priority - a.watch_priority ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit);

  const index = new Map(ranked.map((f, i) => [norm(f.name), i]));
  for (const f of ranked) {
    for (const a of f.aliases) index.set(norm(a), index.get(norm(f.name))!);
  }

  const n = ranked.length;
  const cells: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  let max = 0;

  for (const row of heatmap) {
    const i = index.get(norm(row.firm_a));
    const j = index.get(norm(row.firm_b));
    if (i == null || j == null || i === j) continue;
    cells[i][j] = row.coinvest_count;
    cells[j][i] = row.coinvest_count;
    if (row.coinvest_count > max) max = row.coinvest_count;
  }

  return {
    firms: ranked.map((f) => ({ slug: f.slug, name: f.name })),
    cells,
    max: Math.max(max, 1),
  };
}

function fundSectorBets(funds: FundAnnouncement[]) {
  const map = new Map<string, { count: number; capital_m: number }>();
  for (const f of funds) {
    const themes = f.sector_focus
      .split(/[·,]/)
      .map((t) => t.trim())
      .filter(Boolean);
    for (const theme of themes.slice(0, 2)) {
      const cur = map.get(theme) || { count: 0, capital_m: 0 };
      cur.count += 1;
      cur.capital_m += f.size_m || 0;
      map.set(theme, cur);
    }
  }
  return [...map.entries()]
    .map(([theme, v]) => ({ theme, count: v.count, capital_m: Math.round(v.capital_m) }))
    .sort((a, b) => b.capital_m - a.capital_m || b.count - a.count)
    .slice(0, 10);
}

export function buildPeerIntelligence(
  companies: Company[],
  peers: PeerActivity[],
  firmConfig: PeerFirmConfig[] = PEER_FIRMS,
): PeerIntelligence {
  const map = aliasMap(firmConfig);
  type Bucket = {
    slug: string;
    name: string;
    aliases: string[];
    stated_focus: string;
    dealIds: Set<string>;
    deals: FirmDeal[];
    themes: Map<string, number>;
    stages: Map<string, number>;
    activity: PeerActivity[];
    thesis_shifts: PeerActivity[];
    coinvestors: Map<string, number>;
    last_activity_date: string;
  };
  const buckets = new Map<string, Bucket>();

  const ensure = (raw: string) => {
    const resolved = resolveFirm(raw, map);
    let b = buckets.get(resolved.slug);
    if (!b) {
      b = {
        slug: resolved.slug,
        name: resolved.name,
        aliases: resolved.aliases,
        stated_focus: resolved.stated_focus,
        dealIds: new Set(),
        deals: [],
        themes: new Map(),
        stages: new Map(),
        activity: [],
        thesis_shifts: [],
        coinvestors: new Map(),
        last_activity_date: "",
      };
      buckets.set(resolved.slug, b);
    } else if (resolved.stated_focus && !b.stated_focus) {
      b.stated_focus = resolved.stated_focus;
      b.name = resolved.name;
    }
    return b;
  };

  for (const c of companies) {
    const invs = c.investors || [];
    const names = [...new Set([...(c.lead_investor ? [c.lead_investor] : []), ...invs])];
    for (const raw of names) {
      if (!raw) continue;
      const b = ensure(raw);
      if (b.dealIds.has(c.id)) continue;
      b.dealIds.add(c.id);
      const onThesis = onStatedFocus(c.sector_theme || "", b.stated_focus);
      b.deals.push({
        company_id: c.id,
        company_name: c.name,
        slug: c.slug,
        round: c.stage,
        date: c.last_round_date,
        theme: c.sector_theme,
        subsector: c.subsector,
        recommendation: c.recommendation,
        thesis_score: c.thesis_score,
        on_thesis_flag: onThesis,
        is_lead: !!c.lead_investor && norm(c.lead_investor) === norm(raw),
      });
      bump(b.themes, c.sector_theme || "");
      bump(b.stages, c.stage || "");
      const d = c.last_round_date || "";
      if (d >= b.last_activity_date) b.last_activity_date = d;
      for (const other of invs) {
        if (other && norm(other) !== norm(raw)) bump(b.coinvestors, other);
      }
    }
  }

  for (const pa of peers) {
    if (!pa.firm) continue;
    const b = ensure(pa.firm);
    b.activity.push(pa);
    if ((pa.date || "") >= b.last_activity_date) b.last_activity_date = pa.date || "";
    bump(b.themes, pa.theme || "");
    if (pa.thesis_shift || pa.on_thesis_flag === false) b.thesis_shifts.push(pa);
  }

  const firms: FirmDossier[] = [...buckets.values()].map((b) => {
    const n = b.deals.length || 1;
    const off = b.deals.filter((d) => !d.on_thesis_flag).length;
    const shiftN = b.thesis_shifts.length;
    const drift = Math.min(100, (100 * off) / n * 0.7 + Math.min(40, shiftN * 18));
    const topThemes = topN(b.themes, 5).map((t) => ({ theme: t.key, count: t.count }));
    const conviction = Math.min(
      100,
      20 +
        b.deals.length * 12 +
        b.deals.filter((d) => d.recommendation === "Deep Dive").length * 8 +
        b.deals.filter((d) => d.is_lead).length * 6,
    );
    const watch =
      conviction * 0.45 + Math.min(40, drift) * 0.35 + shiftN * 8 + Math.min(15, b.deals.length);
    const themeStr = topThemes
      .slice(0, 3)
      .map((t) => t.theme)
      .join(", ");
    const leads = b.deals.filter((d) => d.is_lead).length;
    let intel = `${b.name} appears on ${b.deals.length} pipeline companies (${leads} as lead). Concentration: ${themeStr || "mixed"}.`;
    if (drift >= 35 || shiftN) {
      intel += ` Thesis drift elevated (${drift.toFixed(0)}/100, ${shiftN} shift flag(s)) — investigate off-focus bets.`;
    } else if (drift <= 15) {
      intel += " Staying close to stated focus — useful as a clean peer read.";
    } else {
      intel += " Mild drift — normal multi-stage portfolio noise.";
    }

    return {
      id: `firm_${b.slug}`,
      slug: b.slug,
      name: b.name,
      aliases: b.aliases,
      stated_focus: b.stated_focus,
      deal_count: b.deals.length,
      lead_count: leads,
      deep_dive_count: b.deals.filter((d) => d.recommendation === "Deep Dive").length,
      thesis_shift_count: shiftN,
      off_thesis_count: off,
      drift_score: Math.round(drift * 10) / 10,
      focus_alignment: Math.round((100 - drift) * 10) / 10,
      conviction_score: Math.round(conviction * 10) / 10,
      watch_priority: Math.round(watch * 10) / 10,
      top_themes: topThemes,
      top_stages: topN(b.stages, 5).map((t) => ({ stage: t.key, count: t.count })),
      top_coinvestors: topN(b.coinvestors, 8).map((t) => ({ firm: t.key, count: t.count })),
      last_activity_date: b.last_activity_date,
      deals: [...b.deals].sort((a, c) => (c.date || "").localeCompare(a.date || "")),
      recent_activity: [...b.activity].sort((a, c) => (c.date || "").localeCompare(a.date || "")).slice(0, 12),
      thesis_shifts: b.thesis_shifts,
      intel_summary: intel,
    };
  });

  firms.sort(
    (a, b) =>
      b.watch_priority - a.watch_priority ||
      b.conviction_score - a.conviction_score ||
      b.deal_count - a.deal_count ||
      a.name.localeCompare(b.name),
  );

  const heatmap = buildHeatmap(companies);
  const coinvest_matrix = buildCoinvestMatrix(heatmap, firms);
  const comparables = buildComparables(companies);
  const thesis_shifts = peers.filter((p) => p.thesis_shift);
  const sectorMap = new Map<string, number>();
  for (const f of firms) {
    for (const t of f.top_themes) bump(sectorMap, t.theme);
  }

  const fund_announcements = [...FUND_ANNOUNCEMENTS].sort((a, b) =>
    b.announced_date.localeCompare(a.announced_date),
  );
  const fund_sector_bets = fundSectorBets(fund_announcements);

  const firmList = firms.slice(0, 18);
  const cos = [...companies].sort((a, b) => (b.thesis_score || 0) - (a.thesis_score || 0)).slice(0, 24);
  const cells = [];
  for (const f of firmList) {
    const ids = new Set(f.deals.map((d) => d.company_id));
    for (const c of cos) {
      if (!ids.has(c.id)) continue;
      const deal = f.deals.find((d) => d.company_id === c.id)!;
      cells.push({
        firm_slug: f.slug,
        firm: f.name,
        company_id: c.id,
        company: c.name,
        is_lead: deal.is_lead,
        on_thesis: deal.on_thesis_flag,
      });
    }
  }

  return {
    firms,
    heatmap,
    coinvest_matrix,
    thesis_shifts,
    sector_bets: topN(sectorMap, 12).map((t) => ({ theme: t.key, count: t.count })),
    fund_announcements,
    fund_sector_bets,
    comparables,
    matrix: {
      firms: firmList.map((f) => ({ slug: f.slug, name: f.name })),
      companies: cos.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
      cells,
    },
    stats: {
      firm_count: firms.length,
      active_peer_count: firms.filter((f) => f.deal_count > 0).length,
      thesis_shift_count: thesis_shifts.length,
      heatmap_pairs: heatmap.length,
      fund_announcement_count: fund_announcements.length,
      new_fund_count: fund_announcements.filter((f) => f.freshness === "new").length,
    },
  };
}

export function findFirm(intel: PeerIntelligence, slugOrName: string) {
  const n = norm(slugOrName);
  return (
    intel.firms.find((f) => f.slug === slugOrName || norm(f.name) === n) ||
    intel.firms.find((f) => f.aliases.some((a) => norm(a) === n)) ||
    null
  );
}
