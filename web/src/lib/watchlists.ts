/**
 * Partner watchlists — multi-partner ranked company sets (DB-backed).
 * Replaces browser-only Interest likes while keeping meeting-match helpers.
 */

import type { InterestState } from "@/lib/interest";
import { PARTNER_ROSTER, loadPartnerAuthor, savePartnerAuthor } from "@/lib/partnerLog";

export type WatchlistItem = {
  partner_name: string;
  company_id: string;
  rank: number;
  note?: string | null;
  source?: string | null;
  added_at?: string | null;
  updated_at?: string | null;
};

export type WatchlistOverlap = Record<string, string[]>;

export type WatchlistSnapshot = {
  ok: boolean;
  partner_name: string;
  items: WatchlistItem[];
  by_partner: Record<string, WatchlistItem[]>;
  overlap: WatchlistOverlap;
  source?: string;
  error?: string;
};

export type ImportPreviewRow = {
  row?: number;
  action: "match" | "create";
  company_id: string;
  company_name: string;
  name?: string;
  domain?: string | null;
  sector_theme?: string | null;
  stage?: string | null;
  note?: string | null;
  row_source?: string | null;
  payload?: Record<string, unknown> | null;
  merge_fields?: Record<string, unknown> | null;
};

export const WATCHLIST_EVENT = "signal:watchlist-changed";
export const WATCHLIST_PARTNER_KEY = "signal.watchlist.partner.v1";

export { PARTNER_ROSTER };

export function loadWatchlistPartner(): string {
  if (typeof window === "undefined") return PARTNER_ROSTER[0];
  try {
    const raw = localStorage.getItem(WATCHLIST_PARTNER_KEY);
    if (raw && raw.trim()) return raw.trim();
  } catch {
    /* ignore */
  }
  return loadPartnerAuthor();
}

export function saveWatchlistPartner(name: string) {
  if (typeof window === "undefined") return;
  const next = name.trim() || PARTNER_ROSTER[0];
  localStorage.setItem(WATCHLIST_PARTNER_KEY, next);
  savePartnerAuthor(next);
}

export function itemsToInterest(items: WatchlistItem[]): InterestState {
  const sorted = [...items].sort((a, b) => (a.rank || 999) - (b.rank || 999));
  const ranked = sorted.map((i) => i.company_id).filter(Boolean);
  return {
    liked: ranked,
    ranked,
    updated_at: sorted[0]?.updated_at || new Date().toISOString(),
  };
}

export function buildOverlap(byPartner: Record<string, WatchlistItem[]>): WatchlistOverlap {
  const map: WatchlistOverlap = {};
  for (const [partner, items] of Object.entries(byPartner)) {
    for (const it of items) {
      const id = it.company_id;
      if (!id) continue;
      if (!map[id]) map[id] = [];
      if (!map[id].includes(partner)) map[id].push(partner);
    }
  }
  return map;
}

export async function fetchWatchlists(partnerName: string): Promise<WatchlistSnapshot> {
  const q = new URLSearchParams({ partner: partnerName });
  const res = await fetch(`/api/watchlists?${q}`, { cache: "no-store" });
  const data = (await res.json()) as WatchlistSnapshot;
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Failed to load watchlists");
  }
  return data;
}

export async function mutateWatchlist(body: Record<string, unknown>): Promise<WatchlistSnapshot> {
  const res = await fetch("/api/watchlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as WatchlistSnapshot & { error?: string };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Failed to update watchlist");
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT));
  }
  return data;
}

export function subscribeWatchlist(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener(WATCHLIST_EVENT, handler);
  return () => window.removeEventListener(WATCHLIST_EVENT, handler);
}

/** One-time migrate legacy Interest localStorage into the active partner's list. */
export function consumeLegacyInterestIds(): string[] | null {
  if (typeof window === "undefined") return null;
  const FLAG = "signal.watchlist.migrated_interest.v1";
  try {
    if (localStorage.getItem(FLAG)) return null;
    const raw = localStorage.getItem("signal.interest.v1");
    localStorage.setItem(FLAG, "1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ranked?: string[]; liked?: string[] };
    const ids = (parsed.ranked?.length ? parsed.ranked : parsed.liked) || [];
    return Array.isArray(ids) ? ids.filter(Boolean) : null;
  } catch {
    return null;
  }
}
