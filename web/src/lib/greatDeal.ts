/**
 * Knows what a great deal looks like —
 * Separates noisy funding announcements from outstanding opportunities,
 * articulates why on founder / market / investors / traction / valuation,
 * and ranks within sector × stage (not in isolation).
 */

import type { Company } from "@/lib/types";
import { evaluateThirdbaseCriteria } from "@/lib/thirdbaseCriteria";

export type DealGrade = "outstanding" | "promising" | "noise" | "pass";

export type DealPillarId =
  | "founder"
  | "market"
  | "investors"
  | "traction"
  | "valuation";

export type DealPillar = {
  id: DealPillarId;
  label: string;
  score: number; // 0–100
  evidence: string;
  weight: number;
};

export type CohortPeer = {
  company_id: string;
  name: string;
  slug?: string | null;
  thesis_score: number;
  recommendation: string;
  rank: number;
  is_self: boolean;
};

export type CohortBoard = {
  key: string;
  theme: string;
  stage: string;
  size: number;
  members: CohortPeer[];
  leader_id: string | null;
  leader_name: string | null;
  avg_score: number;
};

export type GreatDealCard = {
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
  grade: DealGrade;
  grade_label: string;
  noise_score: number; // 0–100 higher = more announcement noise
  outstanding_score: number; // 0–100 composite of pillars + cohort position
  pillars: DealPillar[];
  pillar_avg: number;
  why_best: string[]; // why this is (or isn't) one of the best deals right now
  weak_spots: string[];
  cohort_key: string;
  cohort_rank: number;
  cohort_size: number;
  cohort_percentile: number; // 100 = #1
  criteria_fit_pct: number;
  lead_investor?: string | null;
  tier1_count: number;
  yoy_growth_pct?: number | null;
  valuation_est_m?: number | null;
  last_round_size_m?: number | null;
  why_now?: string | null;
};

export type GreatDealPack = {
  summary: {
    headline: string;
    counsel: string;
    must_do: string[];
    outstanding_count: number;
    promising_count: number;
    noise_count: number;
    pass_count: number;
    cohort_count: number;
  };
  cards: GreatDealCard[];
  outstanding: GreatDealCard[];
  noise: GreatDealCard[];
  promising: GreatDealCard[];
  cohorts: CohortBoard[];
  grade_mix: { label: string; value: number; color: string }[];
  pillar_book: { label: string; value: number }[];
  markdown: string;
};

const PILLAR_META: {
  id: DealPillarId;
  label: string;
  weight: number;
  dims: string[];
}[] = [
  { id: "founder", label: "Founder", weight: 0.22, dims: ["team_quality"] },
  { id: "market", label: "Market", weight: 0.2, dims: ["thesis_fit", "tam_exit"] },
  { id: "investors", label: "Investors", weight: 0.22, dims: ["cap_table"] },
  { id: "traction", label: "Traction", weight: 0.2, dims: ["traction"] },
  { id: "valuation", label: "Entry valuation", weight: 0.16, dims: ["valuation"] },
];

const GRADE_LABEL: Record<DealGrade, string> = {
  outstanding: "Outstanding",
  promising: "Promising",
  noise: "Noisy raise",
  pass: "Below bar",
};

