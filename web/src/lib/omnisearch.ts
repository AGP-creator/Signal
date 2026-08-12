/**
 * Omnisearch — Bookface-style typed search across Signal corpora + CSV export.
 */

import type {
  AlertItem,
  Commentary,
  Company,
  NewsItem,
  PeerActivity,
  SectorCall,
} from "@/lib/types";
import { PLAYBOOKS, type Playbook } from "@/lib/playbooks";
import { deriveCycle } from "@/lib/directory";

export type OmniType =
  | "company"
  | "commentary"
  | "news"
  | "peer"
  | "sector"
  | "alert"
  | "playbook";

export type OmniHit = {
  type: OmniType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  meta?: string;
  score: number;
};

export const OMNI_TYPE_LABELS: Record<OmniType, string> = {
  company: "Companies",
  commentary: "Commentary",
  news: "News",
  peer: "Peer moves",
  sector: "Sectors",
  alert: "Alerts",
  playbook: "Playbooks",
};

export const OMNI_TYPE_ORDER: OmniType[] = [
  "company",
  "playbook",
  "commentary",
  "news",
  "peer",
  "sector",
  "alert",
];

function scoreBlob(q: string, parts: (string | null | undefined)[]): number {
  const needle = q.toLowerCase().trim();
  if (!needle) return 0;
  const blob = parts.filter(Boolean).join(" ").toLowerCase();
  if (!blob.includes(needle)) {
    // token AND
    const tokens = needle.split(/\s+/).filter(Boolean);
    if (!tokens.every((t) => blob.includes(t))) return 0;
    return 40;
  }
  if (parts[0]?.toLowerCase() === needle) return 100;
  if (parts[0]?.toLowerCase().startsWith(needle)) return 90;
  if (parts[0]?.toLowerCase().includes(needle)) return 75;
  return 55;
}

export function omnisearch(
  q: string,
  ctx: {
    companies: Company[];
    commentary: Commentary[];
    news: NewsItem[];
    peers: PeerActivity[];
    sectors: SectorCall[];
    alerts: AlertItem[];
    playbooks?: Playbook[];
  },
  typeFilter?: OmniType | "All",
): OmniHit[] {
  const query = q.trim();
  if (!query) return [];
  const hits: OmniHit[] = [];
  const playbooks = ctx.playbooks || PLAYBOOKS;

  for (const c of ctx.companies) {
    const s = scoreBlob(query, [
      c.name,
      c.one_liner,
      c.sector_theme,
      c.subsector,
      c.lead_investor,
      ...(c.investors || []),
    ]);
    if (!s) continue;
    hits.push({
      type: "company",
      id: c.id,
      title: c.name,
      subtitle: c.one_liner || c.sector_theme || "",
      href: `/company/${c.id}`,
      meta: `${c.recommendation || "—"} · ${c.stage || "—"} · ${deriveCycle(c.last_round_date)} · score ${c.thesis_score ?? "—"}`,
      score: s + (c.thesis_score || 0) / 100,
    });
  }

  for (const c of ctx.commentary) {
    const s = scoreBlob(query, [c.quote_or_summary, c.source, c.company_name]);
    if (!s) continue;
    hits.push({
      type: "commentary",
      id: c.id,
      title: c.company_name || c.source || "Commentary",
      subtitle: (c.quote_or_summary || "").slice(0, 160),
      href: c.company_id ? `/company/${c.company_id}` : "/library?tab=commentary",
      meta: `${c.source || "—"} · ${c.sentiment || "mixed"}`,
      score: s,
    });
  }

  for (const n of ctx.news) {
    const s = scoreBlob(query, [n.title, n.why_it_matters, n.source, ...(n.related_themes || [])]);
    if (!s) continue;
    hits.push({
      type: "news",
      id: n.id,
      title: n.title,
      subtitle: n.why_it_matters || "",
      href: n.url || "/library?tab=news",
      meta: n.source || "News",
      score: s,
    });
  }

  for (const p of ctx.peers) {
    const s = scoreBlob(query, [p.firm, p.company_name, p.theme, p.notes, p.round]);
    if (!s) continue;
    hits.push({
      type: "peer",
      id: p.id,
      title: `${p.firm} → ${p.company_name || "deal"}`,
      subtitle: p.notes || p.round || "",
      href: p.company_id ? `/company/${p.company_id}` : "/peers",
      meta: p.thesis_shift ? "Thesis shift" : p.theme || "Peer",
      score: s + (p.thesis_shift ? 10 : 0),
    });
  }

  for (const srow of ctx.sectors) {
    const s = scoreBlob(query, [
      srow.subsector,
      srow.parent_theme,
      srow.why_thirdbase_cares,
      ...(srow.evidence || []),
      ...(srow.top_companies || []),
    ]);
    if (!s) continue;
    hits.push({
      type: "sector",
      id: srow.id,
      title: srow.subsector,
      subtitle: srow.why_thirdbase_cares || srow.parent_theme || "",
      href: "/sectors",
      meta: `Heat ${srow.heat_score ?? "—"} · ${srow.consensus_level || "—"}`,
      score: s + (srow.heat_score || 0) / 20,
    });
  }

  for (const a of ctx.alerts) {
    const s = scoreBlob(query, [a.title, a.body, a.alert_type]);
    if (!s) continue;
    hits.push({
      type: "alert",
      id: a.id,
      title: a.title || "Alert",
      subtitle: a.body || "",
      href: a.company_id ? `/company/${a.company_id}` : "/",
      meta: a.severity || a.alert_type || "Alert",
      score: s,
    });
  }

  for (const p of playbooks) {
    const s = scoreBlob(query, [p.title, p.summary, p.category, ...p.tags, p.body]);
    if (!s) continue;
    hits.push({
      type: "playbook",
      id: p.id,
      title: p.title,
      subtitle: p.summary,
      href: `/library?tab=playbooks&pb=${p.id}`,
      meta: p.category,
      score: s,
    });
  }

  const filtered =
    !typeFilter || typeFilter === "All" ? hits : hits.filter((h) => h.type === typeFilter);
  return filtered.sort((a, b) => b.score - a.score).slice(0, 60);
}

export function omniHitsToCsv(hits: OmniHit[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = "type,title,subtitle,meta,href";
  const rows = hits.map((h) =>
    [h.type, h.title, h.subtitle, h.meta || "", h.href].map(esc).join(","),
  );
  return [header, ...rows].join("\n");
}
