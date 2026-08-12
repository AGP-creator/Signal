"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadRecentViews } from "@/lib/recentViews";

/** Partner quick jumps from an IC brief — chat, compare, research, peers. */
export function CompanyQuickActions({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const [peerIds, setPeerIds] = useState<string[]>([]);

  useEffect(() => {
    const recent = loadRecentViews()
      .filter((r) => r.id !== companyId)
      .slice(0, 3)
      .map((r) => r.id);
    setPeerIds(recent);
  }, [companyId]);

  const compareHref =
    peerIds.length > 0
      ? `/compare?ids=${[companyId, ...peerIds].slice(0, 4).join(",")}`
      : `/compare?ids=${encodeURIComponent(companyId)}`;

  const chatQ = encodeURIComponent(`Summarize what people are saying about ${companyName}`);
  const bearQ = encodeURIComponent(`Bear case for ${companyName}`);

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={compareHref} className="btn btn-soft btn-sm">
        Compare
      </Link>
      <Link href={`/chat?q=${chatQ}`} className="btn btn-ghost btn-sm">
        Ask chat
      </Link>
      <Link href={`/chat?q=${bearQ}`} className="btn btn-ghost btn-sm">
        Bear case
      </Link>
      <Link
        href={`/search?q=${encodeURIComponent(companyName)}`}
        className="btn btn-ghost btn-sm"
      >
        Research
      </Link>
      <Link href="/work" className="btn btn-ghost btn-sm">
        Work queue
      </Link>
    </div>
  );
}
