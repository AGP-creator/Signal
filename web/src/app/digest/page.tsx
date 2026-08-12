import Link from "next/link";
import { DigestSendButton } from "@/components/DigestSendButton";
import { CompanyLink, CompetitorLink } from "@/components/EntityLink";
import { DigestNewsSection } from "@/components/NewsWorthReading";
import { Eyebrow, Page, PageHeader, Panel, RecBadge } from "@/components/ui";
import {
  cleanProse,
  digestDealFacts,
  formatDigestSubject,
  formatScore,
} from "@/lib/digestFormat";
import { fetchCommentary, fetchDashboard } from "@/lib/data";
import { resolveDigestReads } from "@/lib/newsWorthReading";
import { companyPath } from "@/lib/paths";
import { buildVoiceUpdates } from "@/lib/voices";
import type { Company, DigestDeal, DigestPeerMove, DigestSectorCall } from "@/lib/types";

export const dynamic = "force-dynamic";

function companyByName(companies: Company[], name?: string | null) {
  if (!name) return null;
  const key = name.toLowerCase();
  return companies.find((c) => c.name.toLowerCase() === key) || null;
}

function dealFromCompany(c: Company): DigestDeal {
  return {
    name: c.name,
    score: c.thesis_score,
    recommendation: c.recommendation,
    rationale: c.one_liner || c.why_now,
    one_liner: c.one_liner,
    why_now: c.why_now,
    brief_id: c.brief_id,
    brief_url: `/company/${c.slug || c.id}`,
    slug: c.slug,
    sector: c.sector_theme,
    subsector: c.subsector,
    stage: c.stage,
    team_notes: c.team_notes,
    traction_notes: c.traction_notes,
    moat_notes: c.moat_notes,
    lead_investor: c.lead_investor,
    tier1_count: c.tier1_count,
    tier1_names: c.tier1_names,
    yoy_growth_pct: c.yoy_growth_pct,
    valuation_est_m: c.valuation_est_m,
    valuation_confidence: c.valuation_confidence,
  };
}

