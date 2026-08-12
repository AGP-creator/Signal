"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Bot,
  Briefcase,
  Calendar,
  Compass,
  Crosshair,
  FileSpreadsheet,
  Building2,
  Flame,
  Gauge,
  Layers,
  Library,
  MessageSquare,
  Radar,
  Scale,
  Search,
  Sparkles,
  Target,
  Trophy,
  Users,
  Workflow,
  Zap,
  NotebookPen,
} from "lucide-react";
import { DealCard } from "@/components/DealCard";
import { ExternalLink } from "@/components/ExternalLink";
import { CompanyLink, CompetitorLink } from "@/components/EntityLink";
import { MixGauge } from "@/components/MixGauge";
import { RecentViewsStrip } from "@/components/RecentViews";
import { BarChart, DonutChart } from "@/components/charts";
import {
  EmptyState,
  Eyebrow,
  Panel,
  RecBadge,
  SectionTitle,
  ToneBadge,
} from "@/components/ui";
import { buildAiOsPack } from "@/lib/aiOs";
import { type DealTrail } from "@/lib/icTrail";
import { loadMergedTrails } from "@/lib/icStore";
import { NEWS_KIND_META, selectNewsWorthReading } from "@/lib/newsWorthReading";
import {
  applyStaleReviews,
  hydrateStaleReviews,
  loadStaleReviews,
} from "@/lib/staleReviewStore";
import type {
  AlertItem,
  Commentary,
  Company,
  DigestRow,
  NewsItem,
  PeerActivity,
  SectorCall,
} from "@/lib/types";
import { cn, fmtWhen, portfolioMix } from "@/lib/utils";
import { buildWorkQueue } from "@/lib/workQueue";

/** LOCKED LAYOUT — square module grid on the home desk. Do not collapse into lists/cards. */
const MODULES: {
  href: string;
  label: string;
  blurb: string;
  group: "Decide" | "Partner" | "AI" | "Intel" | "Source" | "External";
  icon: ReactNode;
}[] = [
  {
    href: "/forge",
    label: "Forge",
    blurb: "Win reality × attention",
    group: "Decide",
    icon: <Crosshair className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/os",
    label: "Venture agent",
    blurb: "Core intelligence pillars",
    group: "AI",
    icon: <Bot className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/deals",
    label: "Great deals",
    blurb: "Noise vs outstanding",
    group: "Decide",
    icon: <Trophy className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/compare",
    label: "Compare",
    blurb: "Side-by-side conviction",
    group: "Decide",
    icon: <Scale className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/edge",
    label: "Partner Edge",
    blurb: "Anti-consensus radar",
    group: "Partner",
    icon: <Zap className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/log",
    label: "Partner Log",
    blurb: "Shared notes & threads",
    group: "Partner",
    icon: <NotebookPen className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/judgment",
    label: "Judgment",
    blurb: "Overrides & misses",
    group: "Partner",
    icon: <Gauge className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/pipeline",
    label: "Pipeline",
    blurb: "Thesis-ranked book",
    group: "Decide",
    icon: <Layers className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/workbook",
    label: "Workbook",
    blurb: "Living Excel pipeline",
    group: "Decide",
    icon: <FileSpreadsheet className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/source",
    label: "Deal Sourcing",
    blurb: "Discovery agent",
    group: "Source",
    icon: <Radar className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/chat",
    label: "Chat",
    blurb: "Grounded Q&A",
    group: "AI",
    icon: <MessageSquare className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/peers",
    label: "Competitor OS",
    blurb: "Peer heat & syndicates",
    group: "Intel",
    icon: <Radar className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/sectors",
    label: "Sectors",
    blurb: "Sector of tomorrow",
    group: "Intel",
    icon: <Flame className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/atlas",
    label: "Atlas",
    blurb: "Market map",
    group: "AI",
    icon: <Compass className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/work",
    label: "Work queue",
    blurb: "Diligence handoffs",
    group: "Decide",
    icon: <Workflow className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/search",
    label: "Research",
    blurb: "IC / scout briefs",
    group: "AI",
    icon: <Search className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/ic",
    label: "IC Trail",
    blurb: "Stage & checklist",
    group: "Partner",
    icon: <Target className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/gp",
    label: "GP Desk",
    blurb: "Partner operating view",
    group: "Partner",
    icon: <Briefcase className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/competitors",
    label: "Competitors",
    blurb: "Firm list & analytics",
    group: "Intel",
    icon: <Users className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/firms",
    label: "VC Firms",
    blurb: "Firm watchlist tracker",
    group: "Intel",
    icon: <Building2 className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/library",
    label: "Library",
    blurb: "News & stale review",
    group: "Intel",
    icon: <Library className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/digest",
    label: "Digest",
    blurb: "M/W/F priority mail",
    group: "Intel",
    icon: <Radar className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/launch",
    label: "Launch",
    blurb: "Fresh launches",
    group: "Source",
    icon: <Sparkles className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/directory",
    label: "Directory",
    blurb: "Startup browse",
    group: "Source",
    icon: <Layers className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/find",
    label: "Find",
    blurb: "Omnisearch",
    group: "Source",
    icon: <Search className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/interest",
    label: "Interest Desk",
    blurb: "Demo Day match",
    group: "Source",
    icon: <Target className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/meeting",
    label: "Partner Meeting",
    blurb: "Monday agenda (~90m)",
    group: "Partner",
    icon: <Calendar className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/lp",
    label: "LP Desk",
    blurb: "External narrative",
    group: "External",
    icon: <Briefcase className="h-4 w-4" strokeWidth={1.75} />,
  },
];

