"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { EmptyState, PageHeader, Panel, RecBadge } from "@/components/ui";
import {
  buildMeetingMatch,
  interestMarkdown,
  pushInterestToMeeting,
  type MatchSchedule,
} from "@/lib/interest";
import { PARTNER_ROSTER } from "@/lib/partnerLog";
import { useInterest } from "@/lib/useInterest";
import type { ImportPreviewRow } from "@/lib/watchlists";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";

export function InterestDesk({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const knownIds = useMemo(() => companies.map((c) => c.id), [companies]);
  const {
    partner,
    setPartner,
    state,
    items,
    byPartner,
    overlap,
    loading,
    error,
    like,
    rank,
    setNote,
    noteFor,
    reload,
  } = useInterest(knownIds);

  const [copied, setCopied] = useState(false);
  const [pushed, setPushed] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewRow[] | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);

  const byId = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const rankedCompanies = state.ranked
    .map((id) => byId.get(id))
    .filter(Boolean) as Company[];

  const schedule: MatchSchedule = useMemo(
    () => buildMeetingMatch(companies, state),
    [companies, state],
  );

  const firmOverlap = useMemo(() => {
    return rankedCompanies
      .map((c) => {
        const partners = (overlap[c.id] || []).filter((p) => p !== partner);
        return { company: c, partners };
      })
      .filter((r) => r.partners.length > 0);
  }, [rankedCompanies, overlap, partner]);

  const partnerCounts = useMemo(() => {
    return Object.entries(byPartner)
      .map(([name, list]) => ({ name, count: list.length }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [byPartner]);

  const deepPool = companies
    .filter((c) => c.recommendation === "Deep Dive" || (c.thesis_score ?? 0) >= 70)
    .slice(0, 12);

  async function copySchedule() {
    await navigator.clipboard.writeText(interestMarkdown(schedule, state, companies));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function pushToMeeting() {
    pushInterestToMeeting(schedule);
    setPushed(true);
    setTimeout(() => setPushed(false), 2000);
  }

  function startNote(companyId: string) {
    setEditingNote(companyId);
    setNoteDraft(noteFor(companyId));
  }

  async function saveNote(companyId: string) {
    await setNote(companyId, noteDraft.trim());
    setEditingNote(null);
  }

  async function onFileSelected(file: File | null) {
    if (!file) return;
    setImporting(true);
    setImportError(null);
    setImportSummary(null);
    setPreview(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("partner_name", partner);
      fd.set("mode", "preview");
      const res = await fetch("/api/watchlists/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Preview failed");
      }
      setPreview((data.preview || []) as ImportPreviewRow[]);
      const s = data.summary || {};
      setImportSummary(
        `${data.row_count || 0} rows · ${s.match || 0} match existing · ${s.create || 0} new Watch`,
      );
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function commitImport() {
    if (!preview?.length) return;
    setImporting(true);
    setImportError(null);
    try {
      const last = pendingFileRef.current;
      if (!last) {
        setImportError("Choose the Excel file again, then Confirm import.");
        return;
      }
      const fd = new FormData();
      fd.set("file", last);
      fd.set("partner_name", partner);
      fd.set("mode", "commit");
      const res = await fetch("/api/watchlists/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Import failed");
      }
      setImportSummary(
        `Imported · ${data.matched || 0} matched · ${data.created || 0} created · ${data.added_to_list || 0} added to your list`,
      );
      setPreview(null);
      pendingFileRef.current = null;
      await reload(partner);
      router.refresh();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        live
        eyebrow="Partner watchlists"
        title="Interest Desk"
        description="Each partner keeps a ranked watchlist in the database. Like from Directory / Pipeline, add notes, see firm overlap, or upload Excel — new names land as partner-sourced Watch."
        actions={
          <>
            <label className="flex items-center gap-2 text-[0.8125rem] text-[var(--muted)]">
              <span className="label-caps !mb-0">Partner</span>
              <select
                className="field !py-1.5 !text-[0.8125rem]"
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
              >
                {PARTNER_ROSTER.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <Link href="/directory" className="btn btn-soft btn-sm">
              Browse directory
            </Link>
            {rankedCompanies.length >= 2 ? (
              <Link
                href={`/compare?ids=${encodeURIComponent(
                  rankedCompanies
                    .slice(0, 4)
                    .map((c) => c.id)
                    .join(","),
                )}`}
                className="btn btn-ghost btn-sm"
              >
                Compare stack →
              </Link>
            ) : null}
            <button type="button" className="btn btn-ghost btn-sm" onClick={copySchedule}>
              {copied ? "Copied ✓" : "Copy schedule.md"}
            </button>
          </>
        }
      />

      {(error || importError) && (
        <p className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-[0.8125rem] text-[var(--muted)]">
          {error || importError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="space-y-3 lg:col-span-1">
          <div>
            <h2 className="title text-[1.05rem]">Firm lists</h2>
            <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
              Who is carrying how many names right now.
            </p>
          </div>
          {!partnerCounts.length ? (
            <EmptyState>No partner watchlists yet.</EmptyState>
          ) : (
            <ul className="space-y-1.5">
              {partnerCounts.map((p) => (
                <li key={p.name}>
                  <button
                    type="button"
                    onClick={() => setPartner(p.name)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-[var(--radius)] border px-3 py-2 text-left text-[0.8125rem] transition",
                      p.name === partner
                        ? "border-[var(--signal)] bg-[var(--signal-dim)] text-[var(--signal)]"
                        : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--signal)]/40 hover:text-[var(--text)]",
                    )}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="mono text-[0.75rem]">{p.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="title text-[1.15rem]">Excel import</h2>
              <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                Download the template, fill companies, preview matches, then commit into the DB under{" "}
                <strong className="font-semibold text-[var(--text)]">{partner}</strong>.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="/api/watchlists/template" className="btn btn-soft btn-sm">
                Download template
              </a>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={importing}
                onClick={() => fileRef.current?.click()}
              >
                {importing ? "Working…" : "Upload Excel"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xlsm,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  pendingFileRef.current = f;
                  void onFileSelected(f);
                }}
              />
            </div>
          </div>
          {importSummary && (
            <p className="mono text-[0.75rem] text-[var(--faint)]">{importSummary}</p>
          )}
          {preview && preview.length > 0 && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--line)]">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Action</th>
                      <th>Company</th>
                      <th>Sector</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 40).map((row, i) => (
                      <tr key={`${row.company_id}-${i}`}>
                        <td className="mono text-[0.75rem]">{row.row ?? "—"}</td>
                        <td>
                          <span
                            className={cn(
                              "mono text-[0.75rem]",
                              row.action === "create" ? "text-[var(--signal)]" : "text-[var(--muted)]",
                            )}
                          >
                            {row.action}
                          </span>
                        </td>
                        <td className="font-medium">{row.company_name || row.name}</td>
                        <td className="text-[var(--muted)]">{row.sector_theme || "—"}</td>
                        <td className="text-[var(--muted)]">{row.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={importing}
                onClick={() => void commitImport()}
              >
                {importing ? "Committing…" : "Confirm import → DB"}
              </button>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="title text-[1.15rem]">{partner}&apos;s stack</h2>
              <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                Best-first. ↑↓ to reorder — matcher uses this as the investor preference list.
                {loading ? " Loading…" : ""}
              </p>
            </div>
            <span className="mono text-[0.75rem] text-[var(--faint)]">
              {rankedCompanies.length} likes
            </span>
          </div>

          {!rankedCompanies.length ? (
            <EmptyState>
              No likes yet — like from Directory, Launch, Pipeline, Discovery, upload Excel, or
              quick-add below.
            </EmptyState>
          ) : (
            <ol className="space-y-2">
              {rankedCompanies.map((c, i) => {
                const others = (overlap[c.id] || []).filter((p) => p !== partner);
                const item = items.find((it) => it.company_id === c.id);
                return (
                  <li
                    key={c.id}
                    className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="mono w-6 shrink-0 text-[0.75rem] text-[var(--faint)]">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/company/${c.id}`}
                          className="font-semibold hover:text-[var(--signal)]"
                        >
                          {c.name}
                        </Link>
                        <div className="truncate text-[0.75rem] text-[var(--muted)]">
                          {c.sector_theme} · score {c.thesis_score?.toFixed(0) ?? "—"}
                          {item?.source ? ` · ${item.source}` : ""}
                          {others.length ? ` · also: ${others.join(", ")}` : ""}
                        </div>
                      </div>
                      <RecBadge rec={c.recommendation} />
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm !px-2"
                          aria-label="Edit note"
                          onClick={() => startNote(c.id)}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm !px-2"
                          aria-label="Move up"
                          disabled={i === 0}
                          onClick={() => void rank(c.id, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm !px-2"
                          aria-label="Move down"
                          disabled={i === rankedCompanies.length - 1}
                          onClick={() => void rank(c.id, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm !px-2"
                          aria-label="Unlike"
                          onClick={() => void like(c.id)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    {editingNote === c.id ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          className="field flex-1 !py-1.5 text-[0.8125rem]"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="Why interesting?"
                        />
                        <button
                          type="button"
                          className="btn btn-soft btn-sm"
                          onClick={() => void saveNote(c.id)}
                        >
                          Save
                        </button>
                      </div>
                    ) : item?.note ? (
                      <p className="mt-2 text-[0.8125rem] text-[var(--muted)]">{item.note}</p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}

          <div className="border-t border-[var(--line)] pt-4">
            <div className="label-caps mb-2">Quick-add from Deep Dives</div>
            <div className="flex flex-wrap gap-2">
              {deepPool.map((c) => {
                const on = state.liked.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => void like(c.id)}
                    className={cn(
                      "rounded-[var(--radius)] border px-2.5 py-1.5 text-[0.8125rem] font-medium transition",
                      on
                        ? "border-[var(--signal)] bg-[var(--signal-dim)] text-[var(--signal)]"
                        : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--signal)]/40 hover:text-[var(--text)]",
                    )}
                  >
                    {on ? "✓ " : "+ "}
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel className="space-y-4">
            <div>
              <h2 className="title text-[1.15rem]">Meeting match</h2>
              <p className="mt-1 text-[0.875rem] leading-relaxed text-[var(--muted)]">
                {schedule.counsel}
              </p>
            </div>

            {!schedule.meetings.length ? (
              <EmptyState>No schedule yet — rank at least one liked company.</EmptyState>
            ) : (
              <div className="space-y-2">
                {schedule.meetings.map((m) => (
                  <div
                    key={m.company_id}
                    className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="font-semibold">
                        <span className="mono mr-2 text-[var(--faint)]">S{m.slot}</span>
                        <Link
                          href={`/company/${m.company_id}`}
                          className="hover:text-[var(--signal)]"
                        >
                          {m.company_name}
                        </Link>
                      </div>
                      <span className="mono text-[0.75rem] text-[var(--signal)]">Q{m.quality}</span>
                    </div>
                    <div className="mt-1 text-[0.75rem] text-[var(--faint)]">
                      {m.minutes}m · partner #{m.partner_rank} · company pref #{m.company_rank}
                    </div>
                    <p className="mt-2 text-[0.875rem] text-[var(--muted)]">{m.ask}</p>
                  </div>
                ))}
              </div>
            )}

            {schedule.unmatched_liked.length > 0 && (
              <p className="text-[0.8125rem] text-[var(--faint)]">
                Waitlist (stack order):{" "}
                {schedule.unmatched_liked
                  .map((id) => byId.get(id)?.name || id)
                  .join(", ")}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Link
                href="/meeting?from=interest"
                className="btn btn-soft btn-sm inline-flex"
                onClick={pushToMeeting}
              >
                {pushed ? "Pushed ✓" : "Push into Partner Meeting →"}
              </Link>
            </div>
          </Panel>

          <Panel className="space-y-3">
            <div>
              <h2 className="title text-[1.05rem]">Firm overlap</h2>
              <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                Names on your list that other partners also carry.
              </p>
            </div>
            {!firmOverlap.length ? (
              <EmptyState>No shared names yet — overlap appears as partners add the same companies.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {firmOverlap.map(({ company, partners }) => (
                  <li
                    key={company.id}
                    className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2 last:border-0"
                  >
                    <Link
                      href={`/company/${company.id}`}
                      className="font-medium hover:text-[var(--signal)]"
                    >
                      {company.name}
                    </Link>
                    <span className="mono text-[0.75rem] text-[var(--faint)]">
                      {partners.join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
