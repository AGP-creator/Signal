"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eyebrow, EmptyState, Panel } from "@/components/ui";
import { buildDemoTrails, mergeTrailsWithCompanies, type DealTrail } from "@/lib/icTrail";
import { loadTrails, seedIfEmpty } from "@/lib/icStore";
import { loadOverrides } from "@/lib/overrideStore";
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

function urgencyTone(u: AgendaItem["urgency"]) {
  if (u === "now") return "text-[var(--danger)]";
  if (u === "this_week") return "text-[var(--warn)]";
  return "text-[var(--muted)]";
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
  const [trails, setTrails] = useState<DealTrail[]>([]);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<AgendaItem["block"] | "all">("all");

  useEffect(() => {
    const sync = () => {
      const demos = buildDemoTrails(companies);
      const stored = seedIfEmpty(demos);
      setTrails(mergeTrailsWithCompanies(companies, stored.length ? stored : demos));
    };
    sync();
    window.addEventListener("signal:ic-changed", sync);
    return () => window.removeEventListener("signal:ic-changed", sync);
  }, [companies]);

  const pack: MeetingPack = useMemo(() => {
    const overrides = typeof window !== "undefined" ? loadOverrides() : [];
    return buildMeetingPack(
      companies,
      peers,
      commentary,
      news,
      alerts,
      sectors,
      trails,
      overrides,
    );
  }, [companies, peers, commentary, news, alerts, sectors, trails]);

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
    a.download = "Monday_Partner_Meeting.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Panel className="border-[rgba(214,255,60,0.22)] bg-[rgba(214,255,60,0.04)]">
        <Eyebrow live className="!text-[var(--signal)]">
          Partner Meeting OS
        </Eyebrow>
        <div className="mt-1 text-[0.8125rem] text-[var(--faint)]">{pack.meeting_label}</div>
        <h2 className="display mt-2 text-2xl font-bold md:text-3xl">{pack.headline}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{pack.counsel}</p>
        <div className="mt-5 flex flex-wrap gap-6">
          <MiniStat label="Agenda" value={`~${pack.total_minutes}m`} />
          <MiniStat label="Deep Dives" value={String(pack.stats.deep_dives)} />
          <MiniStat label="Active IC" value={String(pack.stats.active_ic)} />
          <MiniStat label="High alerts" value={String(pack.stats.high_alerts)} />
          <MiniStat label="Thesis shifts" value={String(pack.stats.thesis_shifts)} />
          <MiniStat label="Mix" value={pack.stats.mix_status.replace("_", " ")} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={copyAgenda} className="btn btn-primary !py-1.5 !text-xs">
            {copied ? "Copied ✓" : "Copy Monday brief"}
          </button>
          <button type="button" onClick={downloadAgenda} className="btn btn-ghost !py-1.5 !text-xs">
            Download .md
          </button>
          <Link href="/ic" className="btn btn-ghost !py-1.5 !text-xs">
            Open IC trails →
          </Link>
          <Link href="/lp" className="btn btn-ghost !py-1.5 !text-xs">
            LP desk →
          </Link>
        </div>
      </Panel>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="Full agenda" />
        {BLOCKS.map((b) => (
          <FilterChip
            key={b.id}
            active={filter === b.id}
            onClick={() => setFilter(b.id)}
            label={b.label}
          />
        ))}
      </div>

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
            return (
              <Panel key={b.id} className="!p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-sm font-semibold">{b.label}</div>
                  <div className="mono text-[0.75rem] text-[var(--signal)]">{mins}m</div>
                </div>
                <div className="mt-0.5 text-[0.75rem] text-[var(--faint)]">{b.hint}</div>
                <div className="mt-2 text-[0.8125rem] text-[var(--muted)]">
                  {items.length} item{items.length === 1 ? "" : "s"}
                </div>
              </Panel>
            );
          })}
        </aside>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label-caps">{label}</div>
      <div className="mono mt-1 text-[0.95rem] text-[var(--text)]">{value}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[8px] px-3 py-1.5 text-[0.8125rem] font-semibold transition",
        active
          ? "bg-[var(--signal-dim)] text-[var(--signal)]"
          : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]",
      )}
    >
      {label}
    </button>
  );
}

function AgendaCard({ item }: { item: AgendaItem }) {
  const inner = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-caps text-[var(--faint)]">{item.block}</span>
            <span className={cn("label-caps", urgencyTone(item.urgency))}>{item.urgency}</span>
            <span className="mono text-[0.75rem] text-[var(--muted)]">{item.minutes}m</span>
          </div>
          <h3 className="mt-1.5 text-[1.05rem] font-semibold">{item.title}</h3>
          <p className="mt-0.5 text-[0.8125rem] text-[var(--muted)]">{item.subtitle}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {item.evidence.map((e) => (
          <li key={e} className="flex gap-2 text-[0.875rem] text-[var(--muted)]">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--signal)]" />
            <span>{e}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.875rem]">
        <span className="text-[var(--faint)]">Ask · </span>
        <span className="text-[var(--text)]">{item.ask}</span>
      </p>
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="panel panel-interactive block p-5">
        {inner}
      </Link>
    );
  }
  return <Panel>{inner}</Panel>;
}
