/**
 * Interest Desk — YC Demo Day “like” + Investor Day mutual matching for partner meetings.
 * Persistence lives in DB-backed partner watchlists (`/api/watchlists` via useInterest).
 * Helpers here stay pure: match schedule, markdown, meeting handoff.
 */

import type { Company } from "@/lib/types";

export type InterestState = {
  liked: string[];
  /** company_id ordered best-first (index 0 = #1) */
  ranked: string[];
  updated_at: string;
};

export type MatchMeeting = {
  slot: number;
  company_id: string;
  company_name: string;
  partner_rank: number;
  company_rank: number;
  quality: number;
  minutes: number;
  ask: string;
};

export type MatchSchedule = {
  meetings: MatchMeeting[];
  unmatched_liked: string[];
  counsel: string;
  average_quality: number;
};

export const INTEREST_KEY = "signal.interest.v1";
export const INTEREST_EVENT = "signal:interest-changed";
/** One-shot handoff: Interest Desk → Partner Meeting OS */
export const INTEREST_MEETING_HANDOFF_KEY = "signal.interest.meeting_handoff.v1";

const SLOT_MINUTES = 20;
const MAX_SLOTS = 8;

export function emptyInterest(): InterestState {
  return { liked: [], ranked: [], updated_at: new Date().toISOString() };
}

function normalize(state: InterestState): InterestState {
  const liked = Array.from(new Set(state.liked.filter(Boolean)));
  const ranked = state.ranked.filter((id) => liked.includes(id));
  for (const id of liked) {
    if (!ranked.includes(id)) ranked.push(id);
  }
  return {
    liked,
    ranked,
    updated_at: state.updated_at || new Date().toISOString(),
  };
}

export function loadInterest(): InterestState {
  if (typeof window === "undefined") return emptyInterest();
  try {
    const raw = localStorage.getItem(INTEREST_KEY);
    if (!raw) return emptyInterest();
    const parsed = JSON.parse(raw) as InterestState;
    if (!parsed || !Array.isArray(parsed.liked)) return emptyInterest();
    return normalize({
      liked: parsed.liked,
      ranked: Array.isArray(parsed.ranked) ? parsed.ranked : [],
      updated_at: parsed.updated_at || new Date().toISOString(),
    });
  } catch {
    return emptyInterest();
  }
}

export function saveInterest(state: InterestState) {
  if (typeof window === "undefined") return;
  const next = normalize({ ...state, updated_at: new Date().toISOString() });
  localStorage.setItem(INTEREST_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(INTEREST_EVENT));
}

/** Drop ids that no longer exist in the book; keeps stack-rank order. */
export function pruneInterest(state: InterestState, knownIds: Iterable<string>): InterestState {
  const known = new Set(knownIds);
  const liked = state.liked.filter((id) => known.has(id));
  const ranked = state.ranked.filter((id) => known.has(id) && liked.includes(id));
  for (const id of liked) {
    if (!ranked.includes(id)) ranked.push(id);
  }
  if (
    liked.length === state.liked.length &&
    ranked.length === state.ranked.length &&
    liked.every((id, i) => id === state.liked[i]) &&
    ranked.every((id, i) => id === state.ranked[i])
  ) {
    return state;
  }
  return { liked, ranked, updated_at: new Date().toISOString() };
}

export function toggleLike(state: InterestState, companyId: string): InterestState {
  const liked = state.liked.includes(companyId)
    ? state.liked.filter((id) => id !== companyId)
    : [...state.liked, companyId];
  const ranked = state.ranked.filter((id) => liked.includes(id));
  for (const id of liked) {
    if (!ranked.includes(id)) ranked.push(id);
  }
  return { liked, ranked, updated_at: new Date().toISOString() };
}

export function setRankOrder(state: InterestState, ranked: string[]): InterestState {
  const clean = ranked.filter((id) => state.liked.includes(id));
  for (const id of state.liked) {
    if (!clean.includes(id)) clean.push(id);
  }
  return { ...state, ranked: clean, updated_at: new Date().toISOString() };
}

export function moveRank(state: InterestState, companyId: string, dir: -1 | 1): InterestState {
  const ranked = [...state.ranked];
  const i = ranked.indexOf(companyId);
  if (i < 0) return state;
  const j = i + dir;
  if (j < 0 || j >= ranked.length) return state;
  [ranked[i], ranked[j]] = [ranked[j], ranked[i]];
  return setRankOrder(state, ranked);
}

/** Stack-rank order among currently liked ids (best-first). */
export function rankedLikedIds(state: InterestState): string[] {
  return normalize(state).ranked;
}

/** 1-based rank in the stack, or null if not liked. */
export function interestRankOf(state: InterestState, companyId: string): number | null {
  const i = rankedLikedIds(state).indexOf(companyId);
  return i >= 0 ? i + 1 : null;
}

