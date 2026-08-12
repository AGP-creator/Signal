"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart, DonutChart, GroupedBarChart, RadarChart } from "@/components/charts";
import { CompanyLink } from "@/components/EntityLink";
import {
  EmptyState,
  Eyebrow,
  Panel,
  RecBadge,
  SegItem,
  Segmented,
} from "@/components/ui";
import {
  buildGreatDealPack,
  formatGreatDealMarkdown,
  type CohortBoard,
  type DealGrade,
  type GreatDealCard,
} from "@/lib/greatDeal";
import type { Company } from "@/lib/types";
import { cn, fmtMoneyM, fmtPct } from "@/lib/utils";

type Tab = "outstanding" | "noise" | "cohorts" | "mix" | "inspect";

const TABS: { id: Tab; label: string }[] = [
  { id: "outstanding", label: "Outstanding" },
  { id: "noise", label: "Noise" },
  { id: "cohorts", label: "Cohorts" },
  { id: "mix", label: "Mix" },
  { id: "inspect", label: "Inspect" },
];

function gradeTone(g: DealGrade) {
  if (g === "outstanding") return "text-[var(--signal)]";
  if (g === "promising") return "text-[var(--ok)]";
  if (g === "noise") return "text-[var(--warn)]";
  return "text-[var(--muted)]";
}

function gradeChip(g: DealGrade) {
  if (g === "outstanding") return "chip chip-signal";
  if (g === "promising") return "chip chip-ok";
  if (g === "noise") return "chip chip-warn";
  return "chip";
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

function CoLink({ id, slug, name }: { id: string; slug?: string | null; name: string }) {
  return <CompanyLink id={id} slug={slug} name={name} className="font-medium" />;
}

export function GreatDealDesk({
  companies,
  compact,
}: {
  companies: Company[];
  /** Hide outer banner when embedded inside Venture Agent / another OS shell */
  compact?: boolean;
}) {
  const pack = useMemo(() => buildGreatDealPack(companies), [companies]);
  const [tab, setTab] = useState<Tab>("outstanding");
  const [focusId, setFocusId] = useState<string | null>(
    () => pack.outstanding[0]?.company_id || pack.cards[0]?.company_id || null,
  );

  const focus =
    pack.cards.find((c) => c.company_id === focusId) ||
    pack.outstanding[0] ||
    pack.cards[0] ||
    null;

  return (
    <div className="space-y-5">
      {!compact ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
            {[
              ["Outstanding", pack.summary.outstanding_count],
              ["Promising", pack.summary.promising_count],
              ["Noisy", pack.summary.noise_count],
              ["Cohorts", pack.summary.cohort_count],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-baseline gap-1.5">
                <span className="mono text-[1.05rem] font-semibold text-[var(--text)]">{value}</span>
                <span className="label-caps text-[var(--faint)]">{label}</span>
              </div>
            ))}
          </div>
          <CopyBtn text={formatGreatDealMarkdown(pack)} label="Copy brief" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[0.8125rem] text-[var(--muted)]">
            <span>
              <span className="mono text-[var(--text)]">{pack.summary.outstanding_count}</span> outstanding
            </span>
            <span>
              <span className="mono text-[var(--text)]">{pack.summary.noise_count}</span> noisy
            </span>
          </div>
          <CopyBtn text={formatGreatDealMarkdown(pack)} label="Copy brief" />
        </div>
      )}

      <Segmented aria-label="Great deal modes">
        {TABS.map((t) => (
          <SegItem key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </SegItem>
        ))}
      </Segmented>

      {tab === "outstanding" && (
        <OutstandingTab
          cards={[...pack.outstanding, ...pack.promising]}
          onInspect={(id) => {
            setFocusId(id);
            setTab("inspect");
          }}
        />
      )}
      {tab === "noise" && (
        <NoiseTab
          cards={pack.noise}
          onInspect={(id) => {
            setFocusId(id);
            setTab("inspect");
          }}
        />
      )}
      {tab === "cohorts" && (
        <CohortsTab
          cohorts={pack.cohorts}
          cards={pack.cards}
          onInspect={(id) => {
            setFocusId(id);
            setTab("inspect");
          }}
        />
      )}
      {tab === "mix" && <MixTab pack={pack} />}
      {tab === "inspect" && (
        <InspectTab
          cards={pack.cards}
          focus={focus}
          focusId={focusId}
          setFocusId={setFocusId}
          cohorts={pack.cohorts}
        />
      )}
    </div>
  );
}

