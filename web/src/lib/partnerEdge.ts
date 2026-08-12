/**
 * Partner Edge OS: unique judgment surfaces competitors don't ship:
 * anti consensus radar, conviction clocks, partner twin, reference call factory,
 * thesis what if, pass autopsy, velocity board, pre mortem theater.
 */

import {
  buildBearCase,
  companyToSubject,
  type KillArgument,
} from "@/lib/diligence";
import {
  buildPolicyFuel,
  type PartnerOverride,
  type PolicyFuel,
} from "@/lib/judgment";
import type { Commentary, Company, PeerActivity, SectorCall } from "@/lib/types";
import { portfolioMix } from "@/lib/utils";

export type EdgePosture = "proprietary" | "contested" | "crowded" | "trap" | "quiet";

export type AntiConsensusDeal = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  thesis_score: number;
  recommendation: string;
  posture: EdgePosture;
  peer_count: number;
  peers: string[];
  edge_score: number;
  title: string;
  insight: string;
  action: string;
  why: string[];
};

export type ConvictionClock = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  thesis_score: number;
  recommendation: string;
  peer_pressure: number;
  fomo_index: number;
  patience_alpha: number;
  signal_age_days: number | null;
  counsel: "act_this_week" | "patience_is_alpha" | "race" | "cool_off";
  headline: string;
  detail: string;
  clock_label: string;
};

export type TwinStance = "lean_in" | "align" | "push_back" | "hard_pass";

export type PartnerTwinPrediction = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  signal_rec: string;
  thesis_score: number;
  predicted: TwinStance;
  confidence: "high" | "medium" | "low";
  twin_score: number;
  rationale: string;
  dimension_tensions: { dim: string; signal: number; twin_bias: string }[];
};

export type PartnerTwin = {
  dna_summary: string;
  override_count: number;
  raised_bars: PolicyFuel[];
  lowered_bars: PolicyFuel[];
  style_tags: string[];
  predictions: PartnerTwinPrediction[];
  seeded: boolean;
};

export type RefCallTarget =
  | "customer"
  | "ex_employee"
  | "co_investor"
  | "domain_expert"
  | "competitor_user";

export type ReferenceCall = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  thesis_score: number;
  opener: string;
  targets: { kind: RefCallTarget; label: string; why: string }[];
  questions: { q: string; probes: string; source: string }[];
  landmines: string[];
  markdown: string;
};

export type WhatIfWeights = {
  thesis_fit: number;
  team_quality: number;
  cap_table: number;
  traction: number;
  moat: number;
  valuation: number;
  runway: number;
  tam_exit: number;
  timing: number;
};

export type WhatIfRow = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  base_score: number;
  new_score: number;
  delta: number;
  base_rec: string;
  new_rec: string;
  flipped: boolean;
  bucket: string;
};

export type WhatIfResult = {
  weights: WhatIfWeights;
  rows: WhatIfRow[];
  entered_deep_dive: WhatIfRow[];
  exited_deep_dive: WhatIfRow[];
  counsel: string;
};

export type PassAutopsy = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  thesis_score: number;
  peer_count: number;
  peers: string[];
  tier1_count: number;
  autopsy_score: number;
  lesson: string;
  regret_risk: "high" | "medium" | "low";
  reopen: boolean;
  evidence: string[];
};

export type VelocityDeal = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  thesis_score: number;
  recommendation: string;
  velocity: number;
  drivers: string[];
  signal_age_days: number | null;
  headcount_growth?: number | null;
  commentary_count: number;
};

export type PreMortem = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  thesis_score: number;
  premise: string;
  failure_modes: {
    mode: string;
    probability: "high" | "medium" | "low";
    early_warning: string;
    hedge: string;
  }[];
  kill_arguments: KillArgument[];
  ic_line: string;
};

export type EdgePack = {
  summary: {
    headline: string;
    must_do: string[];
    proprietary_count: number;
    trap_count: number;
    act_now_count: number;
    autopsy_high: number;
  };
  anti_consensus: AntiConsensusDeal[];
  clocks: ConvictionClock[];
  twin: PartnerTwin;
  reference_calls: ReferenceCall[];
  velocity: VelocityDeal[];
  autopsies: PassAutopsy[];
  pre_mortems: PreMortem[];
  default_weights: WhatIfWeights;
};

