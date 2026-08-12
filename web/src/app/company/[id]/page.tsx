import Link from "next/link";
import { CommentaryDesk } from "@/components/CommentaryDesk";
import { CompanyAnalytics } from "@/components/CompanyAnalytics";
import { ContradictionMap } from "@/components/ContradictionMap";
import { DiligenceStressPackFromCompany } from "@/components/DiligenceStressPack";
import { IcPacketButton } from "@/components/IcPacketButton";
import { IcTrailPanel } from "@/components/IcTrailPanel";
import { LikeButton } from "@/components/LikeButton";
import { OverridePanel } from "@/components/OverridePanel";
import { PartnerLogPanel } from "@/components/PartnerLog";
import { TrackCompanyView } from "@/components/RecentViews";
import { ScoreBars } from "@/components/ScoreBars";
import { SourceCoveragePanel } from "@/components/SourceCoveragePanel";
import { GreatDealPanel } from "@/components/GreatDealDesk";
import { ThesisCriteriaPanel } from "@/components/ThesisCriteriaPanel";
import { RadarChart } from "@/components/charts";
import { BackLink, Block, EmptyState, Meta, Panel, RecBadge } from "@/components/ui";
import { CompanyQuickActions } from "@/components/CompanyQuickActions";
import { fetchCommentary, fetchCompanies, fetchCompany, fetchPeers } from "@/lib/data";
import { buildCommentaryIntel, postureTone } from "@/lib/commentaryIntel";
import { resolveFundingRounds, resolveProductNotes } from "@/lib/companyBrief";
import { getDemoFinancials } from "@/lib/demoFinancials";
import { circlingCompetitors } from "@/lib/goldenInsights";
import { computeCompanyFreshness } from "@/lib/judgment";
import { buildPeerIntelligence } from "@/lib/peerIntel";
import { fmtMoneyM, fmtPct } from "@/lib/utils";
import { cleanProse } from "@/lib/digestFormat";

