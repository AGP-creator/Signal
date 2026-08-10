"use client";

import type { OverrideRec, PartnerOverride } from "@/lib/judgment";

const KEY = "signal.judgment.overrides.v1";

export function loadOverrides(): PartnerOverride[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PartnerOverride[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOverrides(rows: PartnerOverride[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent("signal:overrides-changed"));
}

export function upsertOverride(input: {
  company_id: string;
  company_name: string;
  slug?: string | null;
  signal_rec: string;
  partner_rec: OverrideRec;
  partner?: string;
  reason: string;
  dimension_hint?: string | null;
}): PartnerOverride {
  const partner = input.partner || "Partner";
  const row: PartnerOverride = {
    id: `ov_${input.company_id}_${Date.now()}`,
    company_id: input.company_id,
    company_name: input.company_name,
    slug: input.slug,
    signal_rec: input.signal_rec,
    partner_rec: input.partner_rec,
    partner,
    reason: input.reason,
    dimension_hint: input.dimension_hint || null,
    created_at: new Date().toISOString(),
  };
  const existing = loadOverrides().filter(
    (o) => !(o.company_id === row.company_id && o.partner === partner),
  );
  saveOverrides([row, ...existing]);
  return row;
}

export function removeOverride(companyId: string, partner = "Partner") {
  saveOverrides(loadOverrides().filter((o) => !(o.company_id === companyId && o.partner === partner)));
}