export const DEFAULT_WEIGHTS: WhatIfWeights = {
  thesis_fit: 0.2,
  team_quality: 0.15,
  cap_table: 0.15,
  traction: 0.15,
  moat: 0.1,
  valuation: 0.1,
  runway: 0.05,
  tam_exit: 0.05,
  timing: 0.05,
};

/** Demo DNA so Partner Twin always works in interviews even before overrides. */
export const SEED_TWIN_OVERRIDES: PartnerOverride[] = [
  {
    id: "seed_ov_1",
    company_id: "seed_a",
    company_name: "SeedCo Alpha",
    signal_rec: "Deep Dive",
    partner_rec: "Watch",
    partner: "Partner",
    reason: "Cap table thin; wait for a second Tier-1 before IC time.",
    dimension_hint: "cap_table",
    created_at: "2026-07-01T10:00:00Z",
  },
  {
    id: "seed_ov_2",
    company_id: "seed_b",
    company_name: "SeedCo Beta",
    signal_rec: "Watch",
    partner_rec: "Deep Dive",
    partner: "Partner",
    reason: "Moat underscored; proprietary data loop is the whole company.",
    dimension_hint: "moat",
    created_at: "2026-07-08T10:00:00Z",
  },
  {
    id: "seed_ov_3",
    company_id: "seed_c",
    company_name: "SeedCo Gamma",
    signal_rec: "Deep Dive",
    partner_rec: "Pass",
    partner: "Partner",
    reason: "Entry valuation stretched vs sector comps; growth not compensating.",
    dimension_hint: "valuation",
    created_at: "2026-07-15T10:00:00Z",
  },
  {
    id: "seed_ov_4",
    company_id: "seed_d",
    company_name: "SeedCo Delta",
    signal_rec: "Pass",
    partner_rec: "Watch",
    partner: "Partner",
    reason: "Team pedigree outweighs early traction noise; keep on radar.",
    dimension_hint: "team_quality",
    created_at: "2026-07-22T10:00:00Z",
  },
  {
    id: "seed_ov_5",
    company_id: "seed_e",
    company_name: "SeedCo Epsilon",
    signal_rec: "Watch",
    partner_rec: "Pass",
    partner: "Partner",
    reason: "Theme fit is cosmetic, not dominant tech/growth for our 60% sleeve.",
    dimension_hint: "thesis_fit",
    created_at: "2026-07-29T10:00:00Z",
  },
];

const AS_OF = new Date("2026-08-10");

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.round((AS_OF.getTime() - d.getTime()) / 86_400_000));
}

function peersForCompany(companyId: string, peers: PeerActivity[]) {
  const rows = peers.filter((p) => p.company_id === companyId);
  const firms = [...new Set(rows.map((p) => p.firm).filter(Boolean))];
  return { rows, firms, count: firms.length };
}

function recOf(c: Company) {
  return c.recommendation || "Pass";
}

function scoreOf(c: Company) {
  return c.thesis_score ?? 0;
}

function breakdownOf(c: Company): Record<string, number> {
  return c.score_breakdown || {};
}

function weightedScore(bd: Record<string, number>, w: WhatIfWeights): number {
  let sum = 0;
  let tw = 0;
  for (const [k, weight] of Object.entries(w)) {
    sum += (bd[k] ?? 50) * weight;
    tw += weight;
  }
  return Math.round(sum / (tw || 1));
}

function recFromScore(score: number, tier1: number): string {
  if (score >= 78 && (tier1 >= 2 || score >= 83)) return "Deep Dive";
  if (score >= 58) return "Watch";
  return "Pass";
}

function normalizeWeights(w: WhatIfWeights): WhatIfWeights {
  const entries = Object.entries(w) as [keyof WhatIfWeights, number][];
  const total = entries.reduce((s, [, v]) => s + Math.max(0, v), 0) || 1;
  const out = { ...w };
  for (const [k, v] of entries) out[k] = Math.max(0, v) / total;
  return out;
}

