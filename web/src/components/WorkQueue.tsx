"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  MiniStat,
  PageHeader,
  Panel,
  SegItem,
  Segmented,
} from "@/components/ui";
import { DonutChart } from "@/components/charts";
import { type DealTrail } from "@/lib/icTrail";
import { loadMergedTrails } from "@/lib/icStore";
import {
  buildKindNoDraft,
  buildKindNoPack,
  type KindNoDraft,
  type KindNoTone,
} from "@/lib/kindNo";
import { buildWorkQueue, type WorkItem } from "@/lib/workQueue";
import type { Commentary, Company, PeerActivity } from "@/lib/types";
import { cn } from "@/lib/utils";

function RiskChip({ r }: { r: "high" | "medium" | "low" }) {
  const color =
    r === "high" ? "var(--danger)" : r === "medium" ? "var(--warn)" : "var(--faint)";
  return (
    <span className="label-caps" style={{ color }}>
      {r}
    </span>
  );
}

function WorkRow({ item }: { item: WorkItem }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <RiskChip r={item.risk} />
          <Link
            href={item.href}
            className="font-medium transition hover:text-[var(--signal)]"
          >
            {item.company_name}
          </Link>
          <span className="text-[0.7rem] text-[var(--faint)]">{item.area}</span>
          {item.required && (
            <span className="text-[0.65rem] uppercase tracking-wider text-[var(--warn)]">
              required
            </span>
          )}
        </div>
        <div className="mt-1 text-sm text-[var(--text)]/90">{item.title}</div>
        <div className="mt-1 text-[0.75rem] text-[var(--muted)]">{item.detail}</div>
      </div>
      <div className="shrink-0 text-right text-[0.7rem] text-[var(--faint)]">
        {item.source === "ic_checklist" ? "IC checklist" : "Diligence plan"}
        {item.sponsor ? <div>Sponsor {item.sponsor}</div> : null}
      </div>
    </div>
  );
}

