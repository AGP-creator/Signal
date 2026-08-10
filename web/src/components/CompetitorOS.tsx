"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { GoldenPack, GoldenInsight } from "@/lib/goldenInsights";
import type { PeerIntelligence } from "@/lib/peerIntel";
import { cn } from "@/lib/utils";

type Tab = "insights" | "syndicate" | "flows" | "battles" | "radar" | "matrix" | "heatmap";

const KIND_LABEL: Record<GoldenInsight["kind"], string> = {
  alpha: "Proprietary alpha",
  crowding: "Crowding",
  whitespace: "White space",
  syndicate: "Syndicate unlock",
  drift: "Thesis drift",
  race: "Competitive race",
  asymmetric: "Asymmetric signal",
  defend: "Battle card",
};

const URGENCY_CLASS = {
  now: "border-[rgba(214,255,60,0.45)] bg-[rgba(214,255,60,0.08)]",
  this_week: "border-[rgba(62,199,255,0.35)] bg-[rgba(62,199,255,0.06)]",
  monitor: "border-[var(--line)]",
};

export function CompetitorOS({
  intel,
  pack,
}: {
  intel: PeerIntelligence;
  pack: GoldenPack;
}) {
  const [tab, setTab] = useState<Tab>("insights");
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState("all");
  const [driftOnly, setDriftOnly] = useState(false);
  const [copied, setCopied] = useState(false);

  const themes = useMemo(() => {
    const s = new Set<string>();
    for (const f of intel.firms) for (const t of f.top_themes) s.add(t.theme);
    return ["all", ...[...s].sort()];
  }, [intel.firms]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return intel.firms.filter((f) => {
      if (driftOnly && f.drift_score < 25 && f.thesis_shift_count === 0) return false;
      if (theme !== "all" && !f.top_themes.some((t) => t.theme === theme)) return false;
      if (!needle) return true;
      const blob = `${f.name} ${f.stated_focus} ${f.aliases.join(" ")} ${f.intel_summary}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [intel.firms, q, theme, driftOnly]);

  const cellMap = useMemo(() => {
    const m = new Map<string, { is_lead: boolean; on_thesis: boolean }>();
    for (const c of intel.matrix.cells) m.set(`${c.firm_slug}::${c.company_id}`, c);
    return m;
  }, [intel.matrix.cells]);

  async function copyBrief() {
    const text = [
      pack.weekly_brief.subject,
      "",
      pack.weekly_brief.headline,
      "",
      ...pack.weekly_brief.paragraphs,
      "",
      "MUST DO",
      ...pack.weekly_brief.must_do.map((m) => `• ${m}`),
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-6">
      {/* Weekly brief theater */}
      <section className="surface-hero p-6 md:p-8 animate-in">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="eyebrow text-[var(--signal)]">Partner competitor brief</div>
            <h2 className="display mt-3 text-[2rem] md:text-[2.5rem]">
              {pack.weekly_brief.headline}
            </h2>
            <div className="mt-4 space-y-3 text-[0.975rem] leading-relaxed text-[var(--muted)]">
              {pack.weekly_brief.paragraphs.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
          </div>
          <button type="button" onClick={copyBrief} className="btn btn-primary shrink-0">
            {copied ? "Copied" : "Copy brief"}
          </button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[rgba(214,255,60,0.25)] bg-[rgba(214,255,60,0.05)] p-4">
            <div className="label-caps text-[var(--signal)]">Must do</div>
            <ul className="mt-3 space-y-2 text-sm">
              {pack.weekly_brief.must_do.map((m) => (
                <li key={m} className="leading-snug">
                  → {m}
                </li>
              ))}
              {!pack.weekly_brief.must_do.length && (
                <li className="text-[var(--muted)]">No immediate must-dos — maintain coverage.</li>
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="label-caps">Watch list</div>
            <ul className="mt-3 space-y-2 text-[0.9375rem] text-[var(--muted)]">
              {pack.weekly_brief.watch.map((m) => (
                <li key={m}>• {m}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Proprietary strip */}
      {!!pack.proprietary_deals.length && (
        <section className="stagger grid gap-3 md:grid-cols-3">
          {pack.proprietary_deals.slice(0, 3).map((d) => (
            <Link
              key={d.id}
              href={`/company/${d.slug || d.id}`}
              className="panel panel-interactive block p-4"
            >
              <div className="label-caps text-[var(--signal)]">
                Proprietary window
              </div>
              <div className="title mt-2 text-[1.2rem]">{d.name}</div>
              <div className="mono mt-1 text-sm text-[var(--deep)]">
                score {d.thesis_score?.toFixed(0)}
              </div>
              <p className="mt-2 text-[0.8125rem] text-[var(--muted)]">{d.note}</p>
            </Link>
          ))}
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["insights", "Golden insights"],
            ["syndicate", "Syndicate plays"],
            ["flows", "Capital flows"],
            ["battles", "Battle cards"],
            ["radar", "Firm radar"],
            ["matrix", "Matrix"],
            ["heatmap", "Heatmap"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-[8px] px-3 py-1.5 text-[0.9rem] font-medium transition",
              tab === id
                ? "bg-[var(--signal-dim)] text-[var(--signal)]"
                : "text-[var(--muted)] hover:text-[var(--text)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "insights" && (
        <div className="stagger space-y-4">
          {pack.insights.map((insight) => (
            <article
              key={insight.id}
              className={cn("panel border p-5 md:p-6", URGENCY_CLASS[insight.urgency])}
            >
              <div className="flex flex-wrap items-center gap-2 label-caps">
                <span className="text-[var(--signal)]">{KIND_LABEL[insight.kind]}</span>
                <span className="text-[var(--faint)]">·</span>
                <span
                  className={cn(
                    insight.urgency === "now"
                      ? "text-[var(--signal)]"
                      : insight.urgency === "this_week"
                        ? "text-[var(--deep)]"
                        : "text-[var(--muted)]",
                  )}
                >
                  {insight.urgency.replace("_", " ")}
                </span>
                <span className="mono ml-auto text-[var(--faint)]">{insight.score.toFixed(0)}</span>
              </div>
              <h3 className="title mt-2 text-[1.35rem]">{insight.title}</h3>
              <p className="mt-3 max-w-3xl text-[0.975rem] leading-relaxed text-[var(--text)]/90">
                {insight.insight}
              </p>
              <div className="mt-4 rounded-xl border border-[var(--line)] bg-[rgba(0,0,0,0.2)] px-4 py-3 text-sm">
                <span className="text-[var(--signal)]">Action → </span>
                {insight.action}
              </div>
              {!!insight.evidence?.length && (
                <ul className="mt-3 space-y-1 text-[0.8125rem] text-[var(--muted)]">
                  {insight.evidence.filter(Boolean).map((e) => (
                    <li key={e}>• {e}</li>
                  ))}
                </ul>
              )}
              {!!insight.hrefs?.length && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {insight.hrefs.map((h) => (
                    <Link key={h.href + h.label} href={h.href} className="chip">
                      {h.label} →
                    </Link>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {tab === "syndicate" && (
        <div className="space-y-4">
          <p className="text-[0.9375rem] text-[var(--muted)]">
            For every Deep Dive: who is already in, how crowded the tape is, and who Thirdbase should
            call next based on co-invest patterns + theme fit.
          </p>
          {pack.syndicate_plays.map((play) => (
            <div key={play.company_id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/company/${play.slug || play.company_id}`}
                    className="title text-[1.35rem] hover:text-[var(--signal)]"
                  >
                    {play.company_name}
                  </Link>
                  <div className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                    score {play.thesis_score?.toFixed(0)} · crowding{" "}
                    <span className="text-[var(--warn)]">{play.crowding}</span>
                  </div>
                </div>
                <div className="max-w-sm text-right text-[0.8125rem] text-[var(--muted)]">{play.edge_note}</div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="label-caps">
                    Already on tape
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {play.already_in.map((inv) => (
                      <span key={inv} className="chip">
                        {inv}
                      </span>
                    ))}
                    {!play.already_in.length && (
                      <span className="text-[0.8125rem] text-[var(--signal)]">Quiet — proprietary window</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="label-caps">
                    Call list
                  </div>
                  <div className="mt-2 space-y-2">
                    {play.call_list.slice(0, 4).map((c) => (
                      <Link
                        key={c.slug}
                        href={`/peers/${c.slug}`}
                        className="block rounded-lg border border-[var(--line)] px-3 py-2 text-sm hover:border-[var(--signal)]"
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-medium">{c.firm}</span>
                          <span className="mono text-[var(--deep)]">{c.fit_score}</span>
                        </div>
                        <div className="text-[0.8125rem] text-[var(--muted)]">{c.reason}</div>
                      </Link>
                    ))}
                    {!play.call_list.length && (
                      <p className="text-[0.8125rem] text-[var(--muted)]">No clear syndicate unlock yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "flows" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {pack.theme_flows.map((flow) => (
            <div key={flow.theme} className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="title text-[1.2rem]">{flow.theme}</h3>
                <span
                  className={cn(
                    "rounded-[6px] px-2.5 py-1 text-[0.6875rem] font-bold uppercase",
                    flow.posture === "whitespace"
                      ? "bg-[var(--signal)] text-black"
                      : flow.posture === "flood"
                        ? "bg-[var(--warn)] text-black"
                        : flow.posture === "contested"
                          ? "bg-[var(--deep)] text-black"
                          : "border border-[var(--line)] text-[var(--muted)]",
                  )}
                >
                  {flow.posture}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-[var(--panel-2)] py-2">
                  <div className="mono text-lg text-[var(--warn)]">{flow.peer_deals}</div>
                  Peer tags
                </div>
                <div className="rounded-lg bg-[var(--panel-2)] py-2">
                  <div className="mono text-lg text-[var(--deep)]">{flow.thirdbase_deals}</div>
                  Our names
                </div>
                <div className="rounded-lg bg-[var(--panel-2)] py-2">
                  <div className="mono text-lg text-[var(--signal)]">{flow.thirdbase_deep_dives}</div>
                  Deep Dive
                </div>
              </div>
              <p className="mt-4 text-[0.9375rem] text-[var(--muted)]">{flow.counsel}</p>
              <div className="mt-3 text-[0.8125rem] text-[var(--faint)]">
                Peers: {flow.peer_firms.join(" · ") || "—"}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "battles" && (
        <div className="grid gap-4 md:grid-cols-2">
          {pack.battle_cards.map((card) => (
            <Link
              key={card.slug}
              href={`/peers/${card.slug}`}
              className="panel panel-interactive block p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="title text-[1.35rem]">{card.name}</h3>
                  <div className="mt-1 text-[0.8125rem] text-[var(--muted)]">{card.stated_focus || "—"}</div>
                </div>
                <div className="mono text-sm text-[var(--signal)]">{card.watch_priority.toFixed(0)}</div>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <Block label="How they win" body={card.how_they_win} />
                <Block label="Where they're weak" body={card.where_they_are_weak} />
                <Block label="Partner or compete" body={card.partner_or_compete} />
                <Block label="Call when" body={card.call_when} />
              </div>
              {!!card.top_deals.length && (
                <div className="mt-4 text-[0.8125rem] text-[var(--faint)]">
                  Overlap: {card.top_deals.filter(Boolean).join(" · ")}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {(tab === "radar" || tab === "matrix" || tab === "heatmap") && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[14rem] flex-1">
            <span className="label-caps">Search firms</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="a16z, Shield, robotics…"
              className="field mt-1"
            />
          </label>
          <label>
            <span className="label-caps">Theme</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} className="field mt-1">
              {themes.map((t) => (
                <option key={t} value={t}>
                  {t === "all" ? "All themes" : t}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setDriftOnly((v) => !v)}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm",
              driftOnly
                ? "border-[var(--warn)] bg-[rgba(255,176,32,0.12)] text-[var(--warn)]"
                : "border-[var(--line)] text-[var(--muted)]",
            )}
          >
            Thesis drift only
          </button>
        </div>
      )}

      {tab === "radar" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, 36).map((f) => (
            <Link
              key={f.id}
              href={`/peers/${f.slug}`}
              className="panel panel-interactive group block p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="title text-[1.2rem] group-hover:text-[var(--signal)]">
                    {f.name}
                  </div>
                  <div className="mt-1 line-clamp-1 text-[0.8125rem] text-[var(--muted)]">
                    {f.stated_focus || "Focus not catalogued"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="mono text-lg text-[var(--signal)]">{f.watch_priority.toFixed(0)}</div>
                  <div className="label-caps text-[var(--faint)]">watch</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <MiniStat label="Deals" value={String(f.deal_count)} />
                <MiniStat label="Drift" value={f.drift_score.toFixed(0)} warn={f.drift_score >= 30} />
                <MiniStat
                  label="Shifts"
                  value={String(f.thesis_shift_count)}
                  warn={f.thesis_shift_count > 0}
                />
              </div>
              <p className="mt-4 line-clamp-3 text-[0.9375rem] text-[var(--muted)]">{f.intel_summary}</p>
            </Link>
          ))}
        </div>
      )}

      {tab === "matrix" && (
        <div className="panel overflow-auto">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="title text-[1.35rem]">Investor × company matrix</h2>
            <p className="mt-1 text-[0.9375rem] text-[var(--muted)]">
              Lead = signal cell · On-thesis = deep · Off-thesis = warn
            </p>
          </div>
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                <th className="sticky left-0 bg-[var(--panel)] px-3 py-2 font-medium">Firm</th>
                {intel.matrix.companies.map((c) => (
                  <th key={c.id} className="max-w-[4.5rem] truncate px-1 py-2 font-medium" title={c.name}>
                    <Link href={`/company/${c.slug || c.id}`} className="hover:text-[var(--deep)]">
                      {c.name.slice(0, 10)}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {intel.matrix.firms.map((f) => (
                <tr key={f.slug} className="border-b border-[var(--line)]">
                  <td className="sticky left-0 bg-[var(--panel)] px-3 py-2">
                    <Link href={`/peers/${f.slug}`} className="font-medium hover:text-[var(--signal)]">
                      {f.name}
                    </Link>
                  </td>
                  {intel.matrix.companies.map((c) => {
                    const cell = cellMap.get(`${f.slug}::${c.id}`);
                    if (!cell) {
                      return (
                        <td key={c.id} className="px-1 py-2 text-center text-[var(--faint)]">
                          ·
                        </td>
                      );
                    }
                    return (
                      <td key={c.id} className="px-1 py-2 text-center">
                        <span
                          className={cn(
                            "inline-block h-3.5 w-3.5 rounded-sm",
                            cell.is_lead
                              ? "bg-[var(--signal)]"
                              : cell.on_thesis
                                ? "bg-[var(--deep)]"
                                : "bg-[var(--warn)]",
                          )}
                          title={`${f.name} × ${c.name}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "heatmap" && (
        <div className="panel overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="title text-[1.35rem]">Co-investor heatmap</h2>
            <p className="mt-1 text-[0.9375rem] text-[var(--muted)]">
              Syndicate building map — who consistently writes checks together.
            </p>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {intel.heatmap.slice(0, 28).map((row) => (
              <div key={`${row.firm_a}-${row.firm_b}`} className="flex items-center gap-4 px-5 py-3">
                <div
                  className="mono flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
                  style={{
                    background: `rgba(214,255,60,${Math.min(0.55, 0.1 + row.coinvest_count * 0.1)})`,
                    color: "#0b1a08",
                  }}
                >
                  {row.coinvest_count}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {row.firm_a} <span className="text-[var(--faint)]">×</span> {row.firm_b}
                  </div>
                  <div className="truncate text-[0.8125rem] text-[var(--muted)]">
                    {row.shared_themes.slice(0, 2).join(" · ") || "—"}
                    {row.last_shared_deal ? ` · last: ${row.last_shared_deal}` : ""}
                  </div>
                </div>
                <div className="mono shrink-0 text-[0.8125rem] text-[var(--deep)]">
                  syn {row.syndicate_score.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="label-caps text-[var(--faint)]">{label}</div>
      <p className="mt-1 text-[var(--text)]/90">{body}</p>
    </div>
  );
}

function MiniStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-[var(--panel-2)] px-2 py-2">
      <div className={cn("mono text-base", warn ? "text-[var(--warn)]" : "text-[var(--text)]")}>
        {value}
      </div>
      <div className="label-caps text-[var(--faint)]">{label}</div>
    </div>
  );
}
