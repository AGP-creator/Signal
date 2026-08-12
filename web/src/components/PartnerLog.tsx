"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MessageSquarePlus, Trash2, X } from "lucide-react";
import { EmptyState, Eyebrow, Panel } from "@/components/ui";
import {
  PARTNER_ROSTER,
  TARGET_TYPE_META,
  addPartnerNote,
  entriesForTarget,
  formatLogTime,
  loadPartnerAuthor,
  loadPartnerLog,
  recentPartnerNotes,
  removePartnerNote,
  savePartnerAuthor,
  slugifyTarget,
  subscribePartnerLog,
  type PartnerLogEntry,
  type PartnerLogTargetType,
} from "@/lib/partnerLog";
import { cn } from "@/lib/utils";

const TYPE_FILTERS: Array<PartnerLogTargetType | "all"> = [
  "all",
  "company",
  "deal",
  "sector",
  "theme",
  "competitor",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

function targetHref(entry: PartnerLogEntry): string | null {
  if (entry.target_type === "company") return `/company/${entry.target_id}`;
  if (entry.target_type === "competitor") return `/competitors/${entry.target_id}`;
  if (entry.target_type === "sector" || entry.target_type === "theme") return "/sectors";
  if (entry.target_type === "deal") return `/company/${entry.target_id}`;
  return null;
}

function AuthorChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold tracking-wide"
        style={{
          background: "color-mix(in srgb, var(--signal) 18%, var(--panel-2))",
          color: "var(--signal)",
        }}
        aria-hidden
      >
        {initials(name)}
      </span>
      <span className="text-[0.8125rem] font-medium text-[var(--text)]">{name}</span>
    </span>
  );
}

