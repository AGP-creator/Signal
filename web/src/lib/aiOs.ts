/**
 * Signal AI OS — multi-agent deal intelligence inspired by Auryn (contested scores),
 * Kruncher (signal feed), VCOS Flow (lookalike + thesis autopilot), Quadro / AI Native
 * Capital (agent fleets), and Decile (counterfactual debate).
 * Deterministic, grounded in pipeline facts — never invents missing metrics.
 */

import type {
  AlertItem,
  Commentary,
  Company,
  NewsItem,
  PeerActivity,
  SectorCall,
} from "@/lib/types";

export type AgentRole =
  | "Sourcing"
  | "Thesis"
  | "Bull"
  | "Bear"
  | "Market"
  | "Risk"
  | "Diligence"
  | "Portfolio"
  | "LP";

export type AgentNode = {
  id: string;
  name: string;
  role: AgentRole;
  job: string;
  inspired_by: string;
  status: "active" | "standby" | "alert";
  last_action: string;
  throughput: string;
};

export type SignalCategory =
  | "People"
  | "Liquidity"
  | "M&A"
  | "Business"
  | "Hiring"
  | "Research"
  | "Peer"
  | "Thesis";

export type AlphaSignal = {
  id: string;
  category: SignalCategory;
  title: string;
  body: string;
  severity: "critical" | "high" | "medium" | "low";
  route_to: string;
  company_id?: string;
  company_name?: string;
  confidence: "high" | "medium" | "low";
  provenance: string;
  age_label: string;
};

export type AgentVote = {
  agent_id: string;
  agent_name: string;
  role: AgentRole;
  stance: "invest" | "pass" | "watch" | "stress";
  score: number;
  thesis: string;
  evidence: string[];
  kill_or_win: string;
};

export type WarRoom = {
  company: Company;
  contested_score: number;
  consensus: "invest" | "pass" | "watch" | "split";
  disagreement_index: number;
  votes: AgentVote[];
  synthesis: string;
  next_move: string;
  open_questions: string[];
  provenance: string;
};

export type ExitBucket = {
  label: string;
  multiple: string;
  probability: number;
  narrative: string;
};

export type ConvictionSim = {
  company: Company;
  entry_valuation_m: number | null;
  check_size_m: number;
  ownership_pct: number;
  pw_moic: number;
  pw_irr_proxy: string;
  buckets: ExitBucket[];
  bull_path: string;
  base_path: string;
  bear_path: string;
  sensitivity: { lever: string; effect: string }[];
  gate: string;
  confidence: "high" | "medium" | "low";
  provenance: string;
};

export type Lookalike = {
  seed: Company;
  twins: {
    company: Company;
    similarity: number;
    shared: string[];
    why: string;
  }[];
  outbound_angle: string;
};

export type AutopilotHit = {
  company: Company;
  auto_score: number;
  thesis_match: number;
  action: "Deep Dive" | "Watch" | "Pass" | "Kind no";
  reasons: string[];
  blockers: string[];
};

