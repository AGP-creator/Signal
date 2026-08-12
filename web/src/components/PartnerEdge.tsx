"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CompanyLink } from "@/components/EntityLink";
import {
  EmptyState,
  Eyebrow,
  Panel,
  RecBadge,
  SegItem,
  Segmented,
} from "@/components/ui";
import { GaugeChart } from "@/components/charts";
import type { PartnerOverride } from "@/lib/judgment";
import { loadOverrides } from "@/lib/overrideStore";
import {
  DEFAULT_WEIGHTS,
  buildEdgePack,
  formatEdgeBriefMarkdown,
  runWhatIf,
  type AntiConsensusDeal,
  type ConvictionClock,
  type EdgePack,
  type PartnerTwinPrediction,
  type PassAutopsy,
  type PreMortem,
  type ReferenceCall,
  type VelocityDeal,
  type WhatIfWeights,
} from "@/lib/partnerEdge";
import { companyPath } from "@/lib/paths";
import type {
  Commentary,
  Company,
  PeerActivity,
  SectorCall,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab =
  | "brief"
  | "anti"
  | "clocks"
  | "twin"
  | "refs"
  | "whatif"
  | "velocity"
  | "autopsy"
  | "premortem";

const TABS: { id: Tab; label: string }[] = [
  { id: "anti", label: "Anti consensus" },
  { id: "clocks", label: "Clocks" },
  { id: "twin", label: "Partner twin" },
  { id: "refs", label: "References" },
  { id: "whatif", label: "What if" },
  { id: "velocity", label: "Velocity" },
  { id: "autopsy", label: "Autopsy" },
  { id: "premortem", label: "Pre mortem" },
  { id: "brief", label: "Brief" },
];

function postureClass(p: AntiConsensusDeal["posture"]) {
  if (p === "proprietary") return "text-[var(--signal)]";
  if (p === "trap") return "text-[var(--danger)]";
  if (p === "crowded" || p === "contested") return "text-[var(--warn)]";
  return "text-[var(--muted)]";
}

function counselClass(c: ConvictionClock["counsel"]) {
  if (c === "race" || c === "act_this_week") return "text-[var(--danger)]";
  if (c === "patience_is_alpha") return "text-[var(--signal)]";
  return "text-[var(--muted)]";
}

function twinClass(p: PartnerTwinPrediction["predicted"]) {
  if (p === "lean_in") return "text-[var(--signal)]";
  if (p === "hard_pass") return "text-[var(--danger)]";
  if (p === "push_back") return "text-[var(--warn)]";
  return "text-[var(--muted)]";
}

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

export function PartnerEdge({
  companies,
  peers,
  commentary,
  sectors,
}: {
  companies: Company[];
  peers: PeerActivity[];
  commentary: Commentary[];
  sectors: SectorCall[];
}) {
  const [tab, setTab] = useState<Tab>("anti");
  const [stored, setStored] = useState<PartnerOverride[]>([]);
  const [weights, setWeights] = useState<WhatIfWeights>({ ...DEFAULT_WEIGHTS });

  useEffect(() => {
    const sync = () => setStored(loadOverrides());
    sync();
    window.addEventListener("signal:overrides-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("signal:overrides-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const pack: EdgePack = useMemo(
    () => buildEdgePack(companies, peers, commentary, sectors, stored),
    [companies, peers, commentary, sectors, stored],
  );

  const whatIf = useMemo(
    () => runWhatIf(companies, weights),
    [companies, weights],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          {[
            ["Proprietary", pack.summary.proprietary_count],
            ["Traps", pack.summary.trap_count],
            ["Hot clocks", pack.summary.act_now_count],
            ["Autopsy", pack.summary.autopsy_high],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-baseline gap-1.5">
              <span className="mono text-[1.05rem] font-semibold text-[var(--text)]">{value}</span>
              <span className="label-caps text-[var(--faint)]">{label}</span>
            </div>
          ))}
        </div>
        <CopyBtn text={formatEdgeBriefMarkdown(pack)} label="Copy brief" />
      </div>

      <Segmented aria-label="Partner Edge sections" className="seg-scroll">
        {TABS.map((t) => (
          <SegItem
            key={t.id}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </SegItem>
        ))}
      </Segmented>

      {tab === "brief" && <BriefTab pack={pack} />}
      {tab === "anti" && <AntiTab rows={pack.anti_consensus} />}
      {tab === "clocks" && <ClocksTab rows={pack.clocks} />}
      {tab === "twin" && <TwinTab pack={pack} />}
      {tab === "refs" && <RefsTab rows={pack.reference_calls} />}
      {tab === "whatif" && (
        <WhatIfTab weights={weights} setWeights={setWeights} result={whatIf} />
      )}
      {tab === "velocity" && <VelocityTab rows={pack.velocity} />}
      {tab === "autopsy" && <AutopsyTab rows={pack.autopsies} />}
      {tab === "premortem" && <PreMortemTab rows={pack.pre_mortems} />}
    </div>
  );
}

function BriefTab({ pack }: { pack: EdgePack }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel>
        <Eyebrow>Proprietary vs trap</Eyebrow>
        <div className="mt-4 space-y-4">
          {pack.anti_consensus.slice(0, 4).map((a) => (
            <div
              key={a.company_id}
              className="border-b border-[var(--line)] pb-3 last:border-0"
            >
              <div className="flex items-center justify-between gap-2">
                <CoLink id={a.company_id} slug={a.slug} name={a.company_name} />
                <span className={cn("label-caps", postureClass(a.posture))}>
                  {a.posture}
                </span>
              </div>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--muted)]">
                {a.action}
              </p>
            </div>
          ))}
          {!pack.anti_consensus.length && (
            <EmptyState>
              No edge deals. Refresh pipeline or widen filters.
            </EmptyState>
          )}
        </div>
      </Panel>
      <Panel>
        <Eyebrow>Clocks + twin disagreements</Eyebrow>
        <div className="mt-4 space-y-4">
          {pack.clocks.slice(0, 3).map((c) => (
            <div
              key={c.company_id}
              className="border-b border-[var(--line)] pb-3 last:border-0"
            >
              <div className="flex items-center justify-between gap-2">
                <CoLink id={c.company_id} slug={c.slug} name={c.company_name} />
                <span className={cn("label-caps", counselClass(c.counsel))}>
                  {c.headline}
                </span>
              </div>
              <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                {c.clock_label}
              </p>
            </div>
          ))}
          {pack.twin.predictions
            .filter(
              (p) =>
                p.predicted === "push_back" ||
                p.predicted === "hard_pass" ||
                p.predicted === "lean_in",
            )
            .slice(0, 3)
            .map((p) => (
              <div
                key={`t_${p.company_id}`}
                className="border-b border-[var(--line)] pb-3 last:border-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <CoLink
                    id={p.company_id}
                    slug={p.slug}
                    name={p.company_name}
                  />
                  <span className={cn("label-caps", twinClass(p.predicted))}>
                    {p.predicted.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                  {p.rationale}
                </p>
              </div>
            ))}
        </div>
      </Panel>
    </div>
  );
}

function AntiTab({ rows }: { rows: AntiConsensusDeal[] }) {
  return (
    <div className="space-y-4">
      {rows.map((a) => (
        <Panel key={a.company_id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className={cn("label-caps", postureClass(a.posture))}>
                {a.posture}
              </div>
              <h3 className="mt-1 text-[1.05rem] font-medium">
                <CoLink id={a.company_id} slug={a.slug} name={a.title} />
              </h3>
            </div>
            <div className="text-right">
              <div className="mono text-[1.1rem] text-[var(--signal)]">
                {a.edge_score}
              </div>
              <div className="stat-label">Edge</div>
            </div>
          </div>
          <p className="mt-3 text-[0.9rem] leading-relaxed text-[var(--muted)]">
            {a.insight}
          </p>
          <p className="mt-2 text-[0.875rem] font-medium">{a.action}</p>
          <ul className="mt-3 space-y-1 text-[0.75rem] text-[var(--faint)]">
            {a.why.map((w) => (
              <li key={w}>- {w}</li>
            ))}
          </ul>
        </Panel>
      ))}
      {!rows.length && (
        <EmptyState>
          Quiet board. No proprietary / trap / race setups right now.
        </EmptyState>
      )}
    </div>
  );
}

function ClocksTab({ rows }: { rows: ConvictionClock[] }) {
  return (
    <div className="space-y-4">
      {rows.map((c) => (
        <Panel key={c.company_id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className={cn("label-caps", counselClass(c.counsel))}>
                {c.headline}
              </div>
              <h3 className="mt-1 text-[1.05rem]">
                <CoLink id={c.company_id} slug={c.slug} name={c.company_name} />
              </h3>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--muted)]">
                {c.detail}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <GaugeChart
                value={c.fomo_index}
                max={100}
                label="FOMO"
                color="var(--warn)"
                size={120}
              />
              <GaugeChart
                value={c.patience_alpha}
                max={100}
                label="Patience"
                color="var(--signal)"
                size={120}
              />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-[0.75rem] text-[var(--faint)]">
            <span className="mono text-[var(--text)]">{c.clock_label}</span>
            <span>window</span>
            <RecBadge rec={c.recommendation} />
            <span>Thesis {c.thesis_score}</span>
            <span>Peers {c.peer_pressure}</span>
            <span>Signal age {c.signal_age_days ?? "-"}d</span>
          </div>
        </Panel>
      ))}
      {!rows.length && (
        <EmptyState>
          No clocks. No Deep Dive / high conviction names to time.
        </EmptyState>
      )}
    </div>
  );
}

function TwinTab({ pack }: { pack: EdgePack }) {
  const { twin } = pack;
  return (
    <div className="space-y-5">
      <Panel>
        <Eyebrow>{twin.seeded ? "Demo DNA" : "Live twin"}</Eyebrow>
        <p className="mt-3 text-[0.925rem] leading-relaxed">
          {twin.dna_summary}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {twin.style_tags.map((t) => (
            <span
              key={t}
              className="rounded-[var(--radius)] border border-[var(--line)] px-2.5 py-1 text-[0.7rem] text-[var(--muted)]"
            >
              {t}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[0.75rem] text-[var(--faint)]">
          {twin.override_count} override signals | raised bars{" "}
          {twin.raised_bars.map((b) => b.dimension).join(", ") || "-"} | lowered{" "}
          {twin.lowered_bars.map((b) => b.dimension).join(", ") || "-"}
          {twin.seeded ? (
            <>
              {" "}
              | Log real overrides in{" "}
              <Link href="/judgment" className="underline">
                Judgment OS
              </Link>
            </>
          ) : null}
        </p>
      </Panel>
      <div className="space-y-3">
        {twin.predictions.map((p) => (
          <Panel key={p.company_id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CoLink id={p.company_id} slug={p.slug} name={p.company_name} />
              <div className="flex items-center gap-3 text-[0.75rem]">
                <span className="text-[var(--faint)]">
                  Signal {p.signal_rec}
                </span>
                <span className={cn("label-caps", twinClass(p.predicted))}>
                  Twin {p.predicted.replace("_", " ")}
                </span>
                <span className="mono">{p.twin_score}</span>
              </div>
            </div>
            <p className="mt-2 text-[0.8125rem] text-[var(--muted)]">
              {p.rationale}
            </p>
            {p.dimension_tensions.length > 0 && (
              <ul className="mt-2 space-y-1 text-[0.7rem] text-[var(--faint)]">
                {p.dimension_tensions.map((t) => (
                  <li key={t.dim}>
                    - {t.dim}={Math.round(t.signal)}: {t.twin_bias}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}

function RefsTab({ rows }: { rows: ReferenceCall[] }) {
  const [open, setOpen] = useState(rows[0]?.company_id || "");
  const active = rows.find((r) => r.company_id === open) || rows[0];

  if (!rows.length) {
    return (
      <EmptyState>
        No reference packs. Need Deep Dive names to script calls.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.4fr_1fr]">
      <div className="space-y-2">
        {rows.map((r) => (
          <button
            key={r.company_id}
            type="button"
            onClick={() => setOpen(r.company_id)}
            className={cn(
              "w-full rounded-[var(--radius)] border px-3 py-2.5 text-left text-[0.875rem] transition",
              active?.company_id === r.company_id
                ? "border-[var(--signal)] bg-[var(--panel-elevated)]"
                : "border-[var(--line)] hover:border-[var(--ink-soft)]",
            )}
          >
            <div className="font-medium">{r.company_name}</div>
            <div className="mt-0.5 text-[0.7rem] text-[var(--faint)]">
              Thesis {r.thesis_score}
            </div>
          </button>
        ))}
      </div>
      {active && (
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Eyebrow>Call factory</Eyebrow>
              <h3 className="mt-1 text-[1.15rem]">
                <CoLink
                  id={active.company_id}
                  slug={active.slug}
                  name={active.company_name}
                />
              </h3>
            </div>
            <CopyBtn text={active.markdown} label="Copy script" />
          </div>
          <p className="mt-3 text-[0.875rem] leading-relaxed text-[var(--muted)]">
            {active.opener}
          </p>
          <div className="mt-5">
            <div className="label-caps">Who to call</div>
            <ul className="mt-2 space-y-2">
              {active.targets.map((t) => (
                <li key={t.kind} className="text-[0.8125rem]">
                  <span className="font-medium">{t.label}</span>
                  <span className="text-[var(--faint)]">: {t.why}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-5">
            <div className="label-caps">Questions</div>
            <ol className="mt-2 list-decimal space-y-3 pl-4">
              {active.questions.map((q) => (
                <li key={q.q} className="text-[0.875rem]">
                  <div>{q.q}</div>
                  <div className="mt-1 text-[0.75rem] text-[var(--faint)]">
                    Probe: {q.probes}
                  </div>
                </li>
              ))}
            </ol>
          </div>
          {active.landmines.length > 0 && (
            <div className="mt-5">
              <div className="label-caps text-[var(--danger)]">Landmines</div>
              <ul className="mt-2 space-y-1 text-[0.8125rem] text-[var(--muted)]">
                {active.landmines.map((l) => (
                  <li key={l}>- {l}</li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

const WEIGHT_KEYS: { key: keyof WhatIfWeights; label: string }[] = [
  { key: "thesis_fit", label: "Thesis fit" },
  { key: "team_quality", label: "Team" },
  { key: "cap_table", label: "Cap table" },
  { key: "traction", label: "Traction" },
  { key: "moat", label: "Moat" },
  { key: "valuation", label: "Valuation" },
  { key: "runway", label: "Runway" },
  { key: "tam_exit", label: "TAM / exit" },
  { key: "timing", label: "Timing" },
];

function WhatIfTab({
  weights,
  setWeights,
  result,
}: {
  weights: WhatIfWeights;
  setWeights: (w: WhatIfWeights) => void;
  result: ReturnType<typeof runWhatIf>;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Panel>
        <Eyebrow>Reweight thesis</Eyebrow>
        <p className="mt-2 text-[0.8125rem] text-[var(--muted)]">
          Drag weights and Signal reranks instantly. No silent fine tune; this
          is a partner workshop tool.
        </p>
        <div className="mt-5 space-y-4">
          {WEIGHT_KEYS.map(({ key, label }) => (
            <label key={key} className="block">
              <div className="mb-1 flex justify-between text-[0.75rem]">
                <span>{label}</span>
                <span className="mono text-[var(--faint)]">
                  {(weights[key] * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                step={1}
                value={Math.round(weights[key] * 100)}
                onChange={(e) =>
                  setWeights({
                    ...weights,
                    [key]: Number(e.target.value) / 100,
                  })
                }
                className="w-full accent-[var(--signal)]"
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-ghost mt-4 text-[0.75rem]"
          onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}
        >
          Reset to policy
        </button>
        <p className="mt-4 text-[0.8125rem] font-medium">{result.counsel}</p>
      </Panel>
      <div className="space-y-4">
        {(result.entered_deep_dive.length > 0 ||
          result.exited_deep_dive.length > 0) && (
          <Panel>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="label-caps text-[var(--signal)]">
                  Enter Deep Dive
                </div>
                <ul className="mt-2 space-y-1 text-[0.8125rem]">
                  {result.entered_deep_dive.map((r) => (
                    <li key={r.company_id}>
                      <CoLink
                        id={r.company_id}
                        slug={r.slug}
                        name={r.company_name}
                      />{" "}
                      <span className="mono text-[var(--faint)]">
                        {r.base_score}
                        {" -> "}
                        {r.new_score}
                      </span>
                    </li>
                  ))}
                  {!result.entered_deep_dive.length && (
                    <li className="text-[var(--faint)]">None</li>
                  )}
                </ul>
              </div>
              <div>
                <div className="label-caps text-[var(--danger)]">
                  Exit Deep Dive
                </div>
                <ul className="mt-2 space-y-1 text-[0.8125rem]">
                  {result.exited_deep_dive.map((r) => (
                    <li key={r.company_id}>
                      <CoLink
                        id={r.company_id}
                        slug={r.slug}
                        name={r.company_name}
                      />{" "}
                      <span className="mono text-[var(--faint)]">
                        {r.base_score}
                        {" -> "}
                        {r.new_score}
                      </span>
                    </li>
                  ))}
                  {!result.exited_deep_dive.length && (
                    <li className="text-[var(--faint)]">None</li>
                  )}
                </ul>
              </div>
            </div>
          </Panel>
        )}
        <Panel padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.8125rem]">
              <thead>
                <tr className="border-b border-[var(--line)] text-[0.7rem] text-[var(--faint)]">
                  <th className="px-4 py-2 font-medium">Company</th>
                  <th className="px-2 py-2 font-medium">Base</th>
                  <th className="px-2 py-2 font-medium">New</th>
                  <th className="px-2 py-2 font-medium">Delta</th>
                  <th className="px-4 py-2 font-medium">Rec</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.slice(0, 15).map((r) => (
                  <tr
                    key={r.company_id}
                    className={cn(
                      "border-b border-[var(--line)] last:border-0",
                      r.flipped && "bg-[var(--panel-elevated)]",
                    )}
                  >
                    <td className="px-4 py-2">
                      <CoLink
                        id={r.company_id}
                        slug={r.slug}
                        name={r.company_name}
                      />
                    </td>
                    <td className="mono px-2 py-2">{r.base_score}</td>
                    <td className="mono px-2 py-2">{r.new_score}</td>
                    <td
                      className={cn(
                        "mono px-2 py-2",
                        r.delta > 0
                          ? "text-[var(--signal)]"
                          : r.delta < 0
                            ? "text-[var(--danger)]"
                            : "",
                      )}
                    >
                      {r.delta > 0 ? "+" : ""}
                      {r.delta}
                    </td>
                    <td className="px-4 py-2">
                      {r.flipped ? (
                        <span>
                          {r.base_rec}
                          {" -> "}
                          <strong>{r.new_rec}</strong>
                        </span>
                      ) : (
                        r.new_rec
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function VelocityTab({ rows }: { rows: VelocityDeal[] }) {
  return (
    <div className="space-y-3">
      {rows.map((v, i) => {
        const href = companyPath({ id: v.company_id, slug: v.slug });
        const body = (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="mono text-[var(--faint)]">{i + 1}</span>
              <div>
                <div className="font-medium">{v.company_name}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-[0.7rem] text-[var(--faint)]">
                  {v.drivers.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <RecBadge rec={v.recommendation} />
              <div className="text-right">
                <div className="mono text-[1.15rem] text-[var(--signal)]">
                  {v.velocity}
                </div>
                <div className="stat-label">Velocity</div>
              </div>
            </div>
          </div>
        );
        return (
          <Panel key={v.company_id} className="!p-0 overflow-hidden">
            {href ? (
              <Link
                href={href}
                className="block px-5 py-4 transition hover:bg-white/[0.03] [&_.font-medium]:hover:text-[var(--signal)]"
              >
                {body}
              </Link>
            ) : (
              <div className="px-5 py-4">{body}</div>
            )}
          </Panel>
        );
      })}
      {!rows.length && (
        <EmptyState>
          No accelerants. Waiting on fresh signals / commentary.
        </EmptyState>
      )}
    </div>
  );
}

function AutopsyTab({ rows }: { rows: PassAutopsy[] }) {
  return (
    <div className="space-y-4">
      {rows.map((a) => (
        <Panel key={a.company_id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div
                className={cn(
                  "label-caps",
                  a.regret_risk === "high"
                    ? "text-[var(--danger)]"
                    : a.regret_risk === "medium"
                      ? "text-[var(--warn)]"
                      : "text-[var(--muted)]",
                )}
              >
                Regret {a.regret_risk}
                {a.reopen ? " | reopen" : ""}
              </div>
              <h3 className="mt-1 text-[1.05rem]">
                <CoLink id={a.company_id} slug={a.slug} name={a.company_name} />
              </h3>
            </div>
            <div className="mono text-[1.1rem]">{a.autopsy_score}</div>
          </div>
          <p className="mt-3 text-[0.875rem] leading-relaxed">{a.lesson}</p>
          <ul className="mt-3 space-y-1 text-[0.75rem] text-[var(--faint)]">
            {a.evidence.map((e) => (
              <li key={e}>- {e}</li>
            ))}
          </ul>
        </Panel>
      ))}
      {!rows.length && (
        <EmptyState>
          Clean Pass book. No Passes with peer/Tier-1 tension worth autopsy.
        </EmptyState>
      )}
    </div>
  );
}

function PreMortemTab({ rows }: { rows: PreMortem[] }) {
  const [open, setOpen] = useState(rows[0]?.company_id || "");
  const active = rows.find((r) => r.company_id === open) || rows[0];

  if (!rows.length) {
    return (
      <EmptyState>No pre mortems. Need Deep Dives to stress fail.</EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {rows.map((r) => (
          <button
            key={r.company_id}
            type="button"
            className={cn(
              "rounded-[var(--radius)] border px-3 py-1.5 text-[0.8125rem]",
              active?.company_id === r.company_id
                ? "border-[var(--signal)]"
                : "border-[var(--line)]",
            )}
            onClick={() => setOpen(r.company_id)}
          >
            {r.company_name}
          </button>
        ))}
      </div>
      {active && (
        <Panel>
          <Eyebrow>Assume we lost</Eyebrow>
          <h3 className="mt-2 text-[1.15rem]">
            <CoLink
              id={active.company_id}
              slug={active.slug}
              name={active.company_name}
            />
          </h3>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-[var(--muted)]">
            {active.premise}
          </p>
          <p className="mt-3 text-[0.8125rem] font-medium text-[var(--warn)]">
            {active.ic_line}
          </p>
          <div className="mt-6 space-y-4">
            {active.failure_modes.map((f, i) => (
              <div
                key={f.mode}
                className="border-b border-[var(--line)] pb-4 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="mono text-[var(--faint)]">{i + 1}</span>
                  <span
                    className={cn(
                      "label-caps",
                      f.probability === "high"
                        ? "text-[var(--danger)]"
                        : f.probability === "medium"
                          ? "text-[var(--warn)]"
                          : "text-[var(--muted)]",
                    )}
                  >
                    {f.probability}
                  </span>
                </div>
                <div className="mt-1 font-medium">{f.mode}</div>
                <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                  Early warning: {f.early_warning}
                </p>
                <p className="mt-1 text-[0.8125rem]">Hedge: {f.hedge}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
