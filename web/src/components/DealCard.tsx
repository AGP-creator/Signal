import Link from "next/link";
import { SparkBars } from "@/components/charts";
import { CriteriaFitChips } from "@/components/ThesisCriteriaPanel";
import type { Company } from "@/lib/types";
import { RecBadge } from "@/components/ui";
import { getDemoFinancials } from "@/lib/demoFinancials";
import { companyPath } from "@/lib/paths";
import { evaluateThirdbaseCriteria } from "@/lib/thirdbaseCriteria";
import { fmtMoneyM, fmtPct } from "@/lib/utils";
import { cleanProse } from "@/lib/digestFormat";

export function DealCard({ company, index = 0 }: { company: Company; index?: number }) {
  const pack = getDemoFinancials(company.slug) || getDemoFinancials(company.id);
  const spark = pack?.quarters.map((q) => q.arr_m) || [];
  const href = companyPath({ id: company.id, slug: company.slug }) || `/company/${company.id}`;
  const criteria = evaluateThirdbaseCriteria(company);
  const runway =
    company.runway_months_est != null ? `${company.runway_months_est} mo runway` : null;

  return (
    <Link
      href={href}
      className="deal-row group animate-in"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="deal-name title text-[1.15rem] transition md:text-[1.28rem]">
            {company.name}
          </div>
          <div className="mt-1.5 truncate text-[0.8125rem] text-[var(--muted)]">
            {[
              company.subsector || company.sector_theme,
              company.stage,
              company.relative_rank?.match(/^#[\d\s]+of\s+\d+/)?.[0] || null,
              runway,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <RecBadge rec={company.recommendation} />
          <div className="mono mt-2.5 text-[1.3rem] font-semibold text-[var(--signal)]">
            {company.thesis_score?.toFixed(0)}
          </div>
          <div className="mono mt-1 text-[0.65rem] text-[var(--faint)]">
            criteria {criteria.met}/{criteria.items.length}
          </div>
          {spark.length ? (
            <div className="mt-2 flex justify-end">
              <SparkBars values={spark} className="h-6 opacity-80" />
            </div>
          ) : null}
        </div>
      </div>
      <p className="mt-3.5 max-w-xl line-clamp-2 text-[0.875rem] leading-relaxed text-[var(--text)]/80">
        {company.one_liner || cleanProse(company.why_now)}
      </p>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <CriteriaFitChips company={company} />
        <span className="chip chip-signal">Tier-1 {company.tier1_count}</span>
        <span className="chip">Round {fmtMoneyM(company.last_round_size_m)}</span>
        <span className="chip chip-ok">
          YoY {pack ? `+${pack.kpis.arr_growth_yoy_pct}%` : fmtPct(company.yoy_growth_pct)}
        </span>
        {pack ? (
          <span className="chip chip-deep">ARR {fmtMoneyM(pack.kpis.arr_m)}</span>
        ) : (
          <span className="chip chip-deep">Lead {company.lead_investor || "—"}</span>
        )}
        {pack ? <span className="chip">NRR {pack.kpis.nrr_pct}%</span> : null}
      </div>
    </Link>
  );
}
