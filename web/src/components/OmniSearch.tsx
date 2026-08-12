"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, SegItem, Segmented } from "@/components/ui";
import {
  OMNI_TYPE_LABELS,
  OMNI_TYPE_ORDER,
  omniHitsToCsv,
  omnisearch,
  type OmniType,
} from "@/lib/omnisearch";
import type {
  AlertItem,
  Commentary,
  Company,
  NewsItem,
  PeerActivity,
  SectorCall,
} from "@/lib/types";

export function OmniSearch({
  companies,
  commentary,
  news,
  peers,
  sectors,
  alerts,
}: {
  companies: Company[];
  commentary: Commentary[];
  news: NewsItem[];
  peers: PeerActivity[];
  sectors: SectorCall[];
  alerts: AlertItem[];
}) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<OmniType | "All">("All");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefill = new URLSearchParams(window.location.search).get("q")?.trim();
    if (prefill) setQ(prefill);
  }, []);

  const hits = useMemo(
    () =>
      omnisearch(
        q,
        { companies, commentary, news, peers, sectors, alerts },
        type,
      ),
    [q, companies, commentary, news, peers, sectors, alerts, type],
  );

  function exportCsv() {
    const csv = omniHitsToCsv(hits);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signal-search-${type}-${hits.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const counts = useMemo(() => {
    const all = omnisearch(q, { companies, commentary, news, peers, sectors, alerts });
    const map: Partial<Record<OmniType, number>> = {};
    for (const h of all) map[h.type] = (map[h.type] || 0) + 1;
    return map;
  }, [q, companies, commentary, news, peers, sectors, alerts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search companies, commentary, news, peers, sectors, playbooks…"
          className="field min-w-0 flex-1"
          autoFocus
        />
        <button
          type="button"
          className="btn btn-soft btn-sm"
          disabled={!hits.length}
          onClick={exportCsv}
        >
          Export CSV
        </button>
      </div>

      <Segmented aria-label="Result types">
        <SegItem active={type === "All"} onClick={() => setType("All")}>
          All
        </SegItem>
        {OMNI_TYPE_ORDER.map((t) => (
          <SegItem key={t} active={type === t} onClick={() => setType(t)}>
            {OMNI_TYPE_LABELS[t]}
            {counts[t] ? ` (${counts[t]})` : ""}
          </SegItem>
        ))}
      </Segmented>

      {!q.trim() ? (
        <EmptyState>
          Bookface-style omnisearch across the Signal store. Filter by type and export the full hit
          set as CSV.
        </EmptyState>
      ) : !hits.length ? (
        <EmptyState>No hits — try another query or clear the type filter.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {hits.map((h) => (
            <li key={`${h.type}-${h.id}`}>
              <Link
                href={h.href}
                className="panel panel-interactive flex flex-col gap-1 p-4 transition sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="label-caps">{OMNI_TYPE_LABELS[h.type]}</div>
                  <div className="title mt-1 text-[1.05rem]">{h.title}</div>
                  <p className="mt-1 line-clamp-2 text-[0.875rem] text-[var(--muted)]">
                    {h.subtitle}
                  </p>
                </div>
                {h.meta ? (
                  <div className="shrink-0 text-[0.75rem] text-[var(--faint)] sm:max-w-[220px] sm:text-right">
                    {h.meta}
                  </div>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
