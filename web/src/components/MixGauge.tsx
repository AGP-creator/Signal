"use client";

import { motion } from "framer-motion";

export function MixGauge({
  dominantPct,
  tacticalPct,
}: {
  dominantPct: number;
  tacticalPct: number;
}) {
  return (
    <div className="panel p-5">
      <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Portfolio mix</div>
      <div className="display mt-2 text-3xl font-bold">
        {dominantPct}
        <span className="text-[var(--muted)]">/</span>
        {tacticalPct}
      </div>
      <div className="mt-1 text-sm text-[var(--muted)]">Dominant / Tactical · target 60/40</div>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[var(--panel-2)]">
        <motion.div
          className="h-full bg-[var(--signal)]"
          initial={{ width: 0 }}
          animate={{ width: `${dominantPct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <motion.div
          className="h-full bg-[var(--deep)]"
          initial={{ width: 0 }}
          animate={{ width: `${tacticalPct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-[var(--muted)]">
        <span>Dominant tech + growth</span>
        <span>Tactical</span>
      </div>
    </div>
  );
}
