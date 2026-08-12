"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  Crosshair,
  Eye,
  Flame,
  Hourglass,
  Lock,
  Sparkles,
  Target,
  Timer,
  Zap,
} from "lucide-react";
import { CompanyLink } from "@/components/EntityLink";
import {
  EmptyState,
  Eyebrow,
  HeroSurface,
  Panel,
  RecBadge,
  SegItem,
  Segmented,
} from "@/components/ui";
import { GaugeChart } from "@/components/charts";
import {
  buildForgePack,
  moveKindLabel,
  type BlindSpot,
  type ForgePack,
  type MondayMove,
  type RaiseClock,
  type WinMove,
  type WinReality,
} from "@/lib/forge";
import {
  commitForgeMove,
  isForgeCommitted,
  loadForgeCommits,
  type ForgeCommit,
} from "@/lib/forgeStore";
import type {
  AlertItem,
  Commentary,
  Company,
  PeerActivity,
  SectorCall,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "moves" | "win" | "attention" | "raises" | "blinds" | "brief";

const TABS: { id: Tab; label: string }[] = [
  { id: "moves", label: "Monday Moves" },
  { id: "win", label: "Win Reality" },
  { id: "attention", label: "Attention Capital" },
  { id: "raises", label: "Raise Clock" },
  { id: "blinds", label: "Blind Spots" },
  { id: "brief", label: "Brief" },
];

function moveTone(m: WinMove) {
  if (m === "sprint") return "text-[var(--signal)]";
  if (m === "secure_allocation") return "text-[var(--ok)]";
  if (m === "find_warm_path") return "text-[var(--warn)]";
  if (m === "pass_politely") return "text-[var(--danger)]";
  return "text-[var(--muted)]";
}

function moveBadge(m: WinMove) {
  if (m === "sprint") return "Sprint";
  if (m === "secure_allocation") return "Secure seat";
  if (m === "find_warm_path") return "Need path";
  if (m === "pass_politely") return "Pass";
  return "Watch";
}

function urgencyTone(u: RaiseClock["urgency"]) {
  if (u === "imminent") return "text-[var(--danger)]";
  if (u === "this_quarter") return "text-[var(--warn)]";
  return "text-[var(--muted)]";
}

function severityTone(s: BlindSpot["severity"]) {
  if (s === "critical") return "text-[var(--danger)]";
  if (s === "high") return "text-[var(--warn)]";
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

function ForceBar({ label, score, note }: { label: string; score: number; note: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-[0.75rem]">
        <span className="font-medium text-[var(--text)]">{label}</span>
        <span className="mono text-[var(--muted)]">{score}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--soft)]">
        <motion.div
          className="h-full rounded-full bg-[var(--signal)]"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p className="text-[0.7rem] leading-snug text-[var(--muted)]">{note}</p>
    </div>
  );
}

function WinCard({ w, selected, onSelect }: { w: WinReality; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-[var(--radius-lg)] border p-4 text-left transition",
        selected
          ? "border-[var(--signal)] bg-[var(--signal-dim)] shadow-[var(--shadow-panel)]"
          : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--line-hover)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{w.company_name}</span>
            <RecBadge rec={w.recommendation} />
          </div>
          <p className="mt-1 text-[0.8rem] leading-snug text-[var(--muted)]">{w.headline}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="mono text-[1.25rem] font-semibold text-[var(--signal)]">{w.win_prob}%</div>
          <div className={cn("mt-0.5 text-[0.7rem] font-semibold uppercase tracking-wide", moveTone(w.move))}>
            {moveBadge(w.move)}
          </div>
        </div>
      </div>
    </button>
  );
}

function MoveCard({
  move,
  committed,
  onCommit,
}: {
  move: MondayMove;
  committed: boolean;
  onCommit: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: move.rank * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-xl)] border p-5 md:p-6",
        committed
          ? "border-[var(--ok)] bg-[var(--ok-dim)]"
          : "border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-panel)]",
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-40"
        style={{
          background:
            move.rank === 1
              ? "radial-gradient(circle, color-mix(in srgb, var(--signal) 45%, transparent), transparent 70%)"
              : "radial-gradient(circle, color-mix(in srgb, var(--warn) 30%, transparent), transparent 70%)",
        }}
      />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--signal-dim)] mono text-[0.875rem] font-semibold text-[var(--signal)]">
            {move.rank}
          </span>
          <div>
            <div className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">
              {moveKindLabel(move.kind)}
            </div>
            <h3 className="mt-0.5 text-[1.05rem] font-semibold leading-snug">{move.title}</h3>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[0.75rem] text-[var(--muted)]">
          <span className="rounded-md bg-[var(--soft)] px-2 py-1 mono">{move.hours}h</span>
          {move.win_prob != null ? (
            <span className="rounded-md bg-[var(--signal-dim)] px-2 py-1 mono text-[var(--signal)]">
              win {move.win_prob}%
            </span>
          ) : null}
        </div>
      </div>
      <p className="relative mt-3 text-[0.875rem] leading-relaxed text-[var(--muted)]">{move.why}</p>
      <p className="relative mt-2 flex items-start gap-1.5 text-[0.75rem] text-[var(--faint)]">
        <Lock className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2} />
        <span>{move.irreversible}</span>
      </p>
      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        <Link href={move.href} className="btn btn-soft btn-sm">
          Open
        </Link>
        <button
          type="button"
          className={cn("btn btn-sm", committed ? "btn-ghost" : "btn-primary")}
          disabled={committed}
          onClick={onCommit}
        >
          {committed ? "Committed" : "Commit move"}
        </button>
      </div>
    </motion.div>
  );
}

