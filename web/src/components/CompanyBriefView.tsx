import Link from "next/link";
import { ExternalLink } from "@/components/ExternalLink";
import { CommentaryDesk } from "@/components/CommentaryDesk";
import { DiligenceStressPackFromBrief } from "@/components/DiligenceStressPack";
import { CompanyLink, CompetitorLink } from "@/components/EntityLink";
import {
  GaugeChart,
  RadarChart,
  ValuationStepChart,
} from "@/components/charts";
import type { CompanyBrief } from "@/lib/research";
import { getDemoFinancials, hasDemoFinancials } from "@/lib/demoFinancials";
import { ScoreBars } from "@/components/ScoreBars";
import { SourceCoveragePanel } from "@/components/SourceCoveragePanel";
import { ThesisCriteriaPanel } from "@/components/ThesisCriteriaPanel";
import { Block, EmptyState, Eyebrow, Meta, Panel, RecBadge } from "@/components/ui";
import { fmtMoneyM, fmtPct } from "@/lib/utils";
import { cleanProse } from "@/lib/digestFormat";
import { sanitizeBriefDomain } from "@/lib/externalLinks";

function roundAbbrev(round: string) {
  const m = round.match(/Series\s+([A-Z])/i);
  if (m) return `S${m[1].toUpperCase()}`;
  if (/seed/i.test(round)) return "Seed";
  return round.slice(0, 6);
}

