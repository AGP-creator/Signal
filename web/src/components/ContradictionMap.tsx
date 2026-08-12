"use client";

import { useMemo, useState } from "react";
import { DonutChart, TensionBars } from "@/components/charts";
import { EmptyState, Panel } from "@/components/ui";
import { buildContradictionMap, type Contradiction } from "@/lib/contradiction";
import type { Commentary, Company, NewsItem, PeerActivity } from "@/lib/types";

function SeverityChip({ s }: { s: Contradiction["severity"] }) {
  const color =
    s === "high" ? "var(--danger)" : s === "medium" ? "var(--warn)" : "var(--faint)";
  return (
    <span className="label-caps" style={{ color }}>
      {s}
    </span>
  );
}

export function ContradictionMap({
  company,
  commentary,
  peers,
  news,
}: {
  company: Company;
  commentary?: Commentary[];
  peers?: PeerActivity[];
  news?: NewsItem[];
}) {
  const [copied, setCopied] = useState(false);
  const pack = useMemo(
    () => buildContradictionMap(company, { commentary, peers, news }),
    [company, commentary, peers, news],
  );

  const severitySlices = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const c of pack.contradictions) counts[c.severity] += 1;
    const total = pack.contradictions.length || 1;
    return [
      { label: "High", pct: Math.round((100 * counts.high) / total), color: "var(--danger)", n: counts.high },
      { label: "Medium", pct: Math.round((100 * counts.medium) / total), color: "var(--warn)", n: counts.medium },
      { label: "Low", pct: Math.round((100 * counts.low) / total), color: "var(--faint)", n: counts.low },
    ].filter((s) => s.n > 0);
  }, [pack.contradictions]);

  async function copy() {
    await navigator.clipboard.writeText(pack.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Panel
      className={
        pack.clean
          ? undefined
          : pack.contradictions.some((c) => c.severity === "high")
            ? "border-[var(--danger)]/30 bg-[var(--danger-dim)]"
            : "border-[var(--warn)]/30 bg-[var(--warn-dim)]"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="label-caps">Evidence contradiction map</div>
          <h2 className="title mt-1.5 text-[1.25rem]">
            {pack.clean ? "No material tensions" : `${pack.contradictions.length} tension(s)`}
          </h2>
          <p className="mt-1.5 text-sm text-[var(--muted)]">{pack.counsel}</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
          {copied ? "Copied ✓" : "Copy map"}
        </button>
      </div>

      {!pack.clean && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="label-caps mb-3">Severity mix</div>
            <DonutChart
              size={140}
              centerLabel="tensions"
              centerValue={String(pack.contradictions.length)}
              slices={severitySlices}
            />
          </div>
          <div>
            <div className="label-caps mb-3">Tension intensity</div>
            <TensionBars
              rows={pack.contradictions.map((c) => ({
                id: c.id,
                title: c.title,
                severity: c.severity,
                left: c.left,
                right: c.right,
              }))}
            />
          </div>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {pack.contradictions.map((c) => (
          <div key={c.id} className="border-b border-[var(--line)] pb-3 last:border-0">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityChip s={c.severity} />
              <span className="font-semibold">{c.title}</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text)]/90">{c.detail}</p>
            <div className="mt-2 flex flex-wrap gap-2 font-mono text-[0.7rem] text-[var(--faint)]">
              <span className="rounded bg-[var(--panel-2)] px-1.5 py-0.5">{c.left}</span>
              <span>↔</span>
              <span className="rounded bg-[var(--panel-2)] px-1.5 py-0.5">{c.right}</span>
            </div>
            <p className="mt-2 text-[0.8125rem] text-[var(--muted)]">→ {c.counsel}</p>
          </div>
        ))}
        {pack.clean && (
          <EmptyState>Store looks internally consistent — still run the bear case before IC.</EmptyState>
        )}
      </div>
    </Panel>
  );
}