export const dynamic = "force-dynamic";

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await fetchCompany(id);
  if (!company) {
    return (
      <div className="animate-in">
        <h1 className="display text-[1.85rem]">Company not found</h1>
        <Link href="/pipeline" className="link-quiet mt-4 inline-block text-sm">
          Back to pipeline
        </Link>
      </div>
    );
  }
  const [commentary, peers, companies] = await Promise.all([
    fetchCommentary(company.id),
    fetchPeers(),
    fetchCompanies(),
  ]);
  const companyPeers = peers.filter((p) => p.company_id === company.id);
  const intel = buildPeerIntelligence(companies, peers);
  const comps = intel.comparables[company.id] || [];
  const competitive = circlingCompetitors(company, intel);
  const investorFirms = (company.investors || [])
    .map((name) => intel.firms.find((f) => f.name === name || f.aliases.includes(name)))
    .filter(Boolean)
    .slice(0, 6);
  const quietTape = (company.investors || []).length <= 3;
  const freshness = computeCompanyFreshness(company);
  const financePack =
    getDemoFinancials(company.slug) || getDemoFinancials(company.id);
  const fundingRounds = resolveFundingRounds(company);
  const productNotes = resolveProductNotes(company);
  const voiceIntel = buildCommentaryIntel(commentary, {
    company,
    summary: company.commentary_summary,
  });
  const voiceTone = postureTone(voiceIntel.posture);
  const voiceColor =
    voiceTone === "ok"
      ? "text-[var(--ok)]"
      : voiceTone === "danger"
        ? "text-[var(--danger)]"
        : voiceTone === "warn"
          ? "text-[var(--warn)]"
          : "text-[var(--muted)]";

  return (
    <div className="space-y-9 animate-in">
      <TrackCompanyView
        id={company.id}
        slug={company.slug}
        name={company.name}
        recommendation={company.recommendation}
        thesis_score={company.thesis_score}
      />
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-[var(--line)] pb-8">
        <div className="min-w-0 max-w-2xl">
          <BackLink href="/pipeline">Pipeline</BackLink>
          <h1 className="display mt-4 text-[2.5rem] md:text-[3.25rem]">{company.name}</h1>
          <p className="body-muted mt-3 text-[1.05rem]">{company.one_liner}</p>
          <div className="mt-4 flex flex-wrap gap-x-2 gap-y-1 text-[0.8125rem] text-[var(--muted)]">
            <span>{company.sector_theme}</span>
            <span className="text-[var(--faint)]">·</span>
            <span>{company.subsector}</span>
            <span className="text-[var(--faint)]">·</span>
            <span>{company.stage}</span>
            <span className="text-[var(--faint)]">·</span>
            <span>{company.relative_rank}</span>
            <span className="text-[var(--faint)]">·</span>
            <span
              className={
                freshness.overall === "stale"
                  ? "text-[var(--danger)]"
                  : freshness.overall === "aging"
                    ? "text-[var(--warn)]"
                    : "text-[var(--ok)]"
              }
            >
              evidence {freshness.overall} · {freshness.score_confidence}%
            </span>
            <span className="text-[var(--faint)]">·</span>
            <span className={voiceColor}>
              voice {voiceIntel.posture_label.toLowerCase()}
              {voiceIntel.count ? ` · ${voiceIntel.count}` : ""}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <IcPacketButton
              company={company}
              commentary={commentary}
              comps={comps}
              competitive={competitive}
              peers={peers}
            />
            <a
              href={`/api/briefs/${company.id}?format=md`}
              className="btn btn-ghost btn-sm"
              download={`${company.slug || company.id}-brief.md`}
            >
              Intelligence brief ↓
            </a>
            {financePack ? (
              <Link
                href={`/company/${company.id}/financials`}
                className="btn btn-primary btn-sm"
              >
                Financials desk →
              </Link>
            ) : null}
            <LikeButton companyId={company.id} />
          </div>
          <div className="mt-3">
            <CompanyQuickActions companyId={company.id} companyName={company.name} />
          </div>
        </div>
        <div className="text-right">
          <RecBadge rec={company.recommendation} />
          <div className="hero-metric mt-3">{company.thesis_score?.toFixed(0)}</div>
          <div className="mt-2 text-[0.8125rem] text-[var(--muted)]">thesis score</div>
          <div className="mt-1 text-[0.75rem] text-[var(--faint)]">
            vs Thirdbase criteria below
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_min(24rem,30%)]">
        <div className="min-w-0 space-y-5">
          <Panel>
            <h2 className="title text-[1.35rem]">Why now</h2>
            <p className="mt-3 leading-relaxed text-[var(--text)]/90">
              {cleanProse(company.why_now) || "—"}
            </p>
          </Panel>

          <Panel>
            <GreatDealPanel company={company} all={companies} />
          </Panel>

          <Panel>
            <ThesisCriteriaPanel company={company} />
          </Panel>

          {fundingRounds.length > 0 ? (
            <Panel>
              <h2 className="title text-[1.35rem]">Funding history</h2>
              <p className="mt-1.5 text-[0.9375rem] text-[var(--muted)]">
                Multi-round ladder for IC — last round highlighted; priors estimated when only
                latest raise is stored.
              </p>
              <div className="mt-4 space-y-3">
                {fundingRounds.map((r, i) => {
                  const prev = fundingRounds[i - 1];
                  const step =
                    prev?.post_m && r.post_m && prev.post_m > 0
                      ? `${(Number(r.post_m) / Number(prev.post_m)).toFixed(1)}x step-up`
                      : null;
                  return (
                    <div
                      key={`${r.round}-${r.date || i}`}
                      className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <div className="font-medium">{r.round}</div>
                        <div className="text-[0.8125rem] text-[var(--muted)]">
                          {r.date || "—"}
                          {r.lead ? ` · ${r.lead}` : ""}
                          {step ? ` · ${step}` : ""}
                          {r.confidence ? ` · ${r.confidence}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="mono text-[var(--signal)]">{fmtMoneyM(r.amount_m)}</div>
                        {r.post_m != null ? (
                          <div className="mono text-[0.75rem] text-[var(--faint)]">
                            {fmtMoneyM(r.post_m)} post
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          ) : null}

          <Panel className="grid gap-5 sm:grid-cols-2">
            <Meta
              label="Last round"
              value={`${fmtMoneyM(company.last_round_size_m)} · ${company.last_round_date || "—"}`}
            />
            <Meta
              label="Valuation"
              value={`${fmtMoneyM(company.valuation_est_m)} (${company.valuation_confidence})`}
            />
            <Meta label="Lead" value={company.lead_investor || "—"} />
            <Meta
              label="Pipeline bucket"
              value={
                company.pipeline_bucket === "dominant_tech_growth"
                  ? "Dominant tech (60%)"
                  : company.pipeline_bucket === "tactical_sector_agnostic"
                    ? "Tactical (40%)"
                    : company.pipeline_bucket || "—"
              }
            />
            <Meta
              label="Tier-1"
              value={`${company.tier1_count ?? 0} · ${(company.tier1_names || []).join(", ") || "—"}`}
            />
            <Meta
              label="Tier-2 / Tier-3"
              value={`T2 ${company.tier2_count ?? 0}${
                (company.tier2_names || []).length
                  ? ` (${(company.tier2_names || []).slice(0, 3).join(", ")})`
                  : ""
              } · T3 ${company.tier3_count ?? 0}`}
            />
            {financePack ? (
              <>
                <Meta label="ARR" value={`${fmtMoneyM(financePack.kpis.arr_m)} · +${financePack.kpis.arr_growth_yoy_pct}% YoY`} />
                <Meta label="NRR" value={`${financePack.kpis.nrr_pct}%`} />
                <Meta label="Rule of 40" value={String(financePack.kpis.rule_of_40)} />
                <Meta
                  label="Runway / cash"
                  value={`${financePack.kpis.runway_months} mo · ${fmtMoneyM(financePack.kpis.cash_m)}`}
                />
              </>
            ) : (
              <>
                <Meta label="YoY growth" value={fmtPct(company.yoy_growth_pct)} />
                <Meta
                  label="Runway"
                  value={company.runway_months_est ? `${company.runway_months_est} mo` : "—"}
                />
                <Meta
                  label="Headcount"
                  value={`${company.headcount ?? "—"} · 6m ${fmtPct(company.headcount_6m_growth_pct)}`}
                />
                <Meta label="TAM" value={company.tam_usd_b ? `$${company.tam_usd_b}B` : "—"} />
              </>
            )}
          </Panel>

          <Panel className="grid min-w-0 gap-x-8 gap-y-6 md:grid-cols-2">
            <Block
              title="Team & hiring"
              body={
                [
                  company.team_notes,
                  company.headcount != null
                    ? `HC ${company.headcount} · 6m ${fmtPct(company.headcount_6m_growth_pct)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
            />
            <Block title="Product" body={productNotes} />
            <Block title="Traction" body={company.traction_notes} />
            <Block title="Thesis fit / moat" body={company.moat_notes} />
          </Panel>

          {financePack ? (
            <CompanyAnalytics pack={financePack} companyHref={`/company/${company.id}`} />
          ) : null}

          {quietTape && company.recommendation === "Deep Dive" && (
            <Panel className="border-[var(--signal)]/40 bg-[var(--signal-dim)]">
              <div className="label-caps text-[var(--signal)]">
                Proprietary window
              </div>
              <h2 className="title mt-2 text-[1.35rem]">Quiet tape — act before peer FOMO</h2>
              <p className="mt-2 text-[0.9375rem] text-[var(--muted)]">
                Cap table is thin relative to conviction. This is the asymmetric access window Signal
                exists to surface — lock process before Lux / a16z / Coatue crowd the round.
              </p>
            </Panel>
          )}

          <Panel>
            <h2 className="title text-[1.35rem]">Competitive intelligence</h2>
            <p className="mt-1.5 text-[0.9375rem] text-[var(--muted)]">
              Who&apos;s already in, who&apos;s circling from comps, and who to call for syndicate.
            </p>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <div>
                <div className="label-caps">On cap table</div>
                <div className="mt-2 space-y-2">
                  {competitive.on_cap_table.map((f) => (
                    <Link key={f.slug} href={`/competitors/${f.slug}`} className="block text-sm hover:text-[var(--signal)]">
                      {f.name}
                      {f.is_lead ? <span className="text-[var(--deep)]"> · lead</span> : ""}
                    </Link>
                  ))}
                  {!competitive.on_cap_table.length && (
                    <EmptyState>No mapped peer-set firms yet.</EmptyState>
                  )}
                </div>
              </div>
              <div>
                <div className="label-caps text-[var(--warn)]">Circling</div>
                <div className="mt-2 space-y-2">
                  {competitive.circling.map((f) => (
                    <Link key={f.slug} href={`/competitors/${f.slug}`} className="block text-sm hover:text-[var(--signal)]">
                      <div className="font-medium">
                        {f.name}{" "}
                        <span className="label-caps text-[var(--warn)]">{f.threat}</span>
                      </div>
                      <div className="text-[0.8125rem] text-[var(--muted)]">{f.reason}</div>
                    </Link>
                  ))}
                  {!competitive.circling.length && <EmptyState>No clear circlers detected.</EmptyState>}
                </div>
              </div>
              <div>
                <div className="label-caps text-[var(--signal)]">Call next</div>
                <div className="mt-2 space-y-2">
                  {competitive.syndicate_suggestions.map((f) => (
                    <Link key={f.slug} href={`/competitors/${f.slug}`} className="block text-sm hover:text-[var(--signal)]">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{f.firm}</span>
                        <span className="mono text-[var(--deep)]">{f.fit_score}</span>
                      </div>
                      <div className="text-[0.8125rem] text-[var(--muted)]">{f.reason}</div>
                    </Link>
                  ))}
                  {!competitive.syndicate_suggestions.length && (
                    <EmptyState>No syndicate unlock yet.</EmptyState>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <h2 className="title text-[1.35rem]">Comparable companies</h2>
            <p className="mt-1.5 text-[0.9375rem] text-[var(--muted)]">
              Relative peers in the same theme × stage — the competitive set Thirdbase debates in IC.
            </p>
            <div className="mt-4 space-y-3.5">
              {comps.map((comp) => (
                <Link
                  key={comp.company_id}
                  href={`/company/${comp.slug || comp.company_id}`}
                  className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3.5 last:border-0 last:pb-0"
                >
                  <div>
                    <div className="font-semibold transition hover:text-[var(--signal)]">{comp.name}</div>
                    <div className="mt-0.5 text-[0.8125rem] text-[var(--muted)]">{comp.why}</div>
                  </div>
                  <div className="text-right">
                    <RecBadge rec={comp.recommendation} />
                    <div className="mono mt-1.5 text-sm text-[var(--signal)]">
                      {comp.thesis_score?.toFixed(0)}
                    </div>
                  </div>
                </Link>
              ))}
              {!comps.length && <EmptyState>No close comps in pipeline yet.</EmptyState>}
            </div>
          </Panel>

          <CommentaryDesk commentary={commentary} company={company} mode="company" />

          <DiligenceStressPackFromCompany
            company={company}
            commentary={commentary}
            peers={peers}
          />

          <ContradictionMap
            company={company}
            commentary={commentary}
            peers={peers}
          />
        </div>

        <aside className="min-w-0 space-y-5 lg:sticky lg:top-[calc(var(--header-h)+1.25rem)] lg:self-start">
          <IcTrailPanel company={company} />
          <OverridePanel
            companyId={company.id}
            companyName={company.name}
            slug={company.slug}
            signalRec={company.recommendation}
          />
          <PartnerLogPanel
            targetType="company"
            targetId={company.id}
            targetLabel={company.name}
            title="Partner log"
            description="Notes from the partnership on this name — visible on every desk that opens the company."
          />
          <Panel>
            <h2 className="title text-[1.2rem]">Evidence freshness</h2>
            <p className="mt-1.5 text-[0.8125rem] text-[var(--muted)]">{freshness.note}</p>
            <div className="mt-3 space-y-2">
              {freshness.fields.slice(0, 5).map((f) => (
                <div key={f.field} className="flex justify-between gap-2 text-xs">
                  <span className="text-[var(--muted)]">{f.label}</span>
                  <span
                    className={
                      f.status === "stale"
                        ? "text-[var(--danger)]"
                        : f.status === "aging"
                          ? "text-[var(--warn)]"
                          : "text-[var(--faint)]"
                    }
                  >
                    {f.status}
                    {f.age_days != null ? ` · ${f.age_days}d` : ""}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <h2 className="title text-[1.2rem]">Score breakdown</h2>
            <p className="mt-1.5 text-[0.8125rem] text-[var(--muted)]">
              Weighted thesis score dimensions (policy weights).
            </p>
            {company.score_breakdown &&
            Object.keys(company.score_breakdown).length >= 3 ? (
              <RadarChart
                className="mt-3"
                size={200}
                scores={Object.fromEntries(
                  Object.entries(company.score_breakdown)
                    .filter(([, v]) => typeof v === "number")
                    .map(([k, v]) => [
                      k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 12),
                      v as number,
                    ]),
                )}
              />
            ) : null}
            <div className="mt-4">
              <ScoreBars breakdown={company.score_breakdown} />
            </div>
          </Panel>
          <Panel>
            <SourceCoveragePanel sources={company.sources} />
          </Panel>
          <Panel>
            <h2 className="title text-[1.2rem]">Cap table</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(company.investors || []).map((inv) => {
                const firm = intel.firms.find((f) => f.name === inv || f.aliases.includes(inv));
                if (firm) {
                  return (
                    <Link
                      key={inv}
                      href={`/competitors/${firm.slug}`}
                      className="chip !text-[var(--deep)] hover:!border-[var(--deep)]"
                    >
                      {inv}
                    </Link>
                  );
                }
                return (
                  <span key={inv} className="chip">
                    {inv}
                  </span>
                );
              })}
            </div>
          </Panel>
          <Panel>
            <h2 className="title text-[1.2rem]">Investor dossiers</h2>
            <div className="mt-3 space-y-3">
              {investorFirms.map((f) =>
                f ? (
                  <Link
                    key={f.id}
                    href={`/competitors/${f.slug}`}
                    className="block text-sm transition hover:text-[var(--signal)]"
                  >
                    <div className="font-medium">{f.name}</div>
                    <div className="text-[0.8125rem] text-[var(--muted)]">
                      drift {f.drift_score.toFixed(0)} · {f.deal_count} pipeline deals
                    </div>
                  </Link>
                ) : null,
              )}
              {!investorFirms.length && (
                <EmptyState>No mapped peer-set firms on this cap table.</EmptyState>
              )}
            </div>
          </Panel>
          <Panel>
            <h2 className="title text-[1.2rem]">Peer activity</h2>
            <div className="mt-3 space-y-3">
              {companyPeers.map((p) => (
                <div key={p.id} className="text-sm">
                  <div className="font-medium">{p.firm}</div>
                  <div className="text-[0.8125rem] text-[var(--muted)]">
                    {p.round} · {p.date}
                    {p.thesis_shift ? " · THESIS SHIFT" : ""}
                  </div>
                </div>
              ))}
              {!companyPeers.length && <EmptyState>No peer rows.</EmptyState>}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