function NoteCard({
  entry,
  showTarget,
  onRemove,
}: {
  entry: PartnerLogEntry;
  showTarget?: boolean;
  onRemove?: (id: string) => void;
}) {
  const href = targetHref(entry);
  const meta = TARGET_TYPE_META[entry.target_type];

  return (
    <article className="group relative border-b border-[var(--line)] py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <AuthorChip name={entry.author} />
        <time className="mono shrink-0 pt-1 text-[0.7rem] text-[var(--faint)]">
          {formatLogTime(entry.created_at)}
          {entry.updated_at ? " · edited" : ""}
        </time>
      </div>
      {showTarget ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.75rem] text-[var(--muted)]">
          <span className="label-caps !normal-case tracking-wide text-[var(--faint)]">
            {meta.label}
          </span>
          {href ? (
            <Link href={href} className="font-medium text-[var(--text)] hover:text-[var(--signal)]">
              {entry.target_label}
            </Link>
          ) : (
            <span className="font-medium text-[var(--text)]">{entry.target_label}</span>
          )}
        </div>
      ) : null}
      <p className="mt-2.5 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-[var(--text)]/90">
        {entry.body}
      </p>
      {onRemove ? (
        <button
          type="button"
          className="absolute bottom-3 right-0 rounded-md p-1.5 text-[var(--faint)] opacity-0 transition group-hover:opacity-100 hover:bg-[var(--panel-2)] hover:text-[var(--danger)]"
          aria-label="Remove note"
          onClick={() => onRemove(entry.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </article>
  );
}

function Composer({
  targetType,
  targetId,
  targetLabel,
  compact,
  onPosted,
}: {
  targetType: PartnerLogTargetType;
  targetId: string;
  targetLabel: string;
  compact?: boolean;
  onPosted?: () => void;
}) {
  const [author, setAuthor] = useState<string>(PARTNER_ROSTER[0]);
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAuthor(loadPartnerAuthor());
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    addPartnerNote({
      target_type: targetType,
      target_id: targetId,
      target_label: targetLabel,
      body,
      author,
    });
    setBody("");
    setSaved(true);
    onPosted?.();
    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <form onSubmit={submit} className={cn("space-y-3", compact && "space-y-2.5")}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`plog-author-${targetId}`}>
          Partner
        </label>
        <select
          id={`plog-author-${targetId}`}
          value={author}
          onChange={(e) => {
            setAuthor(e.target.value);
            savePartnerAuthor(e.target.value);
          }}
          className="rounded-[8px] border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-1.5 text-[0.8125rem]"
        >
          {PARTNER_ROSTER.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <span className="text-[0.75rem] text-[var(--faint)]">leaving a note for the partnership</span>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={compact ? 3 : 4}
        placeholder="Add context another partner should see before the next call…"
        className="w-full resize-none rounded-[10px] border border-[var(--line)] bg-[var(--panel-2)] px-3.5 py-2.5 text-[0.9375rem] leading-relaxed placeholder:text-[var(--faint)]"
      />
      <div className="flex items-center gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={!body.trim()}>
          {saved ? "Posted" : "Post note"}
        </button>
      </div>
    </form>
  );
}

/** Inline thread on a company / competitor / sector / theme / deal surface. */
export function PartnerLogPanel({
  targetType,
  targetId,
  targetLabel,
  className,
  title = "Partner log",
  description = "Threaded notes for the partnership — like review comments, readable by everyone on the desk.",
}: {
  targetType: PartnerLogTargetType;
  targetId: string;
  targetLabel: string;
  className?: string;
  title?: string;
  description?: string;
}) {
  const [rows, setRows] = useState<PartnerLogEntry[]>([]);

  useEffect(() => {
    const sync = () => setRows(loadPartnerLog());
    sync();
    return subscribePartnerLog(sync);
  }, []);

  const thread = useMemo(
    () => entriesForTarget(rows, targetType, targetId, targetLabel),
    [rows, targetType, targetId, targetLabel],
  );

  return (
    <Panel className={className}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow className="!text-[var(--signal)]">Shared desk</Eyebrow>
          <h2 className="title mt-1.5 text-[1.2rem]">{title}</h2>
          <p className="mt-1.5 max-w-md text-[0.8125rem] leading-relaxed text-[var(--muted)]">
            {description}
          </p>
        </div>
        <span className="mono shrink-0 rounded-md bg-[var(--panel-2)] px-2 py-1 text-[0.7rem] text-[var(--deep)]">
          {thread.length}
        </span>
      </div>

      <div className="mt-4">
        {thread.length ? (
          <div className="max-h-[22rem] overflow-y-auto pr-1">
            {thread.map((e) => (
              <NoteCard key={e.id} entry={e} onRemove={removePartnerNote} />
            ))}
          </div>
        ) : (
          <EmptyState>No notes yet — leave the first context for partners.</EmptyState>
        )}
      </div>

      <div className="mt-4 border-t border-[var(--line)] pt-4">
        <Composer targetType={targetType} targetId={targetId} targetLabel={targetLabel} compact />
        <Link
          href="/log"
          className="link-quiet mt-3 inline-block text-[0.75rem] font-medium text-[var(--faint)]"
        >
          Open full partner log →
        </Link>
      </div>
    </Panel>
  );
}

/** Compact trigger + slide-over for surfaces that shouldn't grow a full panel. */
export function PartnerLogButton({
  targetType,
  targetId,
  targetLabel,
  className,
}: {
  targetType: PartnerLogTargetType;
  targetId: string;
  targetLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () =>
      setCount(entriesForTarget(loadPartnerLog(), targetType, targetId, targetLabel).length);
    sync();
    return subscribePartnerLog(sync);
  }, [targetType, targetId, targetLabel]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("btn btn-ghost btn-sm gap-1.5", className)}
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
        Notes{count ? ` · ${count}` : ""}
      </button>
      {open ? (
        <PartnerLogDrawer
          targetType={targetType}
          targetId={targetId}
          targetLabel={targetLabel}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

export function PartnerLogDrawer({
  targetType,
  targetId,
  targetLabel,
  onClose,
}: {
  targetType: PartnerLogTargetType;
  targetId: string;
  targetLabel: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<PartnerLogEntry[]>([]);

  useEffect(() => {
    const sync = () => setRows(loadPartnerLog());
    sync();
    return subscribePartnerLog(sync);
  }, []);

  const thread = useMemo(
    () => entriesForTarget(rows, targetType, targetId, targetLabel),
    [rows, targetType, targetId, targetLabel],
  );
  const meta = TARGET_TYPE_META[targetType];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_55%,transparent)] backdrop-blur-[2px]"
        aria-label="Close partner log"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-panel)] animate-in"
        role="dialog"
        aria-label={`Partner log · ${targetLabel}`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div className="min-w-0">
            <Eyebrow className="!text-[var(--signal)]">{meta.label} log</Eyebrow>
            <h2 className="title mt-1 truncate text-[1.25rem]">{targetLabel}</h2>
            <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
              Visible to every partner on the desk.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5">
          {thread.length ? (
            thread.map((e) => (
              <NoteCard key={e.id} entry={e} onRemove={removePartnerNote} />
            ))
          ) : (
            <div className="py-10">
              <EmptyState>No notes on this {meta.label.toLowerCase()} yet.</EmptyState>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--line)] px-5 py-4">
          <Composer
            targetType={targetType}
            targetId={targetId}
            targetLabel={targetLabel}
            compact
          />
        </div>
      </aside>
    </div>
  );
}

