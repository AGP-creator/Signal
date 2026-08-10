import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtMoneyM(v?: number | null) {
  if (v == null) return "—";
  return `$${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
}

export function fmtPct(v?: number | null) {
  if (v == null) return "—";
  return `${v.toFixed(0)}%`;
}

export function recClass(rec?: string | null) {
  if (rec === "Deep Dive") return "rec-deep";
  if (rec === "Watch") return "rec-watch";
  return "rec-pass";
}

export function portfolioMix(companies: { pipeline_bucket?: string | null }[]) {
  const n = companies.length || 1;
  const dominant = companies.filter((c) => c.pipeline_bucket === "dominant_tech_growth").length;
  const tactical = companies.filter((c) => c.pipeline_bucket === "tactical_sector_agnostic").length;
  return {
    dominantPct: Math.round((100 * dominant) / n),
    tacticalPct: Math.round((100 * tactical) / n),
    dominant,
    tactical,
    n: companies.length,
  };
}
