/**
 * Signal Forge — Partner Decision Physics
 *
 * Competitors score companies. Forge answers the question that decides careers:
 * "Where should scarce partner attention go this week — and can Thirdbase actually win?"
 *
 * Five surfaces (deterministic, grounded in pipeline + peer facts):
 * 1. Attention Capital — partner hours as scarce AUM
 * 2. Win Reality — competition × warm path × timing × check fit
 * 3. Raise Clock — silent raise windows before public noise
 * 4. Blind Spot Radar — thesis-fit names peers touch that aren't Hot
 * 5. Monday Moves — three irreversible commits before lunch
 */

import { buildWarmPaths } from "@/lib/atlas";
import type {
  AlertItem,
  Commentary,
  Company,
  PeerActivity,
  SectorCall,
} from "@/lib/types";
import { portfolioMix } from "@/lib/utils";

/* ─── types ─────────────────────────────────────────────────────────────── */

export type WinMove =
  | "sprint"
  | "secure_allocation"
  | "patient_watch"
  | "pass_politely"
  | "find_warm_path";

export type WinReality = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  thesis_score: number;
  recommendation: string;
  win_prob: number;
  competitive_intensity: number;
  warm_path_strength: number;
  timing_pressure: number;
  check_fit: number;
  move: WinMove;
  headline: string;
  counsel: string;
  forces: { label: string; score: number; note: string }[];
  peers_circling: string[];
  hours_to_spend: number;
};

export type AttentionBucket = {
  id: string;
  label: string;
  hours: number;
  pct: number;
  tone: "over" | "ok" | "under";
  note: string;
  company_ids: string[];
};

export type AttentionCapital = {
  week_budget_hours: number;
  allocated_hours: number;
  free_hours: number;
  utilization_pct: number;
  counsel: string;
  buckets: AttentionBucket[];
  misallocations: { title: string; detail: string; fix: string }[];
};

export type RaiseClock = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  thesis_score: number;
  recommendation: string;
  days_to_raise: number;
  confidence: "high" | "medium" | "low";
  clock_label: string;
  signals: string[];
  counsel: string;
  urgency: "imminent" | "this_quarter" | "watch";
};

export type BlindSpot = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  thesis_score: number;
  recommendation: string;
  peer_firms: string[];
  heat: number;
  why_blind: string;
  action: string;
  severity: "critical" | "high" | "medium";
};

export type MondayMoveKind =
  | "sprint_diligence"
  | "warm_intro"
  | "elevate_watch"
  | "kill_drain"
  | "blind_spot_pull";

export type MondayMove = {
  id: string;
  rank: number;
  kind: MondayMoveKind;
  title: string;
  why: string;
  company_id?: string;
  company_name?: string;
  slug?: string | null;
  hours: number;
  win_prob?: number;
  href: string;
  irreversible: string;
};

export type ForgePack = {
  generated_at: string;
  headline: string;
  subhead: string;
  punchline: string;
  win_realities: WinReality[];
  attention: AttentionCapital;
  raise_clocks: RaiseClock[];
  blind_spots: BlindSpot[];
  monday_moves: MondayMove[];
  kpis: {
    avg_win_prob: number;
    sprint_count: number;
    imminent_raises: number;
    blind_spot_count: number;
    free_hours: number;
  };
  markdown: string;
};

/* ─── helpers ───────────────────────────────────────────────────────────── */

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function daysSince(iso?: string | null) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 86_400_000));
}

function peersFor(companyId: string, peers: PeerActivity[]) {
  return peers.filter((p) => p.company_id === companyId);
}

function isHot(c: Company) {
  const age = daysSince(c.last_signal_date || c.last_round_date);
  return (
    c.recommendation === "Deep Dive" ||
    ((c.thesis_score || 0) >= 78 && age != null && age <= 30)
  );
}

/* ─── Win Reality ───────────────────────────────────────────────────────── */

function scoreCheckFit(c: Company): { score: number; note: string } {
  const round = c.last_round_size_m ?? 0;
  const stage = (c.stage || "").toLowerCase();
  // Thirdbase growth check heuristic: prefer $8–40M rounds, Series A/B
  if (round >= 8 && round <= 40 && /series\s*[ab]|growth|seed/i.test(stage || "series a")) {
    return { score: 88, note: `$${round}M round sits in Thirdbase check band` };
  }
  if (round > 80) {
    return { score: 38, note: `$${round}M is crowded mega-round — allocation scarce` };
  }
  if (round > 0 && round < 5) {
    return { score: 55, note: `$${round}M is early — ownership math may not work` };
  }
  if ((c.tier1_count || 0) >= 4) {
    return { score: 42, note: "Cap table already packed with Tier-1 — hard seat" };
  }
  return { score: 62, note: "Check fit uncertain — confirm ownership target" };
}

