/**
 * Directory Desk — YC Startup Directory–style faceted browse over the Signal book.
 * Cycles are derived from last_round_date (H1/H2) as a batch proxy; Signal has no
 * accelerator batch entity.
 */

import type { Company } from "@/lib/types";

export type DirectoryStatus = "Active" | "Stale" | "Pending review" | "Archived";

export type HiringSignal = "Hot" | "Growing" | "Steady" | "Quiet";

export type DirectoryCard = Company & {
  cycle: string;
  status_label: DirectoryStatus;
  hiring_signal: HiringSignal;
  region_proxy: string;
};

export type DirectoryFilters = {
  q: string;
  theme: string;
  stage: string;
  rec: string;
  cycle: string;
  status: string;
  hiring: string;
  bucket: string;
};

export const EMPTY_FILTERS: DirectoryFilters = {
  q: "",
  theme: "All",
  stage: "All",
  rec: "All",
  cycle: "All",
  status: "All",
  hiring: "All",
  bucket: "All",
};

export function deriveCycle(date?: string | null): string {
  if (!date) return "Unknown";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Unknown";
  const y = d.getUTCFullYear();
  const half = d.getUTCMonth() < 6 ? "H1" : "H2";
  return `${half}’${String(y).slice(2)}`;
}

export function deriveStatus(c: Company): DirectoryStatus {
  const status = (c.review_status || "").toLowerCase();
  if (status.includes("archived")) return "Archived";
  if (c.review_status === "Pending Partner Review" || c.review_status === "Refresh requested") {
    return "Pending review";
  }
  if (c.is_stale) return "Stale";
  return "Active";
}

export function deriveHiring(c: Company): HiringSignal {
  const g = c.headcount_6m_growth_pct ?? 0;
  if (g >= 40) return "Hot";
  if (g >= 15) return "Growing";
  if (g > 0) return "Steady";
  return "Quiet";
}

/** Soft geo proxy from domain TLD / lead / notes — demo-friendly, never invents blanks as facts. */
export function deriveRegion(c: Company): string {
  const blob = `${c.domain || ""} ${c.team_notes || ""} ${c.one_liner || ""}`.toLowerCase();
  if (/\b(uk|london|europe|eu|berlin|paris|stockholm)\b/.test(blob) || /\.co\.uk$|\.eu$|\.de$|\.fr$/.test(c.domain || "")) {
    return "Europe";
  }
  if (/\b(india|bangalore|singapore|apac|tokyo|seoul)\b/.test(blob)) return "APAC";
  if (/\b(israel|tel aviv)\b/.test(blob)) return "Israel";
  return "US / Global";
}

export function toDirectoryCards(companies: Company[]): DirectoryCard[] {
  return companies.map((c) => ({
    ...c,
    cycle: deriveCycle(c.last_round_date),
    status_label: deriveStatus(c),
    hiring_signal: deriveHiring(c),
    region_proxy: deriveRegion(c),
  }));
}

export function filterDirectory(
  cards: DirectoryCard[],
  f: DirectoryFilters,
): DirectoryCard[] {
  const q = f.q.trim().toLowerCase();
  return cards.filter((c) => {
    if (q) {
      const blob = `${c.name} ${c.one_liner} ${c.subsector} ${c.sector_theme} ${c.lead_investor} ${(c.investors || []).join(" ")}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    if (f.theme !== "All" && c.sector_theme !== f.theme) return false;
    if (f.stage !== "All" && c.stage !== f.stage) return false;
    if (f.rec !== "All" && c.recommendation !== f.rec) return false;
    if (f.cycle !== "All" && c.cycle !== f.cycle) return false;
    if (f.status !== "All" && c.status_label !== f.status) return false;
    if (f.hiring !== "All" && c.hiring_signal !== f.hiring) return false;
    if (f.bucket !== "All") {
      if (f.bucket === "60% Dominant" && c.pipeline_bucket !== "dominant_tech_growth") return false;
      if (f.bucket === "40% Tactical" && c.pipeline_bucket !== "tactical_sector_agnostic") return false;
    }
    return true;
  });
}

export function directoryFacetOptions(cards: DirectoryCard[]) {
  const uniq = (xs: (string | null | undefined)[]) =>
    ["All", ...Array.from(new Set(xs.filter(Boolean) as string[])).sort()];
  return {
    themes: uniq(cards.map((c) => c.sector_theme)),
    stages: uniq(cards.map((c) => c.stage)),
    cycles: uniq(cards.map((c) => c.cycle)),
    recs: ["All", "Deep Dive", "Watch", "Pass"],
    statuses: ["All", "Active", "Stale", "Pending review", "Archived"],
    hiring: ["All", "Hot", "Growing", "Steady", "Quiet"],
    buckets: ["All", "60% Dominant", "40% Tactical"],
  };
}

export function cardsToCsv(cards: DirectoryCard[]): string {
  const cols = [
    "name",
    "one_liner",
    "sector_theme",
    "subsector",
    "stage",
    "cycle",
    "recommendation",
    "thesis_score",
    "status",
    "hiring",
    "lead_investor",
    "tier1_count",
    "yoy_growth_pct",
    "headcount",
    "domain",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = cards.map((c) =>
    [
      c.name,
      c.one_liner,
      c.sector_theme,
      c.subsector,
      c.stage,
      c.cycle,
      c.recommendation,
      c.thesis_score,
      c.status_label,
      c.hiring_signal,
      c.lead_investor,
      c.tier1_count,
      c.yoy_growth_pct,
      c.headcount,
      c.domain,
    ]
      .map(esc)
      .join(","),
  );
  return [cols.join(","), ...rows].join("\n");
}
