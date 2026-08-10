"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eyebrow, EmptyState, Panel } from "@/components/ui";
import {
  buildDemoTrails,
  diligenceProgress,
  mergeTrailsWithCompanies,
  STAGE_LABEL,
  STAGE_ORDER,
  VOTE_LABEL,
  voteSummary,
  type DealTrail,
  type IcStage,
  type VoteChoice,
} from "@/lib/icTrail";
import {
  advanceStage,
  castVote,
  loadTrails,
  seedIfEmpty,
  setDiligenceStatus,
} from "@/lib/icStore";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACTIVE_STAGES: IcStage[] = [
  "deep_dive",
  "diligence",
  "partner_meeting",
  "ic_vote",
  "term_sheet",
];

export function IcGovernance({ companies }: { companies: Company[] }) {
  const [trails, setTrails] = useState<DealTrail[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<IcStage | "all">("all");
  const [partner, setPartner] = useState("GP");
  const [voteChoice, setVoteChoice] = useState<VoteChoice>("yes");
  const [voteNote, setVoteNote] = useState("");

  function refresh() {
    const demos = buildDemoTrails(companies);
    const stored = seedIfEmpty(demos);
    const merged = mergeTrailsWithCompanies(companies, stored.length ? stored : demos);
    setTrails(merged);
    setSelectedId((prev) => prev || merged[0]?.company_id || null);
  }

  useEffect(() => {
    refresh();
    const sync = () => refresh();
    window.addEventListener("signal:ic-changed", sync);
    return () => window.removeEventListener("signal:ic-changed", sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies]);

  const filtered = useMemo(() => {
    const rows =
      stageFilter === "all" ? trails : trails.filter((t) => t.stage === stageFilter);
    return [...rows].sort(
      (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage),
    );
  }, [trails, stageFilter]);

  const selected = trails.find((t) => t.company_id === selectedId) || filtered[0] || null;
  const prog = selected ? diligenceProgress(selected.diligence) : null;
  const tally = selected ? voteSummary(selected.votes) : null;

  function onAdvance(stage: IcStage) {
    if (!selected) return;
    if (!loadTrails().some((t) => t.company_id === selected.company_id)) {
      seedIfEmpty(trails);
    }
    advanceStage(selected.company_id, stage, partner, `Advanced to ${STAGE_LABEL[stage]}`);
    refresh();
  }

  function onVote() {
    if (!selected) return;
    if (!loadTrails().some((t) => t.company_id === selected.company_id)) {
      seedIfEmpty(trails);
    }
    castVote(selected.company_id, { partner, choice: voteChoice, note: voteNote });
    setVoteNote("");
    refresh();
  }

  function onDd(itemId: string, status: "todo" | "in_progress" | "done" | "blocked") {
    if (!selected) return;
    if (!loadTrails().some((t) => t.company_id === selected.company_id)) {
      seedIfEmpty(trails);
    }
    setDiligenceStatus(selected.company_id, itemId, status);
    refresh();
  }

  return (
    <div className="space-y-6">
      <Panel className="border-[rgba(90,208,244,0.22)] bg-[rgba(90,208,244,0.04)]">
        <Eyebrow live className="!text-[var(--deep)]">
          IC Decision Trail
        </Eyebrow>
        <h2 className="display mt-2 text-2xl font-bold md:text-3xl">
          Governance LPs can diligence
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          Stages, diligence checklists, votes, and Pass reasons stay attached to the deal —
          not scattered across Slack and Google Docs. This is the paper trail sophisticated LPs
          ask for.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-[0.8125rem] text-[var(--muted)]">
          <span>
            <span className="mono text-[var(--text)]">{trails.length}</span> trails
          </span>
          <span>
            <span className="mono text-[var(--text)]">
              {trails.filter((t) => ACTIVE_STAGES.includes(t.stage)).length}
            </span>{" "}
            active
          </span>
          <span>
            <span className="mono text-[var(--text)]">
              {trails.filter((t) => t.votes.length).length}
            </span>{" "}
            with votes
          </span>
          <span>
            <span className="mono text-[var(--text)]">
              {trails.filter((t) => t.stage === "pass").length}
            </span>{" "}
            documented Passes
          </span>
        </div>
      </Panel>

      <div className="flex flex-wrap gap-1.5">
        <StageChip
          active={stageFilter === "all"}
          onClick={() => setStageFilter("all")}
          label="All"
        />
        {STAGE_ORDER.filter((s) => s !== "sourced" && s !== "screened" && s !== "invested").map(
          (s) => (
            <StageChip
              key={s}
              active={stageFilter === s}
              onClick={() => setStageFilter(s)}
              label={STAGE_LABEL[s]}
            />
          ),
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="space-y-2">
          {filtered.map((t) => {
            const p = diligenceProgress(t.diligence);
            const active = selected?.company_id === t.company_id;
            return (
              <button
                key={t.company_id}
                type="button"
                onClick={() => setSelectedId(t.company_id)}
                className={cn(
                  "w-full rounded-[10px] border px-4 py-3 text-left transition",
                  active
                    ? "border-[rgba(90,208,244,0.45)] bg-[rgba(90,208,244,0.08)]"
                    : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--line-strong)]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold">{t.company_name}</div>
                  <span className="label-caps shrink-0 text-[var(--deep)]">
                    {STAGE_LABEL[t.stage]}
                  </span>
                </div>
                <div className="mt-1 text-[0.75rem] text-[var(--muted)]">
                  {t.sponsor} · DD {p.pct}%
                  {t.votes.length ? ` · ${t.votes.length} vote(s)` : ""}
                </div>
              </button>
            );
          })}
          {!filtered.length && <EmptyState>No trails in this stage.</EmptyState>}
        </div>

        {selected && prog && tally ? (
          <div className="space-y-4">
            <Panel>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Eyebrow>{STAGE_LABEL[selected.stage]}</Eyebrow>
                  <h3 className="display mt-1 text-2xl">{selected.company_name}</h3>
                  <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">{selected.thesis_hook}</p>
                  <div className="mt-2 text-[0.8125rem] text-[var(--faint)]">
                    Sponsor {selected.sponsor}
                    {selected.check_size_m != null ? ` · $${selected.check_size_m}M` : ""}
                    {selected.target_ownership_pct != null
                      ? ` · ${selected.target_ownership_pct}% target`
                      : ""}
                  </div>
                </div>
                {selected.slug ? (
                  <Link href={`/company/${selected.slug}`} className="btn btn-ghost !py-1.5 !text-xs">
                    Company brief →
                  </Link>
                ) : null}
              </div>

              <div className="mt-5">
                <div className="label-caps mb-2">Advance stage</div>
                <div className="flex flex-wrap gap-1.5">
                  {ACTIVE_STAGES.concat(["watch", "pass"]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onAdvance(s)}
                      className={cn(
                        "rounded-[8px] border px-2.5 py-1 text-[0.75rem] font-semibold transition",
                        selected.stage === s
                          ? "border-[var(--deep)] bg-[var(--deep-dim)] text-[var(--deep)]"
                          : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]",
                      )}
                    >
                      {STAGE_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>

            <div className="grid gap-4 md:grid-cols-2">
              <Panel>
                <Eyebrow>Risks</Eyebrow>
                <ul className="mt-3 space-y-2">
                  {selected.risks.map((r) => (
                    <li key={r} className="text-sm text-[var(--muted)]">
                      · {r}
                    </li>
                  ))}
                </ul>
                <Eyebrow className="mt-5">Open questions</Eyebrow>
                <ul className="mt-3 space-y-2">
                  {selected.open_questions.map((q) => (
                    <li key={q} className="text-sm text-[var(--muted)]">
                      · {q}
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel>
                <div className="flex items-baseline justify-between">
                  <Eyebrow>Diligence checklist</Eyebrow>
                  <span className="mono text-[0.8rem] text-[var(--signal)]">{prog.pct}%</span>
                </div>
                <div className="mt-3 space-y-2">
                  {selected.diligence.map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2 last:border-0"
                    >
                      <div className="min-w-0 text-[0.875rem]">{d.label}</div>
                      <select
                        className="rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1 text-[0.75rem]"
                        value={d.status}
                        onChange={(e) =>
                          onDd(
                            d.id,
                            e.target.value as "todo" | "in_progress" | "done" | "blocked",
                          )
                        }
                      >
                        <option value="todo">Todo</option>
                        <option value="in_progress">In progress</option>
                        <option value="done">Done</option>
                        <option value="blocked">Blocked</option>
                        <option value="na">N/A</option>
                      </select>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <Panel>
              <Eyebrow>IC votes</Eyebrow>
              <div className="mt-2 flex flex-wrap gap-4 text-[0.8125rem]">
                <span>
                  Yes <span className="mono text-[var(--ok)]">{tally.yes}</span>
                </span>
                <span>
                  No <span className="mono text-[var(--danger)]">{tally.no}</span>
                </span>
                <span>
                  Abstain <span className="mono">{tally.abstain}</span>
                </span>
                <span>
                  More DD <span className="mono text-[var(--warn)]">{tally.more_diligence}</span>
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {selected.votes.map((v) => (
                  <div key={v.id} className="rounded-[8px] bg-[var(--panel-2)] px-3 py-2 text-sm">
                    <span className="font-semibold">{v.partner}</span>
                    <span className="mx-2 text-[var(--faint)]">·</span>
                    <span className="text-[var(--deep)]">{VOTE_LABEL[v.choice]}</span>
                    {v.note ? (
                      <span className="mt-1 block text-[var(--muted)]">{v.note}</span>
                    ) : null}
                  </div>
                ))}
                {!selected.votes.length && (
                  <p className="text-sm text-[var(--muted)]">No votes yet — cast below.</p>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-[var(--line)] pt-4">
                <label className="text-[0.75rem] text-[var(--faint)]">
                  Partner
                  <input
                    value={partner}
                    onChange={(e) => setPartner(e.target.value)}
                    className="mt-1 block w-28 rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5 text-sm text-[var(--text)]"
                  />
                </label>
                <label className="text-[0.75rem] text-[var(--faint)]">
                  Vote
                  <select
                    value={voteChoice}
                    onChange={(e) => setVoteChoice(e.target.value as VoteChoice)}
                    className="mt-1 block rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5 text-sm"
                  >
                    {(Object.keys(VOTE_LABEL) as VoteChoice[]).map((k) => (
                      <option key={k} value={k}>
                        {VOTE_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="min-w-[12rem] flex-1 text-[0.75rem] text-[var(--faint)]">
                  Note
                  <input
                    value={voteNote}
                    onChange={(e) => setVoteNote(e.target.value)}
                    placeholder="Why?"
                    className="mt-1 block w-full rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5 text-sm text-[var(--text)]"
                  />
                </label>
                <button type="button" onClick={onVote} className="btn btn-primary !py-1.5 !text-xs">
                  Cast vote
                </button>
              </div>
            </Panel>

            <Panel>
              <Eyebrow>Event log</Eyebrow>
              <ol className="mt-3 space-y-3">
                {selected.events.map((e) => (
                  <li key={e.id} className="border-l-2 border-[var(--line-strong)] pl-3">
                    <div className="label-caps text-[var(--deep)]">{STAGE_LABEL[e.stage]}</div>
                    <div className="mt-0.5 text-sm">{e.note}</div>
                    <div className="mt-0.5 text-[0.75rem] text-[var(--faint)]">
                      {e.actor} · {e.at.slice(0, 10)}
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        ) : (
          <EmptyState>Select a deal trail.</EmptyState>
        )}
      </div>
    </div>
  );
}

function StageChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[8px] px-3 py-1.5 text-[0.8125rem] font-semibold transition",
        active
          ? "bg-[var(--deep-dim)] text-[var(--deep)]"
          : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]",
      )}
    >
      {label}
    </button>
  );
}
