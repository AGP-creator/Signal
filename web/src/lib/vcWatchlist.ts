/**
 * Ordered VC firm watchlist — the peer set partners actively track.
 * Names resolve against PEER_FIRMS / buildPeerIntelligence aliases.
 */

import { PEER_FIRMS } from "@/lib/peerFirms";
import type { FirmDossier } from "@/lib/peerIntel";

export const VC_WATCHLIST: string[] = [
  "Andreessen Horowitz",
  "Sequoia Capital",
  "Lux Capital",
  "Conviction",
  "Gradient Ventures",
  "Ribbit Capital",
  "Shield Capital",
  "8VC",
  "Silver Lake",
  "Thrive Capital",
  "Redpoint",
  "Altimeter Capital",
  "Coatue Management",
  "Tiger Global Management",
  "IVP",
  "Haystack",
  "Initialized Capital",
  "Felicis Ventures",
  "Y Combinator",
  "Benchmark",
  "Bessemer Venture Partners",
  "Insight Partners",
  "Index Ventures",
  "GV",
  "NEA",
  "Kleiner Perkins",
  "Accel",
  "General Catalyst",
  "Khosla Ventures",
  "Founders Fund",
  "Spark Capital",
  "Union Square Ventures",
  "137 Ventures",
  "1752vc",
  "Antler",
  "Kindred Ventures",
  "Basis Set Ventures",
  "Dragonfly",
  "Scout Ventures",
  "2048 Ventures",
  "Peak XV Partners",
  "Obvious Ventures",
  "Primary Venture Partners",
  "Voyager Ventures",
  "Entrepreneurs First",
  "Lightspeed Venture Partners",
  "Picus Capital",
  "Seraphim Space",
  "Samaipata",
  "SlateVC",
  "NFX",
  "b2venture",
  "Social Leverage",
  "Layer Global",
  "Breakout Ventures",
  "Rosberg Ventures",
  "CAVU Consumer Partners",
  "CoFound",
  "Sante Ventures",
  "Quantonation Ventures",
  "StageOne Ventures",
];

export type VcTrackStatus = "watching" | "hot" | "quiet" | "parked";

export type VcTrackNote = {
  status: VcTrackStatus;
  note: string;
  updated_at: string;
};

export type WatchFirmRow = FirmDossier & { watch_rank: number };

const STORE_KEY = "signal:vc-firm-tracks";

export function loadVcTracks(): Record<string, VcTrackNote> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, VcTrackNote>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveVcTrack(slug: string, patch: Partial<VcTrackNote>) {
  const all = loadVcTracks();
  const prev = all[slug] || { status: "watching" as const, note: "", updated_at: "" };
  all[slug] = {
    status: patch.status ?? prev.status,
    note: patch.note ?? prev.note,
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(STORE_KEY, JSON.stringify(all));
  window.dispatchEvent(new Event("signal:vc-tracks-changed"));
}

export function firmSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function emptyDossier(name: string): FirmDossier {
  const cfg =
    PEER_FIRMS.find((f) => norm(f.name) === norm(name)) ||
    PEER_FIRMS.find((f) => f.aliases.some((a) => norm(a) === norm(name)));
  const display = cfg?.name || name;
  const slug = firmSlug(display);
  return {
    id: slug,
    slug,
    name: display,
    aliases: cfg?.aliases || [],
    stated_focus: cfg?.stated_focus || "",
    deal_count: 0,
    lead_count: 0,
    deep_dive_count: 0,
    thesis_shift_count: 0,
    off_thesis_count: 0,
    drift_score: 0,
    focus_alignment: 0,
    conviction_score: 0,
    watch_priority: 0,
    top_themes: [],
    top_stages: [],
    top_coinvestors: [],
    last_activity_date: "",
    deals: [],
    recent_activity: [],
    thesis_shifts: [],
    intel_summary: "On the watchlist — no peer activity yet.",
  };
}

/** Map watchlist names onto peer intel dossiers (alias-aware). */
export function resolveWatchlistFirms(firms: FirmDossier[]): WatchFirmRow[] {
  const byNorm = new Map<string, FirmDossier>();
  for (const f of firms) {
    byNorm.set(norm(f.name), f);
    for (const a of f.aliases) byNorm.set(norm(a), f);
  }

  const out: WatchFirmRow[] = [];
  const seen = new Set<string>();

  VC_WATCHLIST.forEach((name, i) => {
    const hit = byNorm.get(norm(name)) || firms.find((f) => f.slug === firmSlug(name));
    if (hit) {
      if (seen.has(hit.slug)) return;
      seen.add(hit.slug);
      out.push({ ...hit, watch_rank: i + 1 });
      return;
    }
    const placeholder = emptyDossier(name);
    if (seen.has(placeholder.slug)) return;
    seen.add(placeholder.slug);
    out.push({ ...placeholder, watch_rank: i + 1 });
  });

  return out;
}
