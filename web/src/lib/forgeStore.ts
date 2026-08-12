/**
 * Persist Monday Move commits from Signal Forge (local partner ledger).
 */

const KEY = "signal-forge-commits-v1";

export type ForgeCommit = {
  move_id: string;
  title: string;
  kind: string;
  company_id?: string;
  company_name?: string;
  committed_at: string;
  note?: string;
};

function read(): ForgeCommit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ForgeCommit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(rows: ForgeCommit[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 40)));
}

export function loadForgeCommits(): ForgeCommit[] {
  return read();
}

export function commitForgeMove(
  move: {
    id: string;
    title: string;
    kind: string;
    company_id?: string;
    company_name?: string;
  },
  note?: string,
): ForgeCommit[] {
  const next: ForgeCommit = {
    move_id: move.id,
    title: move.title,
    kind: move.kind,
    company_id: move.company_id,
    company_name: move.company_name,
    committed_at: new Date().toISOString(),
    note,
  };
  const prev = read().filter((c) => c.move_id !== move.id);
  const rows = [next, ...prev];
  write(rows);
  return rows;
}

export function isForgeCommitted(moveId: string, commits: ForgeCommit[]) {
  return commits.some((c) => c.move_id === moveId);
}

export function clearForgeCommits() {
  write([]);
}
