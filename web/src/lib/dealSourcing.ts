/**
 * Deal Sourcing & Discovery — thesis-matched market scan + agent surface.
 *
 * Prefill mode (default): rich seed signals, zero Gemini / network cost.
 * Live mode: same shapes from Python adapters (EDGAR / HN / RSS / stubs).
 * Flip via SIGNAL_SOURCING_MODE on refresh; UI reads whatever is in `signals`.
 */

import type { Company, SignalItem } from "@/lib/types";
import { PREFILL_SOURCING_SIGNALS } from "@/lib/prefillSourcing";

export type SourcingKind =
  | "funding"
  | "hiring"
  | "product_launch"
  | "founder_move"
  | "customer_win";

export const SOURCING_KINDS: { id: SourcingKind | "all" | "early"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "early", label: "Early only" },
  { id: "funding", label: "Funding" },
  { id: "hiring", label: "Hiring" },
  { id: "product_launch", label: "Product" },
  { id: "founder_move", label: "Founder moves" },
  { id: "customer_win", label: "Customer wins" },
];

export const KIND_LABEL: Record<SourcingKind, string> = {
  funding: "Funding",
  hiring: "Hiring",
  product_launch: "Product",
  founder_move: "Founder",
  customer_win: "Customer",
};

export const KIND_COLORS: Record<SourcingKind, string> = {
  funding: "var(--signal)",
  hiring: "var(--deep)",
  product_launch: "var(--ok)",
  founder_move: "var(--warn)",
  customer_win: "#8b6f47",
};

export type SourcingEvent = {
  id: string;
  kind: SourcingKind;
  title: string;
  summary: string;
  source: string;
  at: string;
  url?: string | null;
  early_signal: boolean;
};

/** One company card consolidating multi-source hits (no double-count). */
export type SourcingCard = {
  id: string;
  company_id?: string;
  company_name: string;
  kinds: SourcingKind[];
  events: SourcingEvent[];
  source_count: number;
  sources: string[];
  early_signal: boolean;
  on_book: boolean;
  stage?: string | null;
  theme?: string | null;
  recommendation?: string | null;
  thesis_score?: number | null;
  latest_at: string;
  href: string;
  headline: string;
  body: string;
};

export type AdapterStatus = {
  id: string;
  label: string;
  status: "live" | "prefill" | "stub" | "ready";
  detail: string;
};

export type AgentPrompt = {
  id: string;
  label: string;
  prompt: string;
};

export type SourcingPack = {
  mode: "store" | "prefill_fallback";
  cards: SourcingCard[];
  summary: {
    headline: string;
    must_do: string[];
    company_count: number;
    event_count: number;
    early_count: number;
    off_book_count: number;
    consolidated_count: number;
    deep_dive_hits: number;
  };
  kindMix: { label: string; pct: number; color: string; count: number }[];
  sourceMix: { label: string; value: number }[];
  timeline: { label: string; value: number }[];
  funnel: { label: string; count: number; pct?: number }[];
  adapters: AdapterStatus[];
  agentPrompts: AgentPrompt[];
  topEarly: SourcingCard[];
  topConsolidated: SourcingCard[];
};

const KIND_ALIASES: Record<string, SourcingKind> = {
  funding: "funding",
  raise: "funding",
  hiring: "hiring",
  headcount: "hiring",
  product: "product_launch",
  product_launch: "product_launch",
  launch: "product_launch",
  founder_move: "founder_move",
  founder: "founder_move",
  newco: "founder_move",
  customer_win: "customer_win",
  customer: "customer_win",
  traction: "customer_win",
};

const MAINSTREAM_STAGES = /series\s*[b-z]|growth|late/i;

const ADAPTERS: AdapterStatus[] = [
  {
    id: "edgar",
    label: "EDGAR / Form D",
    status: "ready",
    detail: "Quiet raises before PitchBook league tables",
  },
  {
    id: "hn",
    label: "Hacker News",
    status: "ready",
    detail: "Show HN launches + funding chatter",
  },
  {
    id: "rss",
    label: "News RSS",
    status: "ready",
    detail: "Press + customer-win headlines",
  },
  {
    id: "arxiv",
    label: "arXiv / OSS",
    status: "ready",
    detail: "Research velocity for sector of tomorrow",
  },
  {
    id: "hiring",
    label: "Hiring graphs",
    status: "stub",
    detail: "Coresignal / LinkedIn — plug when licensed",
  },
  {
    id: "deal_db",
    label: "Deal databases",
    status: "stub",
    detail: "PitchBook / CB / Harmonic / Dealroom stubs",
  },
  {
    id: "social",
    label: "GP / social",
    status: "prefill",
    detail: "Watchlist founder moves (live X = Phase 2)",
  },
];

