"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AreaChart,
  BarChart,
  DonutChart,
  DualLineChart,
  FunnelChart,
  GroupedBarChart,
  RadarChart,
  SparkBars,
} from "@/components/charts";
import { CompanyLink } from "@/components/EntityLink";
import {
  EmptyState,
  Eyebrow,
  Panel,
  RecBadge,
  SegItem,
  Segmented,
} from "@/components/ui";
import { PartnerLogPanel } from "@/components/PartnerLog";
import {
  CANONICAL_FORESIGHT_QUESTION,
  EVIDENCE_CHANNELS,
  PRESET_THESES,
  buildSectorScanPack,
  formatForesightMarkdown,
  formatThesisScanMarkdown,
  runThesisScan,
  type ContrarianCall,
  type EmergingCall,
  type FlowLane,
  type ForesightPack,
  type MomentumSector,
  type RankedHit,
  type ThesisPillar,
  type ThesisScan,
} from "@/lib/sectorScan";
import type { Commentary, Company, PeerActivity, SectorCall } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "tomorrow" | "thesis" | "momentum" | "contrarian" | "board";

const TABS: { id: Tab; label: string }[] = [
  { id: "tomorrow", label: "Sector of Tomorrow" },
  { id: "thesis", label: "On-demand thesis" },
  { id: "momentum", label: "Momentum" },
  { id: "contrarian", label: "Contrarian" },
  { id: "board", label: "Sector board" },
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

function CoLink({
  id,
  slug,
  name,
}: {
  id: string;
  slug?: string | null;
  name: string;
}) {
  return <CompanyLink id={id} slug={slug} name={name} className="font-medium" />;
}

function tagClass(t: RankedHit["tag"]) {
  if (t === "prime") return "text-[var(--signal)]";
  if (t === "emerging") return "text-[var(--ok)]";
  if (t === "watch") return "text-[var(--deep)]";
  return "text-[var(--muted)]";
}

function postureTone(p: ThesisScan["posture"]) {
  if (p === "contrarian") return "text-[var(--warn)]";
  if (p === "emerging") return "text-[var(--ok)]";
  if (p === "crowded") return "text-[var(--danger)]";
  return "text-[var(--muted)]";
}

function flowTone(id: FlowLane["id"]) {
  if (id === "capital") return "var(--signal)";
  if (id === "talent") return "var(--deep)";
  return "var(--ok)";
}

export function SectorScanner({
  companies,
  peers,
  commentary,
  sectors,
  compact,
}: {
  companies: Company[];
  peers: PeerActivity[];
  commentary: Commentary[];
  sectors: SectorCall[];
  /** Hide outer banner when embedded in Venture Agent */
  compact?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("tomorrow");
  const [thesisQuery, setThesisQuery] = useState(PRESET_THESES[1]);
  const [draft, setDraft] = useState(PRESET_THESES[1]);
  const [buildTick, setBuildTick] = useState(0);
  const [selectedCall, setSelectedCall] = useState(0);
  const [pending, startTransition] = useTransition();

  const pack = useMemo(
    () => buildSectorScanPack(companies, peers, commentary, sectors, thesisQuery),
    [companies, peers, commentary, sectors, thesisQuery],
  );

  const liveScan = useMemo(
    () => runThesisScan(thesisQuery, companies, peers, sectors),
    [thesisQuery, companies, peers, sectors],
  );

  useEffect(() => {
    setBuildTick(0);
    const timers = [120, 320, 520, 720].map((ms, i) =>
      window.setTimeout(() => setBuildTick(i + 1), ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [thesisQuery]);

  useEffect(() => {
    setSelectedCall(0);
  }, [pack.foresight.headline]);

  function commitThesis(q: string) {
    const next = q.trim() || PRESET_THESES[1];
    setDraft(next);
    if (next === CANONICAL_FORESIGHT_QUESTION || /nobody is talking|sector of tomorrow/i.test(next)) {
      setTab("tomorrow");
    }
    startTransition(() => setThesisQuery(next));
  }

  return (
    <div className="space-y-6">
      {!compact ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
            {[
              ["Sectors", pack.summary.sector_count],
              ["Hot", pack.summary.hot_count],
              ["Contrarian", pack.summary.contrarian_count],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-baseline gap-1.5">
                <span className="mono text-[1.05rem] font-semibold text-[var(--text)]">{value}</span>
                <span className="label-caps text-[var(--faint)]">{label}</span>
              </div>
            ))}
          </div>
          <CopyBtn text={formatForesightMarkdown(pack.foresight)} label="Copy brief" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[0.8125rem] text-[var(--muted)]">
            <span>
              <span className="mono text-[var(--text)]">{pack.summary.hot_count}</span> hot
            </span>
            <span>
              <span className="mono text-[var(--text)]">{pack.summary.contrarian_count}</span> contrarian
            </span>
          </div>
          <CopyBtn text={formatForesightMarkdown(pack.foresight)} label="Copy foresight" />
        </div>
      )}

      <Segmented aria-label="Sector scanner modes">
        {TABS.map((t) => (
          <SegItem key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </SegItem>
        ))}
      </Segmented>

      {tab === "tomorrow" && (
        <TomorrowTab
          pack={pack.foresight}
          selected={selectedCall}
          onSelect={setSelectedCall}
        />
      )}
      {tab === "thesis" && (
        <ThesisTab
          scan={liveScan}
          draft={draft}
          setDraft={setDraft}
          onCommit={commitThesis}
          pending={pending}
          buildTick={buildTick}
        />
      )}
      {tab === "momentum" && <MomentumTab pack={pack.momentum} />}
      {tab === "contrarian" && <ContrarianTab pack={pack.contrarian} />}
      {tab === "board" && <BoardTab sectors={sectors} companies={companies} />}
    </div>
  );
}

/* ─── Knows the sector of tomorrow (hero) ───────────────────────────────── */

function TomorrowTab({
  pack,
  selected,
  onSelect,
}: {
  pack: ForesightPack;
  selected: number;
  onSelect: (i: number) => void;
}) {
  const active = pack.top_three[selected] || pack.top_three[0] || null;

  return (
    <div className="space-y-5">
      <Panel className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.45]"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 8% 0%, color-mix(in srgb, var(--signal) 16%, transparent), transparent 55%), radial-gradient(ellipse 55% 45% at 92% 100%, color-mix(in srgb, var(--ok) 10%, transparent), transparent 50%)",
          }}
        />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <Eyebrow live>
                {pack.quarter_label} · {pack.parent_filter}
              </Eyebrow>
              <h3 className="title mt-2 text-[1.35rem] md:text-[1.65rem]">
                Knows the sector of tomorrow
              </h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--muted)]">
                Tracks where <span className="text-[var(--text)]">capital</span>,{" "}
                <span className="text-[var(--text)]">talent</span>, and{" "}
                <span className="text-[var(--text)]">founder attention</span> are flowing —
                then surfaces emerging sub-sectors before they become consensus.
              </p>
            </div>
            <CopyBtn text={formatForesightMarkdown(pack)} label="Copy answer" />
          </div>

          <blockquote className="mt-5 border-l-2 border-[var(--signal)] bg-[var(--soft)]/60 px-4 py-3 text-[0.9rem] leading-relaxed text-[var(--text)]">
            {pack.question}
          </blockquote>

          <p className="mt-4 text-[0.9rem] leading-relaxed text-[var(--muted)]">{pack.counsel}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {EVIDENCE_CHANNELS.map((ch) => (
              <span
                key={ch.id}
                title={ch.hint}
                className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1 text-[0.7rem] text-[var(--muted)]"
              >
                {ch.label}
              </span>
            ))}
          </div>
        </div>
      </Panel>

      {/* Attention flows */}
      <div className="grid gap-4 md:grid-cols-3">
        {pack.flows.map((flow) => (
          <FlowCard key={flow.id} flow={flow} />
        ))}
      </div>

      {/* Top three emerging */}
      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>Three emerging sub-sectors · nobody talking yet</Eyebrow>
            <p className="mt-1 text-[0.8rem] text-[var(--muted)]">
              Ranked by stealth × heat × multi-channel evidence inside {pack.parent_filter}
            </p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {pack.top_three.map((call, i) => (
            <button
              key={call.id}
              type="button"
              onClick={() => onSelect(i)}
              className={cn(
                "rounded-[var(--radius)] border bg-[var(--panel)] p-4 text-left transition",
                selected === i
                  ? "border-[var(--signal)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--signal)_35%,transparent)]"
                  : "border-[var(--line)] hover:border-[var(--signal)]/50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="mono text-[0.75rem] text-[var(--faint)]">0{call.rank}</span>
                <span className="label-caps text-[var(--warn)]">
                  {call.consensus_level || "Emerging"}
                </span>
              </div>
              <h4 className="title mt-2 text-[1.05rem] leading-snug">{call.subsector}</h4>
              <div className="mt-3 flex flex-wrap gap-3 text-[0.7rem] text-[var(--faint)]">
                <span className="mono text-[var(--signal)]">stealth {call.stealth_score}</span>
                <span className="mono">heat {call.heat_score}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--deep)] to-[var(--signal)]"
                  style={{ width: `${call.stealth_score}%` }}
                />
              </div>
              <p className="mt-3 line-clamp-2 text-[0.78rem] text-[var(--muted)]">{call.why}</p>
              <div className="mt-3 text-[0.75rem] text-[var(--text)]/85">
                Best:{" "}
                {call.best_companies[0] ? (
                  <CoLink
                    id={call.best_companies[0].company_id}
                    slug={call.best_companies[0].slug}
                    name={call.best_companies[0].name}
                  />
                ) : (
                  "—"
                )}
              </div>
            </button>
          ))}
          {!pack.top_three.length && (
            <Panel className="lg:col-span-3">
              <EmptyState>No emerging calls — run Refresh to seed Sector of Tomorrow.</EmptyState>
            </Panel>
          )}
        </div>
      </div>

      {active && <EmergingDetail call={active} />}

      {/* Visual analytics */}
      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <Eyebrow>Capital · talent · founder attention</Eyebrow>
          <p className="mt-1 text-[0.8rem] text-[var(--muted)]">
            Where attention is concentrating across the emerging book
          </p>
          <GroupedBarChart
            className="mt-4"
            height={220}
            seriesKeys={["capital", "talent", "founder"]}
            seriesLabels={{
              capital: "Capital",
              talent: "Talent",
              founder: "Founder",
            }}
            colors={["var(--signal)", "var(--deep)", "var(--ok)"]}
            groups={pack.attention.slice(0, 5).map((a) => ({
              label: a.label.length > 14 ? `${a.label.slice(0, 13)}…` : a.label,
              values: {
                capital: a.capital,
                talent: a.talent,
                founder: a.founder,
              },
            }))}
          />
        </Panel>
        <Panel>
          <Eyebrow>Evidence channel coverage</Eyebrow>
          <p className="mt-1 text-[0.8rem] text-[var(--muted)]">
            Average strength across the top-three calls
          </p>
          <div className="mt-3">
            <RadarChart
              size={220}
              scores={Object.fromEntries(pack.channel_totals.map((c) => [c.short, c.score]))}
            />
          </div>
        </Panel>
      </div>

      <Panel>
        <Eyebrow>Evidence matrix · channels × sub-sectors</Eyebrow>
        <p className="mt-1 text-[0.8rem] text-[var(--muted)]">
          GP commentary · frontier hiring · founder migration · fund formation · research / OSS
        </p>
        <ChannelMatrix pack={pack} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Panel>
          <Eyebrow>Flow trajectories (8 weeks)</Eyebrow>
          {pack.flows[0] && pack.flows[1] ? (
            <DualLineChart
              className="mt-3"
              height={180}
              aLabel={pack.flows[0].label}
              bLabel={pack.flows[1].label}
              a={pack.flows[0].series}
              b={pack.flows[1].series}
            />
          ) : (
            <EmptyState>Need flow series.</EmptyState>
          )}
        </Panel>
        <Panel>
          <Eyebrow>Must diligence this week</Eyebrow>
          <div className="mt-4 space-y-3">
            {pack.must_diligence.map((d, i) => (
              <div
                key={d.company_id}
                className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-0"
              >
                <div className="min-w-0">
                  <div className="flex gap-2">
                    <span className="mono text-[0.7rem] text-[var(--faint)]">{i + 1}</span>
                    <CoLink id={d.company_id} slug={d.slug} name={d.name} />
                  </div>
                  <p className="mt-1 text-[0.75rem] text-[var(--muted)]">
                    {d.subsector} · {d.why[0]}
                  </p>
                </div>
                <div className="text-right">
                  <RecBadge rec={d.recommendation} />
                  <div className="mono mt-1 text-[0.75rem] text-[var(--signal)]">{d.thesis_score}</div>
                </div>
              </div>
            ))}
            {!pack.must_diligence.length && <EmptyState>No wedge companies yet.</EmptyState>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function FlowCard({ flow }: { flow: FlowLane }) {
  const color = flowTone(flow.id);
  return (
    <Panel className="!p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Eyebrow>{flow.label}</Eyebrow>
          <div className="mt-1 mono text-[1.65rem]" style={{ color }}>
            {flow.score}
          </div>
        </div>
        <span
          className={cn(
            "mono text-[0.8rem]",
            flow.delta >= 0 ? "text-[var(--ok)]" : "text-[var(--danger)]",
          )}
        >
          {flow.delta >= 0 ? "+" : ""}
          {flow.delta}
        </span>
      </div>
      <p className="mt-2 text-[0.75rem] leading-snug text-[var(--muted)]">{flow.detail}</p>
      <SparkBars
        className="mt-3"
        values={flow.series.map((s) => s.value)}
        color={color}
      />
      <div className="mt-3 text-[0.7rem] text-[var(--faint)]">
        Drivers: {flow.drivers.slice(0, 2).join(" · ") || "—"}
      </div>
    </Panel>
  );
}

function EmergingDetail({ call }: { call: EmergingCall }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Eyebrow>
              #{call.rank} · {call.parent_theme}
            </Eyebrow>
            <h3 className="title mt-2 text-[1.3rem]">{call.subsector}</h3>
          </div>
          <div className="text-right">
            <div className="mono text-[1.5rem] text-[var(--signal)]">{call.stealth_score}</div>
            <div className="label-caps text-[var(--faint)]">stealth</div>
          </div>
        </div>
        <p className="mt-3 text-[0.9rem] leading-relaxed text-[var(--text)]/90">{call.why}</p>
        <p className="mt-2 text-[0.85rem] text-[var(--muted)]">{call.why_pre_consensus}</p>
        <p className="mt-3 rounded-[var(--radius)] bg-[var(--soft)] px-3 py-2 text-[0.85rem] text-[var(--text)]">
          {call.action}
        </p>

        <div className="mt-5 space-y-2">
          <div className="label-caps">Evidence trail</div>
          {call.evidence.map((e) => (
            <div
              key={e}
              className="border-l-2 border-[var(--deep)] pl-3 text-[0.875rem] leading-relaxed text-[var(--muted)]"
            >
              {e}
            </div>
          ))}
          {!call.evidence.length && (
            <p className="text-[0.8rem] text-[var(--faint)]">No evidence lines yet.</p>
          )}
        </div>

        <AreaChart
          className="mt-5"
          height={120}
          series={call.spark.map((v, i) => ({ label: `T${i + 1}`, value: v }))}
        />
      </Panel>

      <div className="space-y-5">
        <Panel>
          <Eyebrow>Channel scores</Eyebrow>
          <div className="mt-3">
            <RadarChart size={200} scores={call.channel_radar} />
          </div>
          <div className="mt-3 space-y-2">
            {call.channel_scores.map((ch) => (
              <div key={ch.id}>
                <div className="flex justify-between gap-2 text-[0.8rem]">
                  <span className="text-[var(--muted)]">{ch.label}</span>
                  <span className="mono text-[var(--signal)]">{ch.score}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--panel-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--signal)]"
                    style={{ width: `${ch.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <Eyebrow>Best companies in this sub-sector</Eyebrow>
          <div className="mt-4 space-y-3">
            {call.best_companies.map((d, i) => (
              <div key={d.company_id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex gap-2">
                    <span className="mono text-[0.7rem] text-[var(--faint)]">{i + 1}</span>
                    <CoLink id={d.company_id} slug={d.slug} name={d.name} />
                  </div>
                  <p className="mt-1 text-[0.75rem] text-[var(--muted)]">
                    {d.why.slice(0, 2).join(" · ")}
                  </p>
                  <span className={cn("mt-1 inline-block label-caps", tagClass(d.tag))}>
                    {d.tag}
                  </span>
                </div>
                <div className="text-right">
                  <div className="mono text-[0.9rem] text-[var(--signal)]">{d.thesis_score}</div>
                  <RecBadge rec={d.recommendation} />
                </div>
              </div>
            ))}
            {!call.best_companies.length && (
              <EmptyState>No named companies mapped yet.</EmptyState>
            )}
          </div>
        </Panel>

        <PartnerLogPanel
          targetType="sector"
          targetId={call.id || call.subsector}
          targetLabel={call.subsector}
          title="Partner log"
          description="Sector reads for the partnership — thesis pushes, pass reasons, who to call."
        />
      </div>
    </div>
  );
}

function ChannelMatrix({ pack }: { pack: ForesightPack }) {
  const { sector_labels, channel_shorts, cells } = pack.channel_matrix;
  if (!sector_labels.length) return <EmptyState>No matrix yet.</EmptyState>;

  const max = Math.max(1, ...cells.flat());
  const colW = 56;
  const rowH = 36;
  const labelW = 150;
  const w = labelW + channel_shorts.length * colW + 8;
  const h = 28 + sector_labels.length * rowH + 8;

  return (
    <div className="mt-4 overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto h-auto min-w-[28rem] w-full max-w-3xl" role="img">
        {channel_shorts.map((lab, j) => (
          <text
            key={lab}
            x={labelW + j * colW + colW / 2}
            y={16}
            textAnchor="middle"
            className="fill-[var(--muted)]"
            fontSize="10"
            fontFamily="var(--font-mono)"
          >
            {lab}
          </text>
        ))}
        {sector_labels.map((lab, i) => (
          <g key={lab}>
            <text
              x={labelW - 8}
              y={28 + i * rowH + rowH / 2 + 3}
              textAnchor="end"
              className="fill-[var(--muted)]"
              fontSize="10"
            >
              {lab.length > 22 ? `${lab.slice(0, 21)}…` : lab}
            </text>
            {cells[i].map((v, j) => {
              const intensity = 0.1 + (v / max) * 0.9;
              return (
                <g key={`${i}-${j}`}>
                  <rect
                    x={labelW + j * colW + 4}
                    y={28 + i * rowH + 4}
                    width={colW - 8}
                    height={rowH - 8}
                    rx="4"
                    fill="var(--signal)"
                    fillOpacity={intensity}
                  />
                  <text
                    x={labelW + j * colW + colW / 2}
                    y={28 + i * rowH + rowH / 2 + 3}
                    textAnchor="middle"
                    className="fill-[var(--text)]"
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                    fontWeight="600"
                  >
                    {v}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ─── On-demand thesis ──────────────────────────────────────────────────── */

function ThesisTab({
  scan,
  draft,
  setDraft,
  onCommit,
  pending,
  buildTick,
}: {
  scan: ThesisScan;
  draft: string;
  setDraft: (q: string) => void;
  onCommit: (q: string) => void;
  pending: boolean;
  buildTick: number;
}) {
  return (
    <div className="space-y-5">
      <Panel className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 10% 0%, color-mix(in srgb, var(--signal) 14%, transparent), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 100%, color-mix(in srgb, var(--deep) 12%, transparent), transparent 50%)",
          }}
        />
        <div className="relative">
          <Eyebrow live>Partner thesis → ranked book</Eyebrow>
          <h3 className="title mt-2 text-[1.35rem] md:text-[1.55rem]">
            Describe the sector. We build the shortlist.
          </h3>
          <p className="mt-2 max-w-2xl text-[0.9rem] leading-relaxed text-[var(--muted)]">
            Natural-language thesis in — interpreted pillars, constellation of fits, and a ranked
            emerging-company list grounded in the live pipeline.
          </p>
          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              onCommit(draft);
            }}
          >
            <textarea
              className="field min-h-[7.5rem] w-full resize-y text-[0.975rem] leading-relaxed"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. Quiet defence tech Series A with hiring velocity and thin Tier-1…"
              aria-label="Partner thesis"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="btn btn-primary" disabled={pending}>
                {pending ? "Building…" : "Build thesis scan"}
              </button>
              <span className={cn("label-caps", postureTone(scan.posture))}>
                Posture · {scan.posture}
              </span>
              <CopyBtn text={formatThesisScanMarkdown(scan)} label="Copy thesis brief" />
            </div>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {PRESET_THESES.map((p) => (
              <button
                key={p}
                type="button"
                className={cn(
                  "btn btn-ghost text-[0.7rem]",
                  scan.query === p && "bg-[var(--soft)] text-[var(--text)]",
                )}
                onClick={() => onCommit(p)}
              >
                {p.length > 48 ? `${p.slice(0, 46)}…` : p}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {scan.build_steps.map((step, i) => {
          const active = buildTick > i;
          return (
            <div
              key={step.id}
              className={cn(
                "rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] px-4 py-3 transition-all duration-500",
                active ? "opacity-100 translate-y-0" : "opacity-40 translate-y-1",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "mono text-[0.7rem]",
                    active ? "text-[var(--signal)]" : "text-[var(--faint)]",
                  )}
                >
                  0{i + 1}
                </span>
                <span className="label-caps">{step.label}</span>
              </div>
              <p className="mt-2 text-[0.8rem] leading-snug text-[var(--muted)]">{step.detail}</p>
            </div>
          );
        })}
      </div>

      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>Thesis blueprint</Eyebrow>
            <h3 className="title mt-1.5 text-[1.15rem]">{scan.interpreted_as}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {scan.filters.map((f) => (
              <span
                key={f}
                className="rounded-[var(--radius)] bg-[var(--soft)] px-2 py-0.5 text-[0.7rem] text-[var(--muted)]"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {scan.pillars.map((p, i) => (
            <PillarCard key={p.id} pillar={p} reveal={buildTick > Math.min(i, 3)} />
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.9fr]">
        <Panel className="!p-0 overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-3">
            <div className="label-caps text-[var(--signal)]">Relevance ranking</div>
            <p className="mt-1 text-[0.75rem] text-[var(--muted)]">
              Sorted by thesis match · bars show relevance and pipeline score
            </p>
          </div>
          <RelevanceRanking hits={scan.hits} />
          <p className="border-t border-[var(--line)] px-5 py-3 text-[0.85rem] text-[var(--muted)]">
            {scan.counsel}
          </p>
        </Panel>

        <Panel>
          <Eyebrow>Ranked shortlist</Eyebrow>
          <div className="mt-4 space-y-3">
            {scan.shortlist.map((h, i) => (
              <div
                key={h.company_id}
                className="flex gap-3 border-b border-[var(--line)] pb-3 last:border-0"
                style={{
                  opacity: buildTick >= 4 ? 1 : 0.35,
                  transition: `opacity 400ms ${i * 60}ms`,
                }}
              >
                <span className="mono w-5 shrink-0 text-[0.75rem] text-[var(--faint)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <CoLink id={h.company_id} slug={h.slug} name={h.name} />
                    <RecBadge rec={h.recommendation} />
                  </div>
                  <p className="mt-1 text-[0.8rem] text-[var(--muted)]">{h.why[0]}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-[0.7rem] text-[var(--faint)]">
                    <span className={cn("label-caps", tagClass(h.tag))}>{h.tag}</span>
                    <span className="mono">rel {h.relevance}</span>
                    <span className="mono">score {h.thesis_score}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--panel-2)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--deep)] to-[var(--signal)]"
                      style={{ width: `${h.relevance}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {!scan.shortlist.length && (
              <EmptyState>No matches — widen thesis language or Refresh.</EmptyState>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel>
          <Eyebrow>Coverage radar</Eyebrow>
          <p className="mt-1 text-[0.8rem] text-[var(--muted)]">
            How the shortlist covers the thesis axes
          </p>
          <div className="mt-3">
            <RadarChart scores={scan.coverage} size={210} />
          </div>
        </Panel>
        <Panel>
          <Eyebrow>Match funnel</Eyebrow>
          <p className="mt-1 text-[0.8rem] text-[var(--muted)]">
            Pipeline → matched → shortlist → prime
          </p>
          <div className="mt-4">
            <FunnelChart
              height={200}
              steps={scan.funnel.map((f) => ({ label: f.label, count: f.value }))}
            />
          </div>
        </Panel>
        <Panel>
          <Eyebrow>Stage mix</Eyebrow>
          <p className="mt-1 text-[0.8rem] text-[var(--muted)]">Matched set composition</p>
          <div className="mt-4">
            {scan.stage_mix.length ? (
              <DonutChart
                slices={scan.stage_mix}
                size={150}
                centerLabel="matched"
                centerValue={String(scan.hits.length)}
              />
            ) : (
              <EmptyState>No stage mix yet.</EmptyState>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.85fr]">
        <Panel>
          <Eyebrow>Full ranked book</Eyebrow>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-[0.85rem]">
              <thead>
                <tr className="label-caps border-b border-[var(--line)] text-[var(--faint)]">
                  <th className="pb-2 pr-3 font-normal">#</th>
                  <th className="pb-2 pr-3 font-normal">Company</th>
                  <th className="pb-2 pr-3 font-normal">Rel</th>
                  <th className="pb-2 pr-3 font-normal">Score</th>
                  <th className="pb-2 pr-3 font-normal">Tag</th>
                  <th className="pb-2 font-normal">Why</th>
                </tr>
              </thead>
              <tbody>
                {scan.hits.map((h, i) => (
                  <tr key={h.company_id} className="border-b border-[var(--line)]/70 align-top">
                    <td className="mono py-2.5 pr-3 text-[var(--faint)]">{i + 1}</td>
                    <td className="py-2.5 pr-3">
                      <CoLink id={h.company_id} slug={h.slug} name={h.name} />
                      <div className="mt-0.5 text-[0.7rem] text-[var(--faint)]">
                        {h.subsector || h.sector_theme} · {h.stage || "—"}
                      </div>
                    </td>
                    <td className="mono py-2.5 pr-3">{h.relevance}</td>
                    <td className="mono py-2.5 pr-3">{h.thesis_score}</td>
                    <td className={cn("py-2.5 pr-3 label-caps", tagClass(h.tag))}>{h.tag}</td>
                    <td className="py-2.5 text-[var(--muted)]">{h.why.slice(0, 2).join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!scan.hits.length && <EmptyState>Empty book for this thesis.</EmptyState>}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <Eyebrow>Nearest sector calls</Eyebrow>
            <div className="mt-3 space-y-3">
              {scan.sector_overlap.map((s) => (
                <div key={s.subsector}>
                  <div className="flex justify-between gap-2 text-[0.85rem]">
                    <span className="font-medium">{s.subsector}</span>
                    <span className="mono text-[var(--signal)]">{s.heat}</span>
                  </div>
                  <div className="mt-1 text-[0.7rem] text-[var(--faint)]">{s.consensus}</div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--panel-2)]">
                    <div
                      className="h-full rounded-full bg-[var(--signal)]"
                      style={{ width: `${s.heat}%` }}
                    />
                  </div>
                </div>
              ))}
              {!scan.sector_overlap.length && <EmptyState>No sector overlap.</EmptyState>}
            </div>
          </Panel>
          <Panel>
            <Eyebrow>Relevance distribution</Eyebrow>
            <BarChart
              className="mt-3"
              height={140}
              series={scan.shortlist.slice(0, 6).map((h) => ({
                label: h.name.length > 8 ? `${h.name.slice(0, 7)}…` : h.name,
                value: h.relevance,
              }))}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function PillarCard({ pillar, reveal }: { pillar: ThesisPillar; reveal: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel-2)]/40 p-3 transition-all duration-500",
        reveal ? "opacity-100 scale-100" : "opacity-30 scale-[0.98]",
      )}
    >
      <div className="label-caps text-[var(--faint)]">{pillar.label}</div>
      <div className="mt-1.5 text-[0.875rem] font-medium leading-snug text-[var(--text)]">
        {pillar.value}
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--panel)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--deep)] to-[var(--signal)] transition-[width] duration-700"
          style={{ width: reveal ? `${clampPillar(pillar.weight)}%` : "0%" }}
        />
      </div>
    </div>
  );
}

function clampPillar(n: number) {
  return Math.max(8, Math.min(100, n));
}

function RelevanceRanking({ hits }: { hits: RankedHit[] }) {

  const ranked = [...hits].sort(

    (a, b) => b.composite - a.composite || b.relevance - a.relevance,

  );



  if (!ranked.length) {

    return (

      <div className="flex min-h-[12rem] items-center justify-center px-5 py-8">

        <EmptyState>Empty ranking — try another thesis.</EmptyState>

      </div>

    );

  }



  return (

    <div className="max-h-[28rem] space-y-0 overflow-y-auto scrollbar-thin">

      {ranked.map((h, i) => (

        <div

          key={h.company_id}

          className="border-b border-[var(--line)] px-5 py-3 last:border-0"

        >

          <div className="flex flex-wrap items-baseline justify-between gap-2">

            <div className="flex min-w-0 items-baseline gap-2.5">

              <span className="mono w-5 shrink-0 text-[0.75rem] text-[var(--faint)]">

                {i + 1}

              </span>

              <CoLink id={h.company_id} slug={h.slug} name={h.name} />

            </div>

            <div className="flex items-center gap-2">

              <span className={cn("label-caps", tagClass(h.tag))}>{h.tag}</span>

              <RecBadge rec={h.recommendation} />

            </div>

          </div>

          <p className="mt-1 pl-7 text-[0.8rem] text-[var(--muted)]">{h.why[0]}</p>

          <div className="mt-2.5 grid gap-2 pl-7 sm:grid-cols-2">

            <div>

              <div className="mb-1 flex justify-between text-[0.7rem] text-[var(--faint)]">

                <span>Relevance</span>

                <span className="mono">{h.relevance}</span>

              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">

                <div

                  className="h-full rounded-full bg-[var(--signal)]"

                  style={{ width: `${Math.max(4, Math.min(100, h.relevance))}%` }}

                />

              </div>

            </div>

            <div>

              <div className="mb-1 flex justify-between text-[0.7rem] text-[var(--faint)]">

                <span>Thesis score</span>

                <span className="mono">{h.thesis_score}</span>

              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">

                <div

                  className="h-full rounded-full bg-[var(--deep)]"

                  style={{ width: `${Math.max(4, Math.min(100, h.thesis_score))}%` }}

                />

              </div>

            </div>

          </div>

        </div>

      ))}

    </div>

  );

}




/* ─── Momentum ──────────────────────────────────────────────────────────── */

function MomentumTab({
  pack,
}: {
  pack: ReturnType<typeof buildSectorScanPack>["momentum"];
}) {
  return (
    <div className="space-y-5">
      <Panel>
        <Eyebrow live>Proactive momentum</Eyebrow>
        <h3 className="title mt-2 text-[1.2rem]">{pack.headline}</h3>
        <p className="mt-2 text-[0.9rem] text-[var(--muted)]">{pack.counsel}</p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <Eyebrow>Sector momentum rank</Eyebrow>
          <BarChart
            className="mt-4"
            height={200}
            series={pack.sectors.slice(0, 6).map((s) => ({
              label: s.subsector.length > 10 ? `${s.subsector.slice(0, 9)}…` : s.subsector,
              value: s.momentum,
            }))}
          />
        </Panel>
        <Panel>
          <Eyebrow>Rising deals (velocity proxy)</Eyebrow>
          <div className="mt-4 space-y-3">
            {pack.rising_deals.slice(0, 6).map((d, i) => (
              <div key={d.company_id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex gap-2">
                    <span className="mono text-[0.7rem] text-[var(--faint)]">{i + 1}</span>
                    <CoLink id={d.company_id} slug={d.slug} name={d.name} />
                  </div>
                  <p className="mt-1 text-[0.75rem] text-[var(--muted)]">
                    {d.why.slice(0, 2).join(" · ") || d.subsector}
                  </p>
                </div>
                <div className="text-right">
                  <div className="mono text-[0.85rem] text-[var(--signal)]">{d.relevance}</div>
                  <SparkBars
                    className="mt-1 justify-end"
                    values={[40, 48, 55, 62, d.relevance * 0.7, d.relevance]}
                  />
                </div>
              </div>
            ))}
            {!pack.rising_deals.length && <EmptyState>No rising deals yet.</EmptyState>}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {pack.sectors.map((s) => (
          <MomentumCard key={s.id} sector={s} />
        ))}
        {!pack.sectors.length && (
          <Panel>
            <EmptyState>No sector calls — run Refresh.</EmptyState>
          </Panel>
        )}
      </div>
    </div>
  );
}

function MomentumCard({ sector }: { sector: MomentumSector }) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>
            {sector.consensus_level || "Emerging"} · {sector.parent_theme}
          </Eyebrow>
          <h3 className="title mt-2 text-[1.25rem]">{sector.subsector}</h3>
        </div>
        <div className="text-right">
          <div className="mono text-[1.5rem] text-[var(--signal)]">{sector.momentum}</div>
          <div className="label-caps text-[var(--faint)]">momentum</div>
        </div>
      </div>
      <p className="mt-3 text-[0.9rem] leading-relaxed text-[var(--text)]/90">{sector.why}</p>
      <AreaChart
        className="mt-4"
        height={110}
        series={sector.spark.map((v, i) => ({ label: `T${i + 1}`, value: v }))}
      />
      <div className="mt-4 space-y-2">
        <div className="label-caps">Best deals in sector</div>
        {sector.best_deals.map((d) => (
          <div key={d.company_id} className="flex items-center justify-between gap-2 text-[0.85rem]">
            <CoLink id={d.company_id} slug={d.slug} name={d.name} />
            <span className="mono text-[var(--muted)]">{d.thesis_score}</span>
          </div>
        ))}
        {!sector.best_deals.length && (
          <p className="text-[0.8rem] text-[var(--faint)]">
            Named: {(sector.top_companies || []).join(" · ") || "—"}
          </p>
        )}
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-md bg-[var(--panel-2)]">
        <div
          className="h-full bg-gradient-to-r from-[var(--deep)] to-[var(--signal)]"
          style={{ width: `${Math.min(100, sector.heat_score)}%` }}
        />
      </div>
      <div className="mt-2 text-[0.7rem] text-[var(--faint)]">Heat {sector.heat_score}</div>
    </Panel>
  );
}

/* ─── Contrarian ────────────────────────────────────────────────────────── */

function ContrarianTab({
  pack,
}: {
  pack: ReturnType<typeof buildSectorScanPack>["contrarian"];
}) {
  const sectors = pack.calls.filter((c) => c.kind === "sector");
  const deals = pack.calls.filter((c) => c.kind === "deal");

  return (
    <div className="space-y-5">
      <Panel>
        <Eyebrow live>Against consensus</Eyebrow>
        <h3 className="title mt-2 text-[1.2rem]">{pack.headline}</h3>
        <p className="mt-2 text-[0.9rem] text-[var(--muted)]">{pack.counsel}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-[0.75rem] text-[var(--muted)]">
          <span>
            Sectors <span className="mono text-[var(--text)]">{pack.sector_count}</span>
          </span>
          <span>
            Deal edges <span className="mono text-[var(--text)]">{pack.deal_count}</span>
          </span>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <Eyebrow>Contrarian / emerging sectors</Eyebrow>
          <div className="mt-4 space-y-4">
            {sectors.map((c) => (
              <ContrarianRow key={c.id} call={c} />
            ))}
            {!sectors.length && <EmptyState>No contrarian sector calls.</EmptyState>}
          </div>
        </Panel>
        <Panel>
          <Eyebrow>Deal-level anti-consensus</Eyebrow>
          <div className="mt-4 space-y-4">
            {deals.map((c) => (
              <ContrarianRow key={c.id} call={c} />
            ))}
            {!deals.length && <EmptyState>No quiet Deep Dives or traps yet.</EmptyState>}
          </div>
        </Panel>
      </div>

      <Panel>
        <Eyebrow>Heat vs consensus posture</Eyebrow>
        <BarChart
          className="mt-4"
          height={180}
          color="var(--warn)"
          series={pack.calls.slice(0, 8).map((c) => ({
            label: c.title.length > 10 ? `${c.title.slice(0, 9)}…` : c.title,
            value: c.heat_or_score,
          }))}
        />
      </Panel>
    </div>
  );
}

function ContrarianRow({ call }: { call: ContrarianCall }) {
  return (
    <div className="border-b border-[var(--line)] pb-4 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="label-caps text-[var(--warn)]">{call.kind}</div>
          {call.company_id ? (
            <CoLink id={call.company_id} slug={call.slug} name={call.title} />
          ) : (
            <div className="mt-1 font-medium">{call.title}</div>
          )}
          <div className="mt-0.5 text-[0.75rem] text-[var(--faint)]">{call.subtitle}</div>
        </div>
        <div className="mono text-[1.15rem] text-[var(--signal)]">{call.heat_or_score}</div>
      </div>
      <p className="mt-2 text-[0.85rem] text-[var(--muted)]">{call.insight}</p>
      <p className="mt-1 text-[0.8rem] text-[var(--text)]/80">{call.action}</p>
      <div className="mt-2 text-[0.7rem] text-[var(--faint)]">{call.consensus_vs}</div>
    </div>
  );
}

/* ─── Classic sector board ──────────────────────────────────────────────── */

function BoardTab({
  sectors,
  companies,
}: {
  sectors: SectorCall[];
  companies: Company[];
}) {
  const byName = useMemo(
    () => new Map(companies.map((c) => [c.name.toLowerCase(), c])),
    [companies],
  );

  return (
    <div className="grid gap-5 md:grid-cols-2 stagger">
      {sectors.map((s, i) => (
        <Panel key={s.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Eyebrow>
                {s.consensus_level} · {s.parent_theme}
              </Eyebrow>
              <h2 className="title mt-2.5 text-[1.45rem] md:text-[1.6rem]">{s.subsector}</h2>
            </div>
            <div className="mono text-[1.75rem] text-[var(--signal)]">{s.heat_score}</div>
          </div>
          <p className="mt-4 text-[0.975rem] leading-relaxed text-[var(--text)]/90">
            {s.why_thirdbase_cares}
          </p>
          <div className="mt-5 space-y-2">
            <div className="label-caps">Evidence</div>
            {(s.evidence || []).map((e) => (
              <div
                key={e}
                className="border-l-2 border-[var(--deep)] pl-3 text-[0.9375rem] leading-relaxed text-[var(--muted)]"
              >
                {e}
              </div>
            ))}
          </div>
          <div className="mt-5 text-[0.9375rem]">
            <span className="text-[var(--muted)]">Best companies: </span>
            {(s.top_companies || []).map((name, idx) => {
              const co = byName.get(name.toLowerCase());
              return (
                <span key={name}>
                  {idx > 0 ? " · " : null}
                  {co ? (
                    <Link
                      href={`/company/${co.slug || co.id}`}
                      className="font-medium hover:text-[var(--signal)]"
                    >
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                </span>
              );
            })}
          </div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-md bg-[var(--panel-2)]">
            <div
              className="h-full bg-gradient-to-r from-[var(--deep)] to-[var(--signal)]"
              style={{ width: `${Math.min(100, s.heat_score || 0)}%` }}
            />
          </div>
          <div className="mt-2 text-[0.75rem] text-[var(--faint)]">Heat rank #{i + 1}</div>
        </Panel>
      ))}
      {!sectors.length && (
        <Panel>
          <EmptyState>No sector calls yet.</EmptyState>
        </Panel>
      )}
    </div>
  );
}