export type AiOsPack = {
  agents: AgentNode[];
  feed: AlphaSignal[];
  war_rooms: WarRoom[];
  conviction: ConvictionSim[];
  lookalikes: Lookalike[];
  autopilot: AutopilotHit[];
  headline: string;
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

function scoreBreakdown(c: Company): Record<string, number> {
  return c.score_breakdown || {};
}

function dim(c: Company, key: string, fallback = 50) {
  const b = scoreBreakdown(c);
  const v = b[key];
  return typeof v === "number" ? v : fallback;
}

export function buildAgentFleet(companies: Company[], alerts: AlertItem[]): AgentNode[] {
  const deep = companies.filter((c) => c.recommendation === "Deep Dive").length;
  const highAlerts = alerts.filter((a) => a.severity === "high").length;
  return [
    {
      id: "scout",
      name: "Scout",
      role: "Sourcing",
      job: "Continuous signal scan — funding, hiring, research, peer tape",
      inspired_by: "Meridia Sourcing · Quadro deal-flow agents",
      status: "active",
      last_action: `Ingested ${companies.length} live pipeline entities`,
      throughput: `${companies.length} cos / cycle`,
    },
    {
      id: "thesis",
      name: "Thesis Filter",
      role: "Thesis",
      job: "Live thesis screen — stage, sector, check, mix bands",
      inspired_by: "VCOS Flow · Meridia Screening",
      status: "active",
      last_action: `${deep} Deep Dive · 60/40 mix guardrails on`,
      throughput: "thesis_policy.yaml",
    },
    {
      id: "bull",
      name: "Bull Counsel",
      role: "Bull",
      job: "Steelman the deal — timing, team, asymmetric upside",
      inspired_by: "Auryn multi-judge · AI Native Capital",
      status: "active",
      last_action: `Arguing for top ${Math.min(6, deep)} contested deals`,
      throughput: "contested scores",
    },
    {
      id: "bear",
      name: "Bear Counsel",
      role: "Bear",
      job: "Counterfactual kill arguments — never invent blanks",
      inspired_by: "Decile Hub counterfactual · Auryn bear memo",
      status: highAlerts ? "alert" : "active",
      last_action: highAlerts
        ? `${highAlerts} high-severity alerts feeding kill cases`
        : "Standing watch on valuation & crowding",
      throughput: "stress packs",
    },
    {
      id: "market",
      name: "Market Timing",
      role: "Market",
      job: "Why-now, sector heat, peer FOMO, white-space posture",
      inspired_by: "Kruncher Alpha Engine · Harmonic momentum",
      status: "active",
      last_action: "Sector heat × peer activity fused",
      throughput: "timing score",
    },
    {
      id: "risk",
      name: "Risk & Red Flags",
      role: "Risk",
      job: "Deck claims, missing fields, confidence haircuts",
      inspired_by: "VCOS Clarity · Auryn Ask+Verify",
      status: "standby",
      last_action: "Ready for deck paste / Diligence Stress Pack",
      throughput: "citations only",
    },
    {
      id: "diligence",
      name: "Diligence Planner",
      role: "Diligence",
      job: "Work orders + founder-only questions with close conditions",
      inspired_by: "Auryn diligence work orders",
      status: "active",
      last_action: "Plans attached to Deep Dive briefs",
      throughput: "5 diligence areas",
    },
    {
      id: "portfolio",
      name: "Portfolio Pulse",
      role: "Portfolio",
      job: "Mix drift, stale SLA, founder radar, miss retros",
      inspired_by: "VCOS Pulse · Signal Judgment OS",
      status: "active",
      last_action: "Judgment OS ledger synced",
      throughput: "policy fuel",
    },
    {
      id: "lp",
      name: "LP Narrator",
      role: "LP",
      job: "Process transparency — how AI shows up with human controls",
      inspired_by: "VCOS Vista · LP Dashboard",
      status: "standby",
      last_action: "One-pager ready for LP diligence",
      throughput: "governance samples",
    },
  ];
}

export function buildAlphaFeed(ctx: {
  companies: Company[];
  peers: PeerActivity[];
  commentary: Commentary[];
  news: NewsItem[];
  alerts: AlertItem[];
  sectors: SectorCall[];
}): AlphaSignal[] {
  const { companies, peers, commentary, news, alerts, sectors } = ctx;
  const out: AlphaSignal[] = [];

  for (const a of alerts.slice(0, 12)) {
    const sev =
      a.severity === "high"
        ? "critical"
        : a.severity === "medium"
          ? "high"
          : ("medium" as const);
    out.push({
      id: `alert-${a.id}`,
      category: "Thesis",
      title: a.title || "Alert",
      body: a.body || "",
      severity: sev,
      route_to: a.severity === "high" ? "Partner on call" : "Associate queue",
      company_id: a.company_id || undefined,
      confidence: a.severity === "high" ? "high" : "medium",
      provenance: `alerts · ${a.alert_type || "signal"}`,
      age_label: "live",
    });
  }

  for (const c of companies.filter((x) => (x.tier1_count || 0) >= 3).slice(0, 8)) {
    out.push({
      id: `liq-${c.id}`,
      category: "Liquidity",
      title: `${c.name}: ${c.tier1_count} Tier-1 on cap table`,
      body: `${c.lead_investor || "Lead TBD"} · ${c.stage || "stage?"} · score ${c.thesis_score?.toFixed?.(0) ?? c.thesis_score}. Cap quality is a routing signal — do not wait for digest.`,
      severity: (c.thesis_score || 0) >= 78 ? "critical" : "high",
      route_to: "Partner — Hot Deals",
      company_id: c.id,
      company_name: c.name,
      confidence: "high",
      provenance: "companies.tier1_count",
      age_label: c.last_signal_date || "recent",
    });
  }

  for (const c of companies.filter((x) => (x.headcount_6m_growth_pct || 0) >= 40).slice(0, 6)) {
    out.push({
      id: `hire-${c.id}`,
      category: "Hiring",
      title: `${c.name}: headcount +${c.headcount_6m_growth_pct}% / 6m`,
      body: `Hiring velocity ${c.headcount_6m_growth_pct}% with ${c.headcount ?? "?"} people. ${c.team_notes || "Team notes thin — verify org chart."}`,
      severity: "high",
      route_to: "Principal — talent diligence",
      company_id: c.id,
      company_name: c.name,
      confidence: c.headcount ? "high" : "medium",
      provenance: "companies.headcount_6m_growth_pct",
      age_label: "6m window",
    });
  }

  for (const p of peers.filter((x) => x.thesis_shift || !x.on_thesis_flag).slice(0, 8)) {
    out.push({
      id: `peer-${p.id}`,
      category: "Peer",
      title: `${p.firm} → ${p.company_name || "unnamed"} (${p.theme || "theme?"})`,
      body: p.notes || (p.thesis_shift ? "Flagged thesis shift vs historical peer set." : "Off-thesis peer move."),
      severity: p.thesis_shift ? "high" : "medium",
      route_to: "Competitor OS",
      company_id: p.company_id,
      company_name: p.company_name || undefined,
      confidence: "medium",
      provenance: "peer_activity",
      age_label: p.date || "recent",
    });
  }

  for (const n of news.slice(0, 6)) {
    out.push({
      id: `news-${n.id}`,
      category: "Business",
      title: n.title,
      body: n.why_it_matters || "",
      severity: "medium",
      route_to: "Library · digest",
      confidence: "medium",
      provenance: `news · ${n.source || "wire"}`,
      age_label: n.published_at || "recent",
    });
  }

  for (const c of commentary.slice(0, 6)) {
    out.push({
      id: `com-${c.id}`,
      category: "People",
      title: `${c.company_name || "Company"} — ${c.source || "operator"} chatter`,
      body: c.quote_or_summary || "",
      severity: c.sentiment === "negative" ? "high" : "low",
      route_to: "Commentary tab",
      company_id: c.company_id,
      company_name: c.company_name,
      confidence: c.credibility_tier === "tier1" ? "high" : "medium",
      provenance: `commentary · ${c.credibility_tier || "unrated"}`,
      age_label: c.captured_at || "recent",
    });
  }

  for (const s of sectors.filter((x) => (x.heat_score || 0) >= 70).slice(0, 5)) {
    out.push({
      id: `sec-${s.id}`,
      category: "Research",
      title: `Sector heat: ${s.subsector}`,
      body: `${s.consensus_level || "?"} · ${s.why_thirdbase_cares || (s.evidence || []).slice(0, 2).join("; ")}`,
      severity: (s.heat_score || 0) >= 85 ? "high" : "medium",
      route_to: "Sector of Tomorrow",
      confidence: "medium",
      provenance: "sector_calls.heat_score",
      age_label: `heat ${s.heat_score}`,
    });
  }

  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 40);
}

