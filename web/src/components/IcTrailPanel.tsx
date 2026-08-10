"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eyebrow, Panel } from "@/components/ui";
import {
  diligenceProgress,
  STAGE_LABEL,
  seedTrailFromCompany,
  type DealTrail,
  type IcStage,
} from "@/lib/icTrail";
import { advanceStage, loadTrails, upsertTrail } from "@/lib/icStore";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";

export function IcTrailPanel({ company }: { company: Company }) {
  const [trail, setTrail] = useState<DealTrail | null>(null);

  function refresh() {
    const stored = loadTrails();
    const found = stored.find((t) => t.company_id === company.id);
    setTrail(found || seedTrailFromCompany(company));
  }

  useEffect(() => {
    refresh();
    const sync = () => refresh();
    window.addEventListener("signal:ic-changed", sync);
    return () => window.removeEventListener("signal:ic-changed", sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id]);

  if (!trail) return null;
  const prog = diligenceProgress(trail.diligence);

  function ensureAndAdvance(stage: IcStage) {
    const stored = loadTrails();
    if (!stored.some((t) => t.company_id === company.id)) {
      upsertTrail(trail!);
    }
    advanceStage(company.id, stage, "Partner", `Set stage to ${STAGE_LABEL[stage]} from company brief`);
    refresh();
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow className="!text-[var(--deep)]">IC trail</Eyebrow>
          <div className="mt-1 text-lg font-semibold">{STAGE_LABEL[trail.stage]}</div>
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
            Sponsor {trail.sponsor} · DD {prog.done}/{prog.total} · {trail.votes.length} vote
            {trail.votes.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/ic" className="link-quiet text-[0.8125rem] font-medium">
          Full governance →
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {(
          [
            "deep_dive",
            "diligence",
            "partner_meeting",
            "ic_vote",
            "watch",
            "pass",
          ] as IcStage[]
        ).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ensureAndAdvance(s)}
            className={cn(
              "rounded-[8px] border px-2 py-1 text-[0.7rem] font-semibold transition",
              trail.stage === s
                ? "border-[var(--deep)] bg-[var(--deep-dim)] text-[var(--deep)]"
                : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]",
            )}
          >
            {STAGE_LABEL[s]}
          </button>
        ))}
      </div>
      {trail.events[0] ? (
        <p className="mt-3 text-[0.75rem] text-[var(--faint)]">Latest: {trail.events[0].note}</p>
      ) : null}
    </Panel>
  );
}