export function buildAntiConsensus(
  companies: Company[],
  peers: PeerActivity[],
  sectors: SectorCall[],
): AntiConsensusDeal[] {
  const deals: AntiConsensusDeal[] = [];

  for (const c of companies) {
    const score = scoreOf(c);
    const rec = recOf(c);
    if (score < 55 && rec === "Pass") continue;

    const { firms, count } = peersForCompany(c.id, peers);
    const quiet = count <= 1;
    const crowded = count >= 3;
    const highConviction = rec === "Deep Dive" || score >= 75;
    const mid = score >= 60 && score < 75;

    let posture: EdgePosture = "quiet";
    let edge = 0;
    let title = "";
    let insight = "";
    let action = "";

    if (highConviction && quiet) {
      posture = "proprietary";
      edge = score + 20 - count * 5;
      title = `Proprietary window: ${c.name}`;
      insight = `High conviction (${score}) with almost no peer capital circling. This is the rare quiet tape Thirdbase can own before consensus forms.`;
      action = "Protect the window: partner call this week, then Soft Circle before the tape heats.";
    } else if (highConviction && crowded) {
      posture = "crowded";
      edge = score - count * 4;
      title = `Crowded race: ${c.name}`;
      insight = `${count} peer firms already on the cap table / activity log. Conviction is real, but price and access risk are rising.`;
      action = "Decide lane now: lead path, co invest ask, or Pass on process; don't half diligence a race.";
    } else if (mid && crowded && score < 72) {
      posture = "trap";
      edge = 90 - score + count * 6;
      title = `Consensus trap: ${c.name}`;
      insight = `Peer FOMO (${count} firms) outruns thesis score (${score}). Classic coverage tool bait: looks hot, ranks soft vs Thirdbase criteria.`;
      action = "Document a clean Pass with peer FOMO noted, or force a kill criteria diligence before any IC time.";
    } else if (highConviction && count === 2) {
      posture = "contested";
      edge = score - 5;
      title = `Contested: ${c.name}`;
      insight = `Two peers in-orbit. Still winnable with judgment, not coverage volume.`;
      action = "Map warm paths to both circling firms; pick a differentiated angle before term sheet season.";
    } else {
      continue;
    }

    deals.push({
      company_id: c.id,
      company_name: c.name,
      slug: c.slug,
      thesis_score: score,
      recommendation: rec,
      posture,
      peer_count: count,
      peers: firms.slice(0, 5),
      edge_score: Math.round(edge),
      title,
      insight,
      action,
      why: [
        `Thesis ${score} · ${rec}`,
        count ? `Peers: ${firms.slice(0, 4).join(", ")}` : "No peer activity logged",
        c.relative_rank ? `Relative rank ${c.relative_rank}` : "Cohort rank pending",
        c.sector_theme || c.subsector || "Theme n/a",
      ],
    });
  }

  // Sector-level contrarian edges
  for (const s of sectors.filter((x) => (x.consensus_level || "").toLowerCase() === "contrarian").slice(0, 3)) {
    deals.push({
      company_id: `sector_${s.id}`,
      company_name: s.subsector,
      slug: null,
      thesis_score: s.heat_score || 0,
      recommendation: "Sector call",
      posture: "proprietary",
      peer_count: 0,
      peers: [],
      edge_score: (s.heat_score || 50) + 15,
      title: `Contrarian sector: ${s.subsector}`,
      insight: s.why_thirdbase_cares || "Emerging before consensus; heat without crowd.",
      action: "Scan for Watch skeletons in this subsector before peer capital floods.",
      why: [
        `Heat ${(s.heat_score || 0).toFixed(0)} · consensus ${s.consensus_level}`,
        ...(s.evidence || []).slice(0, 2),
        (s.top_companies || []).slice(0, 3).join(", ") || "No named cos yet",
      ],
    });
  }

  return deals.sort((a, b) => b.edge_score - a.edge_score);
}

