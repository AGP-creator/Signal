"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AreaChart,
  BarChart,
  BenchmarkBars,
  DonutChart,
  DualLineChart,
  ExitWaterfallChart,
  GaugeChart,
  GrowthBarChart,
  RadarChart,
  StackedOwnership,
  ValuationStepChart,
  WaterfallChart,
} from "@/components/charts";
import { BackLink, HeroMetric, KpiStrip, Panel } from "@/components/ui";
import {
  type DemoFinancialPack,
  capTableSlices,
  defaultExitScenarios,
  deriveArrBridge,
  deriveExitProceeds,
  deriveQoqGrowth,
  deriveYoyGrowth,
  ownershipByType,
} from "@/lib/demoFinancials";
import { cn, fmtMoneyM } from "@/lib/utils";

function statusClass(status: string) {
  if (status === "strong") return "text-[var(--ok)]";
  if (status === "watch") return "text-[var(--warn)]";
  if (status === "weak") return "text-[var(--danger)]";
  return "text-[var(--muted)]";
}

function statusBg(status: string) {
  if (status === "strong") return "bg-[var(--ok-dim)]";
  if (status === "watch") return "bg-[var(--warn-dim)]";
  if (status === "weak") return "bg-[var(--danger-dim)]";
  return "bg-[var(--panel-2)]";
}