function MixTab({ pack }: { pack: ReturnType<typeof buildGreatDealPack> }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel>
        <Eyebrow>Book mix</Eyebrow>
        <div className="mt-4">
          {pack.grade_mix.length ? (
            <DonutChart
              slices={pack.grade_mix.map((g) => ({
                label: g.label,
                color: g.color,
                pct: pack.cards.length
                  ? Math.round((g.value / pack.cards.length) * 100)
                  : 0,
              }))}
              centerLabel="Deals"
              centerValue={String(pack.cards.length)}
            />
          ) : (
            <EmptyState>No scored companies yet.</EmptyState>
          )}
        </div>
      </Panel>
      <Panel>
        <Eyebrow>Pillar average</Eyebrow>
        <div className="mt-4">
          <BarChart series={pack.pillar_book} height={200} />
        </div>
      </Panel>
    </div>
  );
}

function OutstandingTab({
  cards,
  onInspect,
}: {
  cards: GreatDealCard[];
  onInspect: (id: string) => void;
}) {
  if (!cards.length) {
    return <EmptyState>No outstanding or promising names — refresh or widen sourcing.</EmptyState>;
  }

  return (
    <div className="space-y-3 stagger">
      {cards.map((c) => (
        <DealRow key={c.company_id} card={c} onInspect={() => onInspect(c.company_id)} />
      ))}
    </div>
  );
}

