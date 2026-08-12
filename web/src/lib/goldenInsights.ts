/**
 * Golden insights — partner-grade judgment layer on top of peer intelligence.
 * Turns activity into: what to do this week, who to call, where Thirdbase has edge.
 */

import type { Company } from "@/lib/types";
import type { FirmDossier, HeatRow, PeerIntelligence } from "@/lib/peerIntel";

export type InsightKind =
  | "alpha"
  | "crowding"
  | "whitespace"
  | "syndicate"
  | "drift"
  | "race"
  | "asymmetric"
  | "defend";

export type GoldenInsight = {
  id: string;
  kind: InsightKind;
  urgency: "now" | "this_week" | "monitor";
  title: string;
  insight: string;
  action: string;
  evidence: string[];
  score: number;
  hrefs?: { label: string; href: string }[];
};

export type SyndicatePlay = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  thesis_score?: number | null;
  recommendation?: string | null;
  already_in: string[];
  call_list: {
    firm: string;
    slug: string;
    reason: string;
    fit_score: number;
  }[];
  crowding: "quiet" | "selective" | "hot" | "crowded";
  edge_note: string;
};

export type CompetitiveRace = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  thesis_score?: number | null;
  peer_count: number;
  peers: string[];
  race_intensity: number;
  note: string;
};

export type ThemeFlow = {
  theme: string;
  peer_deals: number;
  thirdbase_deals: number;
  thirdbase_deep_dives: number;
  peer_firms: string[];
  posture: "flood" | "contested" | "whitespace" | "balanced";
  counsel: string;
};

export type BattleCard = {
  slug: string;
  name: string;
  stated_focus: string;
  how_they_win: string;
  where_they_are_weak: string;
  partner_or_compete: string;
  call_when: string;
  top_deals: string[];
  drift_score: number;
  watch_priority: number;
};

export type WeeklyBrief = {
  subject: string;
  headline: string;
  paragraphs: string[];
  must_do: string[];
  watch: string[];
};

export type GoldenPack = {
  insights: GoldenInsight[];
  syndicate_plays: SyndicatePlay[];
  races: CompetitiveRace[];
  theme_flows: ThemeFlow[];
  battle_cards: BattleCard[];
  weekly_brief: WeeklyBrief;
  proprietary_deals: {
    name: string;
    slug?: string | null;
    id: string;
    thesis_score?: number | null;
    note: string;
  }[];
  stats: {
    insight_count: number;
    now_count: number;
    proprietary_count: number;
    crowded_races: number;
    whitespace_themes: number;
  };
};

function idOf(...parts: string[]) {
  return parts.join("_").replace(/[^a-z0-9_]+/gi, "_").toLowerCase().slice(0, 64);
}

function firmOnDeal(firm: FirmDossier, companyId: string) {
  return firm.deals.some((d) => d.company_id === companyId);
}

function themePosture(
  peerDeals: number,
  tbDeals: number,
  tbDeep: number,
): ThemeFlow["posture"] {
  if (peerDeals >= 8 && tbDeep <= 1) return "flood";
  if (peerDeals <= 2 && tbDeals >= 2) return "whitespace";
  if (peerDeals >= 5 && tbDeals >= 3) return "contested";
  return "balanced";
}