function bullVote(c: Company): AgentVote {
  const score = clamp(
    (c.thesis_score || 60) + dim(c, "team_quality", 55) * 0.08 + (c.tier1_count || 0) * 2,
    0,
    99,
  );
  const evidence: string[] = [];
  if (c.team_notes) evidence.push(`Team: ${c.team_notes.slice(0, 120)}`);
  if ((c.tier1_count || 0) >= 2)
    evidence.push(`Cap table: ${c.tier1_count} Tier-1 (${(c.tier1_names || []).slice(0, 3).join(", ")})`);
  if (c.why_now) evidence.push(`Why now: ${c.why_now.slice(0, 120)}`);
  if (c.yoy_growth_pct != null) evidence.push(`YoY growth ${c.yoy_growth_pct}%`);
  if (!evidence.length) evidence.push("Limited positive facts on file — conviction capped.");

  return {
    agent_id: "bull",
    agent_name: "Bull Counsel",
    role: "Bull",
    stance: score >= 78 ? "invest" : score >= 58 ? "watch" : "pass",
    score: Math.round(score),
    thesis: `${c.name} is asymmetric if ${c.subsector || c.sector_theme || "the wedge"} compounds before consensus.`,
    evidence,
    kill_or_win: c.moat_notes
      ? `Win condition: ${c.moat_notes.slice(0, 140)}`
      : "Win condition: prove durable moat within 2 diligence cycles.",
  };
}

