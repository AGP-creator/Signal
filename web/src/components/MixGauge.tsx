"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Eyebrow } from "@/components/ui";
import { cn } from "@/lib/utils";

export function MixGauge({
  dominantPct,
  tacticalPct,
}: {
  dominantPct: number;
  tacticalPct: number;
}) {
  const delta = Math.abs(tacticalPct - 40);
  const status = delta >= 12 ? "hard" : delta >= 6 ? "soft" : "ok";
  const alarm =
    status === "hard"
      ? tacticalPct > 40
        ? `Hard drift — tactical ${tacticalPct}%`
        : `Hard drift — dominant only ${dominantPct}%`
      : status === "soft"
        ? `Soft drift vs 60/40`
        : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Eyebrow>Portfolio mix</Eyebrow>
        {status !== "ok" && (
          <Link
            href="/judgment"
            className={cn(
              "label-caps",
              status === "hard" ? "text-[var(--danger)]" : "text-[var(--warn)]",
            )}
          >
            Drift
          </Link>
        )}
      </div>
      <div className="mono mt-3 text-[1.65rem] font-medium tracking-tight">
        {dominantPct}
        <span className="text-[var(--faint)]"> / </span>
        {tacticalPct}
      </div>
      <div className="mt-1 text-[0.8125rem] text-[var(--muted)]">Dominant / Tactical · 60/40</div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
        <div className="flex h-full w-full">
          <motion.div
            className="h-full bg-[var(--signal)]"
            initial={{ width: 0 }}
            animate={{ width: `${dominantPct}%` }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="h-full bg-[var(--deep)] opacity-85"
            initial={{ width: 0 }}
            animate={{ width: `${tacticalPct}%` }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          />
        </div>
      </div>
      <div className="mt-2.5 flex justify-between text-[0.7rem] text-[var(--faint)]">
        <span>Dominant · {dominantPct}%</span>
        <span>Tactical · {tacticalPct}%</span>
      </div>
      {alarm && (
        <p
          className={cn(
            "mt-3 text-[0.75rem]",
            status === "hard" ? "text-[var(--danger)]" : "text-[var(--warn)]",
          )}
        >
          {alarm}
        </p>
      )}
    </div>
  );
}