function scoreCompetition(c: Company, peers: PeerActivity[]): {
  score: number;
  note: string;
  firms: string[];
} {
  const hits = peersFor(c.id, peers);
  const firms = [...new Set(hits.map((p) => p.firm).filter(Boolean))];
  const n = firms.length;
  const tier1 = c.tier1_count || 0;
  // Higher intensity = harder to win (invert later for win_prob)
  let intensity = 20 + n * 18 + Math.min(30, tier1 * 8);
  if ((c.last_round_size_m || 0) > 50) intensity += 15;
  intensity = clamp(intensity, 8, 96);
  const note =
    n === 0
      ? "No peer activity logged — possible proprietary window"
      : `${n} peer firm${n === 1 ? "" : "s"} circling (${firms.slice(0, 3).join(", ")})`;
  return { score: intensity, note, firms };
}

function scoreTiming(c: Company): { score: number; note: string } {
  const age = daysSince(c.last_signal_date || c.last_round_date);
  const runway = c.runway_months_est;
  if (age != null && age <= 10) {
    return { score: 90, note: `Signal ${age}d old — window is open now` };
  }
  if (runway != null && runway <= 10) {
    return { score: 85, note: `~${runway}mo runway — raise pressure building` };
  }
  if (age != null && age <= 30) {
    return { score: 72, note: `${age}d since last signal — still actionable` };
  }
  if (age != null && age > 90) {
    return { score: 28, note: `${age}d stale — timing edge gone` };
  }
  return { score: 50, note: "Timing neutral — confirm founder process" };
}

function scoreWarm(
  companyId: string,
  warmById: Map<string, number>,
): { score: number; note: string } {
  const w = warmById.get(companyId) ?? 35 + (hash(companyId) % 25);
  if (w >= 80) return { score: w, note: "Strong simulated warm path (A-grade)" };
  if (w >= 60) return { score: w, note: "Usable warm path — draft the ask" };
  return { score: w, note: "Cold path — find a bridge before sprinting" };
}

function pickMove(
  winProb: number,
  competition: number,
  warm: number,
  timing: number,
): WinMove {
  if (winProb >= 68 && timing >= 70) return "sprint";
  if (winProb >= 55 && competition >= 60 && warm >= 55) return "secure_allocation";
  if (warm < 45 && winProb >= 50) return "find_warm_path";
  if (winProb < 35 || (competition >= 80 && warm < 50)) return "pass_politely";
  return "patient_watch";
}

function moveLabel(m: WinMove) {
  switch (m) {
    case "sprint":
      return "Sprint diligence";
    case "secure_allocation":
      return "Secure allocation";
    case "find_warm_path":
      return "Find warm path first";
    case "pass_politely":
      return "Pass politely";
    default:
      return "Patient watch";
  }
}