/** Hero feature rail — Monday path first, then stretch desks. */
const FEATURED = [
  {
    href: "/forge",
    label: "Forge",
    blurb: "Win reality × attention",
    icon: <Crosshair className="h-3.5 w-3.5" strokeWidth={1.75} />,
  },
  {
    href: "/meeting",
    label: "Monday agenda",
    blurb: "~90m partner meeting",
    icon: <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />,
  },
  {
    href: "/workbook",
    label: "Workbook",
    blurb: "Debate surface in Excel",
    icon: <FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={1.75} />,
  },
  {
    href: "/chat",
    label: "Chat",
    blurb: "Grounded partner Q&A",
    icon: <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} />,
  },
  {
    href: "/search",
    label: "Research",
    blurb: "IC vs scout briefs",
    icon: <Search className="h-3.5 w-3.5" strokeWidth={1.75} />,
  },
  {
    href: "/digest",
    label: "Digest",
    blurb: "M/W/F priority mail",
    icon: <Radar className="h-3.5 w-3.5" strokeWidth={1.75} />,
  },
] as const;

const GROUP_TONE: Record<(typeof MODULES)[number]["group"], string> = {
  Decide: "decide",
  Partner: "partner",
  AI: "ai",
  Intel: "intel",
  Source: "source",
  External: "external",
};

function openAsk(prompt?: string) {
  window.dispatchEvent(
    new CustomEvent("signal:open-command", { detail: prompt ? { q: prompt } : undefined }),
  );
}