export function buildConvictionClocks(
  companies: Company[],
  peers: PeerActivity[],
): ConvictionClock[] {
  return companies
    .filter((c) => recOf(c) === "Deep Dive" || scoreOf(c) >= 70)
    .map((c) => {
      const score = scoreOf(c);
      const { count } = peersForCompany(c.id, peers);
      const age = daysSince(c.last_signal_date);
      const timingBoost = age == null ? 40 : age <= 14 ? 95 : age <= 30 ? 80 : age <= 60 ? 55 : 30;
      const fomo = Math.min(100, count * 22 + (timingBoost > 80 ? 15 : 0));
      const patience = Math.max(0, Math.min(100, score - count * 12 + (quietBonus(count))));
      let counsel: ConvictionClock["counsel"] = "cool_off";
      if (score >= 78 && count <= 1) counsel = "patience_is_alpha";
      else if (score >= 78 && count >= 3) counsel = "race";
      else if (score >= 72 && (age == null || age <= 21) && count >= 1) counsel = "act_this_week";
      else if (score < 65 || (age != null && age > 90)) counsel = "cool_off";
      else if (patience >= 70) counsel = "patience_is_alpha";
      else counsel = "act_this_week";

      const headlines: Record<ConvictionClock["counsel"], string> = {
        act_this_week: "Act this week",
        patience_is_alpha: "Patience is alpha",
        race: "Race: pick a lane",
        cool_off: "Cool off",
      };
      const details: Record<ConvictionClock["counsel"], string> = {
        act_this_week: `Signal freshness + thesis ${score} say partner time now, before the window closes or peers set terms.`,
        patience_is_alpha: `Quiet tape + strong thesis. Forcing a process burns the proprietary window; deepen diligence without signaling urgency.`,
        race: `${count} peers are already circling. Half measures lose; lead path, co invest, or Pass with spine.`,
        cool_off: `Either thesis softens or evidence aged out. Don't let FOMO reopen a cool deal.`,
      };

      return {
        company_id: c.id,
        company_name: c.name,
        slug: c.slug,
        thesis_score: score,
        recommendation: recOf(c),
        peer_pressure: count,
        fomo_index: Math.round(fomo),
        patience_alpha: Math.round(patience),
        signal_age_days: age,
        counsel,
        headline: headlines[counsel],
        detail: details[counsel],
        clock_label:
          counsel === "act_this_week"
            ? "≤7 days"
            : counsel === "race"
              ? "48-72h"
              : counsel === "patience_is_alpha"
                ? "2-4 weeks"
                : "park",
      };
    })
    .sort((a, b) => {
      const order = { race: 0, act_this_week: 1, patience_is_alpha: 2, cool_off: 3 };
      return order[a.counsel] - order[b.counsel] || b.thesis_score - a.thesis_score;
    });
}

function quietBonus(count: number) {
  return count === 0 ? 18 : count === 1 ? 8 : 0;
}

export function buildPartnerTwin(
  companies: Company[],
  overrides: PartnerOverride[],
): PartnerTwin {
  const seeded = overrides.length === 0;
  const effective = seeded ? SEED_TWIN_OVERRIDES : overrides;
  const fuel = buildPolicyFuel(effective);
  const raised = fuel.filter((f) => f.direction === "raise_bar");
  const lowered = fuel.filter((f) => f.direction === "lower_bar");

  const raiseSet = new Set(raised.map((f) => f.dimension));
  const lowerSet = new Set(lowered.map((f) => f.dimension));

  const style_tags: string[] = [];
  if (raiseSet.has("cap_table") || raiseSet.has("valuation")) style_tags.push("Price & syndicate disciplined");
  if (lowerSet.has("moat") || lowerSet.has("team_quality")) style_tags.push("Founder / moat lean in");
  if (raiseSet.has("thesis_fit")) style_tags.push("60% sleeve guardian");
  if (raiseSet.has("traction")) style_tags.push("Evidence first");
  if (!style_tags.length) style_tags.push("Balanced judgment");

  const dna_summary = seeded
    ? "Demo twin loaded from typical Thirdbase override DNA (cap table & valuation bars up; moat & team bars flexible). Log real overrides in Judgment OS to personalize."
    : `Twin trained on ${effective.length} partner override${effective.length === 1 ? "" : "s"}. Raised bars: ${
        raised.map((r) => r.dimension).join(", ") || "none"
      }. Lowered: ${lowered.map((r) => r.dimension).join(", ") || "none"}.`;

  const predictions: PartnerTwinPrediction[] = companies
    .filter((c) => recOf(c) === "Deep Dive" || recOf(c) === "Watch" || scoreOf(c) >= 68)
    .slice(0, 12)
    .map((c) => {
      const bd = breakdownOf(c);
      const tensions: PartnerTwinPrediction["dimension_tensions"] = [];
      let twinAdj = 0;

      for (const dim of Object.keys(DEFAULT_WEIGHTS)) {
        const v = bd[dim] ?? 50;
        if (raiseSet.has(dim) && v < 65) {
          twinAdj -= (65 - v) * 0.35;
          tensions.push({ dim, signal: v, twin_bias: "raise bar: weak here" });
        } else if (lowerSet.has(dim) && v >= 70) {
          twinAdj += (v - 65) * 0.25;
          tensions.push({ dim, signal: v, twin_bias: "partner lean in dim" });
        } else if (raiseSet.has(dim) && v >= 80) {
          twinAdj += 4;
        }
      }

      const twin_score = Math.round(scoreOf(c) + twinAdj);
      let predicted: TwinStance = "align";
      if (twin_score >= scoreOf(c) + 6 && twin_score >= 72) predicted = "lean_in";
      else if (twin_score <= scoreOf(c) - 10 && twin_score < 60) predicted = "hard_pass";
      else if (twin_score < scoreOf(c) - 5) predicted = "push_back";

      const confidence: PartnerTwinPrediction["confidence"] =
        effective.length >= 4 && tensions.length ? "high" : effective.length >= 2 ? "medium" : "low";

      const rationale =
        predicted === "lean_in"
          ? `Twin leans harder than Signal; partner DNA likes dimensions that are already strong here.`
          : predicted === "hard_pass"
            ? `Twin would kill this; hits raised bars (${tensions
                .filter((t) => t.twin_bias.includes("raise"))
                .map((t) => t.dim)
                .join(", ") || "policy"}).`
            : predicted === "push_back"
              ? `Twin pushes back on Signal's ${recOf(c)}; watch the weak dims partners historically punish.`
              : `Twin roughly aligns with Signal's ${recOf(c)}.`;

      return {
        company_id: c.id,
        company_name: c.name,
        slug: c.slug,
        signal_rec: recOf(c),
        thesis_score: scoreOf(c),
        predicted,
        confidence,
        twin_score,
        rationale,
        dimension_tensions: tensions.slice(0, 4),
      };
    })
    .sort((a, b) => {
      const order = { hard_pass: 0, push_back: 1, lean_in: 2, align: 3 };
      return order[a.predicted] - order[b.predicted];
    });

  return {
    dna_summary,
    override_count: effective.length,
    raised_bars: raised,
    lowered_bars: lowered,
    style_tags,
    predictions,
    seeded,
  };
}

