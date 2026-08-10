import Link from "next/link";
import { Eyebrow, PageHeader, Panel } from "@/components/ui";
import { fetchDashboard } from "@/lib/data";
import type { DigestDeal, DigestNewsItem, DigestPeerMove, DigestSectorCall } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DigestPage() {
  const { digest, companies, sectors, news, peers } = await fetchDashboard();
  const payload = digest?.payload;

  const deals: DigestDeal[] =
    payload?.deals?.length
      ? payload.deals
      : companies
          .filter((c) => c.recommendation === "Deep Dive")
          .slice(0, 5)
          .map((c) => ({
            name: c.name,
            score: c.thesis_score,
            recommendation: c.recommendation,
            rationale: c.why_now,
            brief_id: c.brief_id,
            brief_url: `/company/${c.slug || c.id}`,
            slug: c.slug,
            sector: c.sector_theme,
          }));

  const sectorCalls: DigestSectorCall[] = payload?.sector_calls?.length
    ? payload.sector_calls
    : sectors.slice(0, 2).map((s) => ({
        subsector: s.subsector,
        consensus_level: s.consensus_level,
        why: s.why_thirdbase_cares,
        top_companies: s.top_companies,
      }));

  const newsItems: DigestNewsItem[] = payload?.news?.length
    ? payload.news
    : news.slice(0, 5).map((n) => ({
        title: n.title,
        source: n.source,
        why: n.why_it_matters,
        url: n.url,
      }));

  const shifts = peers.filter((p) => p.thesis_shift);
  const peerMoves: DigestPeerMove[] = payload?.peer_moves?.length
    ? payload.peer_moves
    : (shifts.length ? shifts : peers).slice(0, 4).map((p) => ({
        firm: p.firm,
        company: p.company_name,
        notes: p.notes,
        thesis_shift: p.thesis_shift,
      }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Partner email"
        title="Digest"
        description="Monday / Wednesday / Friday partner email — hard-capped, scannable, only what matters."
      />

      <div className="mx-auto max-w-3xl animate-in">
        <Panel padded={false} className="overflow-hidden shadow-[var(--shadow-float)]">
          <div className="border-b border-[var(--line)] bg-[var(--panel-2)]/70 px-6 py-4">
            <div className="label-caps">Subject</div>
            <div className="mt-1.5 text-[1.05rem] font-semibold leading-snug">
              {digest?.subject ||
                `Thirdbase Signal — ${new Date().toISOString().slice(0, 10)} — ${deals.length} deals worth your time`}
            </div>
          </div>
          <div className="space-y-9 px-6 py-8">
            <section>
              <h2 className="title text-[1.35rem]">Top deals</h2>
              <div className="mt-4 space-y-5">
                {deals.map((d) => {
                  const href = d.brief_url || `/company/${d.slug || ""}`;
                  return (
                    <div key={d.name}>
                      <div className="text-[1.05rem] font-semibold">
                        {d.name} · {d.recommendation} · {d.score}
                      </div>
                      <p className="mt-1.5 text-[0.975rem] leading-relaxed text-[var(--muted)]">{d.rationale}</p>
                      <Link href={href} className="link-quiet mt-1 inline-block text-[0.9375rem] font-medium">
                        Open brief →
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="title text-[1.35rem]">Sector calls</h2>
              <div className="mt-3 space-y-3">
                {sectorCalls.map((s) => (
                  <div key={s.subsector} className="text-[0.975rem] leading-relaxed">
                    <span className="font-semibold">{s.subsector}</span>
                    <span className="text-[var(--muted)]">
                      {" "}
                      ({s.consensus_level}) — {s.why}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="title text-[1.35rem]">News worth reading</h2>
              <div className="mt-3 space-y-2.5">
                {newsItems.map((n) => (
                  <div key={n.title} className="text-[0.975rem] leading-relaxed">
                    <span className="font-medium">{n.title}</span>
                    <span className="text-[var(--muted)]"> — {n.why}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="title text-[1.35rem]">Peer-set moves</h2>
              <div className="mt-3 space-y-2.5 text-[0.975rem] leading-relaxed text-[var(--muted)]">
                {peerMoves.map((p, i) => (
                  <div key={`${p.firm}-${p.company}-${i}`}>
                    {p.firm} → {p.company}
                    {p.thesis_shift ? (
                      <span className="ml-1.5 text-[var(--warn)]">· THESIS SHIFT</span>
                    ) : (
                      ""
                    )}
                    : {p.notes}
                  </div>
                ))}
              </div>
            </section>

            <Eyebrow>End of digest</Eyebrow>
          </div>
        </Panel>
      </div>
    </div>
  );
}