export function buildWinRealities(
  companies: Company[],
  peers: PeerActivity[],
): WinReality[] {
  const warmPaths = buildWarmPaths(companies, peers);
  const warmById = new Map(warmPaths.map((w) => [w.company_id, w.strength]));

  const candidates = companies
    .filter(
      (c) =>
        c.recommendation === "Deep Dive" ||
        c.recommendation === "Watch" ||
        (c.thesis_score || 0) >= 65,
    )
    .slice(0, 40);

  const rows: WinReality[] = candidates.map((c) => {
    const thesis = c.thesis_score || 0;
    const comp = scoreCompetition(c, peers);
    const warm = scoreWarm(c.id, warmById);
    const timing = scoreTiming(c);
    const check = scoreCheckFit(c);

    // Win = quality × access × timing × fit, penalized by competition
    const quality = clamp(thesis * 0.95);
    const access = warm.score;
    const raw =
      quality * 0.28 +
      access * 0.28 +
      timing.score * 0.2 +
      check.score * 0.14 +
      (100 - comp.score) * 0.1;
    const winProb = clamp(raw);
    const move = pickMove(winProb, comp.score, warm.score, timing.score);

    const hours =
      move === "sprint"
        ? 6
        : move === "secure_allocation"
          ? 4
          : move === "find_warm_path"
            ? 2
            : move === "pass_politely"
              ? 0.5
              : 1.5;

    const headline =
      move === "sprint"
        ? `Win window open — ${winProb}% if you move this week`
        : move === "secure_allocation"
          ? `Good company, contested room — win by relationship`
          : move === "find_warm_path"
            ? `Thesis fits; access is the bottleneck`
            : move === "pass_politely"
              ? `High quality, low win — don't burn partner hours`
              : `Hold powder — timing not yet forcing a sprint`;

    return {
      company_id: c.id,
      company_name: c.name,
      slug: c.slug,
      thesis_score: thesis,
      recommendation: c.recommendation || "Watch",
      win_prob: winProb,
      competitive_intensity: comp.score,
      warm_path_strength: warm.score,
      timing_pressure: timing.score,
      check_fit: check.score,
      move,
      headline,
      counsel: `${moveLabel(move)}. ${comp.note}.`,
      forces: [
        { label: "Thesis quality", score: quality, note: `Score ${thesis}` },
        { label: "Warm path", score: warm.score, note: warm.note },
        { label: "Timing", score: timing.score, note: timing.note },
        { label: "Check fit", score: check.score, note: check.note },
        {
          label: "Competition (drag)",
          score: comp.score,
          note: comp.note,
        },
      ],
      peers_circling: comp.firms.slice(0, 5),
      hours_to_spend: hours,
    };
  });

  return rows.sort((a, b) => {
    // Prioritize high win × high thesis with actionable moves
    const rank = (w: WinReality) => {
      const moveBoost =
        w.move === "sprint" ? 30 : w.move === "secure_allocation" ? 20 : w.move === "find_warm_path" ? 10 : 0;
      return w.win_prob * 0.6 + w.thesis_score * 0.25 + moveBoost;
    };
    return rank(b) - rank(a);
  });
}

/* ─── Attention Capital ─────────────────────────────────────────────────── */