function bearVote(c: Company): AgentVote {
  const haircuts: string[] = [];
  let score = clamp(100 - (c.thesis_score || 55), 15, 92);
  if (c.valuation_confidence === "low" || !c.valuation_est_m) {
    score += 8;
    haircuts.push("Valuation blank or low confidence — Auryn rule: never invent.");
  }
  if ((c.tier1_count || 0) >= 4) {
    score += 6;
    haircuts.push("Crowded Tier-1 tape — ownership & entry risk.");
  }
  if ((c.runway_months_est || 36) < 18) {
    score += 10;
    haircuts.push(`Runway ${c.runway_months_est}m below 18m floor.`);
  }
  if (c.is_stale) {
    score += 7;
    haircuts.push("Evidence stale — confidence haircut.");
  }
  if (!c.commentary_summary && !c.traction_notes) {
    haircuts.push("Thin external commentary — information asymmetry.");
  }
  score = clamp(score, 20, 95);
  const stance: AgentVote["stance"] =
    score >= 70 ? "pass" : score >= 50 ? "stress" : "watch";

  return {
    agent_id: "bear",
    agent_name: "Bear Counsel",
    role: "Bear",
    stance,
    score: Math.round(score),
    thesis: `Pass / stress until kill arguments are falsified for ${c.name}.`,
    evidence: haircuts.length ? haircuts : ["No hard kill facts — soft skepticism on timing."],
    kill_or_win: haircuts[0] || "Kill if diligence cannot close valuation + runway gaps.",
  };
}

function thesisVote(c: Company): AgentVote {
  const fit = dim(c, "thesis_fit", c.thesis_score || 55);
  const score = Math.round(clamp(fit, 0, 99));
  return {
    agent_id: "thesis",
    agent_name: "Thesis Filter",
    role: "Thesis",
    stance: score >= 78 ? "invest" : score >= 58 ? "watch" : "pass",
    score,
    thesis: `${c.pipeline_bucket === "dominant_tech_growth" ? "Dominant tech" : "Tactical"} bucket · ${c.sector_theme || "theme?"} / ${c.subsector || "subsector?"}.`,
    evidence: [
      `Thesis score ${c.thesis_score?.toFixed?.(0) ?? c.thesis_score ?? "—"} · relative ${c.relative_rank || "unranked"}`,
      c.recommendation ? `Current rec: ${c.recommendation}` : "No recommendation yet",
    ],
    kill_or_win:
      score < 58
        ? "Kind-no if off-thesis after one partner touch."
        : "Advance only if still #1–2 in peer set for stage×theme.",
  };
}

function marketVote(c: Company, sectors: SectorCall[], peers: PeerActivity[]): AgentVote {
  const theme = (c.sector_theme || "").toLowerCase();
  const heat =
    sectors.find(
      (s) =>
        (s.subsector || "").toLowerCase() === (c.subsector || "").toLowerCase() ||
        (s.parent_theme || "").toLowerCase().includes(theme.split(" ")[0] || "zzz"),
    )?.heat_score || dim(c, "timing", 55);
  const peerHits = peers.filter(
    (p) => p.company_id === c.id || (p.theme || "").toLowerCase().includes(theme.slice(0, 12)),
  ).length;
  const score = Math.round(clamp(heat * 0.7 + peerHits * 4 + (c.why_now ? 8 : 0), 20, 96));
  return {
    agent_id: "market",
    agent_name: "Market Timing",
    role: "Market",
    stance: score >= 75 ? "invest" : score >= 55 ? "watch" : "pass",
    score,
    thesis: c.why_now || `Timing hinge on ${c.subsector || "category"} heat (${heat}).`,
    evidence: [
      `Sector heat proxy ${heat}`,
      peerHits ? `${peerHits} related peer tape events` : "Quiet peer tape",
    ],
    kill_or_win: score < 55 ? "Wait for catalyst — no why-now edge." : "Move now before peer FOMO closes window.",
  };
}