export function buildGoldenPack(
  intel: PeerIntelligence,
  companies: Company[],
): GoldenPack {
  const deep = companies.filter((c) => c.recommendation === "Deep Dive");
  const insights: GoldenInsight[] = [];
  const byId = new Map(companies.map((c) => [c.id, c]));

  // --- Theme capital flow ---
  const themeMap = new Map<
    string,
    { peer: number; firms: Set<string>; tb: number; tbDeep: number }
  >();
  for (const f of intel.firms) {
    for (const t of f.top_themes) {
      const cur = themeMap.get(t.theme) || {
        peer: 0,
        firms: new Set<string>(),
        tb: 0,
        tbDeep: 0,
      };
      cur.peer += t.count;
      cur.firms.add(f.name);
      themeMap.set(t.theme, cur);
    }
  }
  for (const c of companies) {
    const theme = c.sector_theme || "Unknown";
    const cur = themeMap.get(theme) || {
      peer: 0,
      firms: new Set<string>(),
      tb: 0,
      tbDeep: 0,
    };
    cur.tb += 1;
    if (c.recommendation === "Deep Dive") cur.tbDeep += 1;
    themeMap.set(theme, cur);
  }

  const theme_flows: ThemeFlow[] = [...themeMap.entries()]
    .map(([theme, v]) => {
      const posture = themePosture(v.peer, v.tb, v.tbDeep);
      const counsel =
        posture === "flood"
          ? "Peers are overcrowding this theme — raise the bar; only own the #1–2 relative ranks."
          : posture === "whitespace"
            ? "Thirdbase is early vs peer set — protect and deepen coverage before consensus arrives."
            : posture === "contested"
              ? "Hot contested arena — win with access, speed, and sharper relative ranking."
              : "Balanced flow — stay opportunistic within thesis.";
      return {
        theme,
        peer_deals: v.peer,
        thirdbase_deals: v.tb,
        thirdbase_deep_dives: v.tbDeep,
        peer_firms: [...v.firms].slice(0, 6),
        posture,
        counsel,
      };
    })
    .sort((a, b) => b.peer_deals - a.peer_deals);

  for (const flow of theme_flows.filter((t) => t.posture === "whitespace").slice(0, 3)) {
    insights.push({
      id: idOf("ws", flow.theme),
      kind: "whitespace",
      urgency: "this_week",
      title: flow.theme,
      insight: `Peer capital is light (${flow.peer_deals} observed) while Thirdbase already has ${flow.thirdbase_deals} names (${flow.thirdbase_deep_dives} Deep Dive). This is an asymmetric coverage window.`,
      action: `Double-click the top relative-rank names in ${flow.theme} and lock founder access before Lux/a16z crowd in.`,
      evidence: [
        `${flow.thirdbase_deals} pipeline companies in theme`,
        `${flow.peer_deals} peer-tagged deal appearances`,
        flow.counsel,
      ],
      score: 88 + flow.thirdbase_deep_dives * 3,
      hrefs: [{ label: "Sectors", href: "/sectors" }, { label: "Pipeline", href: "/pipeline" }],
    });
  }

  for (const flow of theme_flows.filter((t) => t.posture === "flood").slice(0, 2)) {
    insights.push({
      id: idOf("flood", flow.theme),
      kind: "crowding",
      urgency: "now",
      title: flow.theme,
      insight: `${flow.peer_firms.slice(0, 3).join(", ")} and peers are flooding ${flow.theme} (${flow.peer_deals} appearances). Easy to overpay.`,
      action: `Only Green-light if relative rank is top-quartile and entry valuation is attractive vs comps. Prefer Pass on mid-pack.`,
      evidence: [
        `Peer firms: ${flow.peer_firms.slice(0, 5).join(", ")}`,
        `Thirdbase Deep Dives here: ${flow.thirdbase_deep_dives}`,
      ],
      score: 86,
      hrefs: [{ label: "Pipeline", href: "/pipeline" }],
    });
  }

  // --- Competitive races on Deep Dives ---
  const races: CompetitiveRace[] = deep
    .map((c) => {
      const peers = (c.investors || []).filter(Boolean);
      const peer_count = peers.length;
      const race_intensity = Math.min(
        100,
        peer_count * 14 + (c.tier1_count || 0) * 10 + ((c.thesis_score || 0) >= 85 ? 8 : 0),
      );
      const note =
        peer_count >= 5
          ? "Crowded round dynamics — negotiate via conviction + speed, not valuation heroics."
          : peer_count <= 1
            ? "Quiet cap table — proprietary access window if founder relationship is real."
            : "Selective syndicate — room to lead or co-lead with the right peer.";
      return {
        company_id: c.id,
        company_name: c.name,
        slug: c.slug,
        thesis_score: c.thesis_score,
        peer_count,
        peers,
        race_intensity,
        note,
      };
    })
    .sort((a, b) => b.race_intensity - a.race_intensity);

  for (const race of races.filter((r) => r.peer_count <= 2).slice(0, 4)) {
    insights.push({
      id: idOf("prop", race.company_id),
      kind: "alpha",
      urgency: "now",
      title: race.company_name,
      insight: `${race.company_name} is Deep Dive (score ${race.thesis_score?.toFixed(0)}) with a quiet/selective cap table (${race.peer_count} known peers). This is the kind of deal coverage tools miss.`,
      action: `Partner should take the call this week — draft IC one-pager and lock a process before peer FOMO arrives.`,
      evidence: [race.note, `Investors: ${race.peers.join(", ") || "thin / unknown"}`],
      score: race.peer_count <= 1 ? 95 : 90,
      hrefs: [{ label: race.company_name, href: `/company/${race.slug || race.company_id}` }],
    });
  }

  for (const race of races.filter((r) => r.peer_count >= 5).slice(0, 2)) {
    insights.push({
      id: idOf("race", race.company_id),
      kind: "race",
      urgency: "this_week",
      title: race.company_name,
      insight: `${race.peer_count} investors already on the tape (${race.peers.slice(0, 4).join(", ")}…). Intensity ${race.race_intensity}/100.`,
      action: `Decide lead vs pass fast. If proceeding, pick a syndicate ally from the heatmap who already knows the founder.`,
      evidence: [race.note],
      score: 80,
      hrefs: [{ label: race.company_name, href: `/company/${race.slug || race.company_id}` }],
    });
  }

  // --- Thesis shifts as asymmetric market signal ---
  for (const shift of intel.thesis_shifts.slice(0, 4)) {
    insights.push({
      id: idOf("drift", shift.id || shift.firm, shift.company_name || ""),
      kind: "asymmetric",
      urgency: "now",
      title: `${shift.firm} off-thesis → ${shift.company_name}`,
      insight:
        shift.notes ||
        `${shift.firm} invested outside stated focus — often an early tell of a new consensus theme.`,
      action: `Open a sector scan around ${shift.theme || "this theme"} and find the next LatticeEval-quality name before it becomes consensus.`,
      evidence: [`${shift.round || "Round"} · ${shift.date || "recent"}`, shift.theme || ""],
      score: 92,
      hrefs: [
        { label: "Competitors", href: "/peers" },
        ...(shift.company_id
          ? [{ label: shift.company_name || "Deal", href: `/company/${shift.company_id}` }]
          : []),
      ],
    });
  }

  // high drift firms
  for (const f of intel.firms.filter((x) => x.drift_score >= 35).slice(0, 2)) {
    insights.push({
      id: idOf("firmdrift", f.slug),
      kind: "drift",
      urgency: "monitor",
      title: `${f.name} thesis is migrating`,
      insight: f.intel_summary,
      action: `Treat ${f.name}'s recent off-focus deals as a map of where smart capital is exploring — reverse-engineer the theme.`,
      evidence: f.top_themes.slice(0, 3).map((t) => `${t.theme} (${t.count})`),
      score: 78,
      hrefs: [{ label: f.name, href: `/competitors/${f.slug}` }],
    });
  }

  // --- Syndicate plays ---
  const syndicate_plays: SyndicatePlay[] = deep.slice(0, 10).map((c) => {
    const already = new Set((c.investors || []).map((x) => x.toLowerCase()));
    const call_list: SyndicatePlay["call_list"] = [];

    for (const pair of intel.heatmap.slice(0, 40)) {
      const aIn = already.has(pair.firm_a.toLowerCase());
      const bIn = already.has(pair.firm_b.toLowerCase());
      if (aIn === bIn) continue;
      const missing = aIn ? pair.firm_b : pair.firm_a;
      const present = aIn ? pair.firm_a : pair.firm_b;
      const firm = intel.firms.find(
        (f) =>
          f.name.toLowerCase() === missing.toLowerCase() ||
          f.aliases.some((al) => al.toLowerCase() === missing.toLowerCase()),
      );
      if (!firm) continue;
      if (call_list.some((x) => x.firm === firm.name)) continue;
      const themeFit = firm.top_themes.some((t) => t.theme === c.sector_theme) ? 18 : 0;
      const fit = Math.min(100, pair.syndicate_score * 0.55 + themeFit + (firm.conviction_score || 0) * 0.2);
      call_list.push({
        firm: firm.name,
        slug: firm.slug,
        reason: `Co-invests with ${present} (${pair.coinvest_count}×). ${
          themeFit ? `Active in ${c.sector_theme}.` : "Broad multi-stage partner."
        }`,
        fit_score: Math.round(fit),
      });
    }

    // Also suggest firms strong in same theme not yet on deal
    for (const f of intel.firms) {
      if (already.has(f.name.toLowerCase()) || f.aliases.some((a) => already.has(a.toLowerCase()))) {
        continue;
      }
      const themeHit = f.top_themes.find((t) => t.theme === c.sector_theme);
      if (!themeHit || themeHit.count < 1) continue;
      if (call_list.some((x) => x.firm === f.name)) continue;
      call_list.push({
        firm: f.name,
        slug: f.slug,
        reason: `Theme specialist — ${themeHit.count} pipeline appearances in ${c.sector_theme}.`,
        fit_score: Math.round(55 + themeHit.count * 8 + f.conviction_score * 0.15),
      });
    }

    call_list.sort((a, b) => b.fit_score - a.fit_score);
    const peerN = (c.investors || []).length;
    const crowding: SyndicatePlay["crowding"] =
      peerN >= 6 ? "crowded" : peerN >= 4 ? "hot" : peerN >= 2 ? "selective" : "quiet";

    const edge_note =
      crowding === "quiet"
        ? "Quiet tape — Thirdbase can set terms and invite one strategic peer."
        : crowding === "crowded"
          ? "Crowded — only join if you bring unique access or follow-on power."
          : "Selective room — use heatmap to pick the one partner who unlocks the round.";

    if (call_list[0] && crowding !== "crowded") {
      insights.push({
        id: idOf("syn", c.id),
        kind: "syndicate",
        urgency: crowding === "quiet" ? "now" : "this_week",
        title: `Call ${call_list[0].firm} on ${c.name}`,
        insight: call_list[0].reason,
        action: `Warm intro via shared relationships — position Thirdbase as ${
          crowding === "quiet" ? "lead / co-lead" : "high-conviction co-investor"
        }.`,
        evidence: [edge_note, `Fit ${call_list[0].fit_score}`],
        score: 84 + (crowding === "quiet" ? 8 : 0),
        hrefs: [
          { label: c.name, href: `/company/${c.slug || c.id}` },
          { label: call_list[0].firm, href: `/competitors/${call_list[0].slug}` },
        ],
      });
    }

    return {
      company_id: c.id,
      company_name: c.name,
      slug: c.slug,
      thesis_score: c.thesis_score,
      recommendation: c.recommendation,
      already_in: c.investors || [],
      call_list: call_list.slice(0, 5),
      crowding,
      edge_note,
    };
  });

  // --- Battle cards for top watch firms ---
  const battle_cards: BattleCard[] = intel.firms.slice(0, 8).map((f) => {
    const themes = f.top_themes.map((t) => t.theme).slice(0, 2).join(" & ") || "multi-theme";
    const how =
      f.lead_count >= 2
        ? `Leads aggressively in ${themes}; shows up early and sets pace.`
        : `Follows high-quality syndicates into ${themes}; useful as a co-investor signal.`;
    const weak =
      f.drift_score >= 30
        ? "Stated focus is migrating — messaging may lag actual check-writing."
        : f.deal_count <= 1
          ? "Thin overlap with Thirdbase pipeline — less predictive as a peer read."
          : "Predictable within stated focus — beat them with earlier access, not later bidding.";
    const partner =
      f.conviction_score >= 60
        ? "Prefer partnering when heatmap overlap is high; compete when you have proprietary founder access."
        : "Monitor more than engage — lower signal density in current pipeline.";
    const call_when = f.thesis_shifts.length
      ? `After their off-thesis move into ${(f.thesis_shifts[0].theme || themes).toString()} — ask what changed.`
      : `When you have a ${themes} Deep Dive and need a Tier-1 validation check.`;

    return {
      slug: f.slug,
      name: f.name,
      stated_focus: f.stated_focus,
      how_they_win: how,
      where_they_are_weak: weak,
      partner_or_compete: partner,
      call_when,
      top_deals: f.deals.slice(0, 4).map((d) => d.company_name || ""),
      drift_score: f.drift_score,
      watch_priority: f.watch_priority,
    };
  });

  for (const card of battle_cards.slice(0, 2)) {
    insights.push({
      id: idOf("battle", card.slug),
      kind: "defend",
      urgency: "monitor",
      title: card.name,
      insight: card.how_they_win,
      action: card.call_when,
      evidence: [card.where_they_are_weak, card.partner_or_compete],
      score: 72 + card.watch_priority * 0.1,
      hrefs: [{ label: card.name, href: `/competitors/${card.slug}` }],
    });
  }

  // --- Proprietary deal list ---
  const proprietary_deals = races
    .filter((r) => r.peer_count <= 2 && (r.thesis_score || 0) >= 75)
    .slice(0, 6)
    .map((r) => ({
      name: r.company_name,
      slug: r.slug,
      id: r.company_id,
      thesis_score: r.thesis_score,
      note: r.note,
    }));

  insights.sort((a, b) => {
    const u = { now: 0, this_week: 1, monitor: 2 };
    return u[a.urgency] - u[b.urgency] || b.score - a.score;
  });

  const topInsights = insights.slice(0, 12);
  const must = topInsights.filter((i) => i.urgency === "now").slice(0, 4);
  const watch = topInsights.filter((i) => i.urgency !== "now").slice(0, 4);

  const weekly_brief: WeeklyBrief = {
    subject: `Signal Competitor Brief — ${must.length} moves that matter`,
    headline:
      must[0]?.title ||
      watch[0]?.title ||
      "Peer set is quiet — use the window to deepen proprietary coverage",
    paragraphs: [
      `Across ${intel.stats.active_peer_count} active peer firms, Signal sees ${intel.stats.thesis_shift_count} thesis-shift flags and ${races.filter((r) => r.peer_count >= 5).length} crowded Deep Dive races.`,
      proprietary_deals[0]
        ? `Highest-leverage proprietary look: ${proprietary_deals[0].name} (quiet tape, score ${proprietary_deals[0].thesis_score?.toFixed(0)}). ${proprietary_deals[0].note}`
        : "No ultra-quiet Deep Dives right now — compete with judgment on contested names.",
      theme_flows.find((t) => t.posture === "whitespace")
        ? `White-space edge: ${theme_flows.find((t) => t.posture === "whitespace")!.theme} — ${theme_flows.find((t) => t.posture === "whitespace")!.counsel}`
        : `Capital is broadly contested across themes — selectivity is the product.`,
      syndicate_plays[0]?.call_list[0]
        ? `This week's unlock: call ${syndicate_plays[0].call_list[0].firm} on ${syndicate_plays[0].company_name} — ${syndicate_plays[0].call_list[0].reason}`
        : "Heatmap is the syndicate map — use it before every Deep Dive process.",
    ],
    must_do: [...new Set(must.map((m) => m.action))],
    watch: [...new Set(watch.map((m) => m.title))],
  };

  // defend insight: overlapping Deep Dives with same Tier-1
  const firmOverlap = intel.firms
    .map((f) => ({
      firm: f,
      deepOverlap: f.deals.filter((d) => {
        const c = byId.get(d.company_id);
        return c?.recommendation === "Deep Dive";
      }),
    }))
    .filter((x) => x.deepOverlap.length >= 2)
    .sort((a, b) => b.deepOverlap.length - a.deepOverlap.length);

  for (const ov of firmOverlap.slice(0, 2)) {
    insights.push({
      id: idOf("overlap", ov.firm.slug),
      kind: "race",
      urgency: "this_week",
      title: `You share ${ov.deepOverlap.length} Deep Dives with ${ov.firm.name}`,
      insight: `${ov.firm.name} is already on ${ov.deepOverlap.map((d) => d.company_name).join(", ")}. Expect process competition or a natural syndicate conversation.`,
      action: `Pick one name to partner on and one to win with proprietary access — don't fight them on every overlapping deal.`,
      evidence: ov.deepOverlap.map((d) => d.company_name || ""),
      score: 83,
      hrefs: [{ label: ov.firm.name, href: `/competitors/${ov.firm.slug}` }],
    });
  }

  insights.sort((a, b) => {
    const u = { now: 0, this_week: 1, monitor: 2 };
    return u[a.urgency] - u[b.urgency] || b.score - a.score;
  });

  const finalInsights = insights.slice(0, 14);

  return {
    insights: finalInsights,
    syndicate_plays,
    races: races.slice(0, 12),
    theme_flows: theme_flows.slice(0, 10),
    battle_cards,
    weekly_brief,
    proprietary_deals,
    stats: {
      insight_count: finalInsights.length,
      now_count: finalInsights.filter((i) => i.urgency === "now").length,
      proprietary_count: proprietary_deals.length,
      crowded_races: races.filter((r) => r.peer_count >= 5).length,
      whitespace_themes: theme_flows.filter((t) => t.posture === "whitespace").length,
    },
  };
}