function daysAgo(iso?: string | null): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.floor((Date.now() - t) / (86400 * 1000));
}

function weekBucket(iso: string): string {
  const d = daysAgo(iso);
  if (d <= 7) return "0–7d";
  if (d <= 14) return "8–14d";
  if (d <= 30) return "15–30d";
  return "30d+";
}

export function normalizeSourcingKind(raw?: string | null): SourcingKind | null {
  if (!raw) return null;
  return KIND_ALIASES[raw.trim().toLowerCase()] || null;
}

function isEarly(sig: SignalItem, company?: Company): boolean {
  const raw = sig.raw || {};
  if (typeof raw.early_signal === "boolean") return raw.early_signal;
  if (typeof raw.mainstream === "boolean") return !raw.mainstream;
  if (!company) return true; // not on book yet → early by definition
  if ((company.tier1_count || 0) > 0) return false;
  if (company.stage && MAINSTREAM_STAGES.test(company.stage)) return false;
  return true;
}

function titleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 48);
}

/** Prefer DB signals; fall back to embedded prefill so the desk never goes empty. */
export function resolveSourcingSignals(dbSignals: SignalItem[]): {
  signals: SignalItem[];
  mode: "store" | "prefill_fallback";
} {
  const usable = dbSignals.filter((s) => normalizeSourcingKind(s.signal_type));
  if (usable.length >= 3) {
    return { signals: usable, mode: "store" };
  }
  return { signals: PREFILL_SOURCING_SIGNALS, mode: "prefill_fallback" };
}

export function buildDealSourcing(input: {
  signals: SignalItem[];
  companies: Company[];
}): SourcingCard[] {
  const { signals, companies } = input;
  const byId = new Map(companies.map((c) => [c.id, c]));
  const byName = new Map(companies.map((c) => [c.name.toLowerCase(), c]));

  // First pass: dedupe identical company+title across sources
  const seenEvent = new Set<string>();
  const events: Array<SourcingEvent & { company_id?: string; company_name: string }> = [];

  for (const s of signals) {
    const kind = normalizeSourcingKind(s.signal_type);
    if (!kind) continue;
    const name = (s.company_name || "").trim() || "Unknown";
    const key = `${name.toLowerCase()}|${titleKey(s.title || "")}`;
    if (seenEvent.has(key)) continue;
    seenEvent.add(key);

    const company =
      (s.company_id && byId.get(s.company_id)) || byName.get(name.toLowerCase());

    events.push({
      id: s.id,
      kind,
      title: s.title || "Signal",
      summary: s.summary || "",
      source: s.source || "unknown",
      at: s.observed_at || new Date().toISOString().slice(0, 10),
      url: s.url,
      early_signal: isEarly(s, company),
      company_id: company?.id || s.company_id || undefined,
      company_name: company?.name || name,
    });
  }

  // Second pass: consolidate by company
  const groups = new Map<string, typeof events>();
  for (const ev of events) {
    const gkey = (ev.company_id || ev.company_name).toLowerCase();
    const list = groups.get(gkey) || [];
    list.push(ev);
    groups.set(gkey, list);
  }

  const cards: SourcingCard[] = [];
  for (const [, list] of groups) {
    list.sort((a, b) => daysAgo(a.at) - daysAgo(b.at));
    const head = list[0];
    const company =
      (head.company_id && byId.get(head.company_id)) ||
      byName.get(head.company_name.toLowerCase());
    const kinds = [...new Set(list.map((e) => e.kind))];
    const sources = [...new Set(list.map((e) => e.source))];
    const early = list.some((e) => e.early_signal) && !(company && (company.tier1_count || 0) > 1);
    const onBook = Boolean(company);
    const href = company ? `/company/${company.id}` : "/search";

    cards.push({
      id: `src_${head.company_id || titleKey(head.company_name)}`,
      company_id: company?.id || head.company_id,
      company_name: company?.name || head.company_name,
      kinds,
      events: list.map((row) => {
        const { company_id: _cid, company_name: _cname, ...ev } = row;
        void _cid;
        void _cname;
        return ev;
      }),
      source_count: sources.length,
      sources,
      early_signal: early || !onBook,
      on_book: onBook,
      stage: company?.stage,
      theme: company?.sector_theme,
      recommendation: company?.recommendation,
      thesis_score: company?.thesis_score,
      latest_at: head.at,
      href,
      headline:
        list.length > 1
          ? `${company?.name || head.company_name} — ${list.length} consolidated signals`
          : head.title,
      body: head.summary || head.title,
    });
  }

  return cards.sort((a, b) => {
    // Early + off-book first (goal: early signal), then recency
    const ae = a.early_signal && !a.on_book ? 0 : a.early_signal ? 1 : 2;
    const be = b.early_signal && !b.on_book ? 0 : b.early_signal ? 1 : 2;
    if (ae !== be) return ae - be;
    return daysAgo(a.latest_at) - daysAgo(b.latest_at);
  });
}