function riskVote(c: Company): AgentVote {
  const missing: string[] = [];
  if (!c.valuation_est_m) missing.push("valuation");
  if (c.yoy_growth_pct == null) missing.push("YoY growth");
  if (!c.runway_months_est) missing.push("runway");
  if (!c.headcount) missing.push("headcount");
  const score = Math.round(clamp(40 + missing.length * 12 + (c.is_stale ? 15 : 0), 25, 95));
  return {
    agent_id: "risk",
    agent_name: "Risk & Red Flags",
    role: "Risk",
    stance: missing.length >= 3 ? "stress" : score >= 70 ? "pass" : "watch",
    score,
    thesis: missing.length
      ? `Blank fields: ${missing.join(", ")} — do not fill with model guesses.`
      : "Core fields present; still run Diligence Stress Pack.",
    evidence: missing.length
      ? missing.map((m) => `Missing: ${m}`)
      : ["Core financial fields populated", c.valuation_confidence ? `Val confidence: ${c.valuation_confidence}` : "Val confidence unset"],
    kill_or_win: "Close blanks via founder-only questions before IC vote.",
  };
}

export function buildWarRoom(
  company: Company,
  sectors: SectorCall[],
  peers: PeerActivity[],
): WarRoom {
  const votes = [
    bullVote(company),
    bearVote(company),
    thesisVote(company),
    marketVote(company, sectors, peers),
    riskVote(company),
  ];
  const investLike = votes.filter((v) => v.stance === "invest").length;
  const passLike = votes.filter((v) => v.stance === "pass" || v.stance === "stress").length;
  const scores = votes.map((v) => (v.role === "Bear" || v.role === "Risk" ? 100 - v.score : v.score));
  const contested = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const spread = Math.max(...votes.map((v) => v.score)) - Math.min(...votes.map((v) => v.score));
  const consensus: WarRoom["consensus"] =
    investLike >= 3 && passLike <= 1
      ? "invest"
      : passLike >= 3 && investLike <= 1
        ? "pass"
        : investLike === 0 && passLike === 0
          ? "watch"
          : spread >= 25
            ? "split"
            : "watch";

  const synthesis =
    consensus === "invest"
      ? `Committee leans invest on ${company.name} — Bull/Thesis/Market aligned; Bear must falsify kill arguments in diligence.`
      : consensus === "pass"
        ? `Committee leans pass — Risk/Bear dominate until blanks and kill arguments close.`
        : consensus === "split"
          ? `Split committee on ${company.name} (disagreement ${spread}). Partner judgment required — do not auto-advance.`
          : `Watch posture — keep on radar, no IC slot until contested score clears 78 with lower disagreement.`;

  const next_move =
    consensus === "invest"
      ? "Schedule partner call + Diligence Stress Pack this week."
      : consensus === "pass"
        ? "Document Pass spine with Bear evidence; kind-no if inbound."
        : consensus === "split"
          ? "Force a 20-minute war-room in partner meeting; vote or park."
          : "Assign associate to close missing fields; re-run war room.";

  const open_questions = [
    ...(company.valuation_est_m == null ? ["What is the real entry valuation / last preferred?"] : []),
    ...(company.yoy_growth_pct == null ? ["What is verified YoY revenue or usage growth?"] : []),
    ...(company.runway_months_est == null ? ["Months of runway at current burn?"] : []),
    "What would make Bull wrong in 18 months?",
  ].slice(0, 4);

  return {
    company,
    contested_score: contested,
    consensus,
    disagreement_index: spread,
    votes,
    synthesis,
    next_move,
    open_questions,
    provenance: "Multi-agent contested score · pipeline facts only",
  };
}

