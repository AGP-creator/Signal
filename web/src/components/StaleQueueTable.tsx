"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StaleReviewActions } from "@/components/StaleReviewActions";
import { RecBadge } from "@/components/ui";
import {
  decisionLabel,
  loadStaleReviews,
  type StaleReview,
} from "@/lib/staleReviewStore";
import type { Company } from "@/lib/types";

export function StaleQueueTable({ companies }: { companies: Company[] }) {
  const [reviews, setReviews] = useState<Record<string, StaleReview>>({});

  useEffect(() => {
    const sync = () => setReviews(loadStaleReviews());
    sync();
    void import("@/lib/staleReviewStore").then((m) => m.hydrateStaleReviews().then(sync));
    window.addEventListener("signal:stale-reviews-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("signal:stale-reviews-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const pending = companies.filter((c) => {
    const r = reviews[c.id];
    return !r || r.decision === "refresh";
  });
  const resolved = companies.filter((c) => {
    const r = reviews[c.id];
    return r && r.decision !== "refresh";
  });

  return (
    <div className="space-y-4">
      <div className="panel overflow-hidden !p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="data-table min-w-[720px]">
            <thead>
              <tr>
                <th>Company</th>
                <th>Rec</th>
                <th>Last signal</th>
                <th>Partner action</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      href={`/company/${c.id}`}
                      className="font-semibold hover:text-[var(--signal)]"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td>
                    <RecBadge rec={c.recommendation} />
                  </td>
                  <td className="mono text-[0.8125rem]">{c.last_signal_date || "—"}</td>
                  <td>
                    <StaleReviewActions companyId={c.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!pending.length && (
          <p className="body-muted p-5">
            {companies.length
              ? "All stale names reviewed — Keep / Archive logged."
              : "No stale companies — pipeline signals are fresh."}
          </p>
        )}
      </div>

      {resolved.length > 0 && (
        <div className="panel overflow-hidden !p-0">
          <div className="border-b border-[var(--line)] px-5 py-3 text-[0.75rem] uppercase tracking-wider text-[var(--faint)]">
            Reviewed ({resolved.length})
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="data-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Decision</th>
                  <th>By</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {resolved.map((c) => {
                  const r = reviews[c.id]!;
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link
                          href={`/company/${c.id}`}
                          className="font-semibold hover:text-[var(--signal)]"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="text-[0.875rem]">{decisionLabel(r.decision)}</td>
                      <td className="text-[0.8125rem] text-[var(--muted)]">
                        {r.reviewed_by} · {r.reviewed_at.slice(0, 10)}
                      </td>
                      <td>
                        <StaleReviewActions companyId={c.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