export function CompanyFinancialsView({
  pack,
  companyId,
}: {
  pack: DemoFinancialPack;
  companyId: string;
}) {
  const arrSeries = pack.quarters.map((q) => ({ label: q.q, value: q.arr_m }));
  const burnSeries = pack.quarters.map((q) => ({ label: q.q, value: q.burn_m }));
  const cashSeries = pack.quarters.map((q) => ({ label: q.q, value: q.cash_m }));
  const nrrSeries = pack.quarters
    .filter((q) => q.nrr_pct != null)
    .map((q) => ({ label: q.q, value: q.nrr_pct as number }));
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
  const valuationBridge = (() => {
    const steps: { label: string; value: number; kind: "total" | "delta" }[] = [];
    pack.round_history.forEach((r, i) => {
      if (i === 0) {
        steps.push({ label: r.round, value: r.post_m, kind: "total" });
      } else {
        const prev = pack.round_history[i - 1].post_m;
        steps.push({ label: `Δ ${r.round}`, value: +(r.post_m - prev).toFixed(0), kind: "delta" });
        steps.push({ label: r.round, value: r.post_m, kind: "total" });
      }
    });
    return steps;
  })();
  const scenarios = defaultExitScenarios(pack);
  const [exitIdx, setExitIdx] = useState(Math.min(2, scenarios.length - 1));
  const exitRows = deriveExitProceeds(pack, scenarios[exitIdx]?.exit_m || 0);
  const ue = pack.unit_econ;
  const founderPct = pack.cap_table
    .filter((c) => c.type === "founder")
    .reduce((s, c) => s + c.ownership_pct, 0);
  const investorPct = pack.cap_table
    .filter((c) => c.type === "investor")
    .reduce((s, c) => s + c.ownership_pct, 0);
  const lastRound = pack.round_history[pack.round_history.length - 1];

  return (
    <div className="space-y-9 animate-in">
      <div className="border-b border-[var(--line)] pb-8">
        <BackLink href={`/company/${companyId}`}>Company brief</BackLink>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 max-w-2xl">
            <div className="label-caps text-[var(--signal)]">Financials desk · demo pack</div>
            <h1 className="display mt-2 text-[2.35rem] md:text-[3.1rem]">{pack.name}</h1>
            <p className="body-muted mt-3 text-[1.05rem]">{pack.tagline}</p>
            <p className="mt-2 text-[0.8125rem] text-[var(--faint)]">
              As of {pack.as_of} · illustrative underwriting model for partner demos
            </p>
          </div>
          <HeroMetric
            value={fmtMoneyM(pack.kpis.arr_m)}
            label={
              <>
                ARR · +{pack.kpis.arr_growth_yoy_pct}% YoY · {pack.kpis.arr_multiple}× multiple
              </>
            }
          />
        </div>
        <Link href={`/company/${companyId}`} className="link-quiet mt-4 inline-block text-sm md:hidden">
          ← Back to thesis
        </Link>
      </div>

      <KpiStrip
        items={[
          { label: "ARR", value: fmtMoneyM(pack.kpis.arr_m) },
          { label: "YoY Growth", value: `${pack.kpis.arr_growth_yoy_pct}%` },
          { label: "NRR", value: `${pack.kpis.nrr_pct}%` },
          { label: "Gross Margin", value: `${pack.kpis.gross_margin_pct}%` },
          { label: "Burn / Mo", value: fmtMoneyM(pack.kpis.burn_m) },
          { label: "Cash", value: fmtMoneyM(pack.kpis.cash_m) },
          { label: "Runway", value: `${pack.kpis.runway_months} mo` },
          { label: "Rule of 40", value: String(pack.kpis.rule_of_40) },
        ]}
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="gauge-card">
          <div className="label-caps">Runway</div>
          <GaugeChart
            value={pack.kpis.runway_months}
            max={48}
            label="months"
            color={pack.kpis.runway_months >= 24 ? "var(--ok)" : "var(--warn)"}
            format={(v) => `${Math.round(v)}`}
            sub={`${fmtMoneyM(pack.kpis.cash_m)} · ${fmtMoneyM(pack.kpis.burn_m)}/mo`}
          />
        </Panel>
        <Panel className="gauge-card">
          <div className="label-caps">Rule of 40</div>
          <GaugeChart
            value={pack.kpis.rule_of_40}
            max={150}
            label="score"
            color={pack.kpis.rule_of_40 >= 40 ? "var(--ok)" : "var(--warn)"}
            sub={`${pack.kpis.arr_growth_yoy_pct}% growth + ${pack.kpis.fcf_margin_pct}% FCF`}
          />
        </Panel>
        <Panel className="gauge-card">
          <div className="label-caps">NRR</div>
          <GaugeChart
            value={pack.kpis.nrr_pct}
            max={160}
            label="retention"
            color={pack.kpis.nrr_pct >= 120 ? "var(--ok)" : "var(--warn)"}
            format={(v) => `${Math.round(v)}%`}
            sub="Net revenue retention"
          />
        </Panel>
        <Panel className="gauge-card">
          <div className="label-caps">ARR Multiple</div>
          <GaugeChart
            value={pack.kpis.arr_multiple}
            max={35}
            label="× post/ARR"
            color="var(--signal)"
            format={(v) => `${v.toFixed(1)}×`}
            sub={lastRound ? `${fmtMoneyM(lastRound.post_m)} post` : undefined}
          />
        </Panel>
      </div>

      {/* ARR + growth */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="title text-[1.25rem]">ARR trajectory</h2>
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">Six-quarter recurring revenue</p>
          <div className="mt-4">
            <AreaChart series={arrSeries} height={200} formatValue={(v) => `$${v.toFixed(0)}M`} />
          </div>
        </Panel>
        <Panel>
          <h2 className="title text-[1.25rem]">QoQ growth</h2>
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">Sequential ARR % change</p>
          <div className="mt-4">
            <GrowthBarChart series={qoq} height={200} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="title text-[1.25rem]">ARR bridge</h2>
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
            Movement from prior quarter — new logos, expansion, churn
          </p>
          <div className="mt-4">
            <WaterfallChart steps={bridge} height={210} formatValue={(v) => `$${Math.abs(v).toFixed(1)}M`} />
          </div>
        </Panel>
        <Panel>
          <h2 className="title text-[1.25rem]">Liquidity</h2>
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">Cash balance vs monthly burn</p>
          <div className="mt-4">
            <DualLineChart
              a={cashSeries}
              b={burnSeries}
              aLabel="Cash"
              bLabel="Burn"
              height={200}
              formatA={(v) => `$${v.toFixed(0)}M`}
              formatB={(v) => `$${v.toFixed(1)}M`}
            />
          </div>
        </Panel>
      </div>

      {yoy.length ? (
        <Panel>
          <h2 className="title text-[1.25rem]">YoY ARR growth</h2>
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
            Same-quarter prior year comparison where available
          </p>
          <div className="mt-4 max-w-xl">
            <GrowthBarChart series={yoy} height={160} />
          </div>
        </Panel>
      ) : null}

      {/* Mix / NRR / radar */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel>
          <h2 className="title text-[1.2rem]">Revenue mix</h2>
          <div className="mt-4">
            <DonutChart
              slices={pack.revenue_mix}
              centerValue={`${pack.kpis.arr_m.toFixed(0)}M`}
              centerLabel="ARR"
            />
          </div>
        </Panel>
        <Panel>
          <h2 className="title text-[1.2rem]">NRR by quarter</h2>
          <div className="mt-4">
            <BarChart series={nrrSeries} formatValue={(v) => `${v}%`} color="var(--ok)" />
          </div>
        </Panel>
        <Panel>
          <h2 className="title text-[1.2rem]">Underwriting radar</h2>
          {pack.score_radar ? <RadarChart scores={pack.score_radar} size={210} /> : null}
        </Panel>
      </div>

      {/* Cap table showcase */}
      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="title text-[1.35rem]">Cap table</h2>
            <p className="mt-1 text-[0.9rem] text-[var(--muted)]">
              Illustrative ownership — founders {founderPct}% · investors {investorPct}%
            </p>
          </div>
        </div>
        <div className="mt-5">
          <StackedOwnership slices={capSlices} height={36} />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <DonutChart
            slices={typeSlices}
            size={160}
            centerValue={`${founderPct}%`}
            centerLabel="founders"
          />
          <div className="space-y-3">
            {pack.cap_table.map((row) => (
              <div key={row.holder}>
                <div className="mb-1 flex justify-between gap-2 text-[0.8125rem]">
                  <span className="font-medium text-[var(--text)]">
                    {row.holder}
                    <span className="ml-2 text-[var(--faint)]">{row.type.replace("_", " ")}</span>
                  </span>
                  <span className="mono text-[var(--text)]">{row.ownership_pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, row.ownership_pct * 2.2)}%`,
                      background:
                        row.type === "founder"
                          ? "var(--signal)"
                          : row.type === "investor"
                            ? "var(--ok)"
                            : "var(--deep)",
                    }}
                  />
                </div>
                {row.preference ? (
                  <div className="mt-1 text-[0.75rem] text-[var(--muted)]">{row.preference}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Valuation + rounds */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="title text-[1.25rem]">Valuation ladder</h2>
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">Post-money step-up by round</p>
          <div className="mt-4">
            <ValuationStepChart series={valuation} height={190} />
          </div>
          <div className="mt-5 border-t border-[var(--line)] pt-4">
            <div className="label-caps text-[var(--faint)]">Valuation bridge</div>
            <div className="mt-3">
              <WaterfallChart
                steps={valuationBridge}
                height={170}
                formatValue={(v) =>
                  Math.abs(v) >= 1000 ? `$${(Math.abs(v) / 1000).toFixed(1)}B` : `$${Math.round(Math.abs(v))}M`
                }
              />
            </div>
          </div>
        </Panel>
        <Panel>
          <h2 className="title text-[1.25rem]">Round history</h2>
          <div className="mt-4 space-y-4">
            {pack.round_history.map((r, i) => {
              const prev = pack.round_history[i - 1];
              const stepUp = prev ? (r.post_m / prev.post_m).toFixed(1) : null;
              return (
                <div
                  key={`${r.round}-${r.date}`}
                  className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <div className="font-semibold">{r.round}</div>
                    <div className="mt-0.5 text-[0.8125rem] text-[var(--muted)]">
                      {r.date} · led by {r.lead}
                      {stepUp ? ` · ${stepUp}× step-up` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mono text-[var(--signal)]">{fmtMoneyM(r.amount_m)}</div>
                    <div className="text-[0.75rem] text-[var(--muted)]">{fmtMoneyM(r.post_m)} post</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Exit waterfall */}
      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="title text-[1.35rem]">Exit proceeds (1× non-participating)</h2>
            <p className="mt-1 text-[0.9rem] text-[var(--muted)]">
              Illustrative liquidation stack — preferred filled first, residual to common
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {scenarios.map((s, i) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setExitIdx(i)}
                className={cn(
                  "btn btn-sm",
                  i === exitIdx ? "btn-primary" : "btn-ghost",
                )}
              >
                {s.label} · {fmtMoneyM(s.exit_m)}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <ExitWaterfallChart rows={exitRows} height={180} />
          <div className="space-y-3">
            {exitRows.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--line)] px-4 py-3"
              >
                <span className="inline-flex items-center gap-2 text-[0.875rem] text-[var(--muted)]">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
                  {r.label}
                </span>
                <span className="mono text-[var(--text)]">{fmtMoneyM(r.amount_m)}</span>
              </div>
            ))}
            <p className="text-[0.75rem] text-[var(--faint)]">
              Demo math only — assumes clean 1× non-participating prefs equal to capital invested (
              {fmtMoneyM(pack.round_history.reduce((s, r) => s + r.amount_m, 0))}).
            </p>
          </div>
        </div>
      </Panel>

      {/* Unit economics */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="title text-[1.35rem]">Unit economics</h2>
          <p className="mt-1 text-[0.9rem] text-[var(--muted)]">
            Classic SaaS efficiency stack vs underwriting bands
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              { label: "LTV", value: `$${(ue.ltv_usd / 1000).toFixed(0)}k` },
              { label: "CAC", value: `$${(ue.cac_usd / 1000).toFixed(0)}k` },
              { label: "LTV / CAC", value: `${ue.ltv_cac.toFixed(1)}×` },
              { label: "Payback", value: `${ue.payback_months} mo` },
              { label: "Gross margin", value: `${ue.gross_margin_pct}%` },
              { label: "Contribution margin", value: `${ue.contribution_margin_pct}%` },
              { label: "Magic number", value: ue.magic_number.toFixed(2) },
              { label: "FCF margin", value: `${pack.kpis.fcf_margin_pct}%` },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel-2)]/40 px-4 py-3"
              >
                <div className="label-caps text-[var(--faint)]">{row.label}</div>
                <div className="mono mt-1 text-[1.35rem] text-[var(--text)]">{row.value}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="title text-[1.35rem]">Efficiency bands</h2>
          <p className="mt-1 text-[0.9rem] text-[var(--muted)]">Progress vs elite SaaS benchmarks</p>
          <div className="mt-5">
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
                  label: "Payback strength",
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
                {
                  label: "Contribution margin",
                  value: ue.contribution_margin_pct,
                  max: 100,
                  format: `${ue.contribution_margin_pct}%`,
                  good: ue.contribution_margin_pct >= 40,
                },
              ]}
            />
          </div>
        </Panel>
      </div>

      {/* Headcount / customers / cohort */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel>
          <h2 className="title text-[1.2rem]">Headcount ramp</h2>
          <div className="mt-4">
            <BarChart series={headSeries} formatValue={(v) => String(Math.round(v))} />
          </div>
        </Panel>
        <Panel>
          <h2 className="title text-[1.2rem]">Customer logos</h2>
          <div className="mt-4">
            {customerSeries.length ? (
              <AreaChart
                series={customerSeries}
                height={160}
                color="var(--deep)"
                formatValue={(v) => String(Math.round(v))}
              />
            ) : (
              <p className="text-sm text-[var(--muted)]">No customer series in pack</p>
            )}
          </div>
        </Panel>
        <Panel>
          <h2 className="title text-[1.2rem]">Cohort retention</h2>
          <div className="mt-4">
            <BarChart series={cohort} formatValue={(v) => `${v}%`} color="var(--ok)" />
          </div>
        </Panel>
      </div>

      {/* Ratios table */}
      <Panel>
        <h2 className="title text-[1.35rem]">Ratio sheet</h2>
        <p className="mt-1 text-[0.9rem] text-[var(--muted)]">
          Benchmarked against elite SaaS / growth underwriting bands
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-[0.75rem] uppercase tracking-wide text-[var(--faint)]">
                <th className="pb-2 pr-3 font-medium">Metric</th>
                <th className="pb-2 pr-3 font-medium">Value</th>
                <th className="pb-2 pr-3 font-medium">Benchmark</th>
                <th className="pb-2 pr-3 font-medium">Signal</th>
                <th className="pb-2 font-medium">Read</th>
              </tr>
            </thead>
            <tbody>
              {pack.ratios.map((r) => (
                <tr key={r.key} className="border-b border-[var(--line)] last:border-0">
                  <td className="py-3 pr-3 font-medium text-[var(--text)]">{r.label}</td>
                  <td className="mono py-3 pr-3 text-[var(--signal)]">{r.value}</td>
                  <td className="py-3 pr-3 text-[var(--muted)]">{r.benchmark || "—"}</td>
                  <td className="py-3 pr-3">
                    <span
                      className={cn(
                        "inline-flex rounded px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide",
                        statusBg(r.status),
                        statusClass(r.status),
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 text-[var(--muted)]">{r.hint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* VC terms glossary with values */}
      <Panel>
        <h2 className="title text-[1.35rem]">VC finance terms</h2>
        <p className="mt-1 text-[0.9rem] text-[var(--muted)]">
          Partner-ready glossary — each term wired to this company&apos;s demo numbers
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {pack.vc_terms.map((t) => (
            <div
              key={t.term}
              className="rounded-[var(--radius)] border border-[var(--line)] px-4 py-3.5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-semibold text-[var(--text)]">{t.term}</div>
                <div className="mono text-sm text-[var(--signal)]">{t.value}</div>
              </div>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--muted)]">
                {t.definition}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      {/* Narrative */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="border-[var(--ok)]/30 bg-[var(--ok-dim)]/40">
          <div className="label-caps text-[var(--ok)]">Bull case</div>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--text)]/90">{pack.narrative.bull}</p>
        </Panel>
        <Panel className="border-[var(--warn)]/30 bg-[var(--warn-dim)]/40">
          <div className="label-caps text-[var(--warn)]">Bear case</div>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--text)]/90">{pack.narrative.bear}</p>
        </Panel>
        <Panel className="border-[var(--signal)]/30 bg-[var(--signal-dim)]/50">
          <div className="label-caps text-[var(--signal)]">Underwrite</div>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--text)]/90">
            {pack.narrative.underwrite}
          </p>
        </Panel>
      </div>
    </div>
  );
}