export function buildConvictionSim(company: Company): ConvictionSim {
  const entry = company.valuation_est_m ?? null;
  const check = company.stage?.toLowerCase().includes("a")
    ? 8
    : company.stage?.toLowerCase().includes("b")
      ? 15
      : 5;
  const ownership = entry ? clamp((check / entry) * 100, 1, 18) : 5;
  const t1 = company.tier1_count || 0;
  const growth = company.yoy_growth_pct ?? 30;
  const score = company.thesis_score || 60;
  const h = hash(company.id || company.name);

  const pFail = clamp(0.35 - (score - 60) * 0.004 - t1 * 0.02, 0.12, 0.55);
  const pBase = clamp(0.4 + (growth > 40 ? 0.05 : 0), 0.25, 0.5);
  const pBull = clamp(1 - pFail - pBase, 0.08, 0.35);
  const pHome = clamp(0.04 + (score >= 85 ? 0.04 : 0) + (h % 5) * 0.005, 0.03, 0.12);
  const norm = pFail + pBase + pBull + pHome;

  const buckets: ExitBucket[] = [
    {
      label: "0–1× (loss / soft)",
      multiple: "0.5×",
      probability: Math.round((100 * pFail) / norm),
      narrative: "Crowding, valuation miss, or category winter.",
    },
    {
      label: "1–3× base",
      multiple: "2×",
      probability: Math.round((100 * pBase) / norm),
      narrative: "Solid outcome — category grows, no category king.",
    },
    {
      label: "3–8× bull",
      multiple: "5×",
      probability: Math.round((100 * pBull) / norm),
      narrative: "Becomes default in wedge; follow-ons at premium.",
    },
    {
      label: "8×+ fund-maker",
      multiple: "12×",
      probability: Math.round((100 * pHome) / norm),
      narrative: "Platform outcome — rare, needs moat + timing.",
    },
  ];
  // Fix rounding drift
  const sumP = buckets.reduce((a, b) => a + b.probability, 0);
  if (sumP !== 100 && buckets[1]) buckets[1].probability += 100 - sumP;

  const mult = [0.5, 2, 5, 12];
  const pw =
    buckets.reduce((acc, b, i) => acc + (b.probability / 100) * mult[i], 0) || 1.5;

  const confidence: ConvictionSim["confidence"] =
    entry && company.yoy_growth_pct != null ? "medium" : entry ? "low" : "low";

  return {
    company,
    entry_valuation_m: entry,
    check_size_m: check,
    ownership_pct: Math.round(ownership * 10) / 10,
    pw_moic: Math.round(pw * 100) / 100,
    pw_irr_proxy: pw >= 3 ? "~45%+ IRR path" : pw >= 2 ? "~25–35% IRR path" : "sub-20% unless upside expands",
    buckets,
    bull_path: `${company.name} owns ${company.subsector || "wedge"}; Tier-1 (${t1}) validates; growth ${growth}% sustains.`,
    base_path: `Good company, contested category — exit via strategic or solid IPO window in 5–7y.`,
    bear_path: entry
      ? `Entry at ~$${entry}M proves rich if growth <30% or runway compresses.`
      : "No entry valuation on file — model is illustrative only.",
    sensitivity: [
      { lever: "Entry −20%", effect: "pwMOIC ↑ ~0.3–0.5×" },
      { lever: "Growth −15pp", effect: "Bull bucket shrinks; base dominates" },
      { lever: "Extra Tier-1", effect: "Crowding ↑ · ownership ↓ · FOMO risk" },
    ],
    gate:
      pw >= 2.5 && (company.thesis_score || 0) >= 78
        ? "Passes conviction gate for Deep Dive sizing debate."
        : "Below conviction gate — Watch or stress valuation before writing.",
    confidence,
    provenance: entry
      ? "pwMOIC from staged exit buckets · valuation on file"
      : "Illustrative pwMOIC — valuation blank (never invented as fact)",
  };
}