function NoiseTab({
  cards,
  onInspect,
}: {
  cards: GreatDealCard[];
  onInspect: (id: string) => void;
}) {
  if (!cards.length) {
    return (
      <EmptyState>
        No noisy funding announcements flagged — book looks underwritten, not PR-led.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3 stagger">
      {cards.map((c) => (
        <DealRow key={c.company_id} card={c} onInspect={() => onInspect(c.company_id)} />
      ))}
    </div>
  );
}

function CohortsTab({
  cohorts,
  cards,
  onInspect,
}: {
  cohorts: CohortBoard[];
  cards: GreatDealCard[];
  onInspect: (id: string) => void;
}) {
  const rich = cohorts.filter((b) => b.size >= 2).slice(0, 8);
  if (!rich.length) {
    return (
      <EmptyState>
        Most names are singleton cohorts — relative rank needs more peers at the same stage.
      </EmptyState>
    );
  }

  const grouped = rich.slice(0, 5).map((b) => ({
    label: `${b.theme.split(" ")[0]} ${b.stage}`.slice(0, 14),
    values: Object.fromEntries(
      b.members.slice(0, 3).map((m) => [m.company_id, m.thesis_score]),
    ),
  }));
  const seriesKeys = Array.from(
    new Set(grouped.flatMap((g) => Object.keys(g.values))),
  ).slice(0, 3);
  const seriesLabels = Object.fromEntries(
    seriesKeys.map((id) => {
      const c = cards.find((x) => x.company_id === id);
      return [id, c?.name || id.slice(0, 6)];
    }),
  );

  return (
    <div className="space-y-5">
      <Panel>
        <Eyebrow>Relative, not absolute</Eyebrow>
        <h3 className="title mt-2 text-[1.15rem]">Theme × stage cohorts</h3>
        <p className="mt-1.5 text-[0.875rem] text-[var(--muted)]">
          Top names scored against peers in the same sector and stage — the bar that matters for
          “best deal available right now.”
        </p>
        {seriesKeys.length >= 2 ? (
          <div className="mt-4">
            <GroupedBarChart
              groups={grouped}
              seriesKeys={seriesKeys}
              seriesLabels={seriesLabels}
              height={210}
            />
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        {rich.map((board) => (
          <Panel key={board.key}>
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <div className="title text-[1.05rem]">{board.theme}</div>
                <div className="mt-0.5 text-[0.75rem] text-[var(--muted)]">
                  {board.stage} · {board.size} names · avg {board.avg_score}
                </div>
              </div>
              {board.leader_name ? (
                <span className="mono text-[0.75rem] text-[var(--signal)]">
                  #1 {board.leader_name}
                </span>
              ) : null}
            </div>
            <ol className="mt-4 space-y-2">
              {board.members.map((m) => {
                const card = cards.find((c) => c.company_id === m.company_id);
                return (
                  <li
                    key={m.company_id}
                    className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        className="text-left font-medium hover:text-[var(--signal)]"
                        onClick={() => onInspect(m.company_id)}
                      >
                        <span className="mono text-[var(--faint)]">#{m.rank}</span> {m.name}
                      </button>
                      <div className="mt-0.5 flex flex-wrap gap-2 text-[0.7rem] text-[var(--muted)]">
                        <span className="text-[0.7rem] text-[var(--muted)]">
                          {m.recommendation}
                        </span>
                        {card ? (
                          <span className={gradeTone(card.grade)}>{card.grade_label}</span>
                        ) : null}
                      </div>
                    </div>
                    <span className="mono shrink-0 text-[0.9375rem] text-[var(--text)]">
                      {m.thesis_score.toFixed(0)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function InspectTab({
  cards,
  focus,
  focusId,
  setFocusId,
  cohorts,
}: {
  cards: GreatDealCard[];
  focus: GreatDealCard | null;
  focusId: string | null;
  setFocusId: (id: string) => void;
  cohorts: CohortBoard[];
}) {
  if (!focus) {
    return <EmptyState>Pick a company from Outstanding or Cohorts.</EmptyState>;
  }

  const board = cohorts.find((b) => b.key === focus.cohort_key);
  const radar = Object.fromEntries(focus.pillars.map((p) => [p.label, p.score]));
  const cohortBars =
    board?.members.slice(0, 6).map((m) => ({
      label: m.name.length > 8 ? `${m.name.slice(0, 7)}…` : m.name,
      value: m.thesis_score,
    })) || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {cards.slice(0, 14).map((c) => (
          <button
            key={c.company_id}
            type="button"
            className={cn(
              "rounded-[var(--radius)] border px-2.5 py-1.5 text-[0.8125rem] transition",
              c.company_id === focusId
                ? "border-[var(--signal)] bg-[var(--signal-dim)] text-[var(--signal)]"
                : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--text)]/30 hover:text-[var(--text)]",
            )}
            onClick={() => setFocusId(c.company_id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Eyebrow>Why this deal</Eyebrow>
              <h3 className="title mt-2 text-[1.45rem]">
                <CoLink id={focus.company_id} slug={focus.slug} name={focus.name} />
              </h3>
              <p className="mt-1.5 text-[0.875rem] text-[var(--muted)]">
                {[focus.subsector || focus.sector_theme, focus.stage, focus.relative_rank]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <RecBadge rec={focus.recommendation} />
                <span className={gradeChip(focus.grade)}>{focus.grade_label}</span>
                <span className="chip">
                  Cohort P{focus.cohort_percentile} · #{focus.cohort_rank}/{focus.cohort_size}
                </span>
                <span className="chip">Criteria {focus.criteria_fit_pct}%</span>
              </div>
            </div>
            <div className="text-right">
              <div className="hero-metric">{focus.outstanding_score}</div>
              <div className="mt-1 text-[0.75rem] text-[var(--muted)]">outstanding score</div>
              <div className="mono mt-1 text-[0.8125rem] text-[var(--faint)]">
                thesis {focus.thesis_score.toFixed(0)}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="label-caps">Why one of the best right now</h4>
            <ul className="mt-3 space-y-2.5">
              {focus.why_best.map((w) => (
                <li
                  key={w}
                  className="border-l-2 border-[var(--signal)] pl-3 text-[0.9rem] leading-snug text-[var(--text)]/90"
                >
                  {w}
                </li>
              ))}
            </ul>
            {focus.weak_spots.length ? (
              <>
                <h4 className="label-caps mt-6">Pressure points</h4>
                <ul className="mt-3 space-y-2">
                  {focus.weak_spots.map((w) => (
                    <li key={w} className="text-[0.8125rem] text-[var(--muted)]">
                      · {w}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {focus.pillars.map((p) => (
              <div
                key={p.id}
                className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel-2)]/40 p-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[0.875rem] font-medium">{p.label}</span>
                  <span className="mono text-[0.875rem] text-[var(--signal)]">{p.score}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--panel)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--deep)] to-[var(--signal)]"
                    style={{ width: `${Math.max(4, p.score)}%` }}
                  />
                </div>
                <p className="mt-2 text-[0.75rem] leading-snug text-[var(--muted)]">{p.evidence}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-[0.75rem] text-[var(--muted)]">
            <span>Tier-1 {focus.tier1_count}</span>
            <span className="text-[var(--faint)]">·</span>
            <span>YoY {fmtPct(focus.yoy_growth_pct)}</span>
            <span className="text-[var(--faint)]">·</span>
            <span>Entry {fmtMoneyM(focus.valuation_est_m)}</span>
            <span className="text-[var(--faint)]">·</span>
            <span>Round {fmtMoneyM(focus.last_round_size_m)}</span>
            <span className="text-[var(--faint)]">·</span>
            <span>Lead {focus.lead_investor || "—"}</span>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <Eyebrow>Five pillars</Eyebrow>
            <h3 className="title mt-2 text-[1.1rem]">Founder · Market · Investors · Traction · Entry</h3>
            <div className="mt-3">
              <RadarChart scores={radar} size={260} />
            </div>
          </Panel>
          {cohortBars.length >= 2 ? (
            <Panel>
              <Eyebrow>Cohort</Eyebrow>
              <h3 className="title mt-2 text-[1.1rem]">
                {focus.sector_theme} × {focus.stage}
              </h3>
              <p className="mt-1 text-[0.75rem] text-[var(--muted)]">
                Ranked by thesis score inside the same sector and stage.
              </p>
              <div className="mt-3">
                <BarChart series={cohortBars} height={180} />
              </div>
            </Panel>
          ) : (
            <Panel>
              <Eyebrow>Cohort</Eyebrow>
              <p className="mt-2 text-[0.875rem] text-[var(--muted)]">
                Singleton cohort — relative rank is provisional until more peers land at this
                stage.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function DealRow({ card, onInspect }: { card: GreatDealCard; onInspect: () => void }) {
  return (
    <div className="panel p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <CoLink id={card.company_id} slug={card.slug} name={card.name} />
            <RecBadge rec={card.recommendation} />
            <span className={gradeChip(card.grade)}>{card.grade_label}</span>
          </div>
          <div className="mt-1.5 text-[0.8125rem] text-[var(--muted)]">
            {[
              card.subsector || card.sector_theme,
              card.stage,
              card.relative_rank || `#${card.cohort_rank} of ${card.cohort_size}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
          <p className="mt-3 text-[0.9rem] leading-relaxed text-[var(--text)]/85">
            {card.why_best[0]}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {card.pillars.map((p) => (
              <span
                key={p.id}
                className="mono rounded-[var(--radius-sm)] bg-[var(--panel-2)] px-2 py-0.5 text-[0.7rem] text-[var(--muted)]"
                title={p.evidence}
              >
                {p.label} {p.score}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="text-right">
            <div className="mono text-[1.35rem] font-semibold text-[var(--signal)]">
              {card.outstanding_score}
            </div>
            <div className="text-[0.7rem] text-[var(--faint)]">
              thesis {card.thesis_score.toFixed(0)}
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onInspect}>
            Articulate →
          </button>
        </div>
      </div>
    </div>
  );
}

/** Compact panel for company pages. */
export function GreatDealPanel({
  company,
  all,
}: {
  company: Company;
  all: Company[];
}) {
  const pack = useMemo(() => buildGreatDealPack(all), [all]);
  const card = pack.cards.find((c) => c.company_id === company.id);
  if (!card) return null;

  const radar = Object.fromEntries(card.pillars.map((p) => [p.label, p.score]));

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="title text-[1.35rem]">Knows what a great deal looks like</h2>
        <Link href="/deals" className="link-quiet text-[0.8125rem] font-semibold">
          Full desk →
        </Link>
      </div>
      <p className="mt-1.5 text-[0.8125rem] text-[var(--muted)]">
        Relative to {card.sector_theme || "theme"} × {card.stage || "stage"} — not scored in
        isolation.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className={gradeChip(card.grade)}>{card.grade_label}</span>
        <span className="chip">
          #{card.cohort_rank} of {card.cohort_size}
        </span>
        <span className="chip">Outstanding {card.outstanding_score}</span>
      </div>
      <ul className="mt-4 space-y-2">
        {card.why_best.slice(0, 3).map((w) => (
          <li
            key={w}
            className="border-l-2 border-[var(--signal)] pl-3 text-[0.875rem] leading-snug text-[var(--text)]/90"
          >
            {w}
          </li>
        ))}
      </ul>
      <div className="mt-4 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
        <RadarChart scores={radar} size={200} />
        <div className="space-y-2.5">
          {card.pillars.map((p) => (
            <div key={p.id}>
              <div className="mb-1 flex justify-between text-[0.75rem]">
                <span className="text-[var(--muted)]">{p.label}</span>
                <span className="mono text-[var(--text)]">{p.score}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-[var(--panel-2)]">
                <div
                  className="h-full rounded-full bg-[var(--signal)]"
                  style={{ width: `${Math.max(4, p.score)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