export function buildAttentionCapital(
  companies: Company[],
  winRealities: WinReality[],
  alerts: AlertItem[],
): AttentionCapital {
  const WEEK = 28; // partner-hours available for sourcing/diligence this week
  const byId = new Map(winRealities.map((w) => [w.company_id, w]));

  const deep = companies.filter((c) => c.recommendation === "Deep Dive");
  const watch = companies.filter((c) => c.recommendation === "Watch");
  const stale = companies.filter((c) => c.is_stale);
  const sprint = winRealities.filter((w) => w.move === "sprint" || w.move === "secure_allocation");

  const deepHours = Math.min(
    14,
    deep.reduce((s, c) => s + (byId.get(c.id)?.hours_to_spend ?? 3), 0),
  );
  const sprintHours = Math.min(
    10,
    sprint.slice(0, 4).reduce((s, w) => s + w.hours_to_spend, 0),
  );
  const watchHours = Math.min(6, Math.ceil(watch.length * 0.35));
  const alertHours = Math.min(4, Math.ceil((alerts?.length || 0) * 0.25));
  const staleHours = Math.min(3, Math.ceil(stale.length * 0.15));
  // Drain: Pass / low-win Deep Dives partners keep debating
  const drains = winRealities.filter(
    (w) =>
      (w.recommendation === "Deep Dive" && w.win_prob < 40) ||
      w.move === "pass_politely",
  );
  const drainHours = Math.min(5, drains.length * 0.8);

  const buckets: AttentionBucket[] = [
    {
      id: "sprint",
      label: "Win sprints",
      hours: sprintHours,
      pct: 0,
      tone: "ok",
      note: "Deals where win probability justifies partner hours",
      company_ids: sprint.slice(0, 5).map((w) => w.company_id),
    },
    {
      id: "deep",
      label: "Deep Dive book",
      hours: deepHours,
      pct: 0,
      tone: deepHours > 12 ? "over" : "ok",
      note: "Active IC-track diligence",
      company_ids: deep.slice(0, 6).map((c) => c.id),
    },
    {
      id: "watch",
      label: "Watch radar",
      hours: watchHours,
      pct: 0,
      tone: watchHours > 5 ? "over" : "ok",
      note: "Light touch — raise clocks only",
      company_ids: watch.slice(0, 8).map((c) => c.id),
    },
    {
      id: "alerts",
      label: "Alerts & peers",
      hours: alertHours,
      pct: 0,
      tone: "ok",
      note: "Peer moves and high-severity alerts",
      company_ids: [],
    },
    {
      id: "stale",
      label: "Stale hygiene",
      hours: staleHours,
      pct: 0,
      tone: "ok",
      note: "Keep / Archive — never silent-delete",
      company_ids: stale.slice(0, 5).map((c) => c.id),
    },
    {
      id: "drain",
      label: "Attention drain",
      hours: drainHours,
      pct: 0,
      tone: drainHours >= 3 ? "over" : "under",
      note: "Low-win debates eating Monday",
      company_ids: drains.slice(0, 4).map((w) => w.company_id),
    },
  ];

  const allocated = buckets.reduce((s, b) => s + b.hours, 0);
  for (const b of buckets) {
    b.pct = allocated > 0 ? clamp((b.hours / allocated) * 100) : 0;
  }

  const free = Math.max(0, WEEK - allocated);
  const util = clamp((allocated / WEEK) * 100);

  const misallocations: AttentionCapital["misallocations"] = [];
  if (drainHours >= 3) {
    misallocations.push({
      title: "Low-win Deep Dives are taxing the week",
      detail: `${drains.length} names with win prob <40% or pass counsel still in debate.`,
      fix: "Kill or demote before Monday — free hours for sprints.",
    });
  }
  if (sprintHours < 4 && deep.length >= 3) {
    misallocations.push({
      title: "Deep Dive book without win sprints",
      detail: "Scoring without access/timing means diligence theater.",
      fix: "Open Forge Win Reality — pick 1–2 sprints only.",
    });
  }
  const mix = portfolioMix(companies.filter((c) => c.recommendation !== "Pass"));
  if (mix.tacticalPct > 50) {
    misallocations.push({
      title: "Attention skewed tactical vs 60/40",
      detail: `Live book is ${mix.dominantPct}/${mix.tacticalPct} dominant/tactical.`,
      fix: "Protect dominant-tech hours this week.",
    });
  }
  if (free < 2 && util > 95) {
    misallocations.push({
      title: "Zero slack in the week",
      detail: "No hours left for a surprise Hot Deal.",
      fix: "Cut one Watch and one drain before committing.",
    });
  }

  const counsel =
    free >= 4
      ? `You have ~${free}h of slack — spend it on the top win sprint, not another Watch.`
      : util > 100
        ? "Overbooked. Cut drains before adding diligence."
        : `Utilization ${util}%. Protect sprint hours; hygiene is not IC.`;

  return {
    week_budget_hours: WEEK,
    allocated_hours: Math.round(allocated * 10) / 10,
    free_hours: Math.round(free * 10) / 10,
    utilization_pct: util,
    counsel,
    buckets,
    misallocations,
  };
}

/* ─── Raise Clock ───────────────────────────────────────────────────────── */

