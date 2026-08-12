"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  buildAiOsPack,
  type AgentNode,
  type AlphaSignal,
  type AutopilotHit,
  type ConvictionSim,
  type Lookalike,
  type WarRoom,
} from "@/lib/aiOs";
import { Eyebrow, EmptyState, Panel, SegItem, Segmented, Stat } from "@/components/ui";
import type {
  AlertItem,
  Commentary,
  Company,
  NewsItem,
  PeerActivity,
  SectorCall,
} from "@/lib/types";
import { cn, fmtMoneyM } from "@/lib/utils";

type Tab = "fleet" | "war" | "feed" | "conviction" | "autopilot";

const TABS: { id: Tab; label: string }[] = [
  { id: "fleet", label: "Agent fleet" },
  { id: "war", label: "War room" },
  { id: "feed", label: "Alpha feed" },
  { id: "conviction", label: "Conviction" },
  { id: "autopilot", label: "Autopilot" },
];

function statusTone(s: AgentNode["status"]) {
  if (s === "alert") return "text-[var(--danger)]";
  if (s === "standby") return "text-[var(--faint)]";
  return "text-[var(--ok)]";
}

function sevTone(s: AlphaSignal["severity"]) {
  if (s === "critical") return "text-[var(--danger)]";
  if (s === "high") return "text-[var(--warn)]";
  if (s === "medium") return "text-[var(--deep)]";
  return "text-[var(--faint)]";
}

function consensusTone(c: WarRoom["consensus"]) {
  if (c === "invest") return "text-[var(--ok)]";
  if (c === "pass") return "text-[var(--danger)]";
  if (c === "split") return "text-[var(--warn)]";
  return "text-[var(--muted)]";
}

function stanceTone(s: string) {
  if (s === "invest") return "text-[var(--ok)]";
  if (s === "pass") return "text-[var(--danger)]";
  if (s === "stress") return "text-[var(--warn)]";
  return "text-[var(--deep)]";
}

function FleetPanel({ agents }: { agents: AgentNode[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 stagger">
      {agents.map((a, i) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <Panel className="h-full">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="label-caps text-[var(--signal)]">{a.role}</div>
                <h3 className="title mt-1.5 text-[1.2rem]">{a.name}</h3>
              </div>
              <span className={cn("label-caps", statusTone(a.status))}>{a.status}</span>
            </div>
            <p className="mt-3 text-[0.875rem] leading-relaxed text-[var(--muted)]">{a.job}</p>
            <div className="mt-4 border-t border-[var(--line)] pt-3">
              <div className="text-[0.8125rem] text-[var(--text)]">{a.last_action}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.7rem] text-[var(--faint)]">
                <span className="mono">{a.throughput}</span>
                <span>·</span>
                <span>{a.inspired_by}</span>
              </div>
            </div>
          </Panel>
        </motion.div>
      ))}
    </div>
  );
}

