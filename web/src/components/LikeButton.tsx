"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { interestRankOf } from "@/lib/interest";
import { useInterest } from "@/lib/useInterest";

/** Compact Like control for company brief, pipeline rows, etc. */
export function LikeButton({
  companyId,
  className,
  size = "sm",
  showRank = true,
}: {
  companyId: string;
  className?: string;
  size?: "sm" | "md";
  showRank?: boolean;
}) {
  const { state, isLiked, like } = useInterest();
  const on = isLiked(companyId);
  const rank = showRank ? interestRankOf(state, companyId) : null;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <button
        type="button"
        className={cn(
          "btn",
          size === "sm" ? "btn-sm" : "",
          on ? "btn-primary" : "btn-soft",
        )}
        onClick={() => like(companyId)}
        aria-pressed={on}
      >
        {on ? (rank != null ? `Liked #${rank}` : "Liked") : "Like"}
      </button>
      {on ? (
        <Link href="/interest" className="text-[0.75rem] text-[var(--signal)] hover:underline">
          Watchlist →
        </Link>
      ) : null}
    </div>
  );
}