export function DeskCommand({
  companies,
  sectors,
  alerts,
  news,
  peers,
  commentary,
  lastRefreshed,
  liveSignals,
}: {
  companies: Company[];
  sectors: SectorCall[];
  alerts: AlertItem[];
  news: NewsItem[];
  peers: PeerActivity[];
  commentary: Commentary[];
  digest?: DigestRow | null;
  lastRefreshed: string;
  liveSignals: string;
}) {
  const [trails, setTrails] = useState<DealTrail[]>([]);
  const [askDraft, setAskDraft] = useState("");
  const [staleTick, setStaleTick] = useState(0);

  useEffect(() => {
    const sync = () => setTrails(loadMergedTrails(companies));
    sync();
    window.addEventListener("signal:ic-changed", sync);
    return () => window.removeEventListener("signal:ic-changed", sync);
  }, [companies]);

  useEffect(() => {
    const sync = () => setStaleTick((n) => n + 1);
    void hydrateStaleReviews().then(sync);
    window.addEventListener("signal:stale-reviews-changed", sync);
    return () => {
      window.removeEventListener("signal:stale-reviews-changed", sync);
    };
  }, []);

  const reviewed = useMemo(() => {
    if (typeof window === "undefined") return companies;
    return applyStaleReviews(companies, loadStaleReviews());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, staleTick]);

  const work = useMemo(
    () => buildWorkQueue(reviewed, trails, { commentary, peers, plan_limit: 4 }),
    [reviewed, trails, commentary, peers],
  );

  const aiOs = useMemo(
    () => buildAiOsPack({ companies: reviewed, peers, commentary, news, alerts, sectors }),
    [reviewed, peers, commentary, news, alerts, sectors],
  );

  const hot = reviewed
    .filter((c) => c.recommendation === "Deep Dive" || (c.thesis_score || 0) >= 78)
    .slice(0, 5);
  const watch = reviewed
    .filter((c) => c.recommendation === "Watch")
    .slice(0, 5);
  const highAlerts = alerts.filter((a) => a.severity === "high" || a.severity === "critical").slice(0, 4);
  const thesisShifts = peers.filter((p) => p.thesis_shift).slice(0, 4);
  const topSectors = sectors.slice(0, 5);
  const worthReading = useMemo(
    () => selectNewsWorthReading(news, reviewed, { max: 3 }),
    [news, reviewed],
  );
  const mix = portfolioMix(reviewed);
  const deepDive = reviewed.filter((c) => c.recommendation === "Deep Dive").length;
  const watchCount = reviewed.filter((c) => c.recommendation === "Watch").length;
  const pass = reviewed.filter((c) => c.recommendation === "Pass").length;
  const total = reviewed.length || 1;
  const activeAgents = aiOs.agents.filter((a) => a.status === "active").length;
  const splitRooms = aiOs.war_rooms.filter((w) => w.consensus === "split").slice(0, 5);
  const alphaFeed = aiOs.feed
    .filter((f) => f.severity === "critical" || f.severity === "high")
    .slice(0, 4);

  const scoreBands = [
    { label: "90+", value: reviewed.filter((c) => (c.thesis_score ?? 0) >= 90).length },
    {
      label: "80s",
      value: reviewed.filter((c) => {
        const s = c.thesis_score ?? 0;
        return s >= 80 && s < 90;
      }).length,
    },
    {
      label: "70s",
      value: reviewed.filter((c) => {
        const s = c.thesis_score ?? 0;
        return s >= 70 && s < 80;
      }).length,
    },
    { label: "<70", value: reviewed.filter((c) => (c.thesis_score ?? 0) < 70).length },
  ];
  const sectorBars = topSectors.map((s) => ({
    label: (s.subsector || "—").slice(0, 10),
    value: s.heat_score ?? 0,
  }));

  return (
    <div className="desk-command space-y-8">
      {/* ── Hero command surface ─────────────────────────────── */}
      <section className="desk-hero animate-in">
        <div className="desk-hero-grid absolute inset-0" aria-hidden />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Eyebrow live>Live desk · AI fleet online</Eyebrow>
            <div className="flex flex-wrap items-center gap-2 text-[0.7rem] text-[var(--muted)]">
              <span className="desk-pill">
                <span className="live-dot !h-1.5 !w-1.5" />
                {activeAgents} agents
              </span>
              <span className="desk-pill mono">{liveSignals || "—"} signals</span>
              <span className="desk-pill mono">ref {fmtWhen(lastRefreshed)}</span>
            </div>
          </div>

          <h1 className="mt-5 display text-[2.6rem] md:text-[3.35rem]">
            Signal{" "}
            <span className="text-[var(--signal)]/90">Command</span>
          </h1>

          <div className="desk-ask mt-6 max-w-2xl">
            <Sparkles className="h-4 w-4 shrink-0 text-[var(--signal)]" strokeWidth={1.75} />
            <input
              value={askDraft}
              onChange={(e) => setAskDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  openAsk(askDraft.trim() || undefined);
                  setAskDraft("");
                }
              }}
              placeholder="Ask about a company, score, or miss…"
              className="min-w-0 flex-1 bg-transparent text-[0.9375rem] font-medium outline-none placeholder:font-normal placeholder:text-[var(--faint)]"
              aria-label="Ask Signal"
            />
            <button
              type="button"
              className="btn btn-primary btn-sm shrink-0"
              onClick={() => {
                openAsk(askDraft.trim() || undefined);
                setAskDraft("");
              }}
            >
              Ask
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Link href="/forge" className="btn btn-primary btn-sm">
              Open Forge
            </Link>
            <Link href="/meeting" className="btn btn-soft btn-sm">
              Open Monday agenda
            </Link>
            <a href="/api/workbook" className="btn btn-soft btn-sm">
              Download Excel
            </a>
            <Link href="/pipeline?rec=Pass" className="btn btn-ghost btn-sm">
              Show a Pass
            </Link>
            <span className="hidden text-[0.75rem] text-[var(--faint)] sm:inline">
              Forge → Meeting → Excel
            </span>
          </div>

          <div className="desk-feature-rail mt-6">
            {FEATURED.map((f) => (
              <Link key={f.href} href={f.href} className="desk-feature panel-interactive">
                <span className="desk-feature-icon">{f.icon}</span>
                <span className="min-w-0">
                  <span className="block text-[0.8125rem] font-semibold leading-snug">{f.label}</span>
                  <span className="mt-0.5 block text-[0.7rem] leading-snug text-[var(--muted)]">
                    {f.blurb}
                  </span>
                </span>
              </Link>
            ))}
          </div>

        </div>
      </section>

      <RecentViewsStrip />

      {/* ── Module launcher (LOCKED square grid) ─────────────── */}
      <section className="animate-in" style={{ animationDelay: "40ms" }}>
        <SectionTitle title="Command modules" href="/os" hrefLabel="Venture agent →" />
        <div className="desk-module-grid mt-4">
          {MODULES.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              data-group={GROUP_TONE[m.group]}
              className="desk-module group panel-interactive"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="desk-module-icon">{m.icon}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[var(--faint)] opacity-0 transition group-hover:opacity-100" />
              </div>
              <div className="mt-3 text-[0.875rem] font-semibold leading-snug">{m.label}</div>
              <div className="mt-1 text-[0.75rem] leading-snug text-[var(--muted)]">{m.blurb}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Analytics strip ──────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Panel className="viz-card !p-4 md:!p-5">
          <MixGauge dominantPct={mix.dominantPct} tacticalPct={mix.tacticalPct} />
        </Panel>
        <Panel className="viz-card !p-4 md:!p-5">
          <div className="label-caps">Recommendation mix</div>
          <div className="mt-auto pt-2">
            <DonutChart
              size={132}
              centerLabel="names"
              centerValue={String(reviewed.length)}
              slices={[
                {
                  label: "Deep Dive",
                  pct: Math.round((100 * deepDive) / total),
                  color: "var(--signal)",
                },
                {
                  label: "Watch",
                  pct: Math.round((100 * watchCount) / total),
                  color: "var(--warn)",
                },
                {
                  label: "Pass",
                  pct: Math.round((100 * pass) / total),
                  color: "var(--faint)",
                },
              ].filter((s) => s.pct > 0)}
            />
          </div>
        </Panel>
        <Panel className="viz-card !p-4 md:!p-5">
          <div className="label-caps">Score distribution</div>
          <BarChart height={156} className="mt-auto pt-2" series={scoreBands} />
        </Panel>
        <Panel className="viz-card !p-4 md:!p-5">
          <div className="label-caps">Sector heat</div>
          <BarChart
            height={156}
            className="mt-auto pt-2"
            series={sectorBars}
            color="var(--warn)"
            formatValue={(v) => String(Math.round(v))}
          />
        </Panel>
      </section>

      {/* ── Main working grid ────────────────────────────────── */}
      <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
          <Panel className="!p-0 overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4 md:px-6">
              <div>
                <Eyebrow live>Contested conviction</Eyebrow>
                <h2 className="title mt-1.5 text-[1.15rem]">War rooms where Signal disagrees</h2>
                <p className="mt-1.5 max-w-lg text-[0.8125rem] leading-relaxed text-[var(--muted)]">
                  {aiOs.headline}
                </p>
              </div>
              <Link href="/os" className="btn btn-soft btn-sm shrink-0">
                Venture agent
              </Link>
            </div>
            <div className="divide-y divide-[var(--line)]">
              {splitRooms.map((w) => (
                <Link
                  key={w.company.id}
                  href={`/company/${w.company.id}`}
                  className="block px-5 py-3.5 transition hover:bg-[var(--soft)] md:px-6"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <ToneBadge tone="now">Split</ToneBadge>
                    <span className="mono text-[0.7rem] text-[var(--faint)]">
                      contested {w.contested_score}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[0.9375rem] font-semibold leading-snug">
                    {w.company.name}
                  </div>
                  <p className="mt-1 line-clamp-1 text-[0.8125rem] text-[var(--muted)]">
                    {w.next_move}
                  </p>
                </Link>
              ))}
              {!splitRooms.length && (
                <div className="px-5 py-6 md:px-6">
                  <EmptyState>No split rooms right now — agents are aligned.</EmptyState>
                </div>
              )}
            </div>
          </Panel>

          <div>
            <SectionTitle title="Hot Deals" href="/deals" hrefLabel="Great deals →" />
            <div className="stagger mt-4">
              {hot.map((c, i) => (
                <DealCard key={c.id} company={c} index={i} />
              ))}
              {!hot.length && (
                <p className="body-muted py-6">No hot deals yet — run Refresh to score the pipeline.</p>
              )}
            </div>
          </div>

          <div>
            <SectionTitle title="Watch radar" href="/pipeline" hrefLabel="All watches →" />
            <div className="mt-3 space-y-0">
              {watch.map((c) => (
                <Link key={c.id} href={`/company/${c.id}`} className="deal-row group !py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="title text-[1rem] transition group-hover:text-[var(--signal)]">
                        {c.name}
                      </div>
                      <div className="mt-1 truncate text-[0.75rem] text-[var(--muted)]">
                        {[c.subsector || c.sector_theme, c.stage].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <RecBadge rec={c.recommendation} />
                      <div className="mono mt-1.5 text-[1.05rem] text-[var(--signal)]">
                        {c.thesis_score?.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {!watch.length && <EmptyState>No Watch names in the book.</EmptyState>}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <Panel className="os-banner !p-5">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow live className="!text-[var(--signal)]">
                AI OS
              </Eyebrow>
              <Link href="/os" className="link-quiet text-[0.75rem] font-semibold">
                Open →
              </Link>
            </div>
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-[var(--muted)]">{aiOs.headline}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {aiOs.agents.slice(0, 6).map((a) => (
                <div key={a.id} className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)]/60 px-2 py-2">
                  <div className="truncate text-[0.7rem] font-semibold">{a.name}</div>
                  <div
                    className={cn(
                      "mt-1 label-caps !text-[0.55rem]",
                      a.status === "alert"
                        ? "!text-[var(--warn)]"
                        : a.status === "active"
                          ? "!text-[var(--ok)]"
                          : "",
                    )}
                  >
                    {a.status}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
              <Link href="/forge" className="btn btn-ghost btn-sm">
                Forge
              </Link>
              <Link href="/deals" className="btn btn-ghost btn-sm">
                Great deals
              </Link>
              <Link href="/edge" className="btn btn-ghost btn-sm">
                Partner Edge
              </Link>
              <Link href="/judgment" className="btn btn-ghost btn-sm">
                Judgment
              </Link>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <Eyebrow>Work queue</Eyebrow>
              <Link href="/work" className="link-quiet text-[0.75rem] font-semibold">
                Board →
              </Link>
            </div>
            <p className="mt-2 text-[0.8125rem] text-[var(--muted)]">{work.headline}</p>
            <div className="mt-4 space-y-3">
              {work.items.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block border-b border-[var(--line)] pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <ToneBadge
                      tone={
                        item.risk === "high" ? "now" : item.risk === "medium" ? "this_week" : "monitor"
                      }
                    >
                      {item.risk}
                    </ToneBadge>
                    <span className="text-[0.7rem] text-[var(--faint)]">{item.area}</span>
                  </div>
                  <div className="mt-1.5 text-[0.875rem] font-semibold leading-snug">{item.title}</div>
                  <div className="mt-0.5 text-[0.75rem] text-[var(--muted)]">{item.company_name}</div>
                </Link>
              ))}
              {!work.items.length && <EmptyState>No open diligence items.</EmptyState>}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <Eyebrow>Alpha feed</Eyebrow>
              <Link href="/os" className="link-quiet text-[0.75rem] font-semibold">
                All
              </Link>
            </div>
            <div className="mt-4 space-y-3.5">
              {alphaFeed.map((f) => (
                <div key={f.id} className="border-b border-[var(--line)] pb-3.5 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="label-caps !text-[var(--warn)]">{f.severity}</span>
                    <span className="text-[0.7rem] text-[var(--faint)]">{f.category}</span>
                  </div>
                  <div className="mt-1.5 text-[0.875rem] font-semibold leading-snug">{f.title}</div>
                  <p className="mt-1 line-clamp-2 text-[0.75rem] leading-relaxed text-[var(--muted)]">
                    {f.body}
                  </p>
                </div>
              ))}
              {!alphaFeed.length && highAlerts.length === 0 && (
                <EmptyState>No critical signals right now.</EmptyState>
              )}
              {!alphaFeed.length &&
                highAlerts.map((a) => (
                  <div key={a.id} className="border-b border-[var(--line)] pb-3.5 last:border-0 last:pb-0">
                    <div className="label-caps text-[var(--warn)]">{a.severity}</div>
                    <div className="mt-1.5 text-[0.875rem] font-semibold leading-snug">{a.title}</div>
                    <p className="mt-1.5 line-clamp-2 text-[0.75rem] leading-relaxed text-[var(--muted)]">
                      {a.body}
                    </p>
                  </div>
                ))}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <Eyebrow>Peer moves</Eyebrow>
              <Link href="/peers" className="link-quiet text-[0.75rem] font-semibold">
                Competitors
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {(thesisShifts.length ? thesisShifts : peers.slice(0, 4)).map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="truncate text-[0.875rem] font-medium">
                      <CompetitorLink name={p.firm} />
                    </div>
                    <div className="mt-0.5 truncate text-[0.75rem] text-[var(--muted)]">
                      {p.company_name || p.company_id ? (
                        <>
                          <CompanyLink
                            id={p.company_id}
                            name={p.company_name || "Company"}
                          />
                          {[p.round, p.theme].filter(Boolean).length
                            ? ` · ${[p.round, p.theme].filter(Boolean).join(" · ")}`
                            : null}
                        </>
                      ) : (
                        [p.company_name, p.round, p.theme].filter(Boolean).join(" · ")
                      )}
                    </div>
                  </div>
                  {p.thesis_shift ? (
                    <ToneBadge tone="this_week">Shift</ToneBadge>
                  ) : p.on_thesis_flag ? (
                    <ToneBadge tone="monitor">On thesis</ToneBadge>
                  ) : null}
                </div>
              ))}
              {!peers.length && <EmptyState>No peer activity loaded.</EmptyState>}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <Eyebrow>Sectors</Eyebrow>
              <Link href="/sectors" className="link-quiet text-[0.75rem] font-semibold">
                All
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {topSectors.map((s) => (
                <div key={s.id} className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[0.875rem] font-medium">{s.subsector}</div>
                    <div className="mt-0.5 text-[0.75rem] text-[var(--muted)]">{s.consensus_level}</div>
                  </div>
                  <div className="mono shrink-0 text-[0.875rem] font-medium text-[var(--signal)]">
                    {s.heat_score}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {worthReading[0] && (
            <Panel>
              <div className="flex items-center justify-between gap-3">
                <Eyebrow>Worth reading</Eyebrow>
                <Link href="/library?tab=news" className="link-quiet text-[0.75rem] font-semibold">
                  Shelf
                </Link>
              </div>
              <p className="mt-2 text-[0.75rem] leading-snug text-[var(--faint)]">
                Curated skim — why each matters to Thirdbase
              </p>
              <div className="mt-4 space-y-4">
                {worthReading.map((n) => (
                  <div key={n.id} className="border-b border-[var(--line)] pb-3.5 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <ToneBadge tone={NEWS_KIND_META[n.kind].tone}>
                        {NEWS_KIND_META[n.kind].short}
                      </ToneBadge>
                      {n.source ? (
                        <span className="text-[0.7rem] text-[var(--faint)]">{n.source}</span>
                      ) : null}
                    </div>
                    <div className="mt-1.5 text-[0.875rem] font-semibold leading-snug">
                      {n.url ? (
                        <ExternalLink href={n.url} kind="source" className="hover:text-[var(--signal)]">
                          {n.title}
                        </ExternalLink>
                      ) : (
                        n.title
                      )}
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[0.75rem] leading-relaxed text-[var(--muted)]">
                      {n.why}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </aside>
      </section>

      {/* ── Full directory footer ────────────────────────────── */}
      <footer className="desk-footer animate-in">
        <div className="label-caps mb-4">All surfaces</div>
        <div className="flex flex-wrap gap-x-5 gap-y-2.5 text-[0.8125rem]">
          {[
            ...MODULES,
            { href: "/library?tab=stale", label: "Stale review", blurb: "", group: "", icon: null },
            { href: "/workbook", label: "Deal Pipeline workbook", blurb: "", group: "", icon: null },
            { href: "/api/workbook", label: "Download Excel", blurb: "", group: "", icon: null },
            { href: "/digest", label: "M/W/F digest", blurb: "", group: "", icon: null },
          ].map((m) =>
            m.href.startsWith("/api") ? (
              <a
                key={m.href + m.label}
                href={m.href}
                className="text-[var(--muted)] transition hover:text-[var(--text)]"
              >
                {m.label}
              </a>
            ) : (
              <Link
                key={m.href + m.label}
                href={m.href}
                className="text-[var(--muted)] transition hover:text-[var(--text)]"
              >
                {m.label}
              </Link>
            ),
          )}
        </div>
      </footer>
    </div>
  );
}
