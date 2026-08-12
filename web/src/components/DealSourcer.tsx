"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AreaChart,
  BarChart,
  DonutChart,
  FunnelChart,
} from "@/components/charts";
import {
  EmptyState,
  Eyebrow,
  Panel,
  RecBadge,
  SegItem,
  Segmented,
} from "@/components/ui";
import {
  KIND_LABEL,
  SOURCING_KINDS,
  buildSourcingPack,
  formatSourcingBriefMarkdown,
  type AdapterStatus,
  type SourcingCard,
  type SourcingKind,
} from "@/lib/dealSourcing";
import { useInterest } from "@/lib/useInterest";
import type { Company, SignalItem } from "@/lib/types";
import { cn, fmtWhen } from "@/lib/utils";

type Tab = "feed" | "early" | "insights" | "agent" | "adapters";
type FilterId = (typeof SOURCING_KINDS)[number]["id"];

const TABS: { id: Tab; label: string }[] = [
  { id: "feed", label: "Companies" },
  { id: "early", label: "Early & off-book" },
  { id: "insights", label: "Insights" },
  { id: "agent", label: "Ask" },
  { id: "adapters", label: "Adapters" },
];

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost text-[0.75rem]"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

function openAsk(prompt?: string) {
  window.dispatchEvent(
    new CustomEvent("signal:open-command", {
      detail: prompt ? { q: prompt } : undefined,
    }),
  );
}

function adapterTone(status: AdapterStatus["status"]) {
  if (status === "live") return "text-[var(--ok)]";
  if (status === "prefill") return "text-[var(--signal)]";
  if (status === "ready") return "text-[var(--deep)]";
  return "text-[var(--faint)]";
}

function adapterLabel(status: AdapterStatus["status"]) {
  if (status === "live") return "Live";
  if (status === "prefill") return "Prefill";
  if (status === "ready") return "Ready";
  return "Stub";
}