export function subscribeInterest(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (e: StorageEvent) => {
    if (e.key === INTEREST_KEY || e.key === null) onChange();
  };
  window.addEventListener(INTEREST_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(INTEREST_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Gale-Shapley–inspired many-to-one: partner proposes down their ranked list;
 * each company accepts the best partner proposal until capacity (1 meeting each
 * in this simplified desk — partner has MAX_SLOTS capacity).
 */
export function buildMeetingMatch(
  companies: Company[],
  state: InterestState,
  opts?: { maxSlots?: number; slotMinutes?: number },
): MatchSchedule {
  const maxSlots = opts?.maxSlots ?? MAX_SLOTS;
  const minutes = opts?.slotMinutes ?? SLOT_MINUTES;
  const byId = new Map(companies.map((c) => [c.id, c]));
  const partnerOrder = rankedLikedIds(state).filter((id) => byId.has(id));

  // Company preference: higher thesis_score = stronger mutual interest proxy
  const companyPref = [...partnerOrder].sort((a, b) => {
    const sa = byId.get(a)?.thesis_score ?? 0;
    const sb = byId.get(b)?.thesis_score ?? 0;
    return sb - sa;
  });
  const companyRankOf = new Map(companyPref.map((id, i) => [id, i + 1]));
  const partnerRankOf = new Map(partnerOrder.map((id, i) => [id, i + 1]));

  const matched: string[] = [];
  const meetings: MatchMeeting[] = [];

  for (const id of partnerOrder) {
    if (matched.length >= maxSlots) break;
    if (matched.includes(id)) continue;
    matched.push(id);
    const c = byId.get(id)!;
    const pr = partnerRankOf.get(id) || matched.length;
    const cr = companyRankOf.get(id) || partnerOrder.length;
    const quality = Math.round(100 - ((pr + cr) / 2 - 1) * (80 / Math.max(partnerOrder.length, 1)));
    meetings.push({
      slot: meetings.length + 1,
      company_id: id,
      company_name: c.name,
      partner_rank: pr,
      company_rank: cr,
      quality: Math.max(20, Math.min(100, quality)),
      minutes,
      ask:
        c.recommendation === "Deep Dive"
          ? `Pressure-test why_now and relative rank (${c.relative_rank || "unranked"}).`
          : c.recommendation === "Watch"
            ? `What would move this to Deep Dive this cycle?`
            : `Confirm Pass spine — any reopen signal?`,
    });
  }

  // Waitlist follows stack-rank (not like-time order)
  const unmatched_liked = partnerOrder.filter((id) => !matched.includes(id));
  const average_quality = meetings.length
    ? Math.round(meetings.reduce((s, m) => s + m.quality, 0) / meetings.length)
    : 0;

  const counsel = !partnerOrder.length
    ? "Like companies in Directory, Launch, Pipeline, or Discovery, then stack-rank — matching needs preferences on both sides."
    : meetings.length >= maxSlots
      ? `Full day: ${meetings.length} × ${minutes}m slots. Average match quality ${average_quality}. Unmatched likes wait for the next block.`
      : `${meetings.length} meetings scheduled (avg quality ${average_quality}). Use ↑↓ to reorder — matcher reads your stack as investor preference.`;

  return { meetings, unmatched_liked, counsel, average_quality };
}

export function interestMarkdown(
  schedule: MatchSchedule,
  state: InterestState,
  companies?: Company[],
): string {
  const nameOf = (id: string) =>
    companies?.find((c) => c.id === id)?.name || id;
  const lines = [
    `# Interest Desk — meeting match`,
    "",
    schedule.counsel,
    "",
    "## Schedule",
    ...schedule.meetings.map(
      (m) =>
        `${m.slot}. **${m.company_name}** (${m.minutes}m) — partner #${m.partner_rank} · company #${m.company_rank} · quality ${m.quality} — ${m.ask}`,
    ),
    "",
    state.ranked.length
      ? `## Your stack rank\n${rankedLikedIds(state)
          .map((id, i) => `${i + 1}. ${nameOf(id)}`)
          .join("\n")}`
      : "",
    schedule.unmatched_liked.length
      ? `\n## Waitlist (next block)\n${schedule.unmatched_liked
          .map((id, i) => `${i + 1}. ${nameOf(id)}`)
          .join("\n")}`
      : "",
  ];
  return lines.filter(Boolean).join("\n");
}

export type InterestMeetingHandoff = {
  created_at: string;
  meetings: MatchMeeting[];
  unmatched_liked: string[];
  counsel: string;
  average_quality: number;
};

export function pushInterestToMeeting(schedule: MatchSchedule): InterestMeetingHandoff {
  const payload: InterestMeetingHandoff = {
    created_at: new Date().toISOString(),
    meetings: schedule.meetings,
    unmatched_liked: schedule.unmatched_liked,
    counsel: schedule.counsel,
    average_quality: schedule.average_quality,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(INTEREST_MEETING_HANDOFF_KEY, JSON.stringify(payload));
  }
  return payload;
}

export function consumeInterestMeetingHandoff(): InterestMeetingHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(INTEREST_MEETING_HANDOFF_KEY);
    if (!raw) return null;
    localStorage.removeItem(INTEREST_MEETING_HANDOFF_KEY);
    const parsed = JSON.parse(raw) as InterestMeetingHandoff;
    if (!parsed || !Array.isArray(parsed.meetings)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function peekInterestMeetingHandoff(): InterestMeetingHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(INTEREST_MEETING_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InterestMeetingHandoff;
    if (!parsed || !Array.isArray(parsed.meetings)) return null;
    return parsed;
  } catch {
    return null;
  }
}
