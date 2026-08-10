import Link from "next/link";
import { DiligenceStressPackFromBrief } from "@/components/DiligenceStressPack";
import type { CompanyBrief } from "@/lib/research";
import { ScoreBars } from "@/components/ScoreBars";
import { Block, EmptyState, Eyebrow, Meta, Panel, RecBadge } from "@/components/ui";
import { fmtMoneyM, fmtPct } from "@/lib/utils";

export function CompanyBriefView({ brief }: { brief: CompanyBrief }) {
  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-2xl">
          <Eyebrow live>
            {brief.in_pipeline ? "Pipeline brief" : "External research"}
            <span className="text-[var(--faint)]">·</span>
            <span>confidence {brief.confidence}</span>
          </Eyebrow>
          <h2 className="display mt-3 text-[2.5rem] md:text-[3.25rem]">{brief.name}</h2>
          <p className="body-muted mt-2.5 text-[1.05rem]">{brief.one_liner}</p>
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
          <RecBadge rec={brief.recommendation} />
          <div className="mono mt-3 text-[2.75rem] text-[var(--signal)]">
            {brief.thesis_score != null ? Number(brief.thesis_score).toFixed(0) : "—"}
          </div>
          <div className="mt-1 text-[0.8125rem] text-[var(--muted)]">thesis score</div>
          {brief.in_pipeline && brief.slug && (
            <Link
              href={`/company/${brief.slug || brief.company_id}`}
              className="link-quiet mt-3 inline-block text-sm"
            >
              Open full company page →
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-5">
          <Panel>
            <h3 className="title text-[1.35rem]">Why now</h3>
            <p className="mt-3 leading-relaxed text-[var(--text)]/90">{brief.why_now || "—"}</p>
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
            <Meta label="Lead" value={brief.lead_investor || "—"} />
            <Meta
              label="Tier-1"
              value={`${brief.tier1_count ?? 0} · ${(brief.tier1_names || []).join(", ") || "—"}`}
            />
            <Meta
              label="Tier-2 / Tier-3"
              value={`T2 ${brief.tier2_count ?? 0}${(brief.tier2_names || []).length ? ` (${brief.tier2_names!.slice(0, 3).join(", ")})` : ""} · T3 ${brief.tier3_count ?? 0}`}
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

          <Panel className="grid gap-6 md:grid-cols-3">
            <Block title="Team & hiring" body={brief.team_notes} />
            <Block title="Product traction" body={brief.traction_notes} />
            <Block title="Moat" body={brief.moat_notes} />
          </Panel>

          <Panel>
            <h3 className="title text-[1.35rem]">Investor & operator commentary</h3>
            <p className="mt-2 text-[0.9375rem] text-[var(--muted)]">{brief.commentary_summary}</p>
            <div className="mt-4 space-y-4">
              {(brief.commentary || []).length === 0 && (
                <EmptyState>No discrete commentary rows yet.</EmptyState>
              )}
              {(brief.commentary || []).map((cm) => (
                <div key={cm.id} className="border-b border-[var(--line)] pb-3.5 last:border-0 last:pb-0">
                  <div className="text-[0.8125rem] text-[var(--muted)]">
                    {cm.source} · {cm.sentiment} · {cm.credibility_tier}
                  </div>
                  <p className="mt-1.5 text-[0.975rem] leading-relaxed">{cm.quote_or_summary}</p>
                </div>
              ))}
            </div>
          </Panel>

          {!!brief.comparables?.length && (
            <Panel>
              <h3 className="title text-[1.35rem]">Comparable companies</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {brief.comparables.map((c) => (
                  <span key={c} className="chip">
                    {c}
                  </span>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <aside className="space-y-5">
          <Panel>
            <h3 className="title text-[1.2rem]">Score breakdown</h3>
            <div className="mt-4">
              <ScoreBars breakdown={brief.score_breakdown} />
            </div>
          </Panel>

          <Panel>
            <h3 className="title text-[1.2rem]">Cap table</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {(brief.investors || []).length === 0 && <EmptyState>No investors captured yet.</EmptyState>}
              {(brief.investors || []).map((inv) => (
                <span key={inv} className="chip">
                  {inv}
                </span>
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
              <h3 className="title text-[1.2rem]">Sources</h3>
              <div className="mt-3 space-y-3.5">
                {brief.sources.slice(0, 8).map((s, i) => (
                  <div key={`${s.provider}-${i}`} className="text-sm">
                    <div className="label-caps text-[var(--faint)]">
                      {s.provider}
                    </div>
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="link-quiet mt-0.5 inline-block"
                      >
                        {s.title}
                      </a>
                    ) : (
                      <div className="mt-0.5">{s.title}</div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </aside>
      </div>

      <DiligenceStressPackFromBrief brief={brief} />

      <p className="text-[0.8125rem] text-[var(--faint)]">{brief.provenance}</p>
    </div>
  );
}
