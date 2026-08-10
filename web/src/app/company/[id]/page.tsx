import Link from "next/link";
import { DiligenceStressPackFromCompany } from "@/components/DiligenceStressPack";
import { IcPacketButton } from "@/components/IcPacketButton";
import { IcTrailPanel } from "@/components/IcTrailPanel";
import { OverridePanel } from "@/components/OverridePanel";
import { ScoreBars } from "@/components/ScoreBars";
import { BackLink, Block, EmptyState, Meta, Panel, RecBadge } from "@/components/ui";
import { fetchCommentary, fetchCompanies, fetchCompany, fetchPeers } from "@/lib/data";
import { circlingCompetitors } from "@/lib/goldenInsights";
import { computeCompanyFreshness } from "@/lib/judgment";
import { buildPeerIntelligence } from "@/lib/peerIntel";
import { fmtMoneyM, fmtPct } from "@/lib/utils";

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

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-2xl">
          <BackLink href="/pipeline">Pipeline</BackLink>
          <h1 className="display mt-4 text-[2.5rem] md:text-[3.25rem]">{company.name}</h1>
          <p className="body-muted mt-2.5 text-[1.05rem]">{company.one_liner}</p>
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
          </div>
          <div className="mt-4">
            <IcPacketButton
              company={company}
              commentary={commentary}
              comps={comps}
              competitive={competitive}
              peers={peers}
            />
          </div>
        </div>
        <div className="text-right">
          <RecBadge rec={company.recommendation} />
          <div className="mono mt-3 text-[2.75rem] text-[var(--signal)]">{company.thesis_score?.toFixed(0)}</div>
          <div className="mt-1 text-[0.8125rem] text-[var(--muted)]">thesis score</div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-5">
          <Panel>
            <h2 className="title text-[1.35rem]">Why now</h2>
            <p className="mt-3 leading-relaxed text-[var(--text)]/90">{company.why_now}</p>
          </Panel>

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
              label="Tier-1"
              value={`${company.tier1_count} · ${(company.tier1_names || []).join(", ")}`}
            />
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
          </Panel>

          <Panel className="grid gap-6 md:grid-cols-3">
            <Block title="Team" body={company.team_notes} />
            <Block title="Traction" body={company.traction_notes} />
            <Block title="Moat" body={company.moat_notes} />
          </Panel>

          {quietTape && company.recommendation === "Deep Dive" && (
            <Panel className="border-[rgba(214,255,60,0.35)] bg-[rgba(214,255,60,0.06)]">
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
                    <Link key={f.slug} href={`/peers/${f.slug}`} className="block text-sm hover:text-[var(--signal)]">
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
                    <Link key={f.slug} href={`/peers/${f.slug}`} className="block text-sm hover:text-[var(--signal)]">
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
                    <Link key={f.slug} href={`/peers/${f.slug}`} className="block text-sm hover:text-[var(--signal)]">
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

          <Panel>
            <h2 className="title text-[1.35rem]">Investor & operator commentary</h2>
            <div className="mt-4 space-y-4">
              {commentary.length === 0 && (
                <EmptyState>{company.commentary_summary || "No commentary yet."}</EmptyState>
              )}
              {commentary.map((cm) => (
                <div key={cm.id} className="border-b border-[var(--line)] pb-3.5 last:border-0 last:pb-0">
                  <div className="text-[0.8125rem] text-[var(--muted)]">
                    {cm.source} · {cm.sentiment} · {cm.credibility_tier}
                  </div>
                  <p className="mt-1.5 text-[0.975rem] leading-relaxed">{cm.quote_or_summary}</p>
                </div>
              ))}
            </div>
          </Panel>

          <DiligenceStressPackFromCompany
            company={company}
            commentary={commentary}
            peers={peers}
          />
        </div>

        <aside className="space-y-5">
          <IcTrailPanel company={company} />
          <OverridePanel
            companyId={company.id}
            companyName={company.name}
            slug={company.slug}
            signalRec={company.recommendation}
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
            <div className="mt-4">
              <ScoreBars breakdown={company.score_breakdown} />
            </div>
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
                      href={`/peers/${firm.slug}`}
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
                    href={`/peers/${f.slug}`}
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
