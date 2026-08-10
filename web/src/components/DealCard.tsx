import Link from "next/link";
import type { Company } from "@/lib/types";
import { RecBadge } from "@/components/ui";
import { fmtMoneyM, fmtPct } from "@/lib/utils";

export function DealCard({ company, index = 0 }: { company: Company; index?: number }) {
  return (
    <Link
      href={`/company/${company.id}`}
      className="panel panel-interactive group block animate-in p-5 md:p-6"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="title text-[1.35rem] transition group-hover:text-[var(--signal)] md:text-[1.45rem]">
            {company.name}
          </div>
          <div className="mt-1.5 truncate text-[0.9rem] text-[var(--muted)]">
            {company.sector_theme} · {company.stage} · {company.relative_rank}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <RecBadge rec={company.recommendation} />
          <div className="mono mt-2.5 text-[1.5rem] font-medium text-[var(--signal)]">
            {company.thesis_score?.toFixed(0)}
          </div>
        </div>
      </div>
      <p className="mt-4 text-[0.975rem] leading-relaxed text-[var(--text)]/88">
        {company.why_now || company.one_liner}
      </p>
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-[var(--line)] pt-4 text-[0.8125rem] text-[var(--muted)]">
        <span>Tier-1 {company.tier1_count}</span>
        <span>Round {fmtMoneyM(company.last_round_size_m)}</span>
        <span>YoY {fmtPct(company.yoy_growth_pct)}</span>
        <span>Lead {company.lead_investor || "—"}</span>
      </div>
    </Link>
  );
}
