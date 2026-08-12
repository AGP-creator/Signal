"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, RecBadge, SegItem, Segmented } from "@/components/ui";
import { buildLaunchFeed, launchCounsel, type LaunchItem } from "@/lib/launchFeed";
import { useInterest } from "@/lib/useInterest";
import type { AlertItem, Commentary, Company, NewsItem } from "@/lib/types";
import { cn, fmtWhen } from "@/lib/utils";

const KINDS = [
  { id: "all", label: "All" },
  { id: "founder_radar", label: "Founder radar" },
  { id: "newco", label: "Launches" },
  { id: "signal", label: "Fresh signals" },
  { id: "launch_news", label: "News" },
] as const;

type KindId = (typeof KINDS)[number]["id"];

export function LaunchFeed({
  companies,
  alerts,
  commentary,
  news,
}: {
  companies: Company[];
  alerts: AlertItem[];
  commentary: Commentary[];
  news: NewsItem[];
}) {
  const items = useMemo(
    () => buildLaunchFeed({ companies, alerts, commentary, news }),
    [companies, alerts, commentary, news],
  );
  const [kind, setKind] = useState<KindId>("all");
  const knownIds = useMemo(() => companies.map((c) => c.id), [companies]);
  const { liked, likedCount, like } = useInterest(knownIds);

  const filtered =
    kind === "all" ? items : items.filter((i) => i.kind === kind);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.9375rem] text-[var(--muted)]">{launchCounsel(items)}</p>
        {likedCount ? (
          <Link href="/interest" className="text-[0.8125rem] font-semibold text-[var(--signal)] hover:underline">
            {likedCount} liked → Interest
          </Link>
        ) : null}
      </div>

      <Segmented aria-label="Launch kinds">
        {KINDS.map((k) => (
          <SegItem key={k.id} active={kind === k.id} onClick={() => setKind(k.id)}>
            {k.label}
          </SegItem>
        ))}
      </Segmented>

      {!filtered.length ? (
        <EmptyState>Nothing in this slice — try All, or Refresh pipeline.</EmptyState>
      ) : (
        <div className="space-y-3 stagger">
          {filtered.map((item) => (
            <LaunchCard
              key={item.id}
              item={item}
              liked={item.company_id ? liked.has(item.company_id) : false}
              onLike={() => item.company_id && like(item.company_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LaunchCard({
  item,
  liked,
  onLike,
}: {
  item: LaunchItem;
  liked: boolean;
  onLike: () => void;
}) {
  const kindLabel: Record<LaunchItem["kind"], string> = {
    founder_radar: "Founder radar",
    newco: "Launch",
    signal: "Signal",
    launch_news: "News",
  };

  return (
    <article className="panel flex flex-col gap-3 p-4 md:p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps">{kindLabel[item.kind]}</span>
          <span className="mono text-[0.7rem] text-[var(--faint)]">{fmtWhen(item.at)}</span>
          {item.recommendation ? <RecBadge rec={item.recommendation} /> : null}
        </div>
        <h3 className="title text-[1.1rem]">
          <Link href={item.href} className="hover:text-[var(--signal)]">
            {item.title}
          </Link>
        </h3>
        <p className="text-[0.9rem] leading-relaxed text-[var(--muted)] line-clamp-3">
          {item.body}
        </p>
        <div className="flex flex-wrap gap-2 text-[0.75rem] text-[var(--faint)]">
          {item.theme ? <span>{item.theme}</span> : null}
          {item.stage ? <span>{item.stage}</span> : null}
          {item.cycle ? <span>{item.cycle}</span> : null}
          {item.hiring ? <span>{item.hiring} hiring</span> : null}
          {item.thesis_score != null ? (
            <span className="mono text-[var(--signal)]">{item.thesis_score.toFixed(0)}</span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {item.company_id ? (
          <button
            type="button"
            className={cn("btn btn-sm", liked ? "btn-primary" : "btn-soft")}
            onClick={onLike}
          >
            {liked ? "Liked" : "Like"}
          </button>
        ) : null}
        <Link href={item.href} className="btn btn-ghost btn-sm">
          {item.cta}
        </Link>
      </div>
    </article>
  );
}