function WarPanel({ rooms }: { rooms: WarRoom[] }) {
  const [activeId, setActiveId] = useState(rooms[0]?.company.id || "");
  const active = rooms.find((r) => r.company.id === activeId) || rooms[0];

  if (!rooms.length) return <EmptyState>No Deep Dive deals to contest yet.</EmptyState>;

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.4fr]">
      <div className="space-y-2">
        {rooms.map((r) => (
          <button
            key={r.company.id}
            type="button"
            onClick={() => setActiveId(r.company.id)}
            className={cn(
              "w-full rounded-[10px] border px-4 py-3.5 text-left transition",
              active?.company.id === r.company.id
                ? "border-[var(--line-hover)] bg-[var(--signal-dim)]"
                : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--line-strong)]",
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{r.company.name}</span>
              <span className="mono text-[var(--signal)]">{r.contested_score}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[0.75rem]">
              <span className={consensusTone(r.consensus)}>{r.consensus}</span>
              <span className="text-[var(--faint)]">Δ{r.disagreement_index}</span>
            </div>
          </button>
        ))}
      </div>

      {active ? (
        <div className="space-y-4">
          <Panel className="border-[var(--signal)]/30">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Eyebrow live>Multi-agent contested score</Eyebrow>
                <h3 className="display mt-2 text-[2rem]">{active.company.name}</h3>
                <p className="mt-2 max-w-xl text-[0.95rem] leading-relaxed text-[var(--muted)]">
                  {active.synthesis}
                </p>
              </div>
              <div className="text-right">
                <div className="mono text-[2.5rem] leading-none text-[var(--signal)]">
                  {active.contested_score}
                </div>
                <div className={cn("label-caps mt-2", consensusTone(active.consensus))}>
                  {active.consensus}
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-6 border-t border-[var(--line)] pt-4">
              <Stat value={`Δ${active.disagreement_index}`} label="Disagreement" />
              <Stat
                value={active.votes.filter((v) => v.stance === "invest").length}
                label="Invest votes"
              />
              <Stat
                value={active.votes.filter((v) => v.stance === "pass" || v.stance === "stress").length}
                label="Pass / stress"
              />
            </div>
            <p className="mt-4 text-[0.875rem] font-medium text-[var(--text)]">
              Next: {active.next_move}
            </p>
          </Panel>

          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {active.votes.map((v, i) => (
                <motion.div
                  key={v.agent_id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Panel className="h-full !p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="label-caps text-[var(--faint)]">{v.role}</span>
                      <span className={cn("label-caps", stanceTone(v.stance))}>
                        {v.stance} · {v.score}
                      </span>
                    </div>
                    <div className="mt-2 font-semibold">{v.agent_name}</div>
                    <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--muted)]">
                      {v.thesis}
                    </p>
                    <ul className="mt-3 space-y-1.5 text-[0.75rem] text-[var(--faint)]">
                      {v.evidence.map((e) => (
                        <li key={e} className="flex gap-1.5">
                          <span className="text-[var(--signal)]">›</span>
                          <span>{e}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-[0.75rem] text-[var(--text)]/80">{v.kill_or_win}</p>
                  </Panel>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <Panel>
            <div className="label-caps text-[var(--warn)]">Open questions</div>
            <ul className="mt-3 space-y-2 text-[0.875rem]">
              {active.open_questions.map((q) => (
                <li key={q} className="flex gap-2">
                  <span className="text-[var(--warn)]">›</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/company/${active.company.id}`} className="btn btn-primary !py-1.5 !text-[0.8125rem]">
                Full brief
              </Link>
              <Link href="/meeting" className="btn btn-ghost !py-1.5 !text-[0.8125rem]">
                Add to agenda
              </Link>
            </div>
            <p className="mt-3 text-[0.7rem] text-[var(--faint)]">{active.provenance}</p>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

function FeedPanel({ feed }: { feed: AlphaSignal[] }) {
  const [cat, setCat] = useState<AlphaSignal["category"] | "all">("all");
  const cats = ["all", "Thesis", "Liquidity", "Hiring", "Peer", "People", "Business", "Research", "M&A"] as const;
  const visible = cat === "all" ? feed : feed.filter((f) => f.category === cat);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {cats.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={cn(
              "rounded-[8px] px-3 py-1.5 text-[0.8125rem] font-medium transition",
              cat === c
                ? "bg-[var(--signal)] text-[var(--signal-ink)]"
                : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]",
            )}
          >
            {c === "all" ? "All" : c}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {visible.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.4) }}
          >
            <Panel className="!p-4" interactive>
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip text-[0.7rem]">{f.category}</span>
                <span className={cn("label-caps", sevTone(f.severity))}>{f.severity}</span>
                <span className="ml-auto text-[0.7rem] text-[var(--faint)]">{f.age_label}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[0.975rem] font-semibold">{f.title}</h3>
                {f.company_id ? (
                  <Link href={`/company/${f.company_id}`} className="link-quiet text-[0.8125rem]">
                    Open →
                  </Link>
                ) : null}
              </div>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--muted)]">{f.body}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-[0.75rem] text-[var(--faint)]">
                <span>
                  Route: <span className="text-[var(--signal)]">{f.route_to}</span>
                </span>
                <span>confidence {f.confidence}</span>
                <span className="mono">{f.provenance}</span>
              </div>
            </Panel>
          </motion.div>
        ))}
        {!visible.length && <EmptyState>No signals in this category.</EmptyState>}
      </div>
    </div>
  );
}

function ConvictionPanel({ sims }: { sims: ConvictionSim[] }) {
  const [id, setId] = useState(sims[0]?.company.id || "");
  const sim = sims.find((s) => s.company.id === id) || sims[0];
  if (!sims.length) return <EmptyState>No conviction models yet.</EmptyState>;

  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.45fr]">
      <div className="space-y-2">
        {sims.map((s) => (
          <button
            key={s.company.id}
            type="button"
            onClick={() => setId(s.company.id)}
            className={cn(
              "w-full rounded-[10px] border px-4 py-3 text-left transition",
              sim?.company.id === s.company.id
                ? "border-[var(--line-hover)] bg-[var(--deep-dim)]"
                : "border-[var(--line)] bg-[var(--panel)]",
            )}
          >
            <div className="flex justify-between gap-2">
              <span className="font-semibold">{s.company.name}</span>
              <span className="mono text-[var(--deep)]">{s.pw_moic}×</span>
            </div>
            <div className="mt-1 text-[0.75rem] text-[var(--faint)]">{s.pw_irr_proxy}</div>
          </button>
        ))}
      </div>
      {sim ? (
        <div className="space-y-4">
          <Panel>
            <Eyebrow>Probability-weighted MOIC</Eyebrow>
            <h3 className="display mt-2 text-[2rem]">{sim.company.name}</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Stat value={`${sim.pw_moic}×`} label="pwMOIC" tone="deep" />
              <Stat value={fmtMoneyM(sim.entry_valuation_m)} label="Entry" />
              <Stat value={`${sim.ownership_pct}%`} label="Illustrative ownership" />
            </div>
            <p className="mt-4 text-[0.9rem] text-[var(--muted)]">{sim.gate}</p>
            <p className="mt-2 text-[0.7rem] text-[var(--faint)]">
              {sim.provenance} · confidence {sim.confidence}
            </p>
          </Panel>
          <div className="grid gap-3 sm:grid-cols-2">
            {sim.buckets.map((b) => (
              <Panel key={b.label} className="!p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[0.875rem] font-semibold">{b.label}</span>
                  <span className="mono text-[var(--signal)]">{b.probability}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
                  <motion.div
                    className="h-full rounded-full bg-[var(--signal)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${b.probability}%` }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <p className="mt-2 text-[0.75rem] text-[var(--muted)]">
                  {b.multiple} · {b.narrative}
                </p>
              </Panel>
            ))}
          </div>
          <Panel>
            <div className="space-y-3 text-[0.875rem]">
              <div>
                <span className="label-caps text-[var(--ok)]">Bull</span>
                <p className="mt-1 text-[var(--muted)]">{sim.bull_path}</p>
              </div>
              <div>
                <span className="label-caps text-[var(--deep)]">Base</span>
                <p className="mt-1 text-[var(--muted)]">{sim.base_path}</p>
              </div>
              <div>
                <span className="label-caps text-[var(--danger)]">Bear</span>
                <p className="mt-1 text-[var(--muted)]">{sim.bear_path}</p>
              </div>
            </div>
            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <div className="label-caps">Sensitivity</div>
              <ul className="mt-2 space-y-1.5 text-[0.8125rem] text-[var(--faint)]">
                {sim.sensitivity.map((s) => (
                  <li key={s.lever}>
                    <span className="text-[var(--text)]">{s.lever}</span> — {s.effect}
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

function AutopilotPanel({
  hits,
  lookalikes,
}: {
  hits: AutopilotHit[];
  lookalikes: Lookalike[];
}) {
  const [filter, setFilter] = useState<AutopilotHit["action"] | "all">("all");
  const visible = filter === "all" ? hits : hits.filter((h) => h.action === filter);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "Deep Dive", "Watch", "Pass", "Kind no"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-[8px] px-3 py-1.5 text-[0.8125rem] font-medium transition",
                filter === f
                  ? "bg-[var(--signal)] text-[var(--signal-ink)]"
                  : "border border-[var(--line)] text-[var(--muted)]",
              )}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {visible.map((h) => (
            <Panel key={h.company.id} className="!p-4" interactive>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link href={`/company/${h.company.id}`} className="text-[1rem] font-semibold hover:text-[var(--signal)]">
                    {h.company.name}
                  </Link>
                  <div className="mt-0.5 text-[0.75rem] text-[var(--faint)]">
                    {h.company.sector_theme} · {h.company.stage} · thesis match {h.thesis_match}
                  </div>
                </div>
                <div className="text-right">
                  <div className="mono text-[1.25rem] text-[var(--signal)]">{h.auto_score}</div>
                  <div className="label-caps mt-0.5 text-[var(--muted)]">{h.action}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem]">
                {h.reasons.map((r) => (
                  <span key={r} className="text-[var(--ok)]">
                    + {r}
                  </span>
                ))}
                {h.blockers.map((b) => (
                  <span key={b} className="text-[var(--warn)]">
                    ! {b}
                  </span>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </div>

      <div>
        <Eyebrow>Lookalike outbound</Eyebrow>
        <h3 className="title mt-2 text-[1.4rem]">Deals you wish you&apos;d seen earlier</h3>
        <p className="body-muted mt-1.5 max-w-2xl">
          VCOS Flow-style twins from Hot Deals — source the rhyme before peer FOMO.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {lookalikes.map((l) => (
            <Panel key={l.seed.id}>
              <div className="label-caps text-[var(--deep)]">Seed · {l.seed.name}</div>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--muted)]">
                {l.outbound_angle}
              </p>
              <div className="mt-4 space-y-3">
                {l.twins.map((t) => (
                  <div key={t.company.id} className="border-t border-[var(--line)] pt-3">
                    <div className="flex justify-between gap-2">
                      <Link href={`/company/${t.company.id}`} className="font-semibold hover:text-[var(--signal)]">
                        {t.company.name}
                      </Link>
                      <span className="mono text-[var(--signal)]">{t.similarity}%</span>
                    </div>
                    <p className="mt-1 text-[0.75rem] text-[var(--faint)]">{t.why}</p>
                  </div>
                ))}
                {!l.twins.length && <EmptyState>No twins above similarity floor.</EmptyState>}
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AiOs({
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
  const [tab, setTab] = useState<Tab>("war");
  const [copied, setCopied] = useState(false);

  const pack = useMemo(
    () => buildAiOsPack({ companies, peers, commentary, news, alerts, sectors }),
    [companies, peers, commentary, news, alerts, sectors],
  );

  async function copyBrief() {
    await navigator.clipboard.writeText(pack.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-6">
      <Panel className="overflow-hidden !p-0">
        <div className="px-5 py-6 md:px-8 md:py-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow live>AI OS</Eyebrow>
              <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-[var(--muted)]">
                {pack.headline}
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={copyBrief}>
              {copied ? "Copied" : "Copy OS brief"}
            </button>
          </div>
          <div className="mt-6 flex flex-wrap gap-6 border-t border-[var(--line)] pt-5">
            <Stat value={pack.agents.filter((a) => a.status === "active").length} label="Agents live" />
            <Stat
              value={pack.feed.filter((f) => f.severity === "critical" || f.severity === "high").length}
              label="Hot signals"
              tone="deep"
            />
            <Stat
              value={pack.war_rooms.filter((w) => w.consensus === "split").length}
              label="Split rooms"
            />
            <Stat
              value={pack.autopilot.filter((a) => a.action === "Deep Dive").length}
              label="Autopilot Deep Dive"
            />
          </div>
        </div>
      </Panel>

      <Segmented aria-label="AI OS modules" className="seg-scroll">
        {TABS.map((t) => (
          <SegItem key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </SegItem>
        ))}
      </Segmented>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {tab === "fleet" && <FleetPanel agents={pack.agents} />}
          {tab === "war" && <WarPanel rooms={pack.war_rooms} />}
          {tab === "feed" && <FeedPanel feed={pack.feed} />}
          {tab === "conviction" && <ConvictionPanel sims={pack.conviction} />}
          {tab === "autopilot" && (
            <AutopilotPanel hits={pack.autopilot} lookalikes={pack.lookalikes} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
