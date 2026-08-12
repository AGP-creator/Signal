"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EmptyState, MiniStat, OsBanner, Panel, SegItem, Segmented, ToneBadge } from "@/components/ui";
import { type DealTrail } from "@/lib/icTrail";
import { loadMergedTrails } from "@/lib/icStore";
import {
  buildMeetingMatch,
  consumeInterestMeetingHandoff,
  type InterestMeetingHandoff,
  type MatchMeeting,
} from "@/lib/interest";
import { loadOverrides } from "@/lib/overrideStore";
import {
  applyStaleReviews,
  hydrateStaleReviews,
  loadStaleReviews,
} from "@/lib/staleReviewStore";
import {
  fetchWatchlists,
  itemsToInterest,
  loadWatchlistPartner,
} from "@/lib/watchlists";
import { buildMeetingPack, type AgendaItem, type MeetingPack } from "@/lib/meeting";
import type {
  AlertItem,
  Commentary,
  Company,
  NewsItem,
  PeerActivity,
  SectorCall,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const BLOCKS: { id: AgendaItem["block"]; label: string; hint: string }[] = [
  { id: "decide", label: "Decide", hint: "Conviction & votes" },
  { id: "diligence", label: "Diligence", hint: "Unblock work" },
  { id: "intel", label: "Intel", hint: "Market & peers" },
  { id: "firm", label: "Firm", hint: "Mix · stale · policy" },
  { id: "read", label: "Read", hint: "2-minute scans" },
];

const URGENCY_LABEL: Record<AgendaItem["urgency"], string> = {
  now: "Decide now",
  this_week: "This week",
  monitor: "Monitor",
};

function interestToAgenda(meetings: MatchMeeting[]): AgendaItem[] {
  return meetings.map((m) => ({
    id: `interest_${m.company_id}`,
    block: "decide" as const,
    minutes: m.minutes,
    title: m.company_name,
    subtitle: `Interest match · partner #${m.partner_rank} · quality ${m.quality}`,
    urgency: m.partner_rank <= 3 ? ("now" as const) : ("this_week" as const),
    href: `/company/${m.company_id}`,
    company_id: m.company_id,
    evidence: [
      `Slot ${m.slot} · ${m.minutes}m`,
      `Company pref #${m.company_rank}`,
      m.ask,
    ],
    ask: m.ask,
  }));
}

export function MeetingOS({
  companies,
  peers,
  commentary,
  news,
  alerts,
  sectors,
}: {
  companies: Company[];
  peers: PeerActivity[];
  commentary: Commentary[];
  news: NewsItem[];
  alerts: AlertItem[];
  sectors: SectorCall[];
}) {
  const searchParams = useSearchParams();
  const fromInterest = searchParams.get("from") === "interest";
  const [trails, setTrails] = useState<DealTrail[]>([]);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<AgendaItem["block"] | "all">("all");
  const [staleTick, setStaleTick] = useState(0);
  const [interestHandoff, setInterestHandoff] = useState<InterestMeetingHandoff | null>(null);

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
    window.addEventListener("signal:overrides-changed", sync);
    return () => {
      window.removeEventListener("signal:stale-reviews-changed", sync);
      window.removeEventListener("signal:overrides-changed", sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadInterestAgenda() {
      const handoff = consumeInterestMeetingHandoff();
      if (handoff?.meetings?.length) {
        if (!cancelled) setInterestHandoff(handoff);
        return;
      }
      if (!fromInterest) return;
      try {
        const partner = loadWatchlistPartner();
        const snap = await fetchWatchlists(partner);
        if (cancelled) return;
        const interest = itemsToInterest(snap.items || []);
        const schedule = buildMeetingMatch(companies, interest);
        if (schedule.meetings.length) {
          setInterestHandoff({
            created_at: new Date().toISOString(),
            meetings: schedule.meetings,
            unmatched_liked: schedule.unmatched_liked,
            counsel: schedule.counsel,
            average_quality: schedule.average_quality,
          });
        }
      } catch {
        // no DB watchlist — leave default meeting pack
      }
    }
    void loadInterestAgenda();
    return () => {
      cancelled = true;
    };
  }, [companies, fromInterest]);

  const basePack: MeetingPack = useMemo(() => {
    const overrides = typeof window !== "undefined" ? loadOverrides() : [];
    const reviewed =
      typeof window !== "undefined"
        ? applyStaleReviews(companies, loadStaleReviews())
        : companies;
    return buildMeetingPack(
      reviewed,
      peers,
      commentary,
      news,
      alerts,
      sectors,
      trails,
      overrides,
    );
    // staleTick forces recompute after Keep/Archive/Refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, peers, commentary, news, alerts, sectors, trails, staleTick]);

  const pack: MeetingPack = useMemo(() => {
    if (!interestHandoff?.meetings?.length) return basePack;
    const interestItems = interestToAgenda(interestHandoff.meetings);
    const seen = new Set(interestItems.map((i) => i.company_id).filter(Boolean));
    const rest = basePack.agenda.filter((a) => !a.company_id || !seen.has(a.company_id));
    const agenda = [...interestItems, ...rest];
    const total_minutes = agenda.reduce((s, i) => s + i.minutes, 0);
    const interestMd = [
      "",
      "## Interest Desk match",
      "",
      interestHandoff.counsel,
      "",
      ...interestHandoff.meetings.map(
        (m) =>
          `- **S${m.slot} ${m.company_name}** (${m.minutes}m) — partner #${m.partner_rank} · Q${m.quality}`,
      ),
      "",
    ].join("\n");
    return {
      ...basePack,
      agenda,
      decide: agenda.filter((a) => a.block === "decide"),
      total_minutes,
      headline: `${interestHandoff.meetings.length} Interest matches on the table`,
      counsel: [interestHandoff.counsel, basePack.counsel].filter(Boolean).join(" · "),
      markdown: basePack.markdown.replace(/\n## Decide/, `${interestMd}\n## Decide`),
    };
  }, [basePack, interestHandoff]);

  const visible =
    filter === "all" ? pack.agenda : pack.agenda.filter((a) => a.block === filter);

  async function copyAgenda() {
    await navigator.clipboard.writeText(pack.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function downloadAgenda() {
    const blob = new Blob([pack.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Partner_Meeting.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <OsBanner
        live
        eyebrow="This week's run"
        title={pack.headline}
        description={`~${pack.total_minutes} min · ${pack.meeting_label}`}
        stats={
          <>
            <MiniStat label="Agenda" value={`~${pack.total_minutes}m`} />
            <MiniStat label="Deep Dives" value={String(pack.stats.deep_dives)} tone="deep" />
            <MiniStat label="Active IC" value={String(pack.stats.active_ic)} />
            <MiniStat
              label="High alerts"
              value={String(pack.stats.high_alerts)}
              tone={pack.stats.high_alerts > 0 ? "danger" : "ok"}
            />
            <MiniStat
              label="Thesis shifts"
              value={String(pack.stats.thesis_shifts)}
              tone={pack.stats.thesis_shifts > 0 ? "warn" : "text"}
            />
            <MiniStat label="Mix" value={pack.stats.mix_status.replace("_", " ")} tone="ok" />
          </>
        }
        actions={
          <>
            <button type="button" onClick={copyAgenda} className="btn btn-primary btn-sm">
              {copied ? "Copied ✓" : "Copy agenda"}
            </button>
            <button type="button" onClick={downloadAgenda} className="btn btn-ghost btn-sm">
              Download .md
            </button>
            <Link href="/ic" className="btn btn-ghost btn-sm">
              IC trails
            </Link>
            <Link href="/interest" className="btn btn-ghost btn-sm">
              Interest Desk
            </Link>
          </>
        }
      />

      {interestHandoff?.meetings?.length ? (
        <Panel className="!border-[color-mix(in_srgb,var(--signal)_35%,var(--line))]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="label-caps text-[var(--signal)]">From Interest Desk</div>
              <p className="mt-1 text-[0.875rem] text-[var(--muted)]">{interestHandoff.counsel}</p>
            </div>
            <span className="mono text-[0.75rem] text-[var(--faint)]">
              avg Q{interestHandoff.average_quality}
            </span>
          </div>
          <ol className="mt-3 space-y-1.5 text-[0.875rem]">
            {interestHandoff.meetings.map((m) => (
              <li key={m.company_id} className="flex flex-wrap gap-x-2 gap-y-0.5">
                <span className="mono text-[var(--faint)]">S{m.slot}</span>
                <Link
                  href={`/company/${m.company_id}`}
                  className="font-semibold hover:text-[var(--signal)]"
                >
                  {m.company_name}
                </Link>
                <span className="text-[var(--muted)]">
                  {m.minutes}m · partner #{m.partner_rank} · Q{m.quality}
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      ) : null}

      <Segmented aria-label="Agenda filters">
        <SegItem active={filter === "all"} onClick={() => setFilter("all")}>
          Full agenda
        </SegItem>
        {BLOCKS.map((b) => (
          <SegItem key={b.id} active={filter === b.id} onClick={() => setFilter(b.id)}>
            {b.label}
          </SegItem>
        ))}
      </Segmented>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-3 stagger">
          {visible.map((item) => (
            <AgendaCard key={item.id} item={item} />
          ))}
          {!visible.length && <EmptyState>Nothing in this block this week.</EmptyState>}
        </div>

        <aside className="space-y-3">
          {BLOCKS.map((b) => {
            const items = pack.agenda.filter((a) => a.block === b.id);
            const mins = items.reduce((s, i) => s + i.minutes, 0);
            const urgent = items.filter((i) => i.urgency === "now").length;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setFilter(b.id)}
                className={cn(
                  "panel block-card w-full !p-4 text-left transition",
                  filter === b.id &&
                    "border-[color-mix(in_srgb,var(--signal)_40%,var(--line))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--signal)_20%,transparent)]",
                )}
                data-block={b.id}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-sm font-semibold">{b.label}</div>
                  <div className="mono text-[0.75rem] font-semibold text-[var(--signal)]">{mins}m</div>
                </div>
                <div className="mt-0.5 text-[0.75rem] text-[var(--muted)]">{b.hint}</div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="text-[0.8125rem] font-medium text-[var(--text)]">
                    {items.length} item{items.length === 1 ? "" : "s"}
                  </span>
                  {urgent > 0 ? (
                    <ToneBadge tone="now">{urgent} now</ToneBadge>
                  ) : items.length === 0 ? (
                    <span className="chip text-[0.65rem]">Clear</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </aside>
      </div>
    </div>
  );
}

function AgendaCard({ item }: { item: AgendaItem }) {
  const inner = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ToneBadge tone="block">{item.block}</ToneBadge>
            <ToneBadge tone={item.urgency}>{URGENCY_LABEL[item.urgency]}</ToneBadge>
            <span className="chip chip-signal mono !px-2 !py-0.5 text-[0.7rem]">{item.minutes}m</span>
          </div>
          <h3 className="mt-2.5 text-[1.1rem] font-semibold tracking-tight">{item.title}</h3>
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">{item.subtitle}</p>
        </div>
      </div>
      <ul className="mt-3.5 space-y-1.5">
        {item.evidence.map((e) => (
          <li key={e} className="flex gap-2.5 text-[0.875rem] text-[var(--text)]/88">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--signal)]" />
            <span>{e}</span>
          </li>
        ))}
      </ul>
      <div className="ask-row mt-4">
        <p className="text-[0.8125rem] leading-snug">
          <span className="font-semibold text-[var(--signal)]">Ask · </span>
          <span className="text-[var(--text)]">{item.ask}</span>
        </p>
      </div>
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className="panel panel-interactive panel-rail block p-5 md:p-6"
        data-urgency={item.urgency}
      >
        {inner}
      </Link>
    );
  }
  return (
    <Panel className="panel-rail" data-urgency={item.urgency}>
      {inner}
    </Panel>
  );
}