export function SignalForge({
  companies,
  peers,
  commentary,
  sectors,
  alerts,
}: {
  companies: Company[];
  peers: PeerActivity[];
  commentary: Commentary[];
  sectors: SectorCall[];
  alerts: AlertItem[];
}) {
  const [tab, setTab] = useState<Tab>("moves");
  const [commits, setCommits] = useState<ForgeCommit[]>([]);
  const [selectedWinId, setSelectedWinId] = useState<string | null>(null);

  const pack: ForgePack = useMemo(
    () =>
      buildForgePack({
        companies,
        peers,
        commentary,
        sectors,
        alerts,
      }),
    [companies, peers, commentary, sectors, alerts],
  );

  useEffect(() => {
    setCommits(loadForgeCommits());
  }, []);

  useEffect(() => {
    if (!selectedWinId && pack.win_realities[0]) {
      setSelectedWinId(pack.win_realities[0].company_id);
    }
  }, [pack.win_realities, selectedWinId]);

  const selectedWin =
    pack.win_realities.find((w) => w.company_id === selectedWinId) ||
    pack.win_realities[0];

  return (
    <div className="space-y-[var(--section-gap)]">
      <HeroSurface>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <Eyebrow live>Forge · Decision physics</Eyebrow>
            <h2 className="display mt-3 text-[clamp(1.35rem,3.2vw,1.85rem)] leading-tight tracking-tight">
              {pack.headline}
            </h2>
            <p className="mt-2.5 max-w-xl text-[0.925rem] leading-relaxed text-[var(--muted)]">
              {pack.subhead}
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-[0.8rem] font-medium text-[var(--text)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--signal)]" strokeWidth={1.75} />
              {pack.punchline}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Avg win", value: `${pack.kpis.avg_win_prob}%`, icon: Target },
              { label: "Sprints", value: String(pack.kpis.sprint_count), icon: Flame },
              { label: "Raises", value: String(pack.kpis.imminent_raises), icon: Timer },
              { label: "Free hrs", value: String(pack.kpis.free_hours), icon: Hourglass },
            ].map((k) => (
              <div
                key={k.label}
                className="min-w-[5.5rem] rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5"
              >
                <div className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--faint)]">
                  <k.icon className="h-3 w-3" strokeWidth={2} />
                  {k.label}
                </div>
                <div className="mono mt-1 text-[1.15rem] font-semibold">{k.value}</div>
              </div>
            ))}
          </div>
        </div>
      </HeroSurface>

      <Segmented className="flex-wrap">
        {TABS.map((t) => (
          <SegItem key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </SegItem>
        ))}
      </Segmented>

      <AnimatePresence mode="wait">
        {tab === "moves" ? (
          <motion.div
            key="moves"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
            className="space-y-4"
          >
            <p className="text-[0.875rem] text-[var(--muted)]">
              Three irreversible partner moves before lunch. Commit writes to the local Forge ledger —
              not an email, not a CRM update.
            </p>
            {pack.monday_moves.length === 0 ? (
              <EmptyState>No moves — pipeline is quiet. Protect attention capital.</EmptyState>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {pack.monday_moves.map((m) => (
                  <MoveCard
                    key={m.id}
                    move={m}
                    committed={isForgeCommitted(m.id, commits)}
                    onCommit={() => setCommits(commitForgeMove(m))}
                  />
                ))}
              </div>
            )}
            {commits.length > 0 ? (
              <Panel className="!p-4">
                <h3 className="title text-[1rem]">Committed this week</h3>
                <ul className="mt-3 space-y-2">
                  {commits.slice(0, 6).map((c) => (
                    <li
                      key={`${c.move_id}-${c.committed_at}`}
                      className="flex flex-wrap items-center justify-between gap-2 text-[0.8125rem]"
                    >
                      <span className="font-medium">{c.title}</span>
                      <span className="text-[var(--faint)]">
                        {new Date(c.committed_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}
          </motion.div>
        ) : null}

        {tab === "win" ? (
          <motion.div
            key="win"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
            className="grid gap-5 lg:grid-cols-[1fr_1.1fr]"
          >
            <div className="space-y-2.5">
              <p className="mb-1 text-[0.875rem] text-[var(--muted)]">
                Win probability ≠ thesis score. Access, timing, check fit, and competition decide whether
                Thirdbase gets in.
              </p>
              {pack.win_realities.slice(0, 10).map((w) => (
                <WinCard
                  key={w.company_id}
                  w={w}
                  selected={selectedWin?.company_id === w.company_id}
                  onSelect={() => setSelectedWinId(w.company_id)}
                />
              ))}
            </div>
            {selectedWin ? (
              <Panel className="h-fit lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CompanyLink
                      id={selectedWin.company_id}
                      slug={selectedWin.slug}
                      name={selectedWin.company_name}
                      className="text-[1.1rem] font-semibold hover:text-[var(--signal)]"
                    >
                      {selectedWin.company_name}
                    </CompanyLink>
                    <p className="mt-1 text-[0.85rem] text-[var(--muted)]">{selectedWin.counsel}</p>
                  </div>
                  <div className="w-[7.5rem]">
                    <GaugeChart value={selectedWin.win_prob} label="Win %" />
                  </div>
                </div>
                <div className="mt-5 space-y-4">
                  {selectedWin.forces.map((f) => (
                    <ForceBar key={f.label} {...f} />
                  ))}
                </div>
                {selectedWin.peers_circling.length > 0 ? (
                  <p className="mt-4 text-[0.75rem] text-[var(--faint)]">
                    Peers: {selectedWin.peers_circling.join(" · ")}
                  </p>
                ) : (
                  <p className="mt-4 text-[0.75rem] text-[var(--signal)]">
                    No peers logged — proprietary window if the thesis holds.
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/company/${selectedWin.slug || selectedWin.company_id}`}
                    className="btn btn-primary btn-sm"
                  >
                    Open brief
                  </Link>
                  <Link href="/atlas" className="btn btn-soft btn-sm">
                    Warm paths
                  </Link>
                </div>
              </Panel>
            ) : null}
          </motion.div>
        ) : null}

        {tab === "attention" ? (
          <motion.div
            key="attention"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
            className="space-y-5"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Panel className="!p-5">
                <div className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">
                  Week budget
                </div>
                <div className="mono mt-2 text-[1.75rem] font-semibold">
                  {pack.attention.week_budget_hours}h
                </div>
                <p className="mt-1 text-[0.8rem] text-[var(--muted)]">Partner hours for sourcing + diligence</p>
              </Panel>
              <Panel className="!p-5">
                <div className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">
                  Allocated
                </div>
                <div className="mono mt-2 text-[1.75rem] font-semibold">
                  {pack.attention.allocated_hours}h
                </div>
                <p className="mt-1 text-[0.8rem] text-[var(--muted)]">
                  {pack.attention.utilization_pct}% utilization
                </p>
              </Panel>
              <Panel className="!p-5">
                <div className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">
                  Free slack
                </div>
                <div className="mono mt-2 text-[1.75rem] font-semibold text-[var(--signal)]">
                  {pack.attention.free_hours}h
                </div>
                <p className="mt-1 text-[0.8rem] text-[var(--muted)]">{pack.attention.counsel}</p>
              </Panel>
            </div>

            <Panel>
              <h3 className="title text-[1.05rem]">Hour allocation</h3>
              <div className="mt-4 space-y-4">
                {pack.attention.buckets.map((b) => (
                  <div key={b.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-[0.8125rem]">
                      <span className="font-semibold">{b.label}</span>
                      <span className="mono text-[var(--muted)]">
                        {b.hours}h · {b.pct}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--soft)]">
                      <motion.div
                        className={cn(
                          "h-full rounded-full",
                          b.tone === "over"
                            ? "bg-[var(--danger)]"
                            : b.id === "sprint"
                              ? "bg-[var(--signal)]"
                              : b.id === "drain"
                                ? "bg-[var(--warn)]"
                                : "bg-[color-mix(in_srgb,var(--signal)_55%,var(--muted))]",
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, b.pct)}%` }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    <p className="mt-1 text-[0.7rem] text-[var(--faint)]">{b.note}</p>
                  </div>
                ))}
              </div>
            </Panel>

            {pack.attention.misallocations.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {pack.attention.misallocations.map((m) => (
                  <Panel key={m.title} className="!p-4 border-[color-mix(in_srgb,var(--warn)_35%,var(--line))]">
                    <div className="flex items-start gap-2">
                      <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn)]" strokeWidth={1.75} />
                      <div>
                        <div className="font-semibold">{m.title}</div>
                        <p className="mt-1 text-[0.8rem] text-[var(--muted)]">{m.detail}</p>
                        <p className="mt-2 text-[0.8rem] font-medium text-[var(--signal)]">{m.fix}</p>
                      </div>
                    </div>
                  </Panel>
                ))}
              </div>
            ) : null}
          </motion.div>
        ) : null}

        {tab === "raises" ? (
          <motion.div
            key="raises"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
            className="space-y-3"
          >
            <p className="text-[0.875rem] text-[var(--muted)]">
              Raise clocks predict silent process before the banker blast — runway, peer heat, growth, and
              round cadence.
            </p>
            {pack.raise_clocks.length === 0 ? (
              <EmptyState>No clocks — not enough runway / round signals yet.</EmptyState>
            ) : (
              pack.raise_clocks.map((r, i) => (
                <motion.div
                  key={r.company_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Panel className="!p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <CompanyLink
                            id={r.company_id}
                            slug={r.slug}
                            name={r.company_name}
                            className="font-semibold hover:text-[var(--signal)]"
                          >
                            {r.company_name}
                          </CompanyLink>
                          <RecBadge rec={r.recommendation} />
                          <span
                            className={cn(
                              "text-[0.7rem] font-semibold uppercase tracking-wide",
                              urgencyTone(r.urgency),
                            )}
                          >
                            {r.urgency.replace("_", " ")}
                          </span>
                        </div>
                        <p className="mt-1 text-[0.85rem] text-[var(--muted)]">{r.counsel}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {r.signals.map((s) => (
                            <span
                              key={s}
                              className="rounded-md bg-[var(--soft)] px-2 py-0.5 text-[0.7rem] text-[var(--muted)]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mono text-[1.1rem] font-semibold">{r.clock_label}</div>
                        <div className="mt-0.5 text-[0.7rem] text-[var(--faint)]">
                          {r.confidence} confidence · score {r.thesis_score}
                        </div>
                      </div>
                    </div>
                  </Panel>
                </motion.div>
              ))
            )}
          </motion.div>
        ) : null}

        {tab === "blinds" ? (
          <motion.div
            key="blinds"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
            className="space-y-3"
          >
            <p className="text-[0.875rem] text-[var(--muted)]">
              Blind spots are thesis-fit names peers are touching that never made Hot Deals — the misses that
              haunt IC retros.
            </p>
            {pack.blind_spots.length === 0 ? (
              <EmptyState>
                No blind spots — peer activity is aligned with Hot Deals, or peers are quiet.
              </EmptyState>
            ) : (
              pack.blind_spots.map((b) => (
                <Panel key={b.company_id} className="!p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Eye
                        className={cn("mt-1 h-4 w-4 shrink-0", severityTone(b.severity))}
                        strokeWidth={1.75}
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <CompanyLink
                            id={b.company_id}
                            slug={b.slug}
                            name={b.company_name}
                            className="font-semibold hover:text-[var(--signal)]"
                          >
                            {b.company_name}
                          </CompanyLink>
                          <RecBadge rec={b.recommendation} />
                          <span
                            className={cn(
                              "text-[0.7rem] font-semibold uppercase tracking-wide",
                              severityTone(b.severity),
                            )}
                          >
                            {b.severity}
                          </span>
                        </div>
                        <p className="mt-1 text-[0.85rem] text-[var(--muted)]">{b.why_blind}</p>
                        <p className="mt-2 text-[0.8rem] font-medium text-[var(--signal)]">{b.action}</p>
                        <p className="mt-2 text-[0.75rem] text-[var(--faint)]">
                          Peers: {b.peer_firms.join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="mono text-[1.1rem] font-semibold text-[var(--warn)]">heat {b.heat}</div>
                  </div>
                </Panel>
              ))
            )}
          </motion.div>
        ) : null}

        {tab === "brief" ? (
          <motion.div
            key="brief"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
          >
            <Panel>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="title text-[1.05rem]">Forge brief (paste into Monday notes)</h3>
                <CopyBtn text={pack.markdown} label="Copy markdown" />
              </div>
              <pre className="mt-4 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-[var(--radius)] bg-[var(--soft)] p-4 text-[0.8rem] leading-relaxed text-[var(--text)]">
                {pack.markdown}
              </pre>
            </Panel>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Panel className="!p-4 md:!p-5">
        <div className="flex flex-wrap items-start gap-3">
          <Crosshair className="mt-0.5 h-4 w-4 shrink-0 text-[var(--signal)]" strokeWidth={1.75} />
          <div className="min-w-0 text-[0.85rem] leading-relaxed text-[var(--muted)]">
            <span className="font-semibold text-[var(--text)]">Why Forge exists. </span>
            Harmonic finds companies. Affinity finds warm paths. Auryn writes memos. Forge allocates the
            one resource partners cannot raise more of: attention — and only spends it where Thirdbase can
            win.
          </div>
        </div>
      </Panel>
    </div>
  );
}
