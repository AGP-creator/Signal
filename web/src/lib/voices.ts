import { findVoiceInText, GP_WATCHLIST, type GpVoice } from "@/lib/gpWatchlist";
import type { AlertItem, Commentary, NewsItem } from "@/lib/types";

export type VoiceUpdate = {
  id: string;
  voice: GpVoice;
  text: string;
  source: string;
  captured_at?: string;
  company_id?: string | null;
  company_name?: string | null;
  sentiment?: string | null;
  kind: "commentary" | "news" | "alert";
};

function sortByDateDesc(a?: string, b?: string) {
  return String(b || "").localeCompare(String(a || ""));
}

/** Latest captured chatter that mentions someone on the GP watchlist. */
export function buildVoiceUpdates(opts: {
  commentary?: Commentary[];
  news?: NewsItem[];
  alerts?: AlertItem[];
  limit?: number;
}): VoiceUpdate[] {
  const { commentary = [], news = [], alerts = [], limit = 24 } = opts;
  const out: VoiceUpdate[] = [];
  const seen = new Set<string>();

  for (const cm of commentary) {
    const text = cm.quote_or_summary || "";
    const voice = findVoiceInText(text);
    if (!voice) continue;
    const key = `cm:${cm.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: key,
      voice,
      text,
      source: cm.source || "Commentary",
      captured_at: cm.captured_at,
      company_id: cm.company_id,
      company_name: cm.company_name || null,
      sentiment: cm.sentiment || null,
      kind: "commentary",
    });
  }

  for (const n of news) {
    const blob = `${n.title || ""} ${n.why_it_matters || ""} ${n.source || ""}`;
    const voice = findVoiceInText(blob) || GP_WATCHLIST.find((v) => (n.source || "").toLowerCase().includes(v.name.toLowerCase()));
    if (!voice) continue;
    const key = `n:${n.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: key,
      voice,
      text: n.why_it_matters || n.title || "",
      source: n.source || "News",
      captured_at: n.published_at || undefined,
      kind: "news",
    });
  }

  for (const a of alerts) {
    const blob = `${a.title || ""} ${a.body || ""}`;
    const voice = findVoiceInText(blob);
    if (!voice) continue;
    const key = `a:${a.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: key,
      voice,
      text: a.body || a.title || "",
      source: a.alert_type || "Alert",
      captured_at: a.created_at?.slice(0, 10),
      company_id: a.company_id,
      kind: "alert",
    });
  }

  return out.sort((a, b) => sortByDateDesc(a.captured_at, b.captured_at)).slice(0, limit);
}

export function peopleToFollow(): GpVoice[] {
  return GP_WATCHLIST.filter((v) => v.kind === "person");
}

export function pagesToFollow(): GpVoice[] {
  return GP_WATCHLIST.filter((v) => v.kind === "page");
}