const DIM_QUESTIONS: Record<string, { q: string; probes: string; target: RefCallTarget }> = {
  traction: {
    q: "What does usage / revenue look like when you strip the logo slide?",
    probes: "Net retention, concentration, sales cycle, expansion vs new logo.",
    target: "customer",
  },
  moat: {
    q: "If a well-funded copycat shipped the same product tomorrow, what still holds?",
    probes: "Data loop, switching costs, distribution, regulation.",
    target: "domain_expert",
  },
  team_quality: {
    q: "Who actually ships, and who sells the vision?",
    probes: "Prior ship history, attrition, decision rights between founders.",
    target: "ex_employee",
  },
  cap_table: {
    q: "How did the last round actually clear, and who passed?",
    probes: "Who led vs followed, any structured terms, insider vs outsider demand.",
    target: "co_investor",
  },
  valuation: {
    q: "At this entry, what exit do you need to clear fund math?",
    probes: "Comps, dilution path, secondary pressure.",
    target: "co_investor",
  },
  thesis_fit: {
    q: "Is this dominant tech/growth, or a tactical feature company wearing a platform story?",
    probes: "Budget owner, replace vs augment, category creation proof.",
    target: "domain_expert",
  },
  runway: {
    q: "What is the real burn and the next hire wave that breaks the plan?",
    probes: "Cash vs claimed runway, commitment vs LOI pipeline.",
    target: "ex_employee",
  },
  tam_exit: {
    q: "Who writes the check at exit: strategic or financial, and why them?",
    probes: "Acquirer shortlist, IPO path credibility, competitive overlap.",
    target: "domain_expert",
  },
  timing: {
    q: "Why is this raise happening now: growth or bridge?",
    probes: "Inbound vs outbound process, competing term sheets.",
    target: "co_investor",
  },
};