export function CompanyBriefView({ brief }: { brief: CompanyBrief }) {
  const scout = !brief.in_pipeline || brief.confidence !== "high";
  const displayRec = scout
    ? brief.recommendation === "Pass"
      ? "Pass"
      : "Watch"
    : brief.recommendation;
  const sourceCount = brief.sources?.length || 0;
  const financeReady = hasDemoFinancials(brief.slug || brief.company_id);
  const financePack = getDemoFinancials(brief.slug || brief.company_id);
  const radarScores =
    financePack?.score_radar ||
    (brief.score_breakdown
      ? Object.fromEntries(
          Object.entries(brief.score_breakdown)
            .filter(([, v]) => typeof v === "number")
            .map(([k, v]) => [k.replace(/_/g, " ").slice(0, 10), v as number]),
        )
      : null);
  const ladder =
    (brief.funding_rounds?.length
      ? brief.funding_rounds
      : financePack?.round_history
    )?.map((r) => ({
      label: roundAbbrev(r.round),
      value: r.post_m ?? r.amount_m ?? 0,
    })).filter((r) => r.value > 0) || [];
  const fundingRounds = brief.funding_rounds?.length
    ? brief.funding_rounds
    : financePack?.round_history || [];
  const score = brief.thesis_score != null ? Number(brief.thesis_score) : null;
  const safeDomain = sanitizeBriefDomain(brief.domain, brief.name, brief.in_pipeline);
  const companySite = safeDomain ? `https://${safeDomain}` : null;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-2xl">
          <Eyebrow live={!scout}>
            {brief.in_pipeline
              ? scout
                ? "Pipeline · verify before IC"
                : "Pipeline brief"
              : "Web scout"}
            {safeDomain ? (
              <>
                <span className="text-[var(--faint)]">·</span>
                <span className="mono">{safeDomain}</span>
              </>
            ) : null}
            {sourceCount ? (
              <>
                <span className="text-[var(--faint)]">·</span>
                <span className="mono">{sourceCount} sources</span>
              </>
            ) : null}
          </Eyebrow>
          <h2 className="display mt-3 text-[2.5rem] md:text-[3.25rem]">{brief.name}</h2>
          <p className="body-muted mt-2.5 text-[1.05rem]">{cleanProse(brief.one_liner) || brief.one_liner}</p>
          <div className="mt-4 flex flex-wrap gap-x-2 gap-y-1 text-[0.8125rem] text-[var(--muted)]">
            <span>{brief.sector_theme || "—"}</span>
            <span className="text-[var(--faint)]">·</span>
            <span>{brief.subsector || "—"}</span>
            <span className="text-[var(--faint)]">·</span>
            <span>{brief.stage || "—"}</span>
            {brief.relative_rank && (
              <>
                <span className="text-[var(--faint)]">·</span>
                <span>{brief.relative_rank}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <RecBadge rec={displayRec} />
          <div
            className={`mono mt-3 text-[2.75rem] ${scout ? "text-[var(--muted)]" : "text-[var(--signal)]"}`}
          >
            {brief.thesis_score != null ? (
              <>
                {scout && <span className="mr-1 text-[0.875rem] font-sans text-[var(--faint)]">est.</span>}
                {Number(brief.thesis_score).toFixed(0)}
              </>
            ) : (
              "—"
            )}
          </div>
          <div className="mt-1 text-[0.8125rem] text-[var(--muted)]">
            {scout ? "estimated thesis score" : "thesis score"}
          </div>
          {brief.in_pipeline && brief.slug && (
            <div className="mt-3 flex flex-col items-end gap-1.5">
              <Link
                href={`/company/${brief.slug || brief.company_id}`}
                className="link-quiet text-sm"
              >
                Open full company page →
              </Link>
              {financeReady ? (
                <Link
                  href={`/company/${brief.slug || brief.company_id}/financials`}
                  className="link-quiet text-sm text-[var(--signal)]"
                >
                  Financials desk →
                </Link>
              ) : null}
            </div>
          )}
          {companySite && !brief.in_pipeline && (
            <ExternalLink
              href={companySite}
              companyName={brief.name}
              inPipeline={brief.in_pipeline}
              kind="site"
              className="link-quiet mt-3 inline-block text-sm"
            >
              Open company site →
            </ExternalLink>
          )}
        </div>
      </div>

      <Panel>
        <ThesisCriteriaPanel
          company={{
            pipeline_bucket: brief.pipeline_bucket,
            stage: brief.stage,
            valuation_est_m: brief.valuation_est_m,
            valuation_confidence: brief.valuation_confidence,
            yoy_growth_pct: brief.yoy_growth_pct,
            headcount_6m_growth_pct: brief.headcount_6m_growth_pct,
            runway_months_est: brief.runway_months_est,
            tier1_count: brief.tier1_count,
            tier1_names: brief.tier1_names,
            moat_notes: brief.moat_notes,
            tam_usd_b: brief.tam_usd_b,
            score_breakdown: brief.score_breakdown,
            sources: brief.sources,
            sector_theme: brief.sector_theme,
            last_round_size_m: brief.last_round_size_m,
          }}
        />
      </Panel>

      {!!brief.agent_trace?.length && (
        <Panel className="!p-5">
          <h3 className="title text-[1.15rem]">How Signal researched this</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {brief.agent_trace.map((s) => (
              <span key={s.id} className="chip text-[0.8125rem]">
                {s.status === "done" ? "✓ " : ""}
                {s.label}
                {typeof s.hits === "number" ? ` · ${s.hits}` : ""}
              </span>
            ))}
          </div>
        </Panel>
      )}

      {(ladder.length > 0 || (radarScores && Object.keys(radarScores).length >= 3) || score != null) && (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          {ladder.length > 0 ? (
            <Panel>
              <div className="label-caps">Funding history</div>
              <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                Round ladder · post-money when known
              </p>
              <div className="mt-3">
                <ValuationStepChart series={ladder} height={200} />
              </div>
              {fundingRounds.length ? (
                <div className="mt-4 space-y-3 border-t border-[var(--line)] pt-4">
                  {fundingRounds.map((r, i) => {
                    const prev = fundingRounds[i - 1];
                    const step =
                      prev && "post_m" in prev && prev.post_m && r.post_m && prev.post_m > 0
                        ? `${(Number(r.post_m) / Number(prev.post_m)).toFixed(1)}x step-up`
                        : null;
                    return (
                      <div
                        key={`${r.round}-${r.date || i}`}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="font-medium">{r.round}</div>
                          <div className="text-[0.75rem] text-[var(--muted)]">
                            {r.date || "—"}
                            {r.lead ? ` · ${r.lead}` : ""}
                            {step ? ` · ${step}` : ""}
                            {"confidence" in r && r.confidence ? ` · ${r.confidence}` : ""}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="mono text-[var(--signal)]">
                            {fmtMoneyM(r.amount_m)}
                          </div>
                          {r.post_m != null ? (
                            <div className="mono text-[0.7rem] text-[var(--faint)]">
                              {fmtMoneyM(r.post_m)} post
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </Panel>
          ) : null}
          <div className="space-y-5">
            {score != null ? (
              <Panel className="flex flex-wrap items-center justify-around gap-4 !py-5">
                <GaugeChart
                  value={score}
                  max={100}
                  label="Thesis"
                  sub={scout ? "estimated" : "pipeline score"}
                  color={scout ? "var(--muted)" : "var(--signal)"}
                  size={150}
                />
                {brief.runway_months_est != null ? (
                  <GaugeChart
                    value={brief.runway_months_est}
                    max={36}
                    label="Runway"
                    sub="months"
                    format={(v) => `${Math.round(v)}`}
                    color={
                      brief.runway_months_est < 12
                        ? "var(--danger)"
                        : brief.runway_months_est < 18
                          ? "var(--warn)"
                          : "var(--ok)"
                    }
                    size={150}
                  />
                ) : null}
              </Panel>
            ) : null}
            {radarScores && Object.keys(radarScores).length >= 3 ? (
              <Panel>
                <div className="label-caps">Thesis radar</div>
                <RadarChart scores={radarScores} size={210} className="mt-2" />
              </Panel>
            ) : null}
          </div>
        </div>
      )}

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_min(24rem,30%)]">
        <div className="min-w-0 space-y-5">
          <Panel>
            <h3 className="title text-[1.35rem]">Why now</h3>
            <p className="mt-3 leading-relaxed text-[var(--text)]/90">
              {cleanProse(brief.why_now) || "—"}
            </p>
          </Panel>

          <Panel className="grid gap-5 sm:grid-cols-2">
            <Meta
              label="Last round"
              value={`${fmtMoneyM(brief.last_round_size_m)} · ${brief.last_round_date || "—"}`}
            />
            <Meta
              label="Valuation"
              value={`${fmtMoneyM(brief.valuation_est_m)} (${brief.valuation_confidence || "unknown"})`}
            />
            <Meta
              label="Lead"
              value={
                brief.lead_investor ? (
                  <CompetitorLink name={brief.lead_investor} />
                ) : (
                  "—"
                )
              }
            />
            <Meta
              label="Tier-1"
              value={
                (brief.tier1_names || []).length ? (
                  <span className="inline-flex flex-wrap gap-x-1 gap-y-0.5">
                    <span className="text-[var(--faint)]">{brief.tier1_count ?? 0} ·</span>
                    {(brief.tier1_names || []).map((n, i) => (
                      <span key={n}>
                        <CompetitorLink name={n} />
                        {i < (brief.tier1_names || []).length - 1 ? "," : ""}
                      </span>
                    ))}
                  </span>
                ) : (
                  `${brief.tier1_count ?? 0} · —`
                )
              }
            />
            <Meta
              label="Tier-2 / Tier-3"
              value={`T2 ${brief.tier2_count ?? 0}${
                (brief.tier2_names || []).length ? ` (${brief.tier2_names!.slice(0, 3).join(", ")})` : ""
              } · T3 ${brief.tier3_count ?? 0}`}
            />
            <Meta label="YoY growth" value={fmtPct(brief.yoy_growth_pct)} />
            <Meta
              label="Runway"
              value={brief.runway_months_est != null ? `${brief.runway_months_est} mo` : "—"}
            />
            <Meta
              label="Headcount"
              value={`${brief.headcount ?? "—"} · 6m ${fmtPct(brief.headcount_6m_growth_pct)}`}
            />
            <Meta label="TAM" value={brief.tam_usd_b != null ? `$${brief.tam_usd_b}B` : "—"} />
          </Panel>

          <Panel className="grid min-w-0 gap-x-8 gap-y-6 md:grid-cols-2">
            <Block
              title="Team & hiring"
              body={
                [
                  brief.team_notes,
                  brief.headcount != null
                    ? `HC ${brief.headcount} · 6m ${fmtPct(brief.headcount_6m_growth_pct)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
            />
            <Block title="Product" body={brief.product_notes} />
            <Block title="Traction" body={brief.traction_notes} />
            <Block title="Thesis fit / moat" body={brief.moat_notes} />
          </Panel>

          {!!brief.recent_news?.length && (
            <Panel>
              <h3 className="title text-[1.35rem]">Recent news</h3>
              <ul className="mt-4 space-y-3">
                {brief.recent_news.slice(0, 8).map((n, i) => (
                  <li
                    key={`${n.title}-${i}`}
                    className="border-b border-[var(--line)] pb-3 last:border-0 last:pb-0"
                  >
                    {n.url ? (
                      <ExternalLink href={n.url} kind="source" className="link-quiet text-[0.975rem]">
                        {n.title}
                      </ExternalLink>
                    ) : (
                      <div className="text-[0.975rem]">{n.title}</div>
                    )}
                    <div className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                      {[n.source, n.published].filter(Boolean).join(" · ") || "News"}
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <CommentaryDesk
            commentary={brief.commentary || []}
            summary={cleanProse(brief.commentary_summary) || brief.commentary_summary}
            company={
              brief.company_id
                ? {
                    id: brief.company_id,
                    name: brief.name,
                    commentary_summary: brief.commentary_summary,
                  }
                : null
            }
            mode="company"
          />

          {!!(brief.comparable_rows?.length || brief.comparables?.length) && (
            <Panel>
              <h3 className="title text-[1.35rem]">Comparable companies</h3>
              {brief.comparable_rows?.length ? (
                <div className="mt-4 space-y-3.5">
                  {brief.comparable_rows.map((c) => (
                    <div
                      key={c.company_id || c.name}
                      className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3.5 last:border-0 last:pb-0"
                    >
                      <div>
                        {c.slug || c.company_id ? (
                          <Link
                            href={`/company/${c.slug || c.company_id}`}
                            className="font-semibold transition hover:text-[var(--signal)]"
                          >
                            {c.name}
                          </Link>
                        ) : (
                          <div className="font-semibold">{c.name}</div>
                        )}
                        {c.why ? (
                          <div className="mt-0.5 text-[0.8125rem] text-[var(--muted)]">{c.why}</div>
                        ) : null}
                      </div>
                      <div className="text-right">
                        {c.recommendation ? <RecBadge rec={c.recommendation} /> : null}
                        {c.thesis_score != null ? (
                          <div className="mono mt-1.5 text-sm text-[var(--signal)]">
                            {Number(c.thesis_score).toFixed(0)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(brief.comparables || []).map((c) => (
                    <CompanyLink key={c} slug={c} name={c} className="chip" />
                  ))}
                </div>
              )}
            </Panel>
          )}
        </div>

        <aside className="min-w-0 space-y-5 lg:sticky lg:top-[calc(var(--header-h)+1.25rem)] lg:self-start">
          <Panel>
            <h3 className="title text-[1.2rem]">Score breakdown</h3>
            <p className="mt-1.5 text-[0.8125rem] text-[var(--muted)]">
              Weighted thesis dimensions vs Thirdbase policy.
            </p>
            <div className="mt-4">
              <ScoreBars breakdown={brief.score_breakdown} />
            </div>
          </Panel>

          <Panel>
            <SourceCoveragePanel sources={brief.sources} />
          </Panel>

          <Panel>
            <h3 className="title text-[1.2rem]">Cap table</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {(brief.investors || []).length === 0 && <EmptyState>No investors captured yet.</EmptyState>}
              {(brief.investors || []).map((inv) => (
                <CompetitorLink key={inv} name={inv} className="chip" />
              ))}
            </div>
          </Panel>

          <Panel>
            <h3 className="title text-[1.2rem]">Open questions</h3>
            <ul className="mt-3 space-y-2.5 text-[0.9375rem] text-[var(--muted)]">
              {brief.open_questions.map((q) => (
                <li key={q} className="flex gap-2">
                  <span className="text-[var(--signal)]">›</span>
                  <span className="leading-relaxed">{q}</span>
                </li>
              ))}
            </ul>
          </Panel>

          {!!brief.sources?.length && (
            <Panel>
              <h3 className="title text-[1.2rem]">Source hits ({brief.sources.length})</h3>
              <div className="mt-3 space-y-3.5">
                {brief.sources.slice(0, 16).map((s, i) => (
                  <div key={`${s.provider}-${i}`} className="text-sm">
                    <div className="label-caps text-[var(--faint)]">{s.provider}</div>
                    {s.url ? (
                      <ExternalLink href={s.url} kind="source" className="link-quiet mt-0.5 inline-block">
                        {s.title}
                      </ExternalLink>
                    ) : (
                      <div className="mt-0.5">{s.title}</div>
                    )}
                    {(() => {
                      const snip = cleanProse(s.snippet);
                      if (!snip) return null;
                      return (
                        <p className="mt-1 text-[0.75rem] leading-relaxed text-[var(--muted)] [overflow-wrap:break-word]">
                          {snip.slice(0, 140)}
                          {snip.length > 140 ? "…" : ""}
                        </p>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </aside>
      </div>

      {!scout && <DiligenceStressPackFromBrief brief={brief} />}
      <p className="text-[0.8125rem] text-[var(--faint)]">{brief.provenance}</p>
    </div>
  );
}