function KindNoCard({ draft }: { draft: KindNoDraft }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/company/${draft.slug || draft.company_id}`}
            className="title text-[1.15rem] hover:text-[var(--signal)]"
          >
            {draft.company_name}
          </Link>
          <div className="mt-1 text-[0.75rem] text-[var(--muted)]">
            {draft.recommendation} · score {draft.thesis_score?.toFixed(0) ?? "—"} · {draft.tone}
          </div>
        </div>
        <button type="button" className="btn btn-soft btn-sm" onClick={copy}>
          {copied ? "Copied ✓" : "Copy email"}
        </button>
      </div>
      <div className="mt-3 text-[0.75rem] text-[var(--faint)]">Subject: {draft.subject}</div>
      <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-[var(--radius)] bg-[var(--panel-2)] p-3 font-mono text-[0.75rem] leading-relaxed text-[var(--muted)]">
        {draft.body}
      </pre>
      <p className="mt-2 text-[0.65rem] text-[var(--faint)]">{draft.provenance}</p>
    </Panel>
  );
}

export function WorkQueueBoard({
  companies,
  peers,
  commentary,
}: {
  companies: Company[];
  peers: PeerActivity[];
  commentary: Commentary[];
}) {
  const [tab, setTab] = useState<"queue" | "kindno">("queue");
  const [tone, setTone] = useState<KindNoTone>("warm");
  const [filter, setFilter] = useState<"all" | "high" | "required">("all");
  const [kindCompany, setKindCompany] = useState<string>("");
  const [trails, setTrails] = useState<DealTrail[]>([]);

  useEffect(() => {
    const sync = () => setTrails(loadMergedTrails(companies));
    sync();
    window.addEventListener("signal:ic-changed", sync);
    return () => window.removeEventListener("signal:ic-changed", sync);
  }, [companies]);

  const queue = useMemo(
    () => buildWorkQueue(companies, trails, { commentary, peers }),
    [companies, trails, commentary, peers],
  );

  const kindPack = useMemo(
    () => buildKindNoPack(companies, { tone, limit: 10 }),
    [companies, tone],
  );

  const filtered = useMemo(() => {
    if (filter === "high") return queue.items.filter((i) => i.risk === "high");
    if (filter === "required") return queue.items.filter((i) => i.required);
    return queue.items;
  }, [queue.items, filter]);

  const singleKind = useMemo(() => {
    if (!kindCompany) return null;
    const c = companies.find((x) => x.id === kindCompany || x.slug === kindCompany);
    return c ? buildKindNoDraft(c, tone) : null;
  }, [kindCompany, companies, tone]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Associate ops"
        title="Work queue"
        description="Diligence handoffs and IC checklist opens — clear high-risk before the partner meeting. Kind-no drafts never auto-send."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
          <MiniStat label="Open" value={String(queue.stats.open)} />
          <MiniStat label="High risk" value={String(queue.stats.high)} />
          <MiniStat label="Required" value={String(queue.stats.required)} />
          <MiniStat label="Companies" value={String(queue.stats.companies)} />
        </div>
        <Panel className="!py-4">
          <div className="label-caps">Risk mix</div>
          <div className="mt-3">
            <DonutChart
              size={130}
              centerLabel="open"
              centerValue={String(queue.stats.open)}
              slices={[
                {
                  label: "High",
                  pct:
                    queue.stats.open > 0
                      ? Math.round((100 * queue.stats.high) / queue.stats.open)
                      : 0,
                  color: "var(--danger)",
                },
                {
                  label: "Medium",
                  pct:
                    queue.stats.open > 0
                      ? Math.round(
                          (100 *
                            queue.items.filter((i) => i.risk === "medium").length) /
                            queue.stats.open,
                        )
                      : 0,
                  color: "var(--warn)",
                },
                {
                  label: "Low",
                  pct:
                    queue.stats.open > 0
                      ? Math.round(
                          (100 * queue.items.filter((i) => i.risk === "low").length) /
                            queue.stats.open,
                        )
                      : 0,
                  color: "var(--faint)",
                },
              ].filter((s) => s.pct > 0)}
            />
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="label-caps">Counsel</div>
        <p className="mt-2 leading-relaxed">{queue.counsel}</p>
      </Panel>

      <Segmented>
        <SegItem active={tab === "queue"} onClick={() => setTab("queue")}>
          Handoffs
        </SegItem>
        <SegItem active={tab === "kindno"} onClick={() => setTab("kindno")}>
          Kind-no factory
        </SegItem>
      </Segmented>

      {tab === "queue" && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="title text-[1.2rem]">{queue.headline}</h2>
              <div className="flex gap-1">
                {(["all", "high", "required"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={cn(
                      "chip !py-1 text-[0.7rem]",
                      filter === f && "!border-[var(--signal)] !text-[var(--signal)]",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2">
              {filtered.map((item) => (
                <WorkRow key={item.id} item={item} />
              ))}
              {!filtered.length && <EmptyState>Queue clear for this filter.</EmptyState>}
            </div>
          </Panel>

          <div className="space-y-5">
            <Panel>
              <div className="label-caps">By company</div>
              <div className="mt-3 space-y-2.5">
                {queue.by_company.slice(0, 8).map((c) => (
                  <Link
                    key={c.company_id}
                    href={c.href}
                    className="flex items-baseline justify-between gap-2 text-sm transition hover:text-[var(--signal)]"
                  >
                    <span className="truncate font-medium">{c.company_name}</span>
                    <span className="mono shrink-0 text-[var(--muted)]">
                      {c.high}h · {c.open}
                    </span>
                  </Link>
                ))}
                {!queue.by_company.length && <EmptyState>No open companies.</EmptyState>}
              </div>
            </Panel>
            <Panel>
              <div className="label-caps">By area</div>
              <div className="mt-3 space-y-2">
                {queue.by_area.map((a) => (
                  <div
                    key={a.area}
                    className="flex justify-between text-sm text-[var(--muted)]"
                  >
                    <span>{a.area}</span>
                    <span className="mono">
                      {a.high > 0 ? (
                        <span className="text-[var(--danger)]">{a.high}h </span>
                      ) : null}
                      {a.count}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === "kindno" && (
        <div className="space-y-5">
          <Panel>
            <div className="flex flex-wrap items-center gap-3">
              <div className="label-caps">Tone</div>
              {(["warm", "direct", "future"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={cn(
                    "chip",
                    tone === t && "!border-[var(--signal)] !text-[var(--signal)]",
                  )}
                >
                  {t}
                </button>
              ))}
              <select
                className="ml-auto rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1.5 text-sm"
                value={kindCompany}
                onChange={(e) => setKindCompany(e.target.value)}
              >
                <option value="">Draft for specific company…</option>
                {companies
                  .filter((c) => c.recommendation === "Pass" || c.recommendation === "Watch")
                  .slice(0, 40)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.recommendation})
                    </option>
                  ))}
              </select>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">{kindPack.counsel}</p>
          </Panel>

          {singleKind && <KindNoCard draft={singleKind} />}

          <div className="grid gap-4 lg:grid-cols-2">
            {kindPack.drafts.slice(0, 6).map((d) => (
              <KindNoCard key={d.company_id} draft={d} />
            ))}
          </div>
          {!kindPack.drafts.length && (
            <EmptyState>No Pass/Watch names for kind-no drafts.</EmptyState>
          )}
        </div>
      )}
    </div>
  );
}
