"use client";

import { useEffect, useMemo, useState } from "react";
import { Eyebrow, Panel } from "@/components/ui";
import { buildDemoTrails, mergeTrailsWithCompanies, type DealTrail } from "@/lib/icTrail";
import { seedIfEmpty } from "@/lib/icStore";
import { buildLpDeskPack, type LpDeskPack } from "@/lib/lpDesk";
import { loadOverrides } from "@/lib/overrideStore";
import type { AlertItem, Commentary, Company, NewsItem, PeerActivity } from "@/lib/types";

export function LpDesk({
  companies,
  peers,
  commentary,
  news,
  alerts,
}: {
  companies: Company[];
  peers: PeerActivity[];
  commentary: Commentary[];
  news: NewsItem[];
  alerts: AlertItem[];
}) {
  const [trails, setTrails] = useState<DealTrail[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const demos = buildDemoTrails(companies);
    const stored = seedIfEmpty(demos);
    setTrails(mergeTrailsWithCompanies(companies, stored.length ? stored : demos));
    const sync = () => {
      const d = buildDemoTrails(companies);
      const s = seedIfEmpty(d);
      setTrails(mergeTrailsWithCompanies(companies, s.length ? s : d));
    };
    window.addEventListener("signal:ic-changed", sync);
    return () => window.removeEventListener("signal:ic-changed", sync);
  }, [companies]);

  const pack: LpDeskPack = useMemo(() => {
    const overrides = typeof window !== "undefined" ? loadOverrides() : [];
    return buildLpDeskPack(companies, peers, commentary, news, alerts, trails, overrides);
  }, [companies, peers, commentary, news, alerts, trails]);

  async function copyOnePager() {
    await navigator.clipboard.writeText(pack.one_pager_md);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function downloadOnePager() {
    const blob = new Blob([pack.one_pager_md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Signal_LP_Process_OnePager.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Panel className="border-[rgba(61,214,140,0.25)] bg-[rgba(61,214,140,0.05)]">
        <Eyebrow live className="!text-[var(--ok)]">
          LP Process Desk
        </Eyebrow>
        <h2 className="display mt-2 text-2xl font-bold md:text-3xl">{pack.headline}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{pack.elevator}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={copyOnePager} className="btn btn-primary !py-1.5 !text-xs">
            {copied ? "Copied ✓" : "Copy LP one-pager"}
          </button>
          <button
            type="button"
            onClick={downloadOnePager}
            className="btn btn-ghost !py-1.5 !text-xs"
          >
            Download .md
          </button>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pack.metrics.map((m) => (
          <Panel key={m.label} className="!p-4">
            <div className="label-caps">{m.label}</div>
            <div className="mono mt-2 text-2xl text-[var(--signal)]">{m.value}</div>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--muted)]">{m.note}</p>
          </Panel>
        ))}
      </div>

      <section className="space-y-3">
        <h3 className="title text-xl">Principles LPs care about</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {pack.principles.map((p) => (
            <Panel key={p.id}>
              <h4 className="font-semibold">{p.title}</h4>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{p.for_lp}</p>
              <p className="mt-3 text-[0.75rem] text-[var(--faint)]">{p.evidence}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="title text-xl">How AI shows up in the process</h3>
        <div className="space-y-2">
          {pack.process.map((s) => (
            <Panel key={s.step} className="!p-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="mono text-[var(--signal)]">0{s.step}</span>
                <span className="font-semibold">{s.title}</span>
                <span className="text-[0.75rem] text-[var(--faint)]">Owner: {s.owner}</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="label-caps">AI role</div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{s.ai_role}</p>
                </div>
                <div>
                  <div className="label-caps">Human role</div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{s.human_role}</p>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="title text-xl">Live governance samples</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {pack.governance.map((g) => (
            <Panel key={g.company_name}>
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="font-semibold">{g.company_name}</h4>
                <span className="label-caps text-[var(--deep)]">{g.stage}</span>
              </div>
              <div className="mt-1 text-sm text-[var(--signal)]">{g.outcome}</div>
              <ul className="mt-3 space-y-1">
                {g.paper_trail.map((line) => (
                  <li key={line} className="text-[0.8125rem] text-[var(--muted)]">
                    · {line}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[0.75rem] text-[var(--faint)]">{g.lp_why_it_matters}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="title text-xl">Risks & controls</h3>
        <div className="space-y-2">
          {pack.risks_and_controls.map((r) => (
            <Panel key={r.risk} className="!p-4">
              <div className="text-sm font-semibold text-[var(--warn)]">{r.risk}</div>
              <p className="mt-1.5 text-sm text-[var(--muted)]">{r.control}</p>
            </Panel>
          ))}
        </div>
      </section>

      <Panel>
        <Eyebrow>Talking points for the LP meeting</Eyebrow>
        <ul className="mt-4 space-y-3">
          {pack.talking_points.map((t) => (
            <li key={t} className="flex gap-2 text-sm leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ok)]" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t border-[var(--line)] pt-4 text-[0.8125rem] text-[var(--faint)]">
          Note: ILPA capital account / performance templates (TVPI, DPI, capital calls) remain
          fund-admin systems. Signal owns the investment judgment & process narrative that feeds
          those conversations — not a fake NAV dashboard.
        </p>
      </Panel>
    </div>
  );
}