export default async function DigestPage() {
  const [{ digest, companies, sectors, news, peers, alerts }, commentary] = await Promise.all([
    fetchDashboard(),
    fetchCommentary(),
  ]);
  const payload = digest?.payload;
  const voiceUpdates = buildVoiceUpdates({ commentary, news, alerts, limit: 5 });

  const deals: DigestDeal[] =
    payload?.deals?.length
      ? payload.deals
      : companies
          .filter((c) => c.recommendation === "Deep Dive")
          .slice(0, 5)
          .map(dealFromCompany);

  const sectorCalls: DigestSectorCall[] = payload?.sector_calls?.length
    ? payload.sector_calls
    : sectors.slice(0, 2).map((s) => ({
        subsector: s.subsector,
        consensus_level: s.consensus_level,
        why: s.why_thirdbase_cares,
        top_companies: s.top_companies,
      }));

  const newsItems = resolveDigestReads({
    payloadNews: payload?.news,
    news,
    companies,
  });

  const shifts = peers.filter((p) => p.thesis_shift);
  const peerMoves: DigestPeerMove[] = payload?.peer_moves?.length
    ? payload.peer_moves
    : (shifts.length ? shifts : peers).slice(0, 4).map((p) => ({
        firm: p.firm,
        company: p.company_name,
        notes: p.notes,
        thesis_shift: p.thesis_shift,
      }));

  const subject =
    digest?.subject && !digest.subject.includes("—")
      ? digest.subject
      : formatDigestSubject(new Date().toISOString(), deals.length);

  return (
    <Page>
      <PageHeader
        eyebrow="Digest"
        title="M/W/F priority"
        actions={
          <>
            <Link href="/workbook" className="btn btn-soft">
              Workbook
            </Link>
            <a href="/api/workbook" className="btn btn-ghost">
              Excel
            </a>
          </>
        }
      />

      <div className="mx-auto max-w-2xl animate-in">
        <DigestSendButton />
        <Panel padded={false} className="overflow-hidden shadow-[var(--shadow-float)]">
          <div className="border-b border-[var(--line)] bg-[var(--panel-2)]/60 px-7 py-5">
            <div className="label-caps">Subject</div>
            <div className="mt-2 title text-[1.15rem] leading-snug tracking-[-0.02em]">{subject}</div>
          </div>

          <div className="px-7 py-8">
            <section>
              <h2 className="title text-[1.2rem]">Top deals</h2>
              <div className="mt-6 divide-y divide-[var(--line)]">
                {deals.map((d) => {
                  const company = companyByName(companies, d.name);
                  const { summary, facts } = digestDealFacts(d, company);
                  const href =
                    d.brief_url ||
                    companyPath({
                      slug: d.slug || company?.slug,
                      id: company?.id,
                    }) ||
                    "";
                  const meta = [
                    d.subsector || company?.subsector || d.sector || company?.sector_theme,
                    d.stage || company?.stage,
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <article key={d.name} className="py-6 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="title text-[1.15rem] tracking-[-0.02em]">
                            {href ? (
                              <Link href={href} className="entity-link">
                                {d.name}
                              </Link>
                            ) : (
                              d.name
                            )}
                          </h3>
                          {meta ? (
                            <p className="mt-1 text-[0.8125rem] leading-snug text-[var(--muted)]">
                              {meta}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <RecBadge rec={d.recommendation} />
                          <div className="mono text-[1.15rem] font-medium text-[var(--signal)]">
                            {formatScore(d.score)}
                          </div>
                        </div>
                      </div>

                      {summary ? (
                        <p className="mt-3 text-[0.95rem] leading-[1.55] text-[var(--text)]/90">
                          {summary}
                        </p>
                      ) : null}

                      {facts.length > 0 ? (
                        <dl className="mt-4 grid gap-2.5 text-[0.875rem] leading-snug">
                          {facts.map((f) => (
                            <div
                              key={f.label}
                              className="grid grid-cols-[5.5rem_1fr] gap-3 sm:grid-cols-[6.5rem_1fr]"
                            >
                              <dt className="text-[var(--faint)]">{f.label}</dt>
                              <dd className="text-[var(--muted)]">{f.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}

                      <Link
                        href={href}
                        className="link-quiet mt-4 inline-block text-[0.875rem] font-semibold"
                      >
                        Open brief
                      </Link>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="mt-10 border-t border-[var(--line)] pt-8">
              <h2 className="title text-[1.2rem]">Sector calls</h2>
              <ul className="mt-4 space-y-4">
                {sectorCalls.map((s) => (
                  <li key={s.subsector} className="text-[0.95rem] leading-[1.55]">
                    <div className="font-semibold text-[var(--text)]">{s.subsector}</div>
                    <div className="mt-1 text-[var(--muted)]">
                      <span className="text-[var(--faint)]">{s.consensus_level}</span>
                      {s.why ? <> · {cleanProse(s.why)}</> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-10 border-t border-[var(--line)] pt-8">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="title text-[1.2rem]">News worth reading</h2>
                <span className="text-[0.75rem] text-[var(--faint)]">3–5 · not a firehose</span>
              </div>
              <DigestNewsSection reads={newsItems} />
            </section>

            <section className="mt-10 border-t border-[var(--line)] pt-8">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="title text-[1.2rem]">Latest from people we follow</h2>
                <Link
                  href="/library?tab=voices"
                  className="text-[0.8125rem] font-semibold text-[var(--signal)] hover:underline"
                >
                  Full directory
                </Link>
              </div>
              {voiceUpdates.length ? (
                <ul className="mt-4 space-y-3.5">
                  {voiceUpdates.map((u) => (
                    <li key={u.id} className="text-[0.95rem] leading-[1.55]">
                      <div className="font-medium text-[var(--text)]">
                        {u.voice.url ? (
                          <a
                            href={u.voice.url}
                            target="_blank"
                            rel="noreferrer"
                            className="entity-link"
                          >
                            {u.voice.name}
                          </a>
                        ) : (
                          u.voice.name
                        )}
                        <span className="font-normal text-[var(--faint)]"> · @{u.voice.handle}</span>
                        {u.company_id ? (
                          <>
                            <span className="font-normal text-[var(--faint)]"> · </span>
                            <CompanyLink
                              id={u.company_id}
                              name={u.company_name || "Company"}
                              className="font-normal"
                            />
                          </>
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-[var(--muted)]">{cleanProse(u.text)}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-[0.95rem] text-[var(--muted)]">
                  No GP watchlist hits in this cycle — see the{" "}
                  <Link href="/library?tab=voices" className="font-semibold text-[var(--signal)] hover:underline">
                    People & Pages
                  </Link>{" "}
                  directory.
                </p>
              )}
            </section>

            <section className="mt-10 border-t border-[var(--line)] pt-8">
              <h2 className="title text-[1.2rem]">Peer-set moves</h2>
              <ul className="mt-4 space-y-3.5 text-[0.95rem] leading-[1.55]">
                {peerMoves.map((p, i) => {
                  const company = companyByName(companies, p.company);
                  return (
                    <li key={`${p.firm}-${p.company}-${i}`}>
                      <div className="font-medium text-[var(--text)]">
                        {p.firm ? <CompetitorLink name={p.firm} /> : null}
                        {p.firm && p.company ? (
                          <span className="font-normal text-[var(--faint)]"> on </span>
                        ) : null}
                        {p.company ? (
                          <CompanyLink
                            id={company?.id}
                            slug={company?.slug}
                            name={p.company}
                          />
                        ) : null}
                        {p.thesis_shift ? (
                          <span className="ml-2 text-[0.75rem] font-semibold uppercase tracking-wide text-[var(--warn)]">
                            Thesis shift
                          </span>
                        ) : null}
                      </div>
                    {p.notes ? (
                      <div className="mt-0.5 text-[var(--muted)]">{cleanProse(p.notes)}</div>
                    ) : null}
                  </li>
                  );
                })}
              </ul>
            </section>

            <div className="mt-10 border-t border-[var(--line)] pt-5">
              <Eyebrow>End of digest</Eyebrow>
            </div>
          </div>
        </Panel>
      </div>
    </Page>
  );
}
