"use client";

import {
  buildDemoTrails,
  mergeTrailsWithCompanies,
  type DealTrail,
} from "@/lib/icTrail";
import type { DiligenceItem, IcStage, IcVote, VoteChoice } from "@/lib/icTrail";
import type { Company } from "@/lib/types";

const KEY = "signal.ic.trails.v1";

export function loadTrails(): DealTrail[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DealTrail[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTrails(rows: DealTrail[], opts?: { silent?: boolean }) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(rows));
  if (!opts?.silent) {
    window.dispatchEvent(new CustomEvent("signal:ic-changed"));
  }
}

export function upsertTrail(trail: DealTrail) {
  const rest = loadTrails().filter((t) => t.company_id !== trail.company_id);
  saveTrails([{ ...trail, updated_at: new Date().toISOString() }, ...rest]);
}

/** Persist a trail if missing (merge can show Deep Dives that were never written). */
export function ensureTrail(trail: DealTrail): DealTrail {
  const found = loadTrails().find((t) => t.company_id === trail.company_id);
  if (found) return found;
  upsertTrail(trail);
  return trail;
}

/**
 * Resolve a writable trail. Prefer storage; if missing, persist `seed` so
 * vote / DD / stage actions never silently no-op.
 */
function resolveTrail(companyId: string, seed?: DealTrail | null): DealTrail | null {
  const found = loadTrails().find((t) => t.company_id === companyId);
  if (found) return found;
  if (seed && seed.company_id === companyId) {
    const rest = loadTrails().filter((t) => t.company_id !== companyId);
    // Silent: the upcoming mutation will emit signal:ic-changed once.
    saveTrails([{ ...seed, updated_at: new Date().toISOString() }, ...rest], { silent: true });
    return seed;
  }
  return null;
}

/** Write any merge-only trails so later mutations (vote, DD, stage) can find them. */
export function persistMissingTrails(merged: DealTrail[]): DealTrail[] {
  const stored = loadTrails();
  const byId = new Map(stored.map((t) => [t.company_id, t]));
  let added = false;
  for (const t of merged) {
    if (!byId.has(t.company_id)) {
      byId.set(t.company_id, t);
      added = true;
    }
  }
  if (!added) return stored;
  const next = Array.from(byId.values());
  // Silent: callers already refresh UI; avoid re-entrant signal:ic-changed loops.
  saveTrails(next, { silent: true });
  return next;
}

/**
 * Canonical client load: seed demos once, merge Deep Dives, persist any
 * UI-only rows so votes / DD / stage actions never silently no-op.
 */
export function loadMergedTrails(companies: Company[]): DealTrail[] {
  const demos = buildDemoTrails(companies);
  const stored = seedIfEmpty(demos);
  const merged = mergeTrailsWithCompanies(companies, stored.length ? stored : demos);
  const synced = persistMissingTrails(merged);
  return mergeTrailsWithCompanies(companies, synced.length ? synced : merged);
}

export function advanceStage(
  companyId: string,
  stage: IcStage,
  actor: string,
  note: string,
  seed?: DealTrail | null,
) {
  const t = resolveTrail(companyId, seed);
  if (!t) return null;
  const next: DealTrail = {
    ...t,
    stage,
    events: [
      {
        id: `ev_${companyId}_${Date.now()}`,
        stage,
        actor,
        note,
        at: new Date().toISOString(),
      },
      ...t.events,
    ],
    updated_at: new Date().toISOString(),
  };
  upsertTrail(next);
  return next;
}

export function castVote(
  companyId: string,
  input: { partner: string; choice: VoteChoice; note: string },
  seed?: DealTrail | null,
) {
  const t = resolveTrail(companyId, seed);
  if (!t) return null;
  const vote: IcVote = {
    id: `vote_${companyId}_${Date.now()}`,
    partner: input.partner.trim() || "GP",
    choice: input.choice,
    note: input.note.trim(),
    at: new Date().toISOString(),
  };
  const votes = [vote, ...t.votes.filter((v) => v.partner !== vote.partner)];
  const next: DealTrail = {
    ...t,
    stage: t.stage === "partner_meeting" || t.stage === "diligence" ? "ic_vote" : t.stage,
    votes,
    events: [
      {
        id: `ev_vote_${Date.now()}`,
        stage: "ic_vote",
        actor: vote.partner,
        note: `Voted ${input.choice}${vote.note ? ` — ${vote.note}` : ""}`,
        at: vote.at,
      },
      ...t.events,
    ],
    updated_at: vote.at,
  };
  upsertTrail(next);
  return next;
}

export function setDiligenceStatus(
  companyId: string,
  itemId: string,
  status: DiligenceItem["status"],
  note?: string,
  seed?: DealTrail | null,
) {
  const t = resolveTrail(companyId, seed);
  if (!t) return null;
  const diligence = t.diligence.map((d) =>
    d.id === itemId ? { ...d, status, note: note ?? d.note } : d,
  );
  const next = { ...t, diligence, updated_at: new Date().toISOString() };
  upsertTrail(next);
  return next;
}

/** @deprecated Prefer ensureTrail — kept for callers that only seed one row. */
export function ensureTrailSeeded(trail: DealTrail) {
  ensureTrail(trail);
}

export function seedIfEmpty(demos: DealTrail[]) {
  if (loadTrails().length) return loadTrails();
  saveTrails(demos, { silent: true });
  return demos;
}
