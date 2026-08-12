/**
 * Partner Log — threaded notes on deals, companies, sectors, themes, and competitors.
 * Shared across partners in the firm (local demo store; same pattern as overrides).
 */

export type PartnerLogTargetType =
  | "company"
  | "deal"
  | "sector"
  | "theme"
  | "competitor";

export type PartnerLogEntry = {
  id: string;
  target_type: PartnerLogTargetType;
  target_id: string;
  target_label: string;
  body: string;
  author: string;
  created_at: string;
  updated_at?: string | null;
};

export type PartnerLogTarget = {
  type: PartnerLogTargetType;
  id: string;
  label: string;
};

const KEY = "signal.partner.log.v1";
const AUTHOR_KEY = "signal.partner.log.author.v1";
const EVENT = "signal:partner-log-changed";

export const PARTNER_ROSTER = [
  "Alex Chen",
  "Maya Patel",
  "Jordan Blake",
  "Sam Rivera",
  "Priya Nair",
] as const;

export const TARGET_TYPE_META: Record<
  PartnerLogTargetType,
  { label: string; plural: string }
> = {
  company: { label: "Company", plural: "Companies" },
  deal: { label: "Deal", plural: "Deals" },
  sector: { label: "Sector", plural: "Sectors" },
  theme: { label: "Theme", plural: "Themes" },
  competitor: { label: "Competitor", plural: "Competitors" },
};

const SEED: PartnerLogEntry[] = [
  {
    id: "plog_seed_1",
    target_type: "company",
    target_id: "c_agentgate",
    target_label: "AgentGate",
    body: "Met founder at a16z Speedrun — authz story is crisp. Ask for reference from the security lead who piloted last quarter.",
    author: "Maya Patel",
    created_at: "2026-08-08T16:20:00.000Z",
  },
  {
    id: "plog_seed_2",
    target_type: "company",
    target_id: "c_agentgate",
    target_label: "AgentGate",
    body: "+1 on the reference. Also check whether Okta partnership is exclusive — changes our co-invest posture.",
    author: "Alex Chen",
    created_at: "2026-08-09T11:05:00.000Z",
  },
  {
    id: "plog_seed_3",
    target_type: "competitor",
    target_id: "andreessen-horowitz",
    target_label: "Andreessen Horowitz",
    body: "They're leaning into agent infra this cycle. Prefer syndicate when we already have founder access; compete when the round is quiet.",
    author: "Jordan Blake",
    created_at: "2026-08-07T19:40:00.000Z",
  },
  {
    id: "plog_seed_4",
    target_type: "sector",
    target_id: "agent-security",
    target_label: "Agent security",
    body: "Sector board: keep 2–3 names max. Crowding rising — patience is alpha on me-too auth wrappers.",
    author: "Priya Nair",
    created_at: "2026-08-10T14:12:00.000Z",
  },
  {
    id: "plog_seed_5",
    target_type: "theme",
    target_id: "physical-ai",
    target_label: "Physical AI",
    body: "Theme note for Monday: hardware+software pairs only. Pure sim plays stay on Watch unless customer LOIs are signed.",
    author: "Sam Rivera",
    created_at: "2026-08-11T09:30:00.000Z",
  },
];

function canUseStorage() {
  return typeof window !== "undefined";
}

export function loadPartnerLog(): PartnerLogEntry[] {
  if (!canUseStorage()) return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return [...SEED];
    }
    const parsed = JSON.parse(raw) as PartnerLogEntry[];
    if (!Array.isArray(parsed)) return [...SEED];
    return parsed
      .filter((e) => e && typeof e.body === "string" && e.target_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  } catch {
    return [...SEED];
  }
}

export function savePartnerLog(rows: PartnerLogEntry[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function loadPartnerAuthor(): string {
  if (!canUseStorage()) return PARTNER_ROSTER[0];
  try {
    const raw = localStorage.getItem(AUTHOR_KEY);
    if (raw && raw.trim()) return raw.trim();
  } catch {
    /* ignore */
  }
  return PARTNER_ROSTER[0];
}

export function savePartnerAuthor(name: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(AUTHOR_KEY, name.trim() || PARTNER_ROSTER[0]);
}

export function targetKey(type: PartnerLogTargetType, id: string) {
  return `${type}:${id}`;
}

function normId(s: string) {
  return s.toLowerCase().replace(/^c_/, "").replace(/[^a-z0-9]+/g, "");
}

export function entriesForTarget(
  rows: PartnerLogEntry[],
  type: PartnerLogTargetType,
  id: string,
  label?: string,
): PartnerLogEntry[] {
  const needle = normId(id);
  const labelNeedle = label ? normId(label) : "";
  return rows
    .filter((e) => {
      if (e.target_type !== type) return false;
      const eid = normId(e.target_id);
      const elabel = normId(e.target_label);
      return (
        eid === needle ||
        elabel === needle ||
        (labelNeedle && (eid === labelNeedle || elabel === labelNeedle)) ||
        eid.includes(needle) ||
        needle.includes(eid)
      );
    })
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function addPartnerNote(input: {
  target_type: PartnerLogTargetType;
  target_id: string;
  target_label: string;
  body: string;
  author?: string;
}): PartnerLogEntry {
  const author = (input.author || loadPartnerAuthor()).trim() || PARTNER_ROSTER[0];
  const row: PartnerLogEntry = {
    id: `plog_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    target_type: input.target_type,
    target_id: input.target_id,
    target_label: input.target_label,
    body: input.body.trim(),
    author,
    created_at: new Date().toISOString(),
  };
  savePartnerAuthor(author);
  savePartnerLog([row, ...loadPartnerLog()]);
  return row;
}

export function updatePartnerNote(id: string, body: string): PartnerLogEntry | null {
  const rows = loadPartnerLog();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const next = {
    ...rows[idx],
    body: body.trim(),
    updated_at: new Date().toISOString(),
  };
  const copy = [...rows];
  copy[idx] = next;
  savePartnerLog(copy);
  return next;
}

export function removePartnerNote(id: string) {
  savePartnerLog(loadPartnerLog().filter((r) => r.id !== id));
}

export function recentPartnerNotes(rows: PartnerLogEntry[], limit = 12): PartnerLogEntry[] {
  return [...rows]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

export function countByTarget(rows: PartnerLogEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = targetKey(r.target_type, r.target_id);
    map.set(k, (map.get(k) || 0) + 1);
  }
  return map;
}

export function formatLogTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function slugifyTarget(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export function subscribePartnerLog(onChange: () => void) {
  if (!canUseStorage()) return () => undefined;
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
