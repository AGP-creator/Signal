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
    <div className="panel p-5 md:p-6">
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
            Drift alarm
          </Link>
        )}
      </div>
      <div className="title mt-3 text-[1.85rem]">
        {dominantPct}
        <span className="text-[var(--faint)]"> / </span>
        {tacticalPct}
      </div>
      <div className="mt-1.5 text-[0.9rem] text-[var(--muted)]">Dominant / Tactical · target 60/40</div>
      <div className="mt-5 flex h-2.5 overflow-hidden rounded-md bg-[var(--panel-2)] ring-1 ring-[var(--line)]">
        <motion.div
          className="h-full bg-[var(--signal)]"
          initial={{ width: 0 }}
          animate={{ width: `${dominantPct}%` }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          className="h-full bg-[var(--deep)]"
          initial={{ width: 0 }}
          animate={{ width: `${tacticalPct}%` }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
        />
      </div>
      <div className="mt-2.5 flex justify-between text-[0.75rem] text-[var(--muted)]">
        <span>Dominant tech + growth</span>
        <span>Tactical</span>
      </div>
      {alarm && (
        <p
          className={cn(
            "mt-3 text-[0.8rem]",
            status === "hard" ? "text-[var(--danger)]" : "text-[var(--warn)]",
          )}
        >
          {alarm} — open Judgment OS.
        </p>
      )}
    </div>
  );
}
