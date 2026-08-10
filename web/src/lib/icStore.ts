"use client";

import type { DealTrail, DiligenceItem, IcStage, IcVote, VoteChoice } from "@/lib/icTrail";

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

export function saveTrails(rows: DealTrail[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent("signal:ic-changed"));
}

export function upsertTrail(trail: DealTrail) {
  const rest = loadTrails().filter((t) => t.company_id !== trail.company_id);
  saveTrails([{ ...trail, updated_at: new Date().toISOString() }, ...rest]);
}

export function advanceStage(companyId: string, stage: IcStage, actor: string, note: string) {
  const trails = loadTrails();
  const t = trails.find((x) => x.company_id === companyId);
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
) {
  const trails = loadTrails();
  const t = trails.find((x) => x.company_id === companyId);
  if (!t) return null;
  const vote: IcVote = {
    id: `vote_${companyId}_${Date.now()}`,
    partner: input.partner,
    choice: input.choice,
    note: input.note,
    at: new Date().toISOString(),
  };
  const votes = [vote, ...t.votes.filter((v) => v.partner !== input.partner)];
  const next: DealTrail = {
    ...t,
    stage: t.stage === "partner_meeting" || t.stage === "diligence" ? "ic_vote" : t.stage,
    votes,
    events: [
      {
        id: `ev_vote_${Date.now()}`,
        stage: "ic_vote",
        actor: input.partner,
        note: `Voted ${input.choice}${input.note ? ` — ${input.note}` : ""}`,
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
) {
  const trails = loadTrails();
  const t = trails.find((x) => x.company_id === companyId);
  if (!t) return null;
  const diligence = t.diligence.map((d) =>
    d.id === itemId ? { ...d, status, note: note ?? d.note } : d,
  );
  const next = { ...t, diligence, updated_at: new Date().toISOString() };
  upsertTrail(next);
  return next;
}

export function ensureTrailSeeded(trail: DealTrail) {
  const existing = loadTrails();
  if (existing.some((t) => t.company_id === trail.company_id)) return;
  if (existing.length === 0) {
    // First write: caller should seed demos; just upsert this one
    saveTrails([trail]);
    return;
  }
  upsertTrail(trail);
}

export function seedIfEmpty(demos: DealTrail[]) {
  if (loadTrails().length) return loadTrails();
  saveTrails(demos);
  return demos;
}
