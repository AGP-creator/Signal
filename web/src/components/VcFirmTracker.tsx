"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DonutChart, SparkBars } from "@/components/charts";
import { Eyebrow, Panel } from "@/components/ui";
import type { FundAnnouncement } from "@/lib/fundAnnouncements";
import type { FirmDossier } from "@/lib/peerIntel";
import {
  loadVcTracks,
  resolveWatchlistFirms,
  saveVcTrack,
  type VcTrackNote,
  type VcTrackStatus,
} from "@/lib/vcWatchlist";
import { cn } from "@/lib/utils";

type View = "table" | "cards";
type ActivityFilter = "all" | "active" | "quiet" | "drift";

const STATUS_OPTS: { id: VcTrackStatus; label: string }[] = [
  { id: "watching", label: "Watching" },
  { id: "hot", label: "Hot" },
  { id: "quiet", label: "Quiet" },
  { id: "parked", label: "Parked" },
];

function activityLabel(f: FirmDossier) {
  if (f.thesis_shift_count > 0 || f.drift_score >= 30) return "Drift";
  if (f.deal_count > 0) return "Active";
  return "Quiet";
}

function formatUsdM(n: number | null) {
  if (n == null) return "—";
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  return `$${Math.round(n)}M`;
}

export function VcFirmTracker({
  firms,
  funds = [],
}: {
  firms: FirmDossier[];
  funds?: FundAnnouncement[];
}) {
  const watch = useMemo(() => resolveWatchlistFirms(firms), [firms]);
  const [q, setQ] = useState("");
  const [activity, setActivity] = useState<ActivityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [view, setView] = useState<View>("table");
  const [tracks, setTracks] = useState<Record<string, VcTrackNote>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");

  useEffect(() => {
    const sync = () => setTracks(loadVcTracks());
    sync();
    window.addEventListener("signal:vc-tracks-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("signal:vc-tracks-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return watch.filter((f) => {
      const track = tracks[f.slug];
      const act = activityLabel(f);
      if (activity === "active" && act !== "Active" && act !== "Drift") return false;
      if (activity === "quiet" && act !== "Quiet") return false;
      if (activity === "drift" && act !== "Drift") return false;
      if (statusFilter !== "all" && (track?.status || "watching") !== statusFilter) return false;
      if (!needle) return true;
      const blob = `${f.name} ${f.aliases.join(" ")} ${f.stated_focus} ${f.intel_summary}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [watch, q, activity, statusFilter, tracks]);

  const stats = useMemo(() => {
    const drift = watch.filter((f) => f.thesis_shift_count > 0 || f.drift_score >= 30).length;
    const activeOnly = watch.filter(
      (f) => f.deal_count > 0 && !(f.thesis_shift_count > 0 || f.drift_score >= 30),
    ).length;
    const quiet = Math.max(0, watch.length - drift - activeOnly);
    const hot = Object.values(tracks).filter((t) => t.status === "hot").length;
    const total = Math.max(watch.length, 1);
    return {
      total: watch.length,
      active: activeOnly + drift,
      drift,
      hot,
      shown: filtered.length,
      donut: [
        { label: "Active", pct: Math.round((100 * activeOnly) / total), color: "var(--signal)" },
        { label: "Drift", pct: Math.round((100 * drift) / total), color: "var(--warn)" },
        { label: "Quiet", pct: Math.round((100 * quiet) / total), color: "var(--faint)" },
      ],
    };
  }, [watch, tracks, filtered.length]);

  const recentFunds = useMemo(
    () => [...funds].sort((a, b) => b.announced_date.localeCompare(a.announced_date)).slice(0, 6),
    [funds],
  );

  function openNote(slug: string) {
    setEditing(slug);
    setDraftNote(tracks[slug]?.note || "");
  }

  function commitNote(slug: string) {
    saveVcTrack(slug, { note: draftNote.trim(), status: tracks[slug]?.status || "watching" });
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="On watchlist" value={String(stats.total)} />
          <StatTile label="With activity" value={String(stats.active)} tone="signal" />
          <StatTile label="Thesis drift" value={String(stats.drift)} tone="warn" />
          <StatTile label="Marked hot" value={String(stats.hot)} tone="deep" />
        </div>
        <Panel className="!p-4">
          <div className="label-caps">Watchlist mix</div>
          <DonutChart
            className="mt-3"
            size={120}
            slices={stats.donut}
            centerLabel="firms"
            centerValue={String(stats.total)}
          />
        </Panel>
      </div>

      {!!recentFunds.length && (
        <Panel>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Eyebrow className="!text-[var(--deep)]">Fund announcements</Eyebrow>
              <h2 className="title mt-2 text-[1.25rem]">New vehicles on the peer set</h2>
            </div>
            <Link href="/peers" className="link-quiet text-sm">
              Open Competitor OS →
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentFunds.map((f) => (
              <Link
                key={f.id}
                href={`/competitors/${f.firm_slug}`}
                className="rounded-[var(--radius-lg)] border border-[var(--line)] p-3 transition hover:border-[var(--signal)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{f.firm}</div>
                    <div className="mt-0.5 line-clamp-1 text-[0.8125rem] text-[var(--muted)]">
                      {f.vehicle}
                    </div>
                  </div>
                  <div className="mono shrink-0 text-sm text-[var(--deep)]">{formatUsdM(f.size_m)}</div>
                </div>
                <div className="mt-2 text-[0.75rem] text-[var(--faint)]">
                  {f.sector_focus.split("·")[0].trim()} · {f.announced_date}
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      )}

      <Panel className="!p-4 md:!p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[14rem] flex-1">
            <span className="label-caps">Search</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="a16z, Shield, fintech…"
              className="field mt-1"
            />
          </label>
          <label>
            <span className="label-caps">Activity</span>
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value as ActivityFilter)}
              className="field mt-1"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="drift">Drift</option>
              <option value="quiet">Quiet</option>
            </select>
          </label>
          <label>
            <span className="label-caps">Your status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="field mt-1"
            >
              <option value="all">All</option>
              {STATUS_OPTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-1 rounded-xl border border-[var(--line)] p-1">
            {(
              [
                ["table", "Table"],
                ["cards", "Cards"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm",
                  view === id
                    ? "bg-[var(--panel-2)] text-[var(--text)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 text-[0.8125rem] text-[var(--faint)]">
          Showing {stats.shown} of {stats.total} · open a firm for the full dossier
        </div>
      </Panel>

      {view === "table" ? (
        <div className="panel overflow-hidden !p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="data-table min-w-[960px]">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Firm</th>
                  <th>Focus</th>
                  <th>Activity</th>
                  <th>Deals</th>
                  <th>Pulse</th>
                  <th>Last seen</th>
                  <th>Watch</th>
                  <th>Status</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => {
                  const track = tracks[f.slug];
                  const act = activityLabel(f);
                  return (
                    <tr key={f.slug}>
                      <td className="mono text-[0.75rem] text-[var(--faint)]">{f.watch_rank}</td>
                      <td>
                        <Link
                          href={`/competitors/${f.slug}`}
                          className="font-semibold hover:text-[var(--signal)]"
                        >
                          {f.name}
                        </Link>
                        {!!f.aliases.length && (
                          <div className="mt-0.5 text-[0.75rem] text-[var(--faint)]">
                            {f.aliases.slice(0, 2).join(" · ")}
                          </div>
                        )}
                      </td>
                      <td className="max-w-[14rem] text-[0.875rem] text-[var(--muted)]">
                        {f.stated_focus || "—"}
                      </td>
                      <td>
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide",
                            act === "Drift"
                              ? "bg-[var(--warn-dim)] text-[var(--warn)]"
                              : act === "Active"
                                ? "bg-[var(--signal-dim)] text-[var(--signal)]"
                                : "bg-[var(--panel-2)] text-[var(--muted)]",
                          )}
                        >
                          {act}
                        </span>
                      </td>
                      <td className="mono text-[0.875rem]">{f.deal_count}</td>
                      <td className="w-20">
                        <SparkBars
                          values={[
                            f.deal_count,
                            f.lead_count,
                            Math.round(f.drift_score / 12),
                            f.thesis_shift_count * 2,
                          ]}
                        />
                      </td>
                      <td className="mono text-[0.8125rem] text-[var(--muted)]">
                        {f.last_activity_date || "—"}
                      </td>
                      <td className="mono text-[0.875rem] text-[var(--signal)]">
                        {f.watch_priority ? f.watch_priority.toFixed(0) : "—"}
                      </td>
                      <td>
                        <select
                          value={track?.status || "watching"}
                          onChange={(e) =>
                            saveVcTrack(f.slug, {
                              status: e.target.value as VcTrackStatus,
                              note: track?.note || "",
                            })
                          }
                          className="field !py-1 !text-[0.8125rem]"
                          aria-label={`Status for ${f.name}`}
                        >
                          {STATUS_OPTS.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {editing === f.slug ? (
                          <div className="flex min-w-[12rem] items-center gap-1">
                            <input
                              value={draftNote}
                              onChange={(e) => setDraftNote(e.target.value)}
                              className="field !py-1 !text-[0.8125rem]"
                              placeholder="Partner note…"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitNote(f.slug);
                                if (e.key === "Escape") setEditing(null);
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => commitNote(f.slug)}
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openNote(f.slug)}
                            className="max-w-[12rem] truncate text-left text-[0.8125rem] text-[var(--muted)] hover:text-[var(--signal)]"
                            title={track?.note || "Add note"}
                          >
                            {track?.note || "Add note"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!filtered.length && <p className="body-muted p-5">No firms match these filters.</p>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((f) => {
            const track = tracks[f.slug];
            const act = activityLabel(f);
            return (
              <div key={f.slug} className="panel panel-interactive group relative p-5">
                <Link href={`/competitors/${f.slug}`} className="block">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Eyebrow>#{f.watch_rank}</Eyebrow>
                      <div className="title mt-1.5 text-[1.25rem] group-hover:text-[var(--signal)]">
                        {f.name}
                      </div>
                      <div className="mt-1 line-clamp-1 text-[0.8125rem] text-[var(--muted)]">
                        {f.stated_focus || "Focus not catalogued"}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide",
                        act === "Drift"
                          ? "bg-[var(--warn-dim)] text-[var(--warn)]"
                          : act === "Active"
                            ? "bg-[var(--signal-dim)] text-[var(--signal)]"
                            : "bg-[var(--panel-2)] text-[var(--muted)]",
                      )}
                    >
                      {act}
                    </span>
                  </div>
                  <div className="mt-3">
                    <SparkBars
                      values={[
                        f.deal_count,
                        f.lead_count,
                        Math.round(f.drift_score / 10),
                        f.thesis_shift_count * 2,
                      ]}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <Mini label="Deals" value={String(f.deal_count)} />
                    <Mini
                      label="Drift"
                      value={f.drift_score.toFixed(0)}
                      warn={f.drift_score >= 30}
                    />
                    <Mini
                      label="Watch"
                      value={f.watch_priority ? f.watch_priority.toFixed(0) : "—"}
                    />
                  </div>
                  <p className="mt-4 line-clamp-2 text-[0.875rem] text-[var(--muted)]">
                    {f.intel_summary}
                  </p>
                </Link>
                <div className="mt-4 flex items-center gap-2 border-t border-[var(--line)] pt-3">
                  <select
                    value={track?.status || "watching"}
                    onChange={(e) =>
                      saveVcTrack(f.slug, {
                        status: e.target.value as VcTrackStatus,
                        note: track?.note || "",
                      })
                    }
                    className="field !py-1 !text-[0.8125rem]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {STATUS_OPTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="link-quiet truncate text-[0.75rem]"
                    onClick={() => openNote(f.slug)}
                  >
                    {track?.note || "Note"}
                  </button>
                </div>
                {editing === f.slug && (
                  <div className="mt-2 flex gap-1">
                    <input
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      className="field !py-1 !text-[0.8125rem]"
                      placeholder="Partner note…"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitNote(f.slug);
                        if (e.key === "Escape") setEditing(null);
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => commitNote(f.slug)}
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {!filtered.length && (
            <Panel>
              <p className="body-muted">No firms match these filters.</p>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "signal" | "warn" | "deep";
}) {
  return (
    <div className="panel p-4">
      <div className="label-caps">{label}</div>
      <div
        className={cn(
          "mono mt-2 text-[1.75rem]",
          tone === "signal" && "text-[var(--signal)]",
          tone === "warn" && "text-[var(--warn)]",
          tone === "deep" && "text-[var(--deep)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Mini({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-[var(--panel-2)] px-2 py-2">
      <div className={cn("mono text-sm", warn && "text-[var(--warn)]")}>{value}</div>
      <div className="label-caps mt-0.5 !text-[0.55rem] text-[var(--faint)]">{label}</div>
    </div>
  );
}
