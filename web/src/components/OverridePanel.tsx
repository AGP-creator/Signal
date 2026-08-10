"use client";

import { useEffect, useState } from "react";
import type { OverrideRec } from "@/lib/judgment";
import { loadOverrides, removeOverride, upsertOverride } from "@/lib/overrideStore";
import { Eyebrow, Panel } from "@/components/ui";
import { cn } from "@/lib/utils";

const RECS: OverrideRec[] = ["Deep Dive", "Watch", "Pass"];

export function OverridePanel({
  companyId,
  companyName,
  slug,
  signalRec,
}: {
  companyId: string;
  companyName: string;
  slug?: string | null;
  signalRec?: string | null;
}) {
  const [partnerRec, setPartnerRec] = useState<OverrideRec>("Watch");
  const [reason, setReason] = useState("");
  const [dimension, setDimension] = useState("judgment");
  const [saved, setSaved] = useState(false);
  const [existing, setExisting] = useState<string | null>(null);

  useEffect(() => {
    const row = loadOverrides().find((o) => o.company_id === companyId && o.partner === "Partner");
    if (row) {
      setPartnerRec(row.partner_rec);
      setReason(row.reason);
      setDimension(row.dimension_hint || "judgment");
      setExisting(`${row.signal_rec} → ${row.partner_rec}`);
    }
  }, [companyId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    upsertOverride({
      company_id: companyId,
      company_name: companyName,
      slug,
      signal_rec: signalRec || "Watch",
      partner_rec: partnerRec,
      reason: reason.trim(),
      dimension_hint: dimension,
    });
    setSaved(true);
    setExisting(`${signalRec || "Watch"} → ${partnerRec}`);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Panel>
      <Eyebrow className="!text-[var(--signal)]">Override ledger</Eyebrow>
      <h2 className="title mt-2 text-[1.2rem]">Disagree with Signal</h2>
      <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--muted)]">
        Partners own conviction. Your disagreement becomes policy fuel — versioned judgment, not a
        black-box fine-tune.
      </p>
      {existing && (
        <div className="mt-3 rounded-[10px] bg-[var(--panel-2)] px-3 py-2 text-[0.8125rem] text-[var(--deep)]">
          Logged: {existing}
        </div>
      )}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <div className="label-caps">
            Signal says
          </div>
          <div className="mt-1 font-semibold">{signalRec || "—"}</div>
        </div>
        <div>
          <div className="label-caps">
            Partner says
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {RECS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setPartnerRec(r)}
                className={cn(
                  "rounded-[8px] px-2.5 py-1 text-[0.8125rem] font-medium transition",
                  partnerRec === r
                    ? "bg-[var(--signal-dim)] text-[var(--signal)]"
                    : "bg-[var(--panel-2)] text-[var(--muted)] hover:text-[var(--text)]",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label-caps">
            Dimension
          </label>
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value)}
            className="mt-1.5 w-full rounded-[10px] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm"
          >
            {[
              "thesis_fit",
              "team_quality",
              "cap_table",
              "traction",
              "moat",
              "valuation",
              "timing",
              "judgment",
            ].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-caps">
            Reason (required)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Why is Signal wrong — or right but for the wrong reason?"
            className="mt-1.5 w-full resize-none rounded-[10px] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-[0.975rem] leading-relaxed"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary !py-1.5 !text-xs">
            {saved ? "Logged ✓" : "Log override"}
          </button>
          {existing && (
            <button
              type="button"
              className="btn btn-ghost !py-1.5 !text-xs"
              onClick={() => {
                removeOverride(companyId);
                setExisting(null);
                setReason("");
              }}
            >
              Clear
            </button>
          )}
          <a href="/judgment" className="btn btn-ghost !py-1.5 !text-xs">
            Open Judgment OS
          </a>
        </div>
      </form>
    </Panel>
  );
}
