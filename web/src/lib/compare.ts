/**
 * Deal Compare — side-by-side thesis debate before partner IC.
 * Partners pick 2–4 Deep Dive / Watch names and see who wins on each dimension.
 */

import type { Company, PeerActivity } from "@/lib/types";
import { evaluateThirdbaseCriteria } from "@/lib/thirdbaseCriteria";

export const COMPARE_DIMS: { key: string; label: string }[] = [
  { key: "thesis_fit", label: "Thesis fit (60/40)" },
  { key: "team_quality", label: "Team" },
  { key: "cap_table", label: "Tier-1 cap table" },
  { key: "traction", label: "Growth / traction" },
  { key: "moat", label: "Moat / defensibility" },
  { key: "valuation", label: "Entry valuation" },
  { key: "runway", label: "Runway (~3yr)" },
  { key: "tam_exit", label: "TAM + exit" },
  { key: "timing", label: "Signal freshness" },
];

export type CompareRow = {
  key: string;
  label: string;
  values: Record<string, number | null>;
  winner_id: string | null;
  spread: number;
};

export type CompareField = {
  key: string;
  label: string;
  format: "text" | "money" | "pct" | "number" | "rec";
  values: Record<string, string | number | null>;
};

export type CompareVerdict = {
  leader_id: string | null;
  leader_name: string | null;
  dims_won: Record<string, number>;
  counsel: string;
  close_call: boolean;
};

export type ComparePack = {
  companies: Company[];
  rows: CompareRow[];
  fields: CompareField[];
  verdict: CompareVerdict;
  peer_pressure: { company_id: string; firm: string; notes: string }[];
  markdown: string;
};

function dim(c: Company, key: string): number | null {
  const v = c.score_breakdown?.[key];
  return typeof v === "number" ? v : null;
}

function fieldVal(
  c: Company,
  key: string,
): string | number | null {
  switch (key) {
    case "stage":
      return c.stage || null;
    case "theme":
      return [c.sector_theme, c.subsector].filter(Boolean).join(" / ") || null;
    case "score":
      return c.thesis_score ?? null;
    case "rec":
      return c.recommendation || null;
    case "rank":
      return c.relative_rank || null;
    case "round":
      return c.last_round_size_m ?? null;
    case "valuation":
      return c.valuation_est_m ?? null;
    case "tier1":
      return c.tier1_count ?? null;
    case "yoy":
      return c.yoy_growth_pct ?? null;
    case "runway":
      return c.runway_months_est ?? null;
    case "tam":
      return c.tam_usd_b ?? null;
    case "headcount":
      return c.headcount ?? null;
    case "lead":
      return c.lead_investor || null;
    case "criteria": {
      const s = evaluateThirdbaseCriteria(c);
      return `${s.met}/${s.items.length} (${s.fit_pct}%)`;
    }
    case "bucket":
      return c.pipeline_bucket === "dominant_tech_growth"
        ? "Dominant (60%)"
        : c.pipeline_bucket === "tactical_sector_agnostic"
          ? "Tactical (40%)"
          : c.pipeline_bucket || null;
    default:
      return null;
  }
}