/** Firm-wide log desk — browse & leave notes across target types. */
export function PartnerLogDesk() {
  const [rows, setRows] = useState<PartnerLogEntry[]>([]);
  const [filter, setFilter] = useState<PartnerLogTargetType | "all">("all");
  const [composeType, setComposeType] = useState<PartnerLogTargetType>("company");
  const [composeLabel, setComposeLabel] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [author, setAuthor] = useState<string>(PARTNER_ROSTER[0]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAuthor(loadPartnerAuthor());
    const sync = () => setRows(loadPartnerLog());
    sync();
    return subscribePartnerLog(sync);
  }, []);

  const visible = useMemo(() => {
    const list = filter === "all" ? rows : rows.filter((r) => r.target_type === filter);
    return recentPartnerNotes(list, 40);
  }, [rows, filter]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const label = composeLabel.trim();
    const body = composeBody.trim();
    if (!label || !body) return;
    addPartnerNote({
      target_type: composeType,
      target_id: slugifyTarget(label),
      target_label: label,
      body,
      author,
    });
    setComposeBody("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div className="space-y-5 animate-in">
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <Eyebrow className="!text-[var(--signal)]">New note</Eyebrow>
          <h2 className="title mt-1.5 text-[1.25rem]">Leave context for partners</h2>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--muted)]">
            Tag a company, deal, sector, theme, or competitor — the thread stays on that object
            everywhere it appears.
          </p>
          <form onSubmit={submit} className="mt-5 space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label-caps">Type</label>
                <select
                  value={composeType}
                  onChange={(e) => setComposeType(e.target.value as PartnerLogTargetType)}
                  className="mt-1.5 w-full rounded-[10px] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm"
                >
                  {(Object.keys(TARGET_TYPE_META) as PartnerLogTargetType[]).map((t) => (
                    <option key={t} value={t}>
                      {TARGET_TYPE_META[t].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-caps">Author</label>
                <select
                  value={author}
                  onChange={(e) => {
                    setAuthor(e.target.value);
                    savePartnerAuthor(e.target.value);
                  }}
                  className="mt-1.5 w-full rounded-[10px] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm"
                >
                  {PARTNER_ROSTER.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label-caps">About</label>
              <input
                value={composeLabel}
                onChange={(e) => setComposeLabel(e.target.value)}
                placeholder="e.g. AgentGate, Agent security, Andreessen…"
                className="mt-1.5 w-full rounded-[10px] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="label-caps">Note</label>
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                rows={4}
                placeholder="What should the next partner reading this know?"
                className="mt-1.5 w-full resize-none rounded-[10px] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-[0.975rem] leading-relaxed"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!composeLabel.trim() || !composeBody.trim()}
            >
              {saved ? "Posted" : "Post to partner log"}
            </button>
          </form>
        </Panel>

        <Panel className="!p-0 overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="title text-[1.2rem]">Recent thread</h2>
                <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                  Chronological across the book — click through to the object.
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {TYPE_FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={cn(
                      "rounded-md px-2 py-1 text-[0.7rem] font-medium transition",
                      filter === f
                        ? "bg-[var(--signal-dim)] text-[var(--signal)]"
                        : "text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]",
                    )}
                  >
                    {f === "all" ? "All" : TARGET_TYPE_META[f].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="max-h-[32rem] overflow-y-auto px-5">
            {visible.length ? (
              visible.map((e) => (
                <NoteCard key={e.id} entry={e} showTarget onRemove={removePartnerNote} />
              ))
            ) : (
              <div className="py-12">
                <EmptyState>No notes in this filter.</EmptyState>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
