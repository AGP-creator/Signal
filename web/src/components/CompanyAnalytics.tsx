import Link from "next/link";
import {
  AreaChart,
  BarChart,
  BenchmarkBars,
  DonutChart,
  DualLineChart,
  GaugeChart,
  GrowthBarChart,
  RadarChart,
  StackedOwnership,
  ValuationStepChart,
  WaterfallChart,
} from "@/components/charts";
import { Panel } from "@/components/ui";
import {
  type DemoFinancialPack,
  capTableSlices,
  deriveArrBridge,
  deriveQoqGrowth,
  deriveYoyGrowth,
  ownershipByType,
} from "@/lib/demoFinancials";
import { fmtMoneyM } from "@/lib/utils";

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "warn" | "signal";
}) {
  const toneClass =
    tone === "ok"
      ? "text-[var(--ok)]"
      : tone === "warn"
        ? "text-[var(--warn)]"
        : tone === "signal"
          ? "text-[var(--signal)]"
          : "text-[var(--text)]";
  return (
    <div className="min-w-0">
      <div className="label-caps text-[var(--faint)]">{label}</div>
      <div className={`mono mt-1 text-[1.25rem] md:text-[1.4rem] ${toneClass}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-[0.75rem] text-[var(--muted)]">{sub}</div> : null}
    </div>
  );
}

export function CompanyAnalytics({
  pack,
  companyHref,
}: {
  pack: DemoFinancialPack;
  companyHref: string;
}) {
  const arrSeries = pack.quarters.map((q) => ({ label: q.q, value: q.arr_m }));
  const burnSeries = pack.quarters.map((q) => ({ label: q.q, value: q.burn_m }));
  const cashSeries = pack.quarters.map((q) => ({ label: q.q, value: q.cash_m }));
  const headSeries = pack.quarters.map((q) => ({
    label: q.q.replace("'2", "'"),
    value: q.headcount,
  }));
  const customerSeries = pack.quarters
    .filter((q) => q.customers != null)
    .map((q) => ({ label: q.q.replace("'2", "'"), value: q.customers as number }));
  const cohort = pack.cohort_retention.map((c) => ({
    label: `M${c.month}`,
    value: c.pct,
  }));
  const qoq = deriveQoqGrowth(pack);
  const yoy = deriveYoyGrowth(pack);
  const bridge = deriveArrBridge(pack).map((s) => ({
    label: s.label,
    value: s.value_m,
    kind: s.kind,
  }));
  const capSlices = capTableSlices(pack);
  const typeSlices = ownershipByType(pack);
  const valuation = pack.round_history.map((r) => ({
    label: r.round.replace("Series ", "S"),
    value: r.post_m,
  }));
  const ue = pack.unit_econ;
  const burnMult =
    pack.ratios.find((r) => r.key === "burn_mult")?.value ||
    `${(pack.kpis.burn_m / Math.max(0.1, pack.kpis.arr_m * 0.05)).toFixed(1)}×`;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label-caps text-[var(--signal)]">Analytics desk</div>
          <h2 className="title mt-1 text-[1.45rem]">Growth, ownership & underwriting</h2>
          <p className="mt-1 max-w-xl text-[0.9rem] text-[var(--muted)]">
            Partner-grade charts · ARR bridge · cap table · unit economics · as of {pack.as_of}
          </p>
        </div>
        <Link href={`${companyHref}/financials`} className="btn btn-primary btn-sm">
          Full financials →
        </Link>
      </div>

      <Panel className="kpi-strip !grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Kpi label="ARR" value={fmtMoneyM(pack.kpis.arr_m)} sub={`+${pack.kpis.arr_growth_yoy_pct}% YoY`} tone="signal" />
        <Kpi label="YoY growth" value={`${pack.kpis.arr_growth_yoy_pct}%`} sub="ARR" tone="ok" />
        <Kpi label="NRR" value={`${pack.kpis.nrr_pct}%`} sub="net retention" tone="ok" />
        <Kpi label="Rule of 40" value={String(pack.kpis.rule_of_40)} sub={`${pack.kpis.gross_margin_pct}% GM`} />
        <Kpi label="Burn / mo" value={fmtMoneyM(pack.kpis.burn_m)} sub={`mult ${burnMult}`} />
        <Kpi label="Cash" value={fmtMoneyM(pack.kpis.cash_m)} sub={`${pack.kpis.runway_months} mo runway`} />
        <Kpi label="ARR multiple" value={`${pack.kpis.arr_multiple}×`} sub="post / ARR" />
        <Kpi label="FCF margin" value={`${pack.kpis.fcf_margin_pct}%`} tone={pack.kpis.fcf_margin_pct >= 0 ? "ok" : "warn"} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h3 className="title text-[1.1rem]">ARR trajectory</h3>
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">Quarterly recurring revenue ($M)</p>
          <div className="mt-3">
            <AreaChart series={arrSeries} formatValue={(v) => `$${v.toFixed(0)}M`} />
          </div>
        </Panel>
        <Panel>
          <h3 className="title text-[1.1rem]">QoQ ARR growth</h3>
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">Sequential growth — partner tape scan</p>
          <div className="mt-3">
            <GrowthBarChart series={qoq} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h3 className="title text-[1.1rem]">ARR bridge</h3>
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
            Start → new logos → expansion → churn → ending ARR
          </p>
          <div className="mt-3">
            <WaterfallChart steps={bridge} formatValue={(v) => `$${Math.abs(v).toFixed(1)}M`} />
          </div>
        </Panel>
        <Panel>
          <h3 className="title text-[1.1rem]">Cash vs burn</h3>
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">Liquidity path after last round</p>
          <div className="mt-3">
            <DualLineChart
              a={cashSeries}
              b={burnSeries}
              aLabel="Cash ($M)"
              bLabel="Monthly burn ($M)"
              formatA={(v) => `$${v.toFixed(0)}M`}
              formatB={(v) => `$${v.toFixed(1)}M`}
            />
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="gauge-card justify-center">
          <h3 className="title self-start text-[1.1rem]">Runway</h3>
          <GaugeChart
            value={pack.kpis.runway_months}
            max={48}
            label="months"
            sub={`${fmtMoneyM(pack.kpis.cash_m)} cash · ${fmtMoneyM(pack.kpis.burn_m)}/mo burn`}
            color={pack.kpis.runway_months >= 24 ? "var(--ok)" : "var(--warn)"}
            format={(v) => `${Math.round(v)}`}
          />
        </Panel>
        <Panel className="gauge-card justify-center">
          <h3 className="title self-start text-[1.1rem]">Rule of 40</h3>
          <GaugeChart
            value={pack.kpis.rule_of_40}
            max={150}
            label="score"
            sub={`Growth ${pack.kpis.arr_growth_yoy_pct}% + FCF ${pack.kpis.fcf_margin_pct}%`}
            color={pack.kpis.rule_of_40 >= 40 ? "var(--ok)" : "var(--warn)"}
          />
        </Panel>
        <Panel className="gauge-card justify-center">
          <h3 className="title self-start text-[1.1rem]">NRR</h3>
          <GaugeChart
            value={pack.kpis.nrr_pct}
            max={160}
            label="net retention"
            sub="Expansion vs churn on existing base"
            color={pack.kpis.nrr_pct >= 120 ? "var(--ok)" : "var(--warn)"}
            format={(v) => `${Math.round(v)}%`}
          />
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h3 className="title text-[1.1rem]">Cap table</h3>
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">Illustrative ownership stack</p>
          <div className="mt-4">
            <StackedOwnership slices={capSlices} height={32} />
          </div>
          <div className="mt-5">
            <DonutChart
              slices={typeSlices}
              size={140}
              centerValue={`${pack.cap_table.filter((c) => c.type === "founder").reduce((s, c) => s + c.ownership_pct, 0)}%`}
              centerLabel="founders"
            />
          </div>
        </Panel>
        <Panel>
          <h3 className="title text-[1.1rem]">Valuation ladder</h3>
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">Post-money by round</p>
          <div className="mt-3">
            <ValuationStepChart series={valuation} />
          </div>
          {yoy.length ? (
            <div className="mt-4 border-t border-[var(--line)] pt-4">
              <div className="label-caps text-[var(--faint)]">YoY ARR (matched quarters)</div>
              <div className="mt-2">
                <GrowthBarChart series={yoy} height={120} />
              </div>
            </div>
          ) : null}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel>
          <h3 className="title text-[1.1rem]">Revenue mix</h3>
          <div className="mt-4">
            <DonutChart
              slices={pack.revenue_mix}
              centerValue={`${pack.kpis.arr_m.toFixed(0)}M`}
              centerLabel="ARR"
            />
          </div>
        </Panel>
        <Panel>
          <h3 className="title text-[1.1rem]">Cohort retention</h3>
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">Indexed NRR path</p>
          <div className="mt-3">
            <BarChart series={cohort} formatValue={(v) => `${v}%`} color="var(--ok)" />
          </div>
        </Panel>
        <Panel>
          <h3 className="title text-[1.1rem]">Health radar</h3>
          <div className="mt-2">
            {pack.score_radar ? <RadarChart scores={pack.score_radar} size={200} /> : null}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h3 className="title text-[1.1rem]">Unit economics</h3>
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">LTV, CAC, payback vs underwriting bands</p>
          <div className="mt-4">
            <BenchmarkBars
              rows={[
                {
                  label: "LTV / CAC",
                  value: ue.ltv_cac,
                  max: 8,
                  format: `${ue.ltv_cac.toFixed(1)}×`,
                  good: ue.ltv_cac >= 3,
                },
                {
                  label: "Payback (mo)",
                  value: Math.max(0, 24 - ue.payback_months),
                  max: 24,
                  format: `${ue.payback_months} mo`,
                  good: ue.payback_months <= 18,
                },
                {
                  label: "Magic number",
                  value: ue.magic_number,
                  max: 2,
                  format: ue.magic_number.toFixed(2),
                  good: ue.magic_number >= 0.75,
                },
                {
                  label: "Gross margin",
                  value: ue.gross_margin_pct,
                  max: 100,
                  format: `${ue.gross_margin_pct}%`,
                  good: ue.gross_margin_pct >= 70,
                },
              ]}
            />
          </div>
        </Panel>
        <Panel>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="title text-[1.1rem]">Headcount & customers</h3>
              <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">Org scale alongside ARR</p>
            </div>
            <div className="mono text-sm text-[var(--signal)]">
              {pack.quarters[pack.quarters.length - 1]?.headcount} people
            </div>
          </div>
          <div className="mt-3">
            <BarChart series={headSeries} formatValue={(v) => String(Math.round(v))} />
          </div>
          {customerSeries.length ? (
            <div className="mt-4 border-t border-[var(--line)] pt-4">
              <div className="label-caps text-[var(--faint)]">Customer logos</div>
              <div className="mt-2">
                <AreaChart
                  series={customerSeries}
                  height={120}
                  color="var(--deep)"
                  formatValue={(v) => String(Math.round(v))}
                />
              </div>
            </div>
          ) : null}
        </Panel>
      </div>
    </section>
  );
}