export function DealSourcer({
  companies,
  signals,
}: {
  companies: Company[];
  signals: SignalItem[];
}) {
  const pack = useMemo(
    () => buildSourcingPack({ signals, companies }),
    [signals, companies],
  );
  const [tab, setTab] = useState<Tab>("feed");
  const [filter, setFilter] = useState<FilterId>("all");
  const knownIds = useMemo(() => companies.map((c) => c.id), [companies]);
  const { liked, likedCount, like } = useInterest(knownIds);

  const filtered = pack.cards.filter((c) => {
    if (filter === "all") return true;
    if (filter === "early") return c.early_signal;
    return c.kinds.includes(filter);
  });

  function onLike(companyId?: string) {
    if (!companyId) return;
    like(companyId);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          {[
            ["Companies", pack.summary.company_count],
            ["Early", pack.summary.early_count],
            ["Off-book", pack.summary.off_book_count],
            ["Multi-source", pack.summary.consolidated_count],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-baseline gap-1.5">
              <span className="mono text-[1.05rem] font-semibold text-[var(--text)]">{value}</span>
              <span className="label-caps text-[var(--faint)]">{label}</span>
            </div>
          ))}
          <span className="label-caps text-[var(--muted)]">
            {pack.mode === "prefill_fallback" ? "Prefill" : "Live"}
          </span>
          {likedCount ? (
            <Link
              href="/interest"
              className="text-[0.8125rem] font-semibold text-[var(--signal)] hover:underline"
            >
              {likedCount} liked → Interest
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyBtn text={formatSourcingBriefMarkdown(pack)} label="Copy brief" />
          <button type="button" className="btn btn-soft btn-sm" onClick={() => openAsk()}>
            Ask
          </button>
        </div>
      </div>

      <Segmented aria-label="Deal Sourcing sections" className="seg-scroll">
        {TABS.map((t) => (
          <SegItem key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </SegItem>
        ))}
      </Segmented>

      {tab === "feed" ? (
        <div className="space-y-4">
          <Segmented aria-label="Sourcing filters">
            {SOURCING_KINDS.map((k) => (
              <SegItem key={k.id} active={filter === k.id} onClick={() => setFilter(k.id)}>
                {k.label}
              </SegItem>
            ))}
          </Segmented>
          {!filtered.length ? (
            <EmptyState>No companies in this filter — try All or Early.</EmptyState>
          ) : (
            <div className="space-y-3 stagger">
              {filtered.map((card) => (
                <SourcingCardView
                  key={card.id}
                  card={card}
                  liked={card.company_id ? liked.has(card.company_id) : false}
                  onLike={() => onLike(card.company_id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "early" ? (
        <EarlyTab pack={pack} liked={liked} onLike={onLike} />
      ) : null}

      {tab === "insights" ? <InsightsTab pack={pack} /> : null}

      {tab === "agent" ? <AgentTab pack={pack} /> : null}

      {tab === "adapters" ? <AdaptersTab pack={pack} /> : null}
    </div>
  );
}

function InsightsTab({
  pack,
}: {
  pack: ReturnType<typeof buildSourcingPack>;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <Eyebrow>Signal mix</Eyebrow>
          <div className="mt-4">
            <DonutChart
              slices={pack.kindMix.filter((s) => s.pct > 0)}
              centerValue={String(pack.summary.company_count)}
              centerLabel="cos"
            />
          </div>
        </Panel>
        <Panel>
          <Eyebrow>Discovery funnel</Eyebrow>
          <div className="mt-4">
            <FunnelChart steps={pack.funnel} height={210} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <Eyebrow>Freshness</Eyebrow>
          <div className="mt-4">
            <AreaChart series={pack.timeline} height={160} color="var(--signal)" />
          </div>
        </Panel>
        <Panel>
          <Eyebrow>Sources</Eyebrow>
          <div className="mt-4">
            {pack.sourceMix.length ? (
              <BarChart series={pack.sourceMix} height={160} />
            ) : (
              <EmptyState>No sources yet.</EmptyState>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <Eyebrow>Priority early</Eyebrow>
          <ul className="mt-4 space-y-3">
            {pack.topEarly.length ? (
              pack.topEarly.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={c.href} className="font-medium hover:text-[var(--signal)]">
                      {c.company_name}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-[0.75rem] text-[var(--faint)]">
                      {c.kinds.map((k) => (
                        <span key={k}>{KIND_LABEL[k]}</span>
                      ))}
                      {!c.on_book ? <span className="text-[var(--warn)]">Not on book</span> : null}
                    </div>
                  </div>
                  {c.recommendation ? <RecBadge rec={c.recommendation} /> : null}
                </li>
              ))
            ) : (
              <EmptyState>No early signals yet.</EmptyState>
            )}
          </ul>
        </Panel>
        <Panel>
          <Eyebrow>Consolidations</Eyebrow>
          <ul className="mt-4 space-y-3">
            {pack.topConsolidated.length ? (
              pack.topConsolidated.map((c) => (
                <li key={c.id}>
                  <Link href={c.href} className="font-medium hover:text-[var(--signal)]">
                    {c.company_name}
                  </Link>
                  <div className="mt-0.5 mono text-[0.75rem] text-[var(--faint)]">
                    {c.source_count} sources · {c.sources.join(" · ")}
                  </div>
                </li>
              ))
            ) : (
              <EmptyState>No multi-source hits yet.</EmptyState>
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function EarlyTab({
  pack,
  liked,
  onLike,
}: {
  pack: ReturnType<typeof buildSourcingPack>;
  liked: Set<string>;
  onLike: (id?: string) => void;
}) {
  const early = pack.cards.filter((c) => c.early_signal);
  const offBook = early.filter((c) => !c.on_book);
  const onBookEarly = early.filter((c) => c.on_book);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-[0.8125rem] text-[var(--muted)]">
        <span>
          Off-book <span className="mono text-[var(--warn)]">{offBook.length}</span>
        </span>
        <span>
          Early on book <span className="mono text-[var(--signal)]">{onBookEarly.length}</span>
        </span>
      </div>

      {!early.length ? (
        <EmptyState>No early signals yet.</EmptyState>
      ) : (
        <div className="space-y-3 stagger">
          {[...offBook, ...onBookEarly].map((card) => (
            <SourcingCardView
              key={card.id}
              card={card}
              liked={card.company_id ? liked.has(card.company_id) : false}
              onLike={() => onLike(card.company_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AgentTab({ pack }: { pack: ReturnType<typeof buildSourcingPack> }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {pack.agentPrompts.map((p) => (
          <button
            key={p.id}
            type="button"
            className="btn btn-soft btn-sm"
            onClick={() => openAsk(p.prompt)}
          >
            {p.label}
          </button>
        ))}
        <Link href="/chat" className="btn btn-ghost btn-sm">
          Open chat
        </Link>
      </div>
      <Panel>
        <ul className="space-y-3">
          {pack.agentPrompts.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full text-left transition hover:text-[var(--signal)]"
                onClick={() => openAsk(p.prompt)}
              >
                <div className="font-medium">{p.label}</div>
                <div className="mt-0.5 text-[0.8125rem] text-[var(--muted)] line-clamp-2">
                  {p.prompt}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function AdaptersTab({ pack }: { pack: ReturnType<typeof buildSourcingPack> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {pack.adapters.map((a) => (
        <Panel key={a.id} className="!p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="title text-[1rem]">{a.label}</div>
            <span className={cn("mono text-[0.7rem] uppercase tracking-wide", adapterTone(a.status))}>
              {adapterLabel(a.status)}
            </span>
          </div>
          <p className="mt-2 text-[0.8125rem] text-[var(--muted)] line-clamp-2">{a.detail}</p>
        </Panel>
      ))}
    </div>
  );
}

function SourcingCardView({
  card,
  liked,
  onLike,
}: {
  card: SourcingCard;
  liked: boolean;
  onLike: () => void;
}) {
  return (
    <article className="panel flex flex-col gap-3 p-4 md:p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {card.kinds.map((k: SourcingKind) => (
            <span key={k} className="label-caps">
              {KIND_LABEL[k]}
            </span>
          ))}
          {card.early_signal ? (
            <span className="label-caps text-[var(--signal)]">Early signal</span>
          ) : null}
          {!card.on_book ? (
            <span className="label-caps text-[var(--warn)]">Not on book</span>
          ) : null}
          {card.source_count > 1 ? (
            <span className="mono text-[0.7rem] text-[var(--faint)]">
              {card.source_count} sources · consolidated
            </span>
          ) : (
            <span className="mono text-[0.7rem] text-[var(--faint)]">{card.sources[0]}</span>
          )}
          <span className="mono text-[0.7rem] text-[var(--faint)]">{fmtWhen(card.latest_at)}</span>
          {card.recommendation ? <RecBadge rec={card.recommendation} /> : null}
        </div>
        <h3 className="title text-[1.1rem]">
          <Link href={card.href} className="hover:text-[var(--signal)]">
            {card.headline}
          </Link>
        </h3>
        <p className="text-[0.9rem] leading-relaxed text-[var(--muted)] line-clamp-3">{card.body}</p>
        {card.events.length > 1 ? (
          <ul className="space-y-1 text-[0.8rem] text-[var(--faint)]">
            {card.events.slice(0, 4).map((ev) => (
              <li key={ev.id} className="flex flex-wrap gap-2">
                <span className="label-caps">{KIND_LABEL[ev.kind]}</span>
                <span className="line-clamp-1">{ev.title}</span>
                <span className="mono">{ev.source}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap gap-2 text-[0.75rem] text-[var(--faint)]">
          {card.theme ? <span>{card.theme}</span> : null}
          {card.stage ? <span>{card.stage}</span> : null}
          {card.thesis_score != null ? (
            <span className="mono text-[var(--signal)]">{card.thesis_score.toFixed(0)}</span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {card.company_id ? (
          <button
            type="button"
            className={cn("btn btn-sm", liked ? "btn-primary" : "btn-soft")}
            onClick={onLike}
          >
            {liked ? "Liked" : "Like"}
          </button>
        ) : (
          <Link href="/search" className="btn btn-soft btn-sm">
            Scout brief
          </Link>
        )}
        <Link href={card.href} className="btn btn-ghost btn-sm">
          {card.on_book ? "Open brief" : "Research"}
        </Link>
      </div>
    </article>
  );
}