export function buildRaiseClocks(
  companies: Company[],
  commentary: Commentary[],
  peers: PeerActivity[],
): RaiseClock[] {
  const watches = companies.filter(
    (c) =>
      c.recommendation === "Watch" ||
      c.recommendation === "Deep Dive" ||
      (c.thesis_score || 0) >= 60,
  );

  const clocks: RaiseClock[] = watches.map((c) => {
    const runway = c.runway_months_est;
    const growth = c.yoy_growth_pct || c.headcount_6m_growth_pct || 0;
    const age = daysSince(c.last_round_date);
    const peerN = peersFor(c.id, peers).length;
    const comments = commentary.filter((x) => x.company_id === c.id).length;

    let days = 120;
    const signals: string[] = [];

    if (runway != null && runway <= 8) {
      days = Math.min(days, Math.max(14, runway * 8));
      signals.push(`~${runway}mo runway`);
    } else if (runway != null && runway <= 14) {
      days = Math.min(days, 75);
      signals.push(`~${runway}mo runway — start of raise window`);
    }

    if (growth >= 80) {
      days = Math.min(days, days * 0.7);
      signals.push(`${Math.round(growth)}% growth — demand pull`);
    }
    if (peerN >= 2) {
      days = Math.min(days, 45);
      signals.push(`${peerN} peers already circling`);
    }
    if (age != null && age >= 400) {
      days = Math.min(days, 60);
      signals.push(`${Math.round(age / 30)}mo since last round`);
    } else if (age != null && age >= 280) {
      days = Math.min(days, 90);
      signals.push("Typical re-up cadence approaching");
    }
    if (comments >= 3) {
      days = Math.min(days, days * 0.85);
      signals.push("Commentary heat rising");
    }

    // Deterministic jitter so clocks feel distinct
    days = clamp(days + (hash(c.id) % 17) - 8, 10, 180);

    const urgency: RaiseClock["urgency"] =
      days <= 35 ? "imminent" : days <= 90 ? "this_quarter" : "watch";
    const confidence: RaiseClock["confidence"] =
      signals.length >= 3 ? "high" : signals.length >= 2 ? "medium" : "low";

    if (signals.length === 0) signals.push("Baseline cadence model");

    return {
      company_id: c.id,
      company_name: c.name,
      slug: c.slug,
      thesis_score: c.thesis_score || 0,
      recommendation: c.recommendation || "Watch",
      days_to_raise: days,
      confidence,
      clock_label:
        days <= 21
          ? `~${days}d — raise may already be quiet`
          : days <= 60
            ? `~${days}d to likely process`
            : `~${Math.round(days / 30)}mo horizon`,
      signals: signals.slice(0, 4),
      counsel:
        urgency === "imminent"
          ? "Get on the calendar before the banker blast."
          : urgency === "this_quarter"
            ? "Build the relationship now — don't wait for the email."
            : "Light touch; re-check after next signal.",
      urgency,
    };
  });

  return clocks
    .sort((a, b) => a.days_to_raise - b.days_to_raise)
    .slice(0, 14);
}

/* ─── Blind Spots ───────────────────────────────────────────────────────── */

export function buildBlindSpots(
  companies: Company[],
  peers: PeerActivity[],
): BlindSpot[] {
  const byId = new Map(companies.map((c) => [c.id, c]));
  const hotIds = new Set(companies.filter(isHot).map((c) => c.id));

  // Peer activity on thesis-flagged names that aren't in Hot
  const grouped = new Map<string, PeerActivity[]>();
  for (const p of peers) {
    if (!p.company_id) continue;
    const list = grouped.get(p.company_id) || [];
    list.push(p);
    grouped.set(p.company_id, list);
  }

  const spots: BlindSpot[] = [];
  for (const [cid, acts] of grouped) {
    const c = byId.get(cid);
    if (!c) continue;
    if (hotIds.has(cid) && c.recommendation === "Deep Dive") continue;
    const onThesis = acts.some((a) => a.on_thesis_flag) || (c.thesis_score || 0) >= 58;
    if (!onThesis) continue;

    const firms = [...new Set(acts.map((a) => a.firm).filter(Boolean))];
    if (firms.length === 0) continue;

    const heat = clamp(
      firms.length * 22 +
        (c.thesis_score || 50) * 0.35 +
        (acts.some((a) => a.thesis_shift) ? 15 : 0),
    );

    const why =
      c.recommendation === "Pass"
        ? `Peers still circling a Pass — either they're wrong or we are.`
        : hotIds.has(cid)
          ? `On Watch heat but not treated as Hot Deal.`
          : `Thesis-fit name with peer activity outside Hot Deals.`;

    const severity: BlindSpot["severity"] =
      heat >= 75 || firms.length >= 3
        ? "critical"
        : heat >= 55
          ? "high"
          : "medium";

    spots.push({
      company_id: c.id,
      company_name: c.name,
      slug: c.slug,
      thesis_score: c.thesis_score || 0,
      recommendation: c.recommendation || "Watch",
      peer_firms: firms.slice(0, 5),
      heat,
      why_blind: why,
      action:
        severity === "critical"
          ? "Pull into Monday agenda — decide elevate or reaffirm Pass."
          : "15-min partner skim before peers lock allocation.",
      severity,
    });
  }

  // Also: high thesis Watch with zero peer activity that look orphaned (inverse blind — proprietary)
  // Skip — that's Edge proprietary, not a blind spot.

  return spots.sort((a, b) => b.heat - a.heat).slice(0, 10);
}

/* ─── Monday Moves ──────────────────────────────────────────────────────── */