export function buildComparePack(
  selected: Company[],
  peers: PeerActivity[] = [],
): ComparePack {
  const companies = selected.slice(0, 4);
  const ids = companies.map((c) => c.id);

  const rows: CompareRow[] = COMPARE_DIMS.map(({ key, label }) => {
    const values: Record<string, number | null> = {};
    let best: number | null = null;
    let winner_id: string | null = null;
    let worst: number | null = null;
    for (const c of companies) {
      const v = dim(c, key);
      values[c.id] = v;
      if (v != null && (best == null || v > best)) {
        best = v;
        winner_id = c.id;
      }
      if (v != null && (worst == null || v < worst)) worst = v;
    }
    // Tie → no single winner
    if (best != null) {
      const tied = companies.filter((c) => values[c.id] === best);
      if (tied.length > 1) winner_id = null;
    }
    return {
      key,
      label,
      values,
      winner_id,
      spread: best != null && worst != null ? Math.round(best - worst) : 0,
    };
  });

  const dims_won: Record<string, number> = {};
  for (const id of ids) dims_won[id] = 0;
  for (const row of rows) {
    if (row.winner_id) dims_won[row.winner_id] = (dims_won[row.winner_id] || 0) + 1;
  }

  const fields: CompareField[] = (
    [
      { key: "rec", label: "Recommendation", format: "rec" as const },
      { key: "score", label: "Thesis score", format: "number" as const },
      { key: "criteria", label: "Criteria fit", format: "text" as const },
      { key: "bucket", label: "Pipeline bucket", format: "text" as const },
      { key: "rank", label: "Relative rank", format: "text" as const },
      { key: "theme", label: "Theme", format: "text" as const },
      { key: "stage", label: "Stage", format: "text" as const },
      { key: "round", label: "Last round", format: "money" as const },
      { key: "valuation", label: "Valuation est.", format: "money" as const },
      { key: "tier1", label: "Tier-1 count", format: "number" as const },
      { key: "yoy", label: "YoY growth", format: "pct" as const },
      { key: "runway", label: "Runway (mo)", format: "number" as const },
      { key: "tam", label: "TAM ($B)", format: "number" as const },
      { key: "headcount", label: "Headcount", format: "number" as const },
      { key: "lead", label: "Lead", format: "text" as const },
    ] as const
  ).map((f) => ({
    ...f,
    values: Object.fromEntries(companies.map((c) => [c.id, fieldVal(c, f.key)])),
  }));

  let leader_id: string | null = null;
  let maxWins = -1;
  let close_call = false;
  const winCounts = Object.entries(dims_won).sort((a, b) => b[1] - a[1]);
  if (winCounts.length) {
    leader_id = winCounts[0][0];
    maxWins = winCounts[0][1];
    if (winCounts.length > 1 && winCounts[0][1] - winCounts[1][1] <= 1) {
      close_call = true;
    }
  }

  // Prefer thesis score when dimension wins are tied
  if (close_call || maxWins === 0) {
    const byScore = [...companies].sort(
      (a, b) => (b.thesis_score || 0) - (a.thesis_score || 0),
    );
    if (byScore[0] && byScore[1]) {
      const gap = (byScore[0].thesis_score || 0) - (byScore[1].thesis_score || 0);
      if (gap < 3) close_call = true;
      leader_id = byScore[0].id;
    } else if (byScore[0]) {
      leader_id = byScore[0].id;
    }
  }

  const leader = companies.find((c) => c.id === leader_id) || null;
  const counsel = !companies.length
    ? "Pick at least two pipeline names to debate."
    : close_call
      ? `${leader?.name || "Leader"} edges the board, but this is a close call — take both into the partner meeting with explicit kill criteria.`
      : `${leader?.name || "Leader"} wins the most score dimensions. Stress the weakest dim before allocating partner hours.`;

  const peer_pressure = companies.flatMap((c) =>
    peers
      .filter((p) => p.company_id === c.id)
      .slice(0, 2)
      .map((p) => ({
        company_id: c.id,
        firm: p.firm,
        notes: p.notes || p.round || "peer activity",
      })),
  );

  const markdown = formatCompareMarkdown({
    companies,
    rows,
    fields,
    verdict: {
      leader_id,
      leader_name: leader?.name || null,
      dims_won,
      counsel,
      close_call,
    },
    peer_pressure,
    markdown: "",
  });

  return {
    companies,
    rows,
    fields,
    verdict: {
      leader_id,
      leader_name: leader?.name || null,
      dims_won,
      counsel,
      close_call,
    },
    peer_pressure,
    markdown,
  };
}

export function formatCompareMarkdown(pack: ComparePack): string {
  const { companies, rows, verdict } = pack;
  if (!companies.length) return "No companies selected for compare.";
  const lines = [
    `# Deal compare — ${companies.map((c) => c.name).join(" vs ")}`,
    "",
    `**Verdict:** ${verdict.counsel}`,
    verdict.close_call ? "_Close call — do not auto-rank by score alone._" : "",
    "",
    "| Dimension | " + companies.map((c) => c.name).join(" | ") + " | Winner |",
    "|---|" + companies.map(() => "---:").join("|") + "|---|",
    ...rows.map((r) => {
      const cells = companies.map((c) => {
        const v = r.values[c.id];
        return v != null ? v.toFixed(0) : "—";
      });
      const winner = companies.find((c) => c.id === r.winner_id)?.name || "tie";
      return `| ${r.label} | ${cells.join(" | ")} | ${winner} |`;
    }),
    "",
    "## Snapshot",
    ...companies.map(
      (c) =>
        `- **${c.name}** — ${c.recommendation || "—"} · score ${c.thesis_score?.toFixed(0) ?? "—"} · ${c.relative_rank || "unranked"} · dims won ${verdict.dims_won[c.id] || 0}`,
    ),
    "",
    "_Compare is a debate aid — not an auto-invest._",
  ];
  return lines.filter((l) => l !== undefined && l !== "").join("\n");
}

/** Suggest Deep Dive / high-score names for the compare picker. */
export function suggestCompareCandidates(companies: Company[], limit = 8): Company[] {
  return [...companies]
    .filter((c) => c.recommendation === "Deep Dive" || (c.thesis_score || 0) >= 70)
    .sort((a, b) => (b.thesis_score || 0) - (a.thesis_score || 0))
    .slice(0, limit);
}