export function buildReferenceCalls(
  companies: Company[],
  peers: PeerActivity[],
): ReferenceCall[] {
  return companies
    .filter((c) => recOf(c) === "Deep Dive" || scoreOf(c) >= 75)
    .slice(0, 8)
    .map((c) => {
      const bd = breakdownOf(c);
      const weak = Object.entries(bd)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 4);
      const bear = buildBearCase(companyToSubject(c));
      const { firms } = peersForCompany(c.id, peers);

      const questions = weak.map(([dim, v]) => {
        const tmpl = DIM_QUESTIONS[dim] || DIM_QUESTIONS.traction;
        return {
          q: tmpl.q,
          probes: `${tmpl.probes} (Signal ${dim}=${Math.round(v)})`,
          source: `score_breakdown.${dim}`,
        };
      });

      for (const k of bear.kill_arguments.slice(0, 2)) {
        questions.push({
          q: `Stress test: ${k.title}?`,
          probes: k.argument,
          source: `bear:${k.severity}`,
        });
      }

      const targets: ReferenceCall["targets"] = [
        {
          kind: "customer",
          label: "Design-partner / power user",
          why: "Falsify traction and switching-cost claims without founder narration.",
        },
        {
          kind: "ex_employee",
          label: "Recent departure (eng or GTM)",
          why: "Culture, shipping velocity, and what the deck won't say.",
        },
        {
          kind: "co_investor",
          label: firms[0] ? `${firms[0]} partner` : "Existing Tier-1",
          why: "Process temperature, structure, and who else is circling.",
        },
        {
          kind: "domain_expert",
          label: `${c.subsector || c.sector_theme || "Category"} operator`,
          why: "Moat & TAM reality check vs peer FOMO.",
        },
      ];

      const landmines = bear.kill_arguments.slice(0, 3).map((k) => k.title);
      const opener = `We're diligence-ing ${c.name} (${c.stage || "stage n/a"} · ${
        c.subsector || "theme n/a"
      }). Not asking you to sell us; asking what would make a sharp partner Pass.`;

      const markdown = [
        `# Reference calls: ${c.name}`,
        "",
        opener,
        "",
        "## Who to call",
        ...targets.map((t) => `- **${t.label}** (${t.kind}): ${t.why}`),
        "",
        "## Questions",
        ...questions.map(
          (q, i) => `${i + 1}. ${q.q}\n   - Probe: ${q.probes}\n   - Source: ${q.source}`,
        ),
        "",
        "## Landmines from bear case",
        ...landmines.map((l) => `- ${l}`),
        "",
        "_Never auto-send. Partner edits tone._",
      ].join("\n");

      return {
        company_id: c.id,
        company_name: c.name,
        slug: c.slug,
        thesis_score: scoreOf(c),
        opener,
        targets,
        questions: questions.slice(0, 7),
        landmines,
        markdown,
      };
    });
}

export function runWhatIf(companies: Company[], weights: WhatIfWeights): WhatIfResult {
  const w = normalizeWeights(weights);
  const rows: WhatIfRow[] = companies.map((c) => {
    const base = scoreOf(c);
    const neu = weightedScore(breakdownOf(c), w);
    const base_rec = recOf(c);
    const new_rec = recFromScore(neu, c.tier1_count || 0);
    return {
      company_id: c.id,
      company_name: c.name,
      slug: c.slug,
      base_score: base,
      new_score: neu,
      delta: neu - base,
      base_rec,
      new_rec,
      flipped: base_rec !== new_rec,
      bucket: c.pipeline_bucket || "unknown",
    };
  });

  const sorted = [...rows].sort((a, b) => b.new_score - a.new_score);
  const entered = sorted.filter((r) => r.base_rec !== "Deep Dive" && r.new_rec === "Deep Dive");
  const exited = sorted.filter((r) => r.base_rec === "Deep Dive" && r.new_rec !== "Deep Dive");

  const counsel =
    entered.length || exited.length
      ? `Under this lens, ${entered.length} name(s) enter Deep Dive and ${exited.length} exit. Re-run IC priorities before trusting the old Hot Deals list.`
      : "Recommendation spine holds under this weight set; conviction is robust to the tweak.";

  return {
    weights: w,
    rows: sorted.slice(0, 40),
    entered_deep_dive: entered.slice(0, 8),
    exited_deep_dive: exited.slice(0, 8),
    counsel,
  };
}

export function buildPassAutopsies(
  companies: Company[],
  peers: PeerActivity[],
): PassAutopsy[] {
  const rows: PassAutopsy[] = [];
  for (const c of companies) {
    if (!(recOf(c) === "Pass" || scoreOf(c) < 58)) continue;
    const { firms, count } = peersForCompany(c.id, peers);
    const t1 = c.tier1_count || 0;
    const autopsy = count * 18 + t1 * 12 + (c.headcount_6m_growth_pct || 0) * 0.3;
    if (autopsy < 25 && t1 < 2) continue;

    const regret: PassAutopsy["regret_risk"] =
      autopsy >= 55 || (count >= 2 && t1 >= 2) ? "high" : autopsy >= 35 ? "medium" : "low";

    const lesson =
      regret === "high"
        ? "Peers and Tier-1 density disagree with our Pass; reopen with a miss retro frame, don't silently ignore."
        : regret === "medium"
          ? "Soft regret risk. Log why we Pass so Judgment OS can learn if velocity shows up later."
          : "Pass still looks clean; keep as negative example for training.";

    rows.push({
      company_id: c.id,
      company_name: c.name,
      slug: c.slug,
      thesis_score: scoreOf(c),
      peer_count: count,
      peers: firms.slice(0, 5),
      tier1_count: t1,
      autopsy_score: Math.round(autopsy),
      lesson,
      regret_risk: regret,
      reopen: regret === "high",
      evidence: [
        `Signal ${recOf(c)} @ ${scoreOf(c)}`,
        count ? `${count} peer firm(s): ${firms.slice(0, 3).join(", ")}` : "No peer activity",
        `${t1} Tier-1 on cap table`,
        c.why_now?.slice(0, 120) || "No why_now",
      ],
    });
  }
  return rows.sort((a, b) => b.autopsy_score - a.autopsy_score).slice(0, 10);
}