export function buildSourcingPack(input: {
  signals: SignalItem[];
  companies: Company[];
}): SourcingPack {
  const resolved = resolveSourcingSignals(input.signals);
  const cards = buildDealSourcing({ signals: resolved.signals, companies: input.companies });

  const eventCount = cards.reduce((n, c) => n + c.events.length, 0);
  const early = cards.filter((c) => c.early_signal);
  const offBook = cards.filter((c) => !c.on_book);
  const consolidated = cards.filter((c) => c.source_count > 1);
  const deepDiveHits = cards.filter((c) => c.recommendation === "Deep Dive").length;

  const kindCounts: Record<SourcingKind, number> = {
    funding: 0,
    hiring: 0,
    product_launch: 0,
    founder_move: 0,
    customer_win: 0,
  };
  for (const c of cards) {
    for (const k of c.kinds) kindCounts[k] += 1;
  }
  const kindTotal = Object.values(kindCounts).reduce((a, b) => a + b, 0) || 1;
  const kindMix = (Object.keys(kindCounts) as SourcingKind[]).map((k) => ({
    label: KIND_LABEL[k],
    count: kindCounts[k],
    pct: Math.round((kindCounts[k] / kindTotal) * 100),
    color: KIND_COLORS[k],
  }));

  const sourceMap = new Map<string, number>();
  for (const c of cards) {
    for (const s of c.sources) {
      const label = s.replace(/^prefill:/, "").replace(/_/g, " ");
      sourceMap.set(label, (sourceMap.get(label) || 0) + 1);
    }
  }
  const sourceMix = [...sourceMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const buckets = ["0–7d", "8–14d", "15–30d", "30d+"] as const;
  const timelineMap = Object.fromEntries(buckets.map((b) => [b, 0])) as Record<
    (typeof buckets)[number],
    number
  >;
  for (const c of cards) {
    const b = weekBucket(c.latest_at) as (typeof buckets)[number];
    timelineMap[b] += 1;
  }
  const timeline = buckets.map((label) => ({ label, value: timelineMap[label] }));

  const rawEvents = resolved.signals.filter((s) => normalizeSourcingKind(s.signal_type)).length;
  const funnel = [
    { label: "Raw hits", count: Math.max(rawEvents, eventCount) },
    { label: "After dedupe", count: eventCount },
    { label: "Companies", count: cards.length },
    { label: "Early signal", count: early.length },
    { label: "Not on book", count: offBook.length },
  ].map((step, _, arr) => ({
    ...step,
    pct: Math.round((step.count / Math.max(arr[0].count, 1)) * 100),
  }));

  const adapters = ADAPTERS.map((a) => {
    if (resolved.mode === "prefill_fallback") {
      if (a.status === "ready") return { ...a, status: "prefill" as const };
      return a;
    }
    if (a.status === "prefill") return { ...a, status: "live" as const };
    if (a.status === "ready") return { ...a, status: "live" as const };
    return a;
  });

  const topEarly = early.slice(0, 5);
  const topConsolidated = [...consolidated]
    .sort((a, b) => b.source_count - a.source_count || daysAgo(a.latest_at) - daysAgo(b.latest_at))
    .slice(0, 4);

  const must_do: string[] = [];
  if (offBook.length) {
    must_do.push(
      `Scout ${offBook
        .slice(0, 2)
        .map((c) => c.company_name)
        .join(" · ")} — early / not yet on book.`,
    );
  }
  if (consolidated.length) {
    must_do.push(
      `Trust consolidations first (${consolidated.length} multi-source) — same company, not double-count.`,
    );
  }
  if (deepDiveHits) {
    must_do.push(`${deepDiveHits} Deep Dive hits already on book — open briefs before Monday.`);
  }
  must_do.push(
    resolved.mode === "prefill_fallback"
      ? "Prefill mode — Refresh keeps Gemini off; set SIGNAL_SOURCING_MODE=live when ready."
      : "Store mode live — adapters feeding the book; Flip to hybrid to keep prefill safety net.",
  );
  if (must_do.length < 3) {
    must_do.push("Push early names into Interest Desk → Partner Meeting spine.");
  }

  const headline =
    early.length && offBook.length
      ? `${early.length} early signals · ${offBook.length} not yet on book — discovery before consensus`
      : early.length
        ? `${early.length} early thesis-fit signals in the scan`
        : `${cards.length} companies in the continuous sourcing loop`;

  const agentPrompts: AgentPrompt[] = [
    {
      id: "early",
      label: "What’s early?",
      prompt: "Show continuous deal sourcing — which companies are early signal and not yet on book?",
    },
    {
      id: "why",
      label: "Why this company?",
      prompt: topEarly[0]
        ? `Why does ${topEarly[0].company_name} matter for Thirdbase thesis right now?`
        : "Which newly sourced company matters most for Thirdbase thesis?",
    },
    {
      id: "hiring",
      label: "Hiring heat",
      prompt: "Which hiring signals look like early growth ahead of a raise?",
    },
    {
      id: "founder",
      label: "Founder moves",
      prompt: "Any watched founder or operator newcos from continuous sourcing?",
    },
    {
      id: "dedupe",
      label: "Dedupe proof",
      prompt: "How does deal sourcing consolidate multi-source hits without double-counting?",
    },
  ];

  return {
    mode: resolved.mode,
    cards,
    summary: {
      headline,
      must_do: must_do.slice(0, 4),
      company_count: cards.length,
      event_count: eventCount,
      early_count: early.length,
      off_book_count: offBook.length,
      consolidated_count: consolidated.length,
      deep_dive_hits: deepDiveHits,
    },
    kindMix,
    sourceMix,
    timeline,
    funnel,
    adapters,
    agentPrompts,
    topEarly,
    topConsolidated,
  };
}

export function sourcingCounsel(cards: SourcingCard[], mode: string): string {
  const early = cards.filter((c) => c.early_signal).length;
  const multi = cards.filter((c) => c.source_count > 1).length;
  const off = cards.filter((c) => !c.on_book).length;
  if (!cards.length) {
    return "No sourcing signals yet — run Refresh (prefill mode needs no Gemini key).";
  }
  const modeLabel =
    mode === "prefill_fallback"
      ? "prefill fallback"
      : mode === "store"
        ? "store"
        : mode;
  return `${cards.length} companies · ${early} early · ${off} not yet on book · ${multi} multi-source consolidations · mode ${modeLabel}. Gemini is not used in this loop.`;
}

export function formatSourcingBriefMarkdown(pack: SourcingPack): string {
  const lines = [
    "# Deal Sourcing & Discovery",
    "",
    pack.summary.headline,
    "",
    "## Must do",
    ...pack.summary.must_do.map((m) => `- ${m}`),
    "",
    `Companies: **${pack.summary.company_count}** · Events: **${pack.summary.event_count}** · Early: **${pack.summary.early_count}** · Off-book: **${pack.summary.off_book_count}** · Consolidated: **${pack.summary.consolidated_count}**`,
    "",
    "## Top early",
    ...pack.topEarly.map(
      (c) =>
        `- **${c.company_name}** — ${c.kinds.map((k) => KIND_LABEL[k]).join(", ")} · ${c.on_book ? "on book" : "not on book"}`,
    ),
    "",
    "## Consolidations",
    ...(pack.topConsolidated.length
      ? pack.topConsolidated.map(
          (c) => `- **${c.company_name}** — ${c.source_count} sources (${c.sources.join(", ")})`,
        )
      : ["- None yet"]),
    "",
    `Mode: ${pack.mode === "prefill_fallback" ? "prefill (no Gemini)" : "store"}. Open **/source**.`,
  ];
  return lines.join("\n");
}
