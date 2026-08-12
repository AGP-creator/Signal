/**
 * Evidence Contradiction Map — cross-check score dims, commentary, and notes.
 * Inspired by multi-agent contradiction maps in agentic diligence (Axiomic / Stack AI).
 * Never invents facts; only flags tensions already visible in the store.
 */

import type { Commentary, Company, NewsItem, PeerActivity } from "@/lib/types";

export type ContradictionSeverity = "high" | "medium" | "low";

export type Contradiction = {
  id: string;
  title: string;
  detail: string;
  severity: ContradictionSeverity;
  left: string;
  right: string;
  counsel: string;
  fields: string[];
};

export type ContradictionPack = {
  company_name: string;
  company_id?: string;
  contradictions: Contradiction[];
  clean: boolean;
  counsel: string;
  markdown: string;
};

function dim(c: Company, key: string, fallback = 50): number {
  const v = c.score_breakdown?.[key];
  return typeof v === "number" ? v : fallback;
}

export function buildContradictionMap(
  company: Company,
  opts?: {
    commentary?: Commentary[];
    peers?: PeerActivity[];
    news?: NewsItem[];
  },
): ContradictionPack {
  const commentary = (opts?.commentary || []).filter(
    (c) => !c.company_id || c.company_id === company.id,
  );
  const peers = (opts?.peers || []).filter((p) => p.company_id === company.id);
  const contradictions: Contradiction[] = [];
  let n = 0;
  const add = (c: Omit<Contradiction, "id">) => {
    n += 1;
    contradictions.push({ ...c, id: `cx-${n}` });
  };

  const score = company.thesis_score ?? 0;
  const rec = company.recommendation || "";

  // High score + Pass (or low score + Deep Dive)
  if (score >= 75 && rec === "Pass") {
    add({
      title: "Score vs recommendation tension",
      detail: `Thesis score ${score.toFixed(0)} normally lands Deep Dive / Watch, but recommendation is Pass.`,
      severity: "high",
      left: `thesis_score=${score.toFixed(0)}`,
      right: `recommendation=Pass`,
      counsel: "Confirm Pass is intentional (cap table / valuation kill) or reopen.",
      fields: ["thesis_score", "recommendation"],
    });
  }
  if (score < 55 && rec === "Deep Dive") {
    add({
      title: "Deep Dive on weak score",
      detail: `Deep Dive with thesis score ${score.toFixed(0)} — either override fuel or stale rec.`,
      severity: "high",
      left: `thesis_score=${score.toFixed(0)}`,
      right: `recommendation=Deep Dive`,
      counsel: "Require partner override reason before agenda hours.",
      fields: ["thesis_score", "recommendation"],
    });
  }

  // Traction notes vs YoY
  const yoy = company.yoy_growth_pct;
  const tractionDim = dim(company, "traction");
  if (yoy != null && yoy < 25 && tractionDim >= 70) {
    add({
      title: "Traction score vs YoY",
      detail: `Traction dim ${tractionDim.toFixed(0)} but YoY only ${yoy}% — below Thirdbase 40% growth posture.`,
      severity: "medium",
      left: `traction_dim=${tractionDim.toFixed(0)}`,
      right: `yoy_growth_pct=${yoy}`,
      counsel: "Ask which metric justifies traction (ARR quality, NDR) vs headline YoY.",
      fields: ["traction", "yoy_growth_pct"],
    });
  }
  if (yoy != null && yoy >= 80 && tractionDim < 50) {
    add({
      title: "Hypergrowth vs weak traction dim",
      detail: `YoY ${yoy}% but traction dim ${tractionDim.toFixed(0)} — scoring may lag fresh signal.`,
      severity: "medium",
      left: `yoy_growth_pct=${yoy}`,
      right: `traction_dim=${tractionDim.toFixed(0)}`,
      counsel: "Refresh scoring inputs or document why growth is discounted.",
      fields: ["yoy_growth_pct", "traction"],
    });
  }

  // Moat notes empty but moat dim high
  const moatDim = dim(company, "moat");
  if (moatDim >= 70 && !company.moat_notes) {
    add({
      title: "High moat score without notes",
      detail: `Moat dim ${moatDim.toFixed(0)} but moat_notes blank — IC cannot diligence an empty claim.`,
      severity: "high",
      left: `moat_dim=${moatDim.toFixed(0)}`,
      right: "moat_notes=blank",
      counsel: "Force a written defensibility paragraph before IC packet.",
      fields: ["moat", "moat_notes"],
    });
  }

  // Tier-1 count vs cap_table dim
  const t1 = company.tier1_count ?? 0;
  const capDim = dim(company, "cap_table");
  if (t1 >= 3 && capDim < 45) {
    add({
      title: "Strong Tier-1 vs weak cap-table dim",
      detail: `${t1} Tier-1 names but cap_table dim ${capDim.toFixed(0)} — ownership / dynamics may be the drag.`,
      severity: "medium",
      left: `tier1_count=${t1}`,
      right: `cap_table=${capDim.toFixed(0)}`,
      counsel: "Check pro-rata, stack rank, and lead dynamics — not just logos.",
      fields: ["tier1_count", "cap_table"],
    });
  }
  if (t1 === 0 && capDim >= 75) {
    add({
      title: "Cap-table dim without Tier-1",
      detail: `Cap-table dim ${capDim.toFixed(0)} with zero Tier-1 — verify who is actually on the tape.`,
      severity: "medium",
      left: "tier1_count=0",
      right: `cap_table=${capDim.toFixed(0)}`,
      counsel: "Confirm investor quality mapping or haircut the dim.",
      fields: ["tier1_count", "cap_table"],
    });
  }

  // Runway vs runway dim / valuation confidence
  const runway = company.runway_months_est;
  const runwayDim = dim(company, "runway");
  if (runway != null && runway < 12 && runwayDim >= 70) {
    add({
      title: "Short runway vs strong runway dim",
      detail: `${runway} months runway but runway dim ${runwayDim.toFixed(0)}.`,
      severity: "high",
      left: `runway_months=${runway}`,
      right: `runway_dim=${runwayDim.toFixed(0)}`,
      counsel: "Treat as financing risk; diligence burn and next round timing.",
      fields: ["runway_months_est", "runway"],
    });
  }

  // Valuation confidence low but valuation dim high
  const valDim = dim(company, "valuation");
  const valConf = (company.valuation_confidence || "").toLowerCase();
  if ((valConf === "low" || valConf === "guess") && valDim >= 70) {
    add({
      title: "High valuation score on low-confidence estimate",
      detail: `Valuation dim ${valDim.toFixed(0)} while confidence is '${company.valuation_confidence}'.`,
      severity: "high",
      left: `valuation_confidence=${company.valuation_confidence}`,
      right: `valuation_dim=${valDim.toFixed(0)}`,
      counsel: "Do not price on a guess — get a round mark or mark dim unknown.",
      fields: ["valuation_confidence", "valuation"],
    });
  }

  // Bearish commentary vs Deep Dive
  const bearish = commentary.filter(
    (c) => (c.sentiment || "").toLowerCase().includes("bear") || (c.sentiment || "").toLowerCase() === "negative",
  );
  if (bearish.length >= 2 && rec === "Deep Dive") {
    add({
      title: "Bearish commentary vs Deep Dive",
      detail: `${bearish.length} negative commentary rows while recommendation is Deep Dive.`,
      severity: "medium",
      left: `commentary_bearish=${bearish.length}`,
      right: "recommendation=Deep Dive",
      counsel: "Surface quotes in IC packet; decide if noise or thesis risk.",
      fields: ["commentary", "recommendation"],
    });
  }

  // Peer FOMO / thesis shift vs Pass
  const shifts = peers.filter((p) => p.thesis_shift || p.on_thesis_flag === false);
  if (shifts.length && rec === "Pass") {
    add({
      title: "Peer activity vs Pass",
      detail: `Peer moves on file (${shifts.map((p) => p.firm).join(", ")}) while Signal says Pass.`,
      severity: "medium",
      left: `peer_moves=${shifts.length}`,
      right: "recommendation=Pass",
      counsel: "Candidate for pass autopsy — confirm Pass still has spine.",
      fields: ["peer_activity", "recommendation"],
    });
  }

  // Stale evidence vs high score
  if (company.is_stale && score >= 70) {
    add({
      title: "Stale evidence on high-score name",
      detail: `Flagged stale but thesis score ${score.toFixed(0)} — confidence should be haircut.`,
      severity: "high",
      left: "is_stale=true",
      right: `thesis_score=${score.toFixed(0)}`,
      counsel: "Refresh signals or drop from Hot Deals until evidence updates.",
      fields: ["is_stale", "thesis_score"],
    });
  }

  // Team notes blank + high team dim
  const teamDim = dim(company, "team_quality");
  if (teamDim >= 75 && !company.team_notes) {
    add({
      title: "Strong team dim without notes",
      detail: `Team dim ${teamDim.toFixed(0)} with empty team_notes.`,
      severity: "medium",
      left: `team_quality=${teamDim.toFixed(0)}`,
      right: "team_notes=blank",
      counsel: "Write founder/background notes before reference calls.",
      fields: ["team_quality", "team_notes"],
    });
  }

  contradictions.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.severity] - rank[b.severity];
  });

  const high = contradictions.filter((c) => c.severity === "high").length;
  const clean = contradictions.length === 0;
  const counsel = clean
    ? "No material contradictions in the store — still run bear case before IC."
    : high > 0
      ? `${high} high-severity contradiction(s) — resolve or document before partner hours.`
      : `${contradictions.length} tension(s) to reconcile in diligence notes.`;

  const markdown = [
    `# Contradiction map — ${company.name}`,
    "",
    counsel,
    "",
    ...contradictions.map(
      (c) =>
        `- **[${c.severity}] ${c.title}**\n  ${c.detail}\n  \`${c.left}\` ↔ \`${c.right}\`\n  → ${c.counsel}`,
    ),
    clean ? "_Clean — no tensions flagged._" : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    company_name: company.name,
    company_id: company.id,
    contradictions,
    clean,
    counsel,
    markdown,
  };
}