export function buildMondayMoves(
  winRealities: WinReality[],
  attention: AttentionCapital,
  raiseClocks: RaiseClock[],
  blindSpots: BlindSpot[],
): MondayMove[] {
  const moves: MondayMove[] = [];
  let rank = 1;

  const topSprint = winRealities.find((w) => w.move === "sprint");
  if (topSprint) {
    moves.push({
      id: `move_sprint_${topSprint.company_id}`,
      rank: rank++,
      kind: "sprint_diligence",
      title: `Sprint ${topSprint.company_name}`,
      why: topSprint.headline,
      company_id: topSprint.company_id,
      company_name: topSprint.company_name,
      slug: topSprint.slug,
      hours: topSprint.hours_to_spend,
      win_prob: topSprint.win_prob,
      href: `/company/${topSprint.slug || topSprint.company_id}`,
      irreversible: "Commit partner hours — this displaces one Watch debate.",
    });
  }

  const needWarm = winRealities.find((w) => w.move === "find_warm_path" || w.move === "secure_allocation");
  if (needWarm && moves.length < 3) {
    moves.push({
      id: `move_warm_${needWarm.company_id}`,
      rank: rank++,
      kind: "warm_intro",
      title: `Warm path for ${needWarm.company_name}`,
      why: needWarm.counsel,
      company_id: needWarm.company_id,
      company_name: needWarm.company_name,
      slug: needWarm.slug,
      hours: Math.max(1.5, needWarm.hours_to_spend * 0.6),
      win_prob: needWarm.win_prob,
      href: `/atlas`,
      irreversible: "Send the ask draft (human-confirm) — starts the relationship clock.",
    });
  }

  const imminent = raiseClocks.find((r) => r.urgency === "imminent");
  if (imminent && moves.length < 3) {
    moves.push({
      id: `move_elevate_${imminent.company_id}`,
      rank: rank++,
      kind: "elevate_watch",
      title: `Elevate ${imminent.company_name} before raise`,
      why: `${imminent.clock_label}. ${imminent.counsel}`,
      company_id: imminent.company_id,
      company_name: imminent.company_name,
      slug: imminent.slug,
      hours: 2,
      href: `/company/${imminent.slug || imminent.company_id}`,
      irreversible: "Promote to Deep Dive candidate — appears on next digest.",
    });
  }

  const drain = attention.buckets.find((b) => b.id === "drain");
  if (drain && drain.hours >= 2 && drain.company_ids[0] && moves.length < 3) {
    const id = drain.company_ids[0];
    const w = winRealities.find((x) => x.company_id === id);
    moves.push({
      id: `move_kill_${id}`,
      rank: rank++,
      kind: "kill_drain",
      title: `Kill attention drain${w ? `: ${w.company_name}` : ""}`,
      why: w?.counsel || drain.note,
      company_id: id,
      company_name: w?.company_name,
      slug: w?.slug,
      hours: 0.5,
      win_prob: w?.win_prob,
      href: w ? `/company/${w.slug || w.company_id}` : "/pipeline?rec=Pass",
      irreversible: "Reaffirm Pass / archive debate — frees hours permanently this week.",
    });
  }

  const blind = blindSpots[0];
  if (blind && moves.length < 3) {
    moves.push({
      id: `move_blind_${blind.company_id}`,
      rank: rank++,
      kind: "blind_spot_pull",
      title: `Pull blind spot: ${blind.company_name}`,
      why: blind.why_blind,
      company_id: blind.company_id,
      company_name: blind.company_name,
      slug: blind.slug,
      hours: 1.5,
      href: `/company/${blind.slug || blind.company_id}`,
      irreversible: "Force a decision: elevate or reaffirm Pass with peer context.",
    });
  }

  return moves.slice(0, 3).map((m, i) => ({ ...m, rank: i + 1 }));
}

/* ─── Pack ──────────────────────────────────────────────────────────────── */