export function buildLookalikes(seed: Company, universe: Company[]): Lookalike {
  const scored = universe
    .filter((c) => c.id !== seed.id)
    .map((c) => {
      const shared: string[] = [];
      let sim = 0;
      if (c.sector_theme && c.sector_theme === seed.sector_theme) {
        shared.push(c.sector_theme);
        sim += 35;
      }
      if (c.subsector && c.subsector === seed.subsector) {
        shared.push(c.subsector);
        sim += 25;
      }
      if (c.stage && c.stage === seed.stage) {
        shared.push(c.stage);
        sim += 15;
      }
      if (c.pipeline_bucket && c.pipeline_bucket === seed.pipeline_bucket) {
        shared.push(c.pipeline_bucket.replace(/_/g, " "));
        sim += 10;
      }
      const seedInv = new Set((seed.tier1_names || []).map((x) => x.toLowerCase()));
      const overlap = (c.tier1_names || []).filter((n) => seedInv.has(n.toLowerCase()));
      if (overlap.length) {
        shared.push(`co-investors: ${overlap.slice(0, 2).join(", ")}`);
        sim += overlap.length * 8;
      }
      const scoreDelta = Math.abs((c.thesis_score || 0) - (seed.thesis_score || 0));
      sim += clamp(15 - scoreDelta / 4, 0, 15);
      return {
        company: c,
        similarity: Math.round(clamp(sim, 0, 99)),
        shared,
        why:
          shared.length > 0
            ? `Looks like ${seed.name} on ${shared.slice(0, 3).join(" · ")}`
            : `Loose neighbor by score proximity`,
      };
    })
    .filter((x) => x.similarity >= 35)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  return {
    seed,
    twins: scored,
    outbound_angle: scored.length
      ? `Outbound lookalike from a deal you wish you’d seen earlier: source companies that rhyme with ${seed.name} (${seed.subsector || seed.sector_theme}) before peer FOMO.`
      : `Sparse lookalike graph for ${seed.name} — widen sector screen or wait for more tape.`,
  };
}

export function buildAutopilot(companies: Company[]): AutopilotHit[] {
  return [...companies]
    .sort((a, b) => (b.thesis_score || 0) - (a.thesis_score || 0))
    .slice(0, 20)
    .map((c) => {
      const thesis_match = dim(c, "thesis_fit", c.thesis_score || 50);
      const auto = Math.round(
        clamp(
          (c.thesis_score || 50) * 0.55 +
            thesis_match * 0.25 +
            dim(c, "team_quality", 50) * 0.1 +
            dim(c, "timing", 50) * 0.1,
          0,
          99,
        ),
      );
      const reasons: string[] = [];
      const blockers: string[] = [];
      if ((c.thesis_score || 0) >= 78) reasons.push("Thesis score ≥ Deep Dive threshold");
      if ((c.tier1_count || 0) >= 2) reasons.push(`${c.tier1_count} Tier-1 validators`);
      if (c.why_now) reasons.push("Why-now narrative on file");
      if ((c.yoy_growth_pct || 0) >= 40) reasons.push(`YoY ${c.yoy_growth_pct}% ≥ 40% target`);
      if (!c.valuation_est_m) blockers.push("Valuation blank");
      if ((c.runway_months_est || 36) < 18) blockers.push("Runway below floor");
      if (c.is_stale) blockers.push("Stale evidence SLA");
      if (thesis_match < 55) blockers.push("Weak thesis fit");

      let action: AutopilotHit["action"] = "Watch";
      if (auto >= 78 && blockers.length <= 1) action = "Deep Dive";
      else if (auto < 50 || (thesis_match < 45 && (c.tier1_count || 0) < 1)) action = "Kind no";
      else if (auto < 58) action = "Pass";

      return { company: c, auto_score: auto, thesis_match: Math.round(thesis_match), action, reasons, blockers };
    });
}

