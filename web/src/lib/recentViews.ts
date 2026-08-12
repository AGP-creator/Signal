/**
 * Recently viewed companies — local partner memory for Desk continuity.
 */

export type RecentView = {
  id: string;
  slug?: string | null;
  name: string;
  recommendation?: string | null;
  thesis_score?: number | null;
  viewedAt: string;
};

const KEY = "signal-recent-views";
const MAX = 12;

export function loadRecentViews(): RecentView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentView[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecentView(entry: Omit<RecentView, "viewedAt"> & { viewedAt?: string }) {
  if (typeof window === "undefined") return;
  const next: RecentView = {
    id: entry.id,
    slug: entry.slug,
    name: entry.name,
    recommendation: entry.recommendation,
    thesis_score: entry.thesis_score,
    viewedAt: entry.viewedAt || new Date().toISOString(),
  };
  const prev = loadRecentViews().filter((r) => r.id !== next.id);
  const rows = [next, ...prev].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent("signal:recent-views-changed"));
}

export function clearRecentViews() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("signal:recent-views-changed"));
}