export function buildForgePack(input: {
  companies: Company[];
  peers: PeerActivity[];
  commentary: Commentary[];
  sectors: SectorCall[];
  alerts: AlertItem[];
}): ForgePack {
  const { companies, peers, commentary, alerts } = input;
  const win_realities = buildWinRealities(companies, peers);
  const attention = buildAttentionCapital(companies, win_realities, alerts);
  const raise_clocks = buildRaiseClocks(companies, commentary, peers);
  const blind_spots = buildBlindSpots(companies, peers);
  const monday_moves = buildMondayMoves(
    win_realities,
    attention,
    raise_clocks,
    blind_spots,
  );

  const sprints = win_realities.filter((w) => w.move === "sprint");
  const avgWin =
    win_realities.length > 0
      ? clamp(
          win_realities.slice(0, 8).reduce((s, w) => s + w.win_prob, 0) /
            Math.min(8, win_realities.length),
        )
      : 0;
  const imminent = raise_clocks.filter((r) => r.urgency === "imminent").length;

  const top = monday_moves[0];
  const headline = top
    ? `This week’s singularity: ${top.title}`
    : "Forge is quiet — protect attention capital";
  const subhead =
    "Scoring says what’s good. Forge says what you can win — and what deserves partner hours.";
  const punchline =
    attention.free_hours >= 3
      ? `${attention.free_hours}h of slack · ${sprints.length} sprint window${sprints.length === 1 ? "" : "s"} · ${blind_spots.length} blind spot${blind_spots.length === 1 ? "" : "s"}`
      : `Over-allocated · cut drains before adding diligence · ${imminent} imminent raise${imminent === 1 ? "" : "s"}`;

  const markdown = formatForgeBriefMarkdown({
    headline,
    subhead,
    punchline,
    win_realities,
    attention,
    raise_clocks,
    blind_spots,
    monday_moves,
  });

  return {
    generated_at: new Date().toISOString(),
    headline,
    subhead,
    punchline,
    win_realities,
    attention,
    raise_clocks,
    blind_spots,
    monday_moves,
    kpis: {
      avg_win_prob: avgWin,
      sprint_count: sprints.length,
      imminent_raises: imminent,
      blind_spot_count: blind_spots.length,
      free_hours: attention.free_hours,
    },
    markdown,
  };
}

export function formatForgeBriefMarkdown(p: {
  headline: string;
  subhead: string;
  punchline: string;
  win_realities: WinReality[];
  attention: AttentionCapital;
  raise_clocks: RaiseClock[];
  blind_spots: BlindSpot[];
  monday_moves: MondayMove[];
}) {
  const lines: string[] = [
    `# Signal Forge — Monday Decision Brief`,
    ``,
    `**${p.headline}**`,
    p.subhead,
    ``,
    p.punchline,
    ``,
    `## Monday Moves (irreversible)`,
  ];
  for (const m of p.monday_moves) {
    lines.push(
      `${m.rank}. **${m.title}** (${m.hours}h)${m.win_prob != null ? ` · win ${m.win_prob}%` : ""}`,
    );
    lines.push(`   ${m.why}`);
    lines.push(`   _${m.irreversible}_`);
  }
  lines.push(``, `## Win Reality (top)`);
  for (const w of p.win_realities.slice(0, 6)) {
    lines.push(
      `- **${w.company_name}** — ${w.win_prob}% · ${moveLabel(w.move)} · ${w.headline}`,
    );
  }
  lines.push(``, `## Attention Capital`);
  lines.push(
    `Budget ${p.attention.week_budget_hours}h · allocated ${p.attention.allocated_hours}h · free ${p.attention.free_hours}h (${p.attention.utilization_pct}% util)`,
  );
  lines.push(p.attention.counsel);
  for (const m of p.attention.misallocations) {
    lines.push(`- **${m.title}** — ${m.fix}`);
  }
  lines.push(``, `## Raise Clocks (imminent)`);
  for (const r of p.raise_clocks.filter((x) => x.urgency !== "watch").slice(0, 5)) {
    lines.push(`- **${r.company_name}** — ${r.clock_label} · ${r.counsel}`);
  }
  lines.push(``, `## Blind Spots`);
  for (const b of p.blind_spots.slice(0, 5)) {
    lines.push(
      `- **${b.company_name}** [${b.severity}] — ${b.peer_firms.join(", ")} · ${b.action}`,
    );
  }
  lines.push(``, `_Signal Forge · Thirdbase · attention is the scarce AUM_`);
  return lines.join("\n");
}

export function moveKindLabel(k: MondayMoveKind) {
  switch (k) {
    case "sprint_diligence":
      return "Sprint";
    case "warm_intro":
      return "Warm path";
    case "elevate_watch":
      return "Elevate";
    case "kill_drain":
      return "Kill drain";
    case "blind_spot_pull":
      return "Blind spot";
  }
}