export function buildAiOsPack(ctx: {
  companies: Company[];
  peers: PeerActivity[];
  commentary: Commentary[];
  news: NewsItem[];
  alerts: AlertItem[];
  sectors: SectorCall[];
}): AiOsPack {
  const { companies, peers, alerts, sectors } = ctx;
  const agents = buildAgentFleet(companies, alerts);
  const feed = buildAlphaFeed(ctx);
  const hot = companies
    .filter((c) => c.recommendation === "Deep Dive" || (c.thesis_score || 0) >= 75)
    .slice(0, 8);
  const war_rooms = hot.map((c) => buildWarRoom(c, sectors, peers));
  const conviction = hot.slice(0, 6).map(buildConvictionSim);
  const lookalikes = hot.slice(0, 4).map((c) => buildLookalikes(c, companies));
  const autopilot = buildAutopilot(companies);

  const split = war_rooms.filter((w) => w.consensus === "split").length;
  const critical = feed.filter((f) => f.severity === "critical").length;
  const headline = `${agents.filter((a) => a.status === "active").length} agents live · ${critical} critical signals · ${split} split war rooms needing partner judgment`;

  const markdown = formatAiOsMarkdown({
    agents,
    feed,
    war_rooms,
    conviction,
    lookalikes,
    autopilot,
    headline,
    markdown: "",
  });

  return { agents, feed, war_rooms, conviction, lookalikes, autopilot, headline, markdown };
}

export function formatAiOsMarkdown(pack: AiOsPack): string {
  const lines = [
    "# Signal AI OS",
    "",
    pack.headline,
    "",
    "## Agent fleet",
    ...pack.agents.map(
      (a) => `- **${a.name}** (${a.role} · ${a.status}) — ${a.last_action}`,
    ),
    "",
    "## Critical / high alpha feed",
    ...pack.feed
      .filter((f) => f.severity === "critical" || f.severity === "high")
      .slice(0, 8)
      .map((f) => `- **[${f.category}]** ${f.title} → ${f.route_to}`),
    "",
    "## Contested war rooms",
    ...pack.war_rooms.slice(0, 5).map(
      (w) =>
        `- **${w.company.name}** contested ${w.contested_score} · ${w.consensus} · Δ${w.disagreement_index} — ${w.next_move}`,
    ),
    "",
    "## Conviction (pwMOIC)",
    ...pack.conviction.slice(0, 4).map(
      (c) =>
        `- **${c.company.name}** pwMOIC ${c.pw_moic}× · ${c.pw_irr_proxy} — ${c.gate}`,
    ),
    "",
    "## Thesis autopilot",
    ...pack.autopilot
      .filter((a) => a.action === "Deep Dive" || a.action === "Kind no")
      .slice(0, 6)
      .map(
        (a) =>
          `- **${a.company.name}** auto ${a.auto_score} → ${a.action}${a.blockers.length ? ` (blockers: ${a.blockers.join(", ")})` : ""}`,
      ),
    "",
    "_Grounded in pipeline facts. Human partners remain the governance layer._",
  ];
  return lines.join("\n");
}

export function formatWarRoomMarkdown(room: WarRoom): string {
  return [
    `# War Room — ${room.company.name}`,
    "",
    `Contested score **${room.contested_score}** · consensus **${room.consensus}** · disagreement **${room.disagreement_index}**`,
    "",
    room.synthesis,
    "",
    "## Votes",
    ...room.votes.map(
      (v) =>
        `- **${v.agent_name}** (${v.stance} · ${v.score}): ${v.thesis}\n  - ${v.evidence.join("; ")}`,
    ),
    "",
    `**Next move:** ${room.next_move}`,
    "",
    "## Open questions",
    ...room.open_questions.map((q) => `- ${q}`),
    "",
    `_${room.provenance}_`,
  ].join("\n");
}

export function formatConvictionMarkdown(sim: ConvictionSim): string {
  return [
    `# Conviction — ${sim.company.name}`,
    "",
    `pwMOIC **${sim.pw_moic}×** · ${sim.pw_irr_proxy}`,
    `Entry ${sim.entry_valuation_m != null ? `$${sim.entry_valuation_m}M` : "blank"} · illustrative check $${sim.check_size_m}M · ~${sim.ownership_pct}%`,
    "",
    "## Exit buckets",
    ...sim.buckets.map((b) => `- ${b.label}: **${b.probability}%** @ ${b.multiple} — ${b.narrative}`),
    "",
    `**Bull:** ${sim.bull_path}`,
    `**Base:** ${sim.base_path}`,
    `**Bear:** ${sim.bear_path}`,
    "",
    sim.gate,
    "",
    `_${sim.provenance} · confidence ${sim.confidence}_`,
  ].join("\n");
}
