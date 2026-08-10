import Link from "next/link";
import type { Company } from "@/lib/types";
import { cn, fmtMoneyM, fmtPct, recClass } from "@/lib/utils";

export function DealCard({ company, index = 0 }: { company: Company; index?: number }) {
  return (
    <Link
      href={`/company/${company.id}`}
      className="panel group block p-5 transition hover:border-[rgba(214,255,60,0.35)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="display text-2xl font-bold tracking-tight group-hover:text-[var(--signal)]">
            {company.name}
          </div>
          <div className="mt-1 text-sm text-[var(--muted)]">
            {company.sector_theme} · {company.stage} · {company.relative_rank}
          </div>
        </div>
        <div className="text-right">
          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", recClass(company.recommendation))}>
            {company.recommendation}
          </span>
          <div className="mono mt-2 text-2xl font-medium text-[var(--signal)]">
            {company.thesis_score?.toFixed(0)}
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[var(--text)]/90">
        {company.why_now || company.one_liner}
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
        <span>Tier-1 {company.tier1_count}</span>
        <span>Round {fmtMoneyM(company.last_round_size_m)}</span>
        <span>YoY {fmtPct(company.yoy_growth_pct)}</span>
        <span>Lead {company.lead_investor || "—"}</span>
      </div>
    </Link>
  );
}
