/**
 * Launch Feed — Launch YC–style discovery of newly surfaced companies / founder radar hits.
 * Grounded in alerts, recent last_signal_date, and commentary — not a scraped YC feed.
 */

import type { AlertItem, Commentary, Company, NewsItem } from "@/lib/types";
import { deriveCycle, deriveHiring } from "@/lib/directory";

export type LaunchItem = {
  id: string;
  kind: "newco" | "signal" | "launch_news" | "founder_radar";
  title: string;
  body: string;
  company_id?: string;
  company_name?: string;
  stage?: string | null;
  theme?: string | null;
  recommendation?: string | null;
  thesis_score?: number | null;
  cycle?: string;
  hiring?: string;
  at: string;
  cta: string;
  href: string;
};

function daysAgo(iso?: string | null): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.floor((Date.now() - t) / (86400 * 1000));
}

export function buildLaunchFeed(input: {
  companies: Company[];
  alerts: AlertItem[];
  commentary: Commentary[];
  news: NewsItem[];
}): LaunchItem[] {
  const { companies, alerts, commentary, news } = input;
  const byId = new Map(companies.map((c) => [c.id, c]));
  const items: LaunchItem[] = [];

  for (const a of alerts) {
    const title = a.title || "Alert";
    const isFounder =
      /founder|stealth|newco|launching|spinning up/i.test(title) ||
      /founder|stealth|newco/i.test(a.body || "");
    const c = a.company_id ? byId.get(a.company_id) : undefined;
    items.push({
      id: `alert_${a.id}`,
      kind: isFounder ? "founder_radar" : "signal",
      title,
      body: a.body || "",
      company_id: a.company_id || undefined,
      company_name: c?.name,
      stage: c?.stage,
      theme: c?.sector_theme,
      recommendation: c?.recommendation,
      thesis_score: c?.thesis_score,
      cycle: c ? deriveCycle(c.last_round_date) : undefined,
      hiring: c ? deriveHiring(c) : undefined,
      at: a.created_at || new Date().toISOString(),
      cta: isFounder ? "Open founder radar context" : "Open signal",
      href: a.company_id ? `/company/${a.company_id}` : "/judgment",
    });
  }

  // Fresh signals on the book — proxy for "just launched / just raised"
  const fresh = [...companies]
    .filter((c) => daysAgo(c.last_signal_date) <= 21)
    .sort((a, b) => daysAgo(a.last_signal_date) - daysAgo(b.last_signal_date))
    .slice(0, 18);

  for (const c of fresh) {
    const viral = /viral|launch|hn|product hunt|ga\b|generally available/i.test(
      `${c.traction_notes || ""} ${c.why_now || ""}`,
    );
    items.push({
      id: `co_${c.id}`,
      kind: viral ? "newco" : "signal",
      title: viral ? `${c.name} — launch / traction spike` : `${c.name} — fresh signal`,
      body: c.why_now || c.one_liner || c.traction_notes || "",
      company_id: c.id,
      company_name: c.name,
      stage: c.stage,
      theme: c.sector_theme,
      recommendation: c.recommendation,
      thesis_score: c.thesis_score,
      cycle: deriveCycle(c.last_round_date),
      hiring: deriveHiring(c),
      at: c.last_signal_date || new Date().toISOString(),
      cta: "Open brief",
      href: `/company/${c.id}`,
    });
  }

  for (const n of news.slice(0, 10)) {
    if (!/launch|announce|raise|fund|debut|ship/i.test(`${n.title} ${n.why_it_matters || ""}`)) {
      continue;
    }
    items.push({
      id: `news_${n.id}`,
      kind: "launch_news",
      title: n.title,
      body: n.why_it_matters || "",
      theme: (n.related_themes || [])[0],
      at: n.published_at || new Date().toISOString(),
      cta: n.url ? "Read source" : "Open library",
      href: n.url || "/library?tab=news",
    });
  }

  // Commentary that smells like launch / first customers
  for (const c of commentary) {
    if (!/launch|first customer|ga\b|product|demo day|batch/i.test(c.quote_or_summary || "")) {
      continue;
    }
    const co = byId.get(c.company_id);
    items.push({
      id: `com_${c.id}`,
      kind: "launch_news",
      title: `${c.source || "Commentary"} on ${c.company_name || "company"}`,
      body: c.quote_or_summary || "",
      company_id: c.company_id,
      company_name: c.company_name || co?.name,
      stage: co?.stage,
      theme: co?.sector_theme,
      recommendation: co?.recommendation,
      thesis_score: co?.thesis_score,
      at: c.captured_at || new Date().toISOString(),
      cta: "Open company",
      href: `/company/${c.company_id}`,
    });
  }

  // Dedupe by title+company, prefer founder_radar > newco > signal
  const rank = { founder_radar: 0, newco: 1, launch_news: 2, signal: 3 } as const;
  const seen = new Set<string>();
  const sorted = items.sort((a, b) => {
    const kd = rank[a.kind] - rank[b.kind];
    if (kd !== 0) return kd;
    return daysAgo(a.at) - daysAgo(b.at);
  });

  const out: LaunchItem[] = [];
  for (const it of sorted) {
    const key = `${it.company_id || ""}|${it.title.toLowerCase().slice(0, 48)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
    if (out.length >= 40) break;
  }
  return out;
}

export function launchCounsel(items: LaunchItem[]): string {
  const founders = items.filter((i) => i.kind === "founder_radar").length;
  const launches = items.filter((i) => i.kind === "newco").length;
  if (!items.length) {
    return "No fresh launches in the current store — Refresh pipeline or widen Watch.";
  }
  return `${items.length} live surfaces · ${launches} launch/traction · ${founders} founder-radar. Like anything interesting into Interest Desk before the partner scramble.`;
}
