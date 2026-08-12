"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RecBadge } from "@/components/ui";
import { companyPath } from "@/lib/paths";
import {
  clearRecentViews,
  loadRecentViews,
  pushRecentView,
  type RecentView,
} from "@/lib/recentViews";

export function RecentViewsStrip({ limit = 6 }: { limit?: number }) {
  const [rows, setRows] = useState<RecentView[]>([]);

  useEffect(() => {
    const sync = () => setRows(loadRecentViews());
    sync();
    window.addEventListener("signal:recent-views-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("signal:recent-views-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!rows.length) return null;

  const shown = rows.slice(0, limit);

  return (
    <section className="animate-in" style={{ animationDelay: "20ms" }}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="label-caps">Continue</div>
        <button
          type="button"
          className="text-[0.7rem] text-[var(--faint)] hover:text-[var(--muted)]"
          onClick={() => clearRecentViews()}
        >
          Clear
        </button>
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {shown.map((r) => {
          const href = companyPath({ id: r.id, slug: r.slug }) || `/company/${r.id}`;
          return (
            <Link
              key={r.id}
              href={href}
              className="panel panel-interactive flex min-w-[10.5rem] shrink-0 flex-col gap-1.5 !p-3"
            >
              <span className="truncate text-[0.875rem] font-semibold">{r.name}</span>
              <div className="flex items-center justify-between gap-2">
                <RecBadge rec={r.recommendation} />
                <span className="mono text-[0.75rem] text-[var(--signal)]">
                  {r.thesis_score != null ? Math.round(r.thesis_score) : "—"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function TrackCompanyView({
  id,
  slug,
  name,
  recommendation,
  thesis_score,
}: {
  id: string;
  slug?: string | null;
  name: string;
  recommendation?: string | null;
  thesis_score?: number | null;
}) {
  useEffect(() => {
    pushRecentView({ id, slug, name, recommendation, thesis_score });
  }, [id, slug, name, recommendation, thesis_score]);

  return null;
}
