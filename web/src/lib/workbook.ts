/**
 * Living Excel workbook — partner debate surface helpers.
 * Tab titles match PRODUCT.md / Thirdbase_Deal_Pipeline.xlsx exactly.
 */

import type { Company, DigestRow, PeerActivity, SectorCall } from "@/lib/types";

/** Tab order mirrors Excel: core brief tabs, then Signal extracts. */
export const WORKBOOK_TABS = [
  { id: "pipeline", label: "Pipeline" },
  { id: "hot", label: "Hot Deals" },
  { id: "watchlist", label: "Watchlist" },
  { id: "sectors", label: "Sector of Tomorrow" },
  { id: "peers", label: "Peer Set Activity" },
  { id: "heatmap", label: "Co-investor Heatmap" },
  { id: "news", label: "News Worth Reading" },
  { id: "commentary", label: "Investor Commentary" },
  { id: "stale", label: "Stale" },
  { id: "golden", label: "Actions" },
  { id: "dossiers", label: "Peer Firm Dossiers" },
  { id: "judgment", label: "Judgment" },
] as const;

export type WorkbookTabId = (typeof WORKBOOK_TABS)[number]["id"];

export function isWorkbookTab(v: string | undefined | null): v is WorkbookTabId {
  return !!v && WORKBOOK_TABS.some((t) => t.id === v);
}

const HOT_CUTOFF_DAYS = 30;

function daysSince(iso?: string | null): number {
  if (!iso) return 9999;
  const d = Date.parse(String(iso).slice(0, 10));
  if (Number.isNaN(d)) return 9999;
  return Math.floor((Date.now() - d) / 86_400_000);
}

/** Same rule as Excel Hot Deals tab: recent signal + Deep Dive or score ≥ 75. */
export function hotDeals(companies: Company[], cutoffDays = HOT_CUTOFF_DAYS): Company[] {
  return companies
    .filter((c) => {
      const days = daysSince(c.last_signal_date);
      return (
        days <= cutoffDays &&
        (c.recommendation === "Deep Dive" || (c.thesis_score ?? 0) >= 75)
      );
    })
    .sort((a, b) => (b.thesis_score ?? 0) - (a.thesis_score ?? 0));
}

export function watchlistCompanies(companies: Company[]): Company[] {
  return companies.filter(
    (c) =>
      c.recommendation === "Watch" ||
      ["seed", "pre-seed"].includes((c.stage || "").toLowerCase()),
  );
}

export function staleCompanies(companies: Company[]): Company[] {
  return companies.filter(
    (c) =>
      (c.is_stale ||
        c.review_status === "Pending Partner Review" ||
        c.review_status === "Refresh requested") &&
      !(c.review_status || "").toLowerCase().includes("archived") &&
      c.review_status !== "Reviewed — keep",
  );
}

export type WorkbookHygiene = {
  total: number;
  deep: number;
  watch: number;
  pass: number;
  hot: number;
  stale: number;
  recentSignal: number;
  peerShifts: number;
  sectorHeat: number;
};

export function workbookHygiene(
  companies: Company[],
  peers: PeerActivity[],
  sectors: SectorCall[],
): WorkbookHygiene {
  const hot = hotDeals(companies).length;
  return {
    total: companies.length,
    deep: companies.filter((c) => c.recommendation === "Deep Dive").length,
    watch: companies.filter((c) => c.recommendation === "Watch").length,
    pass: companies.filter((c) => c.recommendation === "Pass").length,
    hot,
    stale: staleCompanies(companies).length,
    recentSignal: companies.filter((c) => daysSince(c.last_signal_date) <= 14).length,
    peerShifts: peers.filter((p) => p.thesis_shift).length,
    sectorHeat: sectors.filter((s) => (s.heat_score ?? 0) >= 70).length,
  };
}

/** Next Mon/Wed/Fri digest slot in local time (for partner UX). */
export function nextDigestSlot(now = new Date()): {
  label: string;
  weekday: "Monday" | "Wednesday" | "Friday";
  isoDate: string;
  isToday: boolean;
} {
  const days: Array<"Monday" | "Wednesday" | "Friday"> = ["Monday", "Wednesday", "Friday"];
  const targets = [1, 3, 5]; // Mon=1 … Fri=5 (getDay)
  const today = now.getDay();
  for (let offset = 0; offset < 8; offset++) {
    const d = new Date(now);
    d.setHours(9, 0, 0, 0);
    d.setDate(now.getDate() + offset);
    const wd = d.getDay();
    const idx = targets.indexOf(wd);
    if (idx >= 0) {
      const weekday = days[idx];
      return {
        weekday,
        label: offset === 0 ? `${weekday} (today)` : weekday,
        isoDate: d.toISOString().slice(0, 10),
        isToday: offset === 0 && today === wd,
      };
    }
  }
  return { weekday: "Monday", label: "Monday", isoDate: now.toISOString().slice(0, 10), isToday: false };
}

export function digestDealCap(digest: DigestRow | null): number {
  return digest?.payload?.deals?.length ?? 0;
}