export function buildVelocityBoard(
  companies: Company[],
  commentary: Commentary[],
): VelocityDeal[] {
  const byCo = new Map<string, number>();
  for (const c of commentary) {
    byCo.set(c.company_id, (byCo.get(c.company_id) || 0) + 1);
  }

  const rows: VelocityDeal[] = [];
  for (const c of companies) {
    const age = daysSince(c.last_signal_date);
    const comments = byCo.get(c.id) || 0;
    const growth = c.headcount_6m_growth_pct;
    const drivers: string[] = [];
    let velocity = scoreOf(c) * 0.25;

    if (age != null && age <= 14) {
      velocity += 35;
      drivers.push(`Signal ${age}d ago`);
    } else if (age != null && age <= 30) {
      velocity += 20;
      drivers.push(`Signal ${age}d ago`);
    }
    if (growth != null && growth >= 25) {
      velocity += Math.min(25, growth * 0.35);
      drivers.push(`Headcount +${growth.toFixed(0)}% /6m`);
    }
    if (comments >= 2) {
      velocity += comments * 6;
      drivers.push(`${comments} commentary hits`);
    }
    if ((c.tier1_count || 0) >= 3) {
      velocity += 8;
      drivers.push(`${c.tier1_count} Tier-1`);
    }
    if (recOf(c) === "Deep Dive") velocity += 10;

    if (drivers.length < 1 || velocity < 40) continue;

    rows.push({
      company_id: c.id,
      company_name: c.name,
      slug: c.slug,
      thesis_score: scoreOf(c),
      recommendation: recOf(c),
      velocity: Math.round(velocity),
      drivers,
      signal_age_days: age,
      headcount_growth: growth,
      commentary_count: comments,
    });
  }
  return rows.sort((a, b) => b.velocity - a.velocity).slice(0, 12);
}

export function buildPreMortems(companies: Company[]): PreMortem[] {
  return companies
    .filter((c) => recOf(c) === "Deep Dive")
    .slice(0, 5)
    .map((c) => {
      const bear = buildBearCase(companyToSubject(c));
      const bd = breakdownOf(c);
      const weak = Object.entries(bd).sort((a, b) => a[1] - b[1])[0];

      const failure_modes: PreMortem["failure_modes"] = [
        {
          mode: bear.kill_arguments[0]?.title || "Thesis narrative collapses under customer scrutiny",
          probability: "high",
          early_warning: bear.kill_arguments[0]?.evidence || "Reference calls contradict deck",
          hedge: "Kill-criteria diligence before term sheet; no FOMO override without new evidence",
        },
        {
          mode:
            weak && weak[1] < 60
              ? `${weak[0]} stays below bar (${Math.round(weak[1])}) through IC`
              : "Entry valuation never clears fund math after dilution",
          probability: "medium",
          early_warning: "Comps move against us or round marks up without traction step-change",
          hedge: "Price discipline + structure; Walk away memo ready",
        },
        {
          mode: "Category crowds: three peers write bigger checks and set terms we can't match",
          probability: (c.tier1_count || 0) >= 3 ? "high" : "medium",
          early_warning: "Second process opens; lead asks for exclusivity we won't get",
          hedge: "Pick lane early or Pass with spine; document in IC trail",
        },
        {
          mode: "Team / execution fracture before Series next",
          probability: "low",
          early_warning: "Key hire churn, founder conflict signals in references",
          hedge: "Ex-employee refs + board observer rights discussion",
        },
        {
          mode: "We were right on company, wrong on timing; capital locked in a long winter",
          probability: "medium",
          early_warning: "Runway claims slip; pipeline LOIs don't convert",
          hedge: "Milestone-tied follow-on reserves, not blind conviction",
        },
      ];

      return {
        company_id: c.id,
        company_name: c.name,
        slug: c.slug,
        thesis_score: scoreOf(c),
        premise: `Assume Thirdbase invested in ${c.name} and the position is a 0-0.5x. Why, before we cheer the Deep Dive.`,
        failure_modes,
        kill_arguments: bear.kill_arguments.slice(0, 4),
        ic_line:
          "IC should hear the pre mortem out loud. If we can't name the kill path, we don't understand the deal.",
      };
    });
}

