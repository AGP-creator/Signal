import Link from "next/link";
import { ScoreBars } from "@/components/ScoreBars";
import { fetchCommentary, fetchCompany, fetchPeers } from "@/lib/data";
import { cn, fmtMoneyM, fmtPct, recClass } from "@/lib/utils";

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
      <div>
        <h1 className="display text-3xl">Company not found</h1>
        <Link href="/pipeline" className="mt-4 inline-block text-[var(--deep)]">
          Back to pipeline
        </Link>
      </div>
    );
  }
  const [commentary, peers] = await Promise.all([
    fetchCommentary(company.id),
    fetchPeers(),
  ]);
  const companyPeers = peers.filter((p) => p.company_id === company.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/pipeline" className="text-sm text-[var(--muted)]">
            ← Pipeline
          </Link>
          <h1 className="display mt-3 text-5xl font-extrabold">{company.name}</h1>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">{company.one_liner}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
            <span>{company.sector_theme}</span>
            <span>·</span>
            <span>{company.subsector}</span>
            <span>·</span>
            <span>{company.stage}</span>
            <span>·</span>
            <span>{company.relative_rank}</span>
          </div>
        </div>
        <div className="text-right">
          <span className={cn("rounded-full px-3 py-1 text-xs font-bold", recClass(company.recommendation))}>
            {company.recommendation}
          </span>
          <div className="mono mt-3 text-5xl text-[var(--signal)]">
            {company.thesis_score?.toFixed(0)}
          </div>
          <div className="text-xs text-[var(--muted)]">thesis score</div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-5">
          <section className="panel p-6">
            <h2 className="display text-2xl font-bold">Why now</h2>
            <p className="mt-3 leading-relaxed text-[var(--text)]/90">{company.why_now}</p>
          </section>

          <section className="panel grid gap-4 p-6 sm:grid-cols-2">
            <Meta label="Last round" value={`${fmtMoneyM(company.last_round_size_m)} · ${company.last_round_date || "—"}`} />
            <Meta label="Valuation" value={`${fmtMoneyM(company.valuation_est_m)} (${company.valuation_confidence})`} />
            <Meta label="Lead" value={company.lead_investor || "—"} />
            <Meta label="Tier-1" value={`${company.tier1_count} · ${(company.tier1_names || []).join(", ")}`} />
            <Meta label="YoY growth" value={fmtPct(company.yoy_growth_pct)} />
            <Meta label="Runway" value={company.runway_months_est ? `${company.runway_months_est} mo` : "—"} />
            <Meta label="Headcount" value={`${company.headcount ?? "—"} · 6m ${fmtPct(company.headcount_6m_growth_pct)}`} />
            <Meta label="TAM" value={company.tam_usd_b ? `$${company.tam_usd_b}B` : "—"} />
          </section>

          <section className="panel grid gap-6 p-6 md:grid-cols-3">
            <Block title="Team" body={company.team_notes} />
            <Block title="Traction" body={company.traction_notes} />
            <Block title="Moat" body={company.moat_notes} />
          </section>

          <section className="panel p-6">
            <h2 className="display text-2xl font-bold">Investor & operator commentary</h2>
            <div className="mt-4 space-y-4">
              {commentary.length === 0 && (
                <p className="text-sm text-[var(--muted)]">{company.commentary_summary || "No commentary yet."}</p>
              )}
              {commentary.map((cm) => (
                <div key={cm.id} className="border-b border-[var(--line)] pb-3">
                  <div className="text-xs text-[var(--muted)]">
                    {cm.source} · {cm.sentiment} · {cm.credibility_tier}
                  </div>
                  <p className="mt-1 text-sm">{cm.quote_or_summary}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="panel p-6">
            <h2 className="display text-xl font-bold">Score breakdown</h2>
            <div className="mt-4">
              <ScoreBars breakdown={company.score_breakdown} />
            </div>
          </section>
          <section className="panel p-6">
            <h2 className="display text-xl font-bold">Cap table</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(company.investors || []).map((inv) => (
                <span
                  key={inv}
                  className="rounded-full border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--muted)]"
                >
                  {inv}
                </span>
              ))}
            </div>
          </section>
          <section className="panel p-6">
            <h2 className="display text-xl font-bold">Peer activity</h2>
            <div className="mt-3 space-y-3">
              {companyPeers.map((p) => (
                <div key={p.id} className="text-sm">
                  <div className="font-medium">{p.firm}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {p.round} · {p.date}
                    {p.thesis_shift ? " · THESIS SHIFT" : ""}
                  </div>
                </div>
              ))}
              {!companyPeers.length && <p className="text-sm text-[var(--muted)]">No peer rows.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function Block({ title, body }: { title: string; body?: string | null }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-[var(--muted)]">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text)]/90">{body || "—"}</p>
    </div>
  );
}