function dim(c: Company, key: string): number | null {
  const v = c.score_breakdown?.[key];
  return typeof v === "number" ? v : null;
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function clip(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function cohortKey(c: Company): string {
  const theme = c.theme_id || c.sector_theme || "other";
  const stage = c.stage || "n/a";
  return `${theme}::${stage}`;
}

function parseRank(relative?: string | null): { rank: number; size: number } | null {
  if (!relative) return null;
  const m = relative.match(/#(\d+)\s+of\s+(\d+)/i);
  if (!m) return null;
  return { rank: Number(m[1]), size: Number(m[2]) };
}

function pillarEvidence(c: Company, id: DealPillarId, score: number): string {
  switch (id) {
    case "founder": {
      const notes = (c.team_notes || "").trim();
      if (notes) return notes.length > 110 ? `${notes.slice(0, 107)}…` : notes;
      return score >= 70
        ? "Team quality clears bar on file"
        : score >= 50
          ? "Team signal present but thin"
          : "Founder / team evidence weak or missing";
    }
    case "market": {
      const bits = [c.sector_theme, c.subsector].filter(Boolean).join(" · ");
      const tam = c.tam_usd_b != null ? `TAM $${c.tam_usd_b}B` : null;
      return [bits || "Theme unassigned", tam].filter(Boolean).join(" · ");
    }
    case "investors": {
      const t1 = c.tier1_count ?? 0;
      const names = (c.tier1_names || []).slice(0, 3).join(", ");
      const lead = c.lead_investor ? `Lead ${c.lead_investor}` : null;
      if (t1 > 0 && names) return `${t1} Tier-1 (${names})${lead ? ` · ${lead}` : ""}`;
      if (t1 > 0) return `${t1} Tier-1 on cap table${lead ? ` · ${lead}` : ""}`;
      return lead || "Cap table light on Tier-1";
    }
    case "traction": {
      const notes = (c.traction_notes || "").trim();
      const yoy = c.yoy_growth_pct != null ? `${c.yoy_growth_pct}% YoY` : null;
      const hc =
        c.headcount_6m_growth_pct != null
          ? `HC +${c.headcount_6m_growth_pct}% /6m`
          : null;
      if (notes && /noisy|announcement|not outstanding/i.test(notes)) {
        return `Noise flag: ${notes.length > 90 ? `${notes.slice(0, 87)}…` : notes}`;
      }
      return [yoy, hc, notes ? (notes.length > 80 ? `${notes.slice(0, 77)}…` : notes) : null]
        .filter(Boolean)
        .join(" · ") || "Traction not yet underwritten";
    }
    case "valuation": {
      const val = c.valuation_est_m;
      const conf = c.valuation_confidence || "estimated";
      const round = c.last_round_size_m != null ? `Round $${c.last_round_size_m}M` : null;
      if (val != null) {
        return `~$${val}M post (${conf})${round ? ` · ${round}` : ""}`;
      }
      return round || "Entry mark not captured";
    }
  }
}

function buildPillars(c: Company): DealPillar[] {
  return PILLAR_META.map((p) => {
    const scores = p.dims
      .map((d) => dim(c, d))
      .filter((v): v is number => v != null);
    const score = scores.length ? Math.round(avg(scores)) : 45;
    return {
      id: p.id,
      label: p.label,
      score,
      weight: p.weight,
      evidence: pillarEvidence(c, p.id, score),
    };
  });
}

function noiseHints(c: Company, pillars: DealPillar[]): string[] {
  const hints: string[] = [];
  const traction = pillars.find((p) => p.id === "traction");
  const founder = pillars.find((p) => p.id === "founder");
  const investors = pillars.find((p) => p.id === "investors");
  const valuation = pillars.find((p) => p.id === "valuation");
  const notes = `${c.traction_notes || ""} ${c.why_now || ""}`.toLowerCase();

  if (/noisy|not outstanding|announcement only|pr noise/.test(notes)) {
    hints.push("Corpus flags this as announcement noise, not an outstanding underwrite.");
  }
  if ((c.last_round_size_m || 0) >= 40 && (c.thesis_score || 0) < 65) {
    hints.push("Large raise relative to thesis score — classic noisy funding print.");
  }
  if ((traction?.score || 0) < 55 && (c.last_round_size_m || 0) >= 15) {
    hints.push("Capital raised ahead of traction evidence.");
  }
  if ((founder?.score || 0) < 55 && (investors?.score || 0) < 55) {
    hints.push("Neither founder nor Tier-1 density carries the story.");
  }
  if ((valuation?.score || 0) < 50 && (c.valuation_est_m || 0) > 0) {
    hints.push("Entry valuation does not clear sector × stage comps.");
  }
  const parsed = parseRank(c.relative_rank);
  if (parsed && parsed.size >= 3 && parsed.rank > Math.ceil(parsed.size / 2)) {
    hints.push(`Bottom half of ${c.sector_theme || "theme"} × ${c.stage || "stage"} cohort.`);
  }
  return hints;
}

function whyBest(
  c: Company,
  grade: DealGrade,
  pillars: DealPillar[],
  cohortRank: number,
  cohortSize: number,
): { why: string[]; weak: string[] } {
  const why: string[] = [];
  const weak: string[] = [];
  const strong = [...pillars].sort((a, b) => b.score - a.score);
  const soft = [...pillars].sort((a, b) => a.score - b.score);

  if (grade === "outstanding") {
    why.push(
      cohortSize > 1
        ? `#${cohortRank} of ${cohortSize} in ${c.sector_theme || "theme"} × ${c.stage || "stage"} — ranked vs peers, not in isolation.`
        : `Clears Thirdbase outstanding bar at ${c.stage || "this stage"} (thin cohort — widen comps before IC).`,
    );
    for (const p of strong.slice(0, 3)) {
      if (p.score >= 60) why.push(`${p.label}: ${p.evidence}`);
    }
    if (c.why_now) {
      const snip = c.why_now.length > 140 ? `${c.why_now.slice(0, 137)}…` : c.why_now;
      why.push(snip);
    }
  } else if (grade === "promising") {
    why.push(
      `Interesting — not yet outstanding vs the ${c.sector_theme || "theme"} × ${c.stage || "stage"} book.`,
    );
    for (const p of strong.slice(0, 2)) {
      if (p.score >= 55) why.push(`${p.label} supports Watch: ${p.evidence}`);
    }
  } else if (grade === "noise") {
    why.push(...noiseHints(c, pillars).slice(0, 3));
    if (!why.length) {
      why.push("Looks like a funding headline more than a Thirdbase-grade opportunity.");
    }
  } else {
    why.push("Does not clear the outstanding / Watch bar this cycle.");
  }

  for (const p of soft.slice(0, 2)) {
    if (p.score < 60) weak.push(`${p.label} soft (${p.score}): ${p.evidence}`);
  }

  return { why: why.slice(0, 5), weak: weak.slice(0, 3) };
}

function gradeDeal(
  c: Company,
  pillars: DealPillar[],
  pillarAvg: number,
  cohortRank: number,
  cohortSize: number,
  noiseScore: number,
  outstandingScore: number,
): DealGrade {
  const rec = c.recommendation || "";
  const noiseFlags = noiseHints(c, pillars);
  const parsed = parseRank(c.relative_rank);
  const topHalf =
    cohortSize <= 1 || cohortRank <= Math.max(1, Math.ceil(cohortSize * 0.4));
  const topTwo = cohortRank <= 2;

  if (rec === "Pass" && noiseScore >= 55) return "noise";
  if (noiseFlags.length >= 2 && pillarAvg < 62 && rec !== "Deep Dive") return "noise";
  if (
    /noisy|not outstanding/i.test(c.traction_notes || "") &&
    rec !== "Deep Dive"
  ) {
    return "noise";
  }

  if (
    (rec === "Deep Dive" && (topTwo || outstandingScore >= 72)) ||
    (outstandingScore >= 78 && topHalf && pillarAvg >= 68)
  ) {
    return "outstanding";
  }

  if (rec === "Watch" || (outstandingScore >= 58 && pillarAvg >= 55)) {
    return "promising";
  }

  if (noiseScore >= 50 || (parsed && parsed.rank > parsed.size * 0.6 && (c.last_round_size_m || 0) > 10)) {
    return "noise";
  }

  return "pass";
}

function noiseScoreOf(c: Company, pillars: DealPillar[], pillarAvg: number): number {
  let n = 0;
  const hints = noiseHints(c, pillars);
  n += hints.length * 18;
  if ((c.last_round_size_m || 0) >= 50 && (c.thesis_score || 0) < 70) n += 20;
  if (pillarAvg < 55) n += 15;
  if ((c.recommendation || "") === "Pass") n += 10;
  const traction = pillars.find((p) => p.id === "traction");
  if ((traction?.score || 0) < 50) n += 12;
  return clip(n);
}

function outstandingScoreOf(
  c: Company,
  pillars: DealPillar[],
  cohortRank: number,
  cohortSize: number,
): number {
  const weighted = pillars.reduce((s, p) => s + p.score * p.weight, 0);
  const thesis = c.thesis_score ?? weighted;
  const percentile =
    cohortSize <= 1 ? 70 : clip(((cohortSize - cohortRank + 1) / cohortSize) * 100);
  const recBoost =
    c.recommendation === "Deep Dive" ? 8 : c.recommendation === "Watch" ? 3 : 0;
  return clip(weighted * 0.55 + thesis * 0.25 + percentile * 0.2 + recBoost);
}

export function buildGreatDealCard(
  c: Company,
  cohortRank: number,
  cohortSize: number,
): GreatDealCard {
  const pillars = buildPillars(c);
  const pillarAvg = Math.round(avg(pillars.map((p) => p.score)));
  const noise_score = noiseScoreOf(c, pillars, pillarAvg);
  const outstanding_score = outstandingScoreOf(c, pillars, cohortRank, cohortSize);
  const grade = gradeDeal(
    c,
    pillars,
    pillarAvg,
    cohortRank,
    cohortSize,
    noise_score,
    outstanding_score,
  );
  const { why, weak } = whyBest(c, grade, pillars, cohortRank, cohortSize);
  const criteria = evaluateThirdbaseCriteria(c);
  const parsed = parseRank(c.relative_rank);
  const rank = parsed?.rank ?? cohortRank;
  const size = parsed?.size ?? cohortSize;
  const percentile = size <= 1 ? 100 : clip(((size - rank + 1) / size) * 100);

  return {
    company_id: c.id,
    name: c.name,
    slug: c.slug,
    one_liner: c.one_liner,
    sector_theme: c.sector_theme,
    subsector: c.subsector,
    stage: c.stage,
    thesis_score: c.thesis_score ?? 0,
    recommendation: c.recommendation || "—",
    relative_rank: c.relative_rank,
    grade,
    grade_label: GRADE_LABEL[grade],
    noise_score,
    outstanding_score: Math.round(outstanding_score),
    pillars,
    pillar_avg: pillarAvg,
    why_best: why,
    weak_spots: weak,
    cohort_key: cohortKey(c),
    cohort_rank: rank,
    cohort_size: size,
    cohort_percentile: Math.round(percentile),
    criteria_fit_pct: criteria.fit_pct,
    lead_investor: c.lead_investor,
    tier1_count: c.tier1_count ?? 0,
    yoy_growth_pct: c.yoy_growth_pct,
    valuation_est_m: c.valuation_est_m,
    last_round_size_m: c.last_round_size_m,
    why_now: c.why_now,
  };
}

function buildCohorts(companies: Company[]): CohortBoard[] {
  const groups = new Map<string, Company[]>();
  for (const c of companies) {
    const key = cohortKey(c);
    const list = groups.get(key) || [];
    list.push(c);
    groups.set(key, list);
  }

  const boards: CohortBoard[] = [];
  for (const [key, members] of groups) {
    const ordered = [...members].sort(
      (a, b) => (b.thesis_score || 0) - (a.thesis_score || 0),
    );
    const theme = ordered[0]?.sector_theme || key.split("::")[0];
    const stage = ordered[0]?.stage || key.split("::")[1] || "n/a";
    const peers: CohortPeer[] = ordered.map((c, i) => ({
      company_id: c.id,
      name: c.name,
      slug: c.slug,
      thesis_score: c.thesis_score ?? 0,
      recommendation: c.recommendation || "—",
      rank: i + 1,
      is_self: false,
    }));
    boards.push({
      key,
      theme,
      stage,
      size: peers.length,
      members: peers,
      leader_id: peers[0]?.company_id || null,
      leader_name: peers[0]?.name || null,
      avg_score: Math.round(avg(peers.map((p) => p.thesis_score))),
    });
  }

  return boards.sort((a, b) => b.size - a.size || b.avg_score - a.avg_score);
}

export function buildGreatDealPack(companies: Company[]): GreatDealPack {
  const active = companies.filter((c) => !(c.review_status || "").toLowerCase().includes("archived"));
  const cohorts = buildCohorts(active);
  const rankById = new Map<string, { rank: number; size: number }>();
  for (const board of cohorts) {
    for (const m of board.members) {
      rankById.set(m.company_id, { rank: m.rank, size: board.size });
    }
  }

  const cards = active
    .map((c) => {
      const r = rankById.get(c.id) || { rank: 1, size: 1 };
      return buildGreatDealCard(c, r.rank, r.size);
    })
    .sort((a, b) => {
      const order: Record<DealGrade, number> = {
        outstanding: 0,
        promising: 1,
        noise: 2,
        pass: 3,
      };
      if (order[a.grade] !== order[b.grade]) return order[a.grade] - order[b.grade];
      return b.outstanding_score - a.outstanding_score;
    });

  const outstanding = cards.filter((c) => c.grade === "outstanding");
  const promising = cards.filter((c) => c.grade === "promising");
  const noise = cards.filter((c) => c.grade === "noise");
  const pass = cards.filter((c) => c.grade === "pass");

  const top = outstanding[0];
  const headline = top
    ? `${outstanding.length} outstanding vs ${noise.length} noisy raises — lead: ${top.name} (#${top.cohort_rank} of ${top.cohort_size} ${top.sector_theme || ""} ${top.stage || ""})`.trim()
    : promising[0]
      ? `No Deep Dive-grade outstanding names yet — ${promising.length} promising Watch names to pressure-test.`
      : "Pipeline needs more thesis-fit signal before outstanding calls.";

  const must_do: string[] = [];
  if (outstanding.length) {
    must_do.push(
      `Diligence ${outstanding
        .slice(0, 2)
        .map((c) => c.name)
        .join(" & ")} — articulate founder / market / investors / traction / entry.`,
    );
  }
  if (noise.length) {
    must_do.push(
      `Filter ${noise.slice(0, 2).map((c) => c.name).join(" & ")}${noise.length > 2 ? ` (+${noise.length - 2})` : ""} — funding noise, not outstanding.`,
    );
  }
  const thin = cohorts.filter((b) => b.size === 1).length;
  if (thin > 0) {
    must_do.push(
      `${thin} singleton cohort${thin === 1 ? "" : "s"} — widen sector × stage comps before trusting relative rank.`,
    );
  }
  if (!must_do.length) {
    must_do.push("Refresh pipeline and re-score so relative ranks have a live cohort.");
  }

  const counsel = outstanding.length
    ? `Great deals are relative: ${top?.name || "lead"} wins its ${top?.sector_theme || "theme"} × ${top?.stage || "stage"} cohort on weighted pillars — not absolute score alone.`
    : "Signal withholds Deep Dive until a name clears pillars and beats its sector × stage cohort.";

  const pillar_book = PILLAR_META.map((p) => ({
    label: p.label,
    value: Math.round(
      avg(
        outstanding.length
          ? outstanding.map((c) => c.pillars.find((x) => x.id === p.id)?.score || 0)
          : cards.slice(0, 8).map((c) => c.pillars.find((x) => x.id === p.id)?.score || 0),
      ),
    ),
  }));

  const grade_mix = [
    { label: "Outstanding", value: outstanding.length, color: "var(--signal)" },
    { label: "Promising", value: promising.length, color: "var(--ok)" },
    { label: "Noisy raise", value: noise.length, color: "var(--warn)" },
    { label: "Below bar", value: pass.length, color: "var(--faint)" },
  ].filter((g) => g.value > 0);

  const markdown = formatGreatDealMarkdown({
    summary: {
      headline,
      counsel,
      must_do,
      outstanding_count: outstanding.length,
      promising_count: promising.length,
      noise_count: noise.length,
      pass_count: pass.length,
      cohort_count: cohorts.length,
    },
    cards,
    outstanding,
    noise,
    promising,
    cohorts,
    grade_mix,
    pillar_book,
    markdown: "",
  });

  return {
    summary: {
      headline,
      counsel,
      must_do,
      outstanding_count: outstanding.length,
      promising_count: promising.length,
      noise_count: noise.length,
      pass_count: pass.length,
      cohort_count: cohorts.length,
    },
    cards,
    outstanding,
    noise,
    promising,
    cohorts,
    grade_mix,
    pillar_book,
    markdown,
  };
}

export function formatGreatDealMarkdown(pack: GreatDealPack): string {
  const lines = [
    `# Knows what a great deal looks like`,
    "",
    pack.summary.headline,
    "",
    pack.summary.counsel,
    "",
    "## Must do",
    ...pack.summary.must_do.map((m) => `- ${m}`),
    "",
    "## Outstanding",
    ...(!pack.outstanding.length
      ? ["- None clear the bar this cycle."]
      : pack.outstanding.slice(0, 6).flatMap((c) => [
          `### ${c.name} — ${c.recommendation} · score ${c.thesis_score.toFixed(0)} · ${c.relative_rank || `#${c.cohort_rank} of ${c.cohort_size}`}`,
          ...c.why_best.map((w) => `- ${w}`),
          `Pillars: ${c.pillars.map((p) => `${p.label} ${p.score}`).join(" · ")}`,
          "",
        ])),
    "## Noisy raises (filter)",
    ...(!pack.noise.length
      ? ["- No announcement-noise names flagged."]
      : pack.noise.slice(0, 5).map(
          (c) =>
            `- **${c.name}** — ${c.why_best[0] || "Funding print ahead of underwrite"} (noise ${c.noise_score})`,
        )),
    "",
    "Open **/deals** for cohort ranks and pillar radar.",
  ];
  return lines.join("\n");
}

/** Compact inspect for a single company (company page / chat). */
export function inspectGreatDeal(
  company: Company,
  all: Company[],
): GreatDealCard {
  const pack = buildGreatDealPack(all.length ? all : [company]);
  return (
    pack.cards.find((c) => c.company_id === company.id) ||
    buildGreatDealCard(company, 1, 1)
  );
}