export function buildEdgePack(
  companies: Company[],
  peers: PeerActivity[],
  commentary: Commentary[],
  sectors: SectorCall[],
  overrides: PartnerOverride[] = [],
): EdgePack {
  const anti = buildAntiConsensus(companies, peers, sectors);
  const clocks = buildConvictionClocks(companies, peers);
  const twin = buildPartnerTwin(companies, overrides);
  const refs = buildReferenceCalls(companies, peers);
  const velocity = buildVelocityBoard(companies, commentary);
  const autopsies = buildPassAutopsies(companies, peers);
  const pre_mortems = buildPreMortems(companies);

  const proprietary = anti.filter((a) => a.posture === "proprietary");
  const traps = anti.filter((a) => a.posture === "trap");
  const act = clocks.filter((c) => c.counsel === "act_this_week" || c.counsel === "race");
  const autopsy_high = autopsies.filter((a) => a.regret_risk === "high").length;

  const must_do: string[] = [];
  if (proprietary[0]) must_do.push(`Protect proprietary window: ${proprietary[0].company_name}`);
  if (act[0]) must_do.push(`${act[0].headline}: ${act[0].company_name} (${act[0].clock_label})`);
  if (traps[0]) must_do.push(`Call out consensus trap: ${traps[0].company_name}`);
  if (autopsy_high) must_do.push(`Reopen ${autopsy_high} Pass autopsy case(s) before they become miss retros`);
  if (refs[0]) must_do.push(`Run reference script for ${refs[0].company_name}`);
  if (!must_do.length) must_do.push("Edge board is quiet; use What if to stress thesis weights");

  const mix = portfolioMix(companies);
  const headline =
    proprietary.length >= 2
      ? `${proprietary.length} proprietary windows while peers sleep. Rare.`
      : act.length
        ? `${act.length} conviction clocks say move; ${traps.length} trap${traps.length === 1 ? "" : "s"} to refuse.`
        : `Edge OS live: mix ${mix.dominantPct}/${mix.tacticalPct}, twin ${twin.seeded ? "demo DNA" : "personalized"}.`;

  return {
    summary: {
      headline,
      must_do: must_do.slice(0, 5),
      proprietary_count: proprietary.length,
      trap_count: traps.length,
      act_now_count: act.length,
      autopsy_high,
    },
    anti_consensus: anti,
    clocks,
    twin,
    reference_calls: refs,
    velocity,
    autopsies,
    pre_mortems,
    default_weights: { ...DEFAULT_WEIGHTS },
  };
}

export function formatEdgeBriefMarkdown(pack: EdgePack): string {
  return [
    `# Partner Edge: Partner brief`,
    "",
    pack.summary.headline,
    "",
    "## Must-do",
    ...pack.summary.must_do.map((m) => `- ${m}`),
    "",
    `Proprietary ${pack.summary.proprietary_count} · Traps ${pack.summary.trap_count} · Clocks hot ${pack.summary.act_now_count} · Autopsy high ${pack.summary.autopsy_high}`,
    "",
    "## Anti consensus (top)",
    ...pack.anti_consensus.slice(0, 5).map(
      (a) => `- **${a.posture}** ${a.company_name}: ${a.insight} → ${a.action}`,
    ),
    "",
    "## Conviction clocks",
    ...pack.clocks.slice(0, 5).map(
      (c) =>
        `- **${c.headline}** ${c.company_name} (${c.clock_label}): FOMO ${c.fomo_index} / patience ${c.patience_alpha}`,
    ),
    "",
    "## Partner twin",
    pack.twin.dna_summary,
    ...pack.twin.predictions.slice(0, 4).map(
      (p) => `- ${p.company_name}: Signal ${p.signal_rec} → Twin **${p.predicted}** (${p.twin_score})`,
    ),
    "",
    "Open /edge for reference scripts, what if, velocity, pre mortems.",
  ].join("\n");
}
