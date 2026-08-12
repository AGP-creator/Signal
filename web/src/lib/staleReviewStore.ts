/**
 * Partner decisions on stale (90d+) companies.
 * Persists to Supabase (partner_reviews / meta) + local cache.
 * Never auto-delete — Archive is a partner Pass, not a wipe.
 */

import type { Company } from "@/lib/types";

export type StaleDecision = "keep" | "archive" | "refresh";

export type StaleReview = {
  company_id: string;
  decision: StaleDecision;
  note?: string;
  reviewed_by: string;
  reviewed_at: string;
};

const KEY = "signal:stale-reviews:v1";

function read(): Record<string, StaleReview> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StaleReview>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function write(map: Record<string, StaleReview>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent("signal:stale-reviews-changed"));
}

export function loadStaleReviews(): Record<string, StaleReview> {
  return read();
}

export function getStaleReview(companyId: string): StaleReview | null {
  return read()[companyId] || null;
}

export function setStaleReviewLocal(
  companyId: string,
  decision: StaleDecision,
  opts?: { note?: string; reviewed_by?: string; reviewed_at?: string },
): StaleReview {
  const map = read();
  const row: StaleReview = {
    company_id: companyId,
    decision,
    note: opts?.note,
    reviewed_by: opts?.reviewed_by || "Partner",
    reviewed_at: opts?.reviewed_at || new Date().toISOString(),
  };
  map[companyId] = row;
  write(map);
  return row;
}

/** @deprecated Prefer setStaleReviewAsync — kept for sync callers */
export function setStaleReview(
  companyId: string,
  decision: StaleDecision,
  opts?: { note?: string; reviewed_by?: string },
): StaleReview {
  return setStaleReviewLocal(companyId, decision, opts);
}

export async function hydrateStaleReviews(): Promise<Record<string, StaleReview>> {
  try {
    const res = await fetch("/api/stale-reviews", { cache: "no-store" });
    if (!res.ok) return read();
    const data = (await res.json()) as { reviews?: Record<string, StaleReview> };
    const remote = data.reviews || {};
    const merged = { ...read(), ...remote };
    write(merged);
    return merged;
  } catch {
    return read();
  }
}

export async function setStaleReviewAsync(
  companyId: string,
  decision: StaleDecision,
  opts?: { note?: string; reviewed_by?: string },
): Promise<StaleReview> {
  const optimistic = setStaleReviewLocal(companyId, decision, opts);
  try {
    const res = await fetch("/api/stale-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_id: companyId,
        decision,
        note: opts?.note,
        reviewed_by: opts?.reviewed_by || "Partner",
      }),
    });
    if (!res.ok) return optimistic;
    const data = (await res.json()) as { review?: StaleReview };
    if (data.review) {
      return setStaleReviewLocal(companyId, data.review.decision, {
        note: data.review.note,
        reviewed_by: data.review.reviewed_by,
        reviewed_at: data.review.reviewed_at,
      });
    }
  } catch {
    // local cache still holds the decision
  }
  return optimistic;
}

export function decisionLabel(d: StaleDecision): string {
  if (d === "keep") return "Keep in pipeline";
  if (d === "archive") return "Archived (partner Pass)";
  return "Refresh requested";
}

/** Still needs partner attention (no review, or refresh requested). */
export function isStalePending(
  company: Company,
  reviews: Record<string, StaleReview> = typeof window !== "undefined" ? read() : {},
): boolean {
  if ((company.review_status || "").toLowerCase().includes("archived")) return false;
  if ((company.review_status || "") === "Reviewed — keep") return false;
  const flagged = Boolean(
    company.is_stale ||
      company.review_status === "Pending Partner Review" ||
      company.review_status === "Refresh requested",
  );
  if (!flagged) return false;
  const r = reviews[company.id];
  if (!r) return true;
  return r.decision === "refresh";
}

export function pendingStaleCompanies(
  companies: Company[],
  reviews?: Record<string, StaleReview>,
): Company[] {
  const map = reviews ?? (typeof window !== "undefined" ? read() : {});
  return companies.filter((c) => isStalePending(c, map));
}

/**
 * Apply partner stale decisions onto company flags so desks/meeting counts
 * stop treating Keep/Archive as open stale work.
 */
export function applyStaleReviews(
  companies: Company[],
  reviews?: Record<string, StaleReview>,
): Company[] {
  const map = reviews ?? (typeof window !== "undefined" ? read() : {});
  return companies.map((c) => {
    const r = map[c.id];
    if (!r || r.decision === "refresh") {
      if (r?.decision === "refresh") {
        return { ...c, is_stale: true, review_status: "Refresh requested" };
      }
      return c;
    }
    return {
      ...c,
      is_stale: false,
      recommendation: r.decision === "archive" ? "Pass" : c.recommendation,
      review_status: r.decision === "archive" ? "Archived (partner)" : "Reviewed — keep",
    };
  });
}