export function circlingCompetitors(
  company: Company,
  intel: PeerIntelligence,
): {
  on_cap_table: { name: string; slug: string; is_lead: boolean }[];
  circling: {
    name: string;
    slug: string;
    reason: string;
    threat: "high" | "medium" | "low";
  }[];
  syndicate_suggestions: {
    firm: string;
    slug: string;
    reason: string;
    fit_score: number;
  }[];
} {
  const already = new Set((company.investors || []).map((x) => x.toLowerCase()));
  const on_cap_table = intel.firms
    .filter(
      (f) =>
        firmOnDeal(f, company.id) ||
        already.has(f.name.toLowerCase()) ||
        f.aliases.some((a) => already.has(a.toLowerCase())),
    )
    .map((f) => ({
      name: f.name,
      slug: f.slug,
      is_lead: f.deals.some((d) => d.company_id === company.id && d.is_lead),
    }));

  const comps = intel.comparables[company.id] || [];
  const circling: {
    name: string;
    slug: string;
    reason: string;
    threat: "high" | "medium" | "low";
  }[] = [];

  for (const f of intel.firms) {
    if (on_cap_table.some((x) => x.slug === f.slug)) continue;
    const onComp = comps.some((c) => firmOnDeal(f, c.company_id));
    const themeHit = f.top_themes.some((t) => t.theme === company.sector_theme);
    if (!onComp && !themeHit) continue;
    const threat: "high" | "medium" | "low" =
      onComp && themeHit ? "high" : onComp ? "medium" : "low";
    const compName = comps.find((c) => firmOnDeal(f, c.company_id))?.name;
    circling.push({
      name: f.name,
      slug: f.slug,
      reason: onComp
        ? `Already on comparable ${compName} — likely scanning this subsector.`
        : `Active in ${company.sector_theme} — natural next look.`,
      threat,
    });
  }
  circling.sort(
    (a, b) =>
      ({ high: 0, medium: 1, low: 2 })[a.threat] - ({ high: 0, medium: 1, low: 2 })[b.threat],
  );

  const syndicate_suggestions: {
    firm: string;
    slug: string;
    reason: string;
    fit_score: number;
  }[] = [];

  for (const pair of intel.heatmap.slice(0, 40)) {
    const aIn = already.has(pair.firm_a.toLowerCase());
    const bIn = already.has(pair.firm_b.toLowerCase());
    if (aIn === bIn) continue;
    const missing = aIn ? pair.firm_b : pair.firm_a;
    const present = aIn ? pair.firm_a : pair.firm_b;
    const firm = intel.firms.find(
      (f) =>
        f.name.toLowerCase() === missing.toLowerCase() ||
        f.aliases.some((al) => al.toLowerCase() === missing.toLowerCase()),
    );
    if (!firm || syndicate_suggestions.some((x) => x.firm === firm.name)) continue;
    const themeFit = firm.top_themes.some((t) => t.theme === company.sector_theme) ? 18 : 0;
    syndicate_suggestions.push({
      firm: firm.name,
      slug: firm.slug,
      reason: `Co-invests with ${present} (${pair.coinvest_count}×).${themeFit ? ` Active in ${company.sector_theme}.` : ""}`,
      fit_score: Math.round(pair.syndicate_score * 0.55 + themeFit + firm.conviction_score * 0.2),
    });
  }
  syndicate_suggestions.sort((a, b) => b.fit_score - a.fit_score);

  return {
    on_cap_table,
    circling: circling.slice(0, 6),
    syndicate_suggestions: syndicate_suggestions.slice(0, 5),
  };
}

export function formatGoldenBriefMarkdown(pack: GoldenPack): string {
  const b = pack.weekly_brief;
  return [
    `# ${b.subject}`,
    "",
    `## ${b.headline}`,
    "",
    ...b.paragraphs.map((p) => p),
    "",
    "## Must do",
    ...b.must_do.map((m) => `- ${m}`),
    "",
    "## Watch",
    ...b.watch.map((m) => `- ${m}`),
    "",
    "## Top golden insights",
    ...pack.insights.slice(0, 6).map(
      (i) => `- **[${i.urgency}] ${i.title}** — ${i.insight} → _${i.action}_`,
    ),
  ].join("\n");
}

// re-export type dependency used externally
export type { HeatRow };
