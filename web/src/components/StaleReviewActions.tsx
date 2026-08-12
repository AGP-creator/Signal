"use client";

import { useEffect, useState } from "react";
import {
  decisionLabel,
  getStaleReview,
  hydrateStaleReviews,
  setStaleReviewAsync,
  type StaleDecision,
  type StaleReview,
} from "@/lib/staleReviewStore";
import { cn } from "@/lib/utils";

const ACTIONS: { id: StaleDecision; label: string }[] = [
  { id: "keep", label: "Keep" },
  { id: "archive", label: "Archive" },
  { id: "refresh", label: "Request refresh" },
];

export function StaleReviewActions({ companyId }: { companyId: string }) {
  const [review, setReview] = useState<StaleReview | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const sync = () => setReview(getStaleReview(companyId));
    sync();
    void hydrateStaleReviews().then(sync);
    window.addEventListener("signal:stale-reviews-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("signal:stale-reviews-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [companyId]);

  async function act(decision: StaleDecision) {
    setSaving(true);
    try {
      setReview(await setStaleReviewAsync(companyId, decision));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={saving}
            onClick={() => void act(a.id)}
            className={cn(
              "btn btn-ghost btn-sm !px-2",
              review?.decision === a.id && "bg-[var(--signal-dim)] text-[var(--signal)]",
            )}
          >
            {a.label}
          </button>
        ))}
      </div>
      {review && (
        <span className="text-[0.6875rem] text-[var(--muted)]">
          {decisionLabel(review.decision)} · {review.reviewed_by}
        </span>
      )}
    </div>
  );
}
