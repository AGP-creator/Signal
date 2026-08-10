import Link from "next/link";
import { DealCard } from "@/components/DealCard";
import { MixGauge } from "@/components/MixGauge";
import { Eyebrow, HeroSurface, Panel, SectionTitle, Stat } from "@/components/ui";
import { fetchDashboard } from "@/lib/data";
import { portfolioMix } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CommandPage() {
  const { companies, sectors, alerts, news, lastRefreshed, liveSignals } = await fetchDashboard();
  const hot = companies
    .filter((c) => c.recommendation === "Deep Dive" || (c.thesis_score || 0) >= 78)
    .slice(0, 6);
  const mix = portfolioMix(companies);
  const highAlerts = alerts.filter((a) => a.severity === "high").slice(0, 4);
  const topNews = news.slice(0, 4);

  return (
    <div className="space-y-10">
      <HeroSurface>
        <Eyebrow live>Live deal intelligence</Eyebrow>
        <h1 className="display mt-4 max-w-3xl text-[3.25rem] md:text-[4.5rem]">Signal</h1>
        <p className="mt-4 max-w-xl text-[1.1rem] leading-relaxed text-[var(--muted)] md:text-[1.2rem]">
          Thirdbase&apos;s always-on sourcing partner — thesis-ranked deals, emerging sectors, and the
          few things worth a partner&apos;s hour.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/meeting" className="btn btn-primary">
            Monday meeting
          </Link>
          <Link href="/search" className="btn btn-ghost">
            Research a company
          </Link>
          <Link href="/chat" className="btn btn-ghost">
            Ask Signal
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap gap-8 border-t border-[var(--line)] pt-7">
          <Stat value={companies.length} label="Pipeline" />
          <Stat
            value={companies.filter((c) => c.recommendation === "Deep Dive").length}
            label="Deep Dive"
          />
          <Stat value={liveSignals || "0"} label="Live signals" tone="deep" />
          <div className="max-w-[14rem]">
            <div className="label-caps">Last refresh</div>
            <div className="mono mt-2 text-[0.8rem] text-[var(--text)]">{lastRefreshed || "—"}</div>
          </div>
        </div>
      </HeroSurface>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-5">
          <SectionTitle title="Hot Deals" href="/pipeline" hrefLabel="Full pipeline →" />
          <div className="grid gap-4 stagger">
            {hot.map((c, i) => (
              <DealCard key={c.id} company={c} index={i} />
            ))}
          </div>
        </div>

        <aside className="space-y-4 stagger">
          <MixGauge dominantPct={mix.dominantPct} tacticalPct={mix.tacticalPct} />

          <Panel>
            <Eyebrow>Immediate alerts</Eyebrow>
            <div className="mt-4 space-y-3.5">
              {highAlerts.map((a) => (
                <div key={a.id} className="border-b border-[var(--line)] pb-3.5 last:border-0 last:pb-0">
                  <div className="label-caps text-[var(--warn)]">{a.severity}</div>
                  <div className="mt-1 text-[0.975rem] font-semibold">{a.title}</div>
                  <p className="mt-1 line-clamp-2 text-[0.875rem] leading-relaxed text-[var(--muted)]">
                    {a.body}
                  </p>
                </div>
              ))}
              {!highAlerts.length && <p className="body-muted">No high-severity alerts.</p>}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <Eyebrow>Sector of Tomorrow</Eyebrow>
              <Link href="/sectors" className="link-quiet text-[0.8125rem] font-medium">
                View all
              </Link>
            </div>
            <div className="mt-4 space-y-4">
              {sectors.slice(0, 3).map((s) => (
                <div key={s.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[0.975rem] font-semibold">{s.subsector}</div>
                    <div className="mono text-[0.95rem] text-[var(--signal)]">{s.heat_score}</div>
                  </div>
                  <div className="mt-0.5 text-[0.8125rem] text-[var(--muted)]">
                    {s.consensus_level} · {s.parent_theme}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <Eyebrow>News worth reading</Eyebrow>
              <Link href="/library?tab=news" className="link-quiet text-[0.8125rem] font-medium">
                Library
              </Link>
            </div>
            <div className="mt-4 space-y-3.5">
              {topNews.map((n) => (
                <div key={n.id}>
                  <div className="text-[0.975rem] font-medium">{n.title}</div>
                  <p className="mt-1 text-[0.875rem] leading-relaxed text-[var(--muted)]">{n.why_it_matters}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Link href="/meeting" className="panel panel-interactive block p-5 md:p-6">
            <Eyebrow className="!text-[var(--signal)]">Partner Meeting OS</Eyebrow>
            <div className="title mt-2.5 text-[1.25rem]">Monday agenda →</div>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--muted)]">
              Decide · diligence · intel · firm — capped to ~90 minutes partners will actually run.
            </p>
          </Link>

          <Link href="/ic" className="panel panel-interactive block p-5 md:p-6">
            <Eyebrow className="!text-[var(--deep)]">IC Decision Trail</Eyebrow>
            <div className="title mt-2.5 text-[1.25rem]">Governance →</div>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--muted)]">
              Stages, DD checklists, votes, Pass spine — the paper trail LPs diligence.
            </p>
          </Link>

          <Link href="/lp" className="panel panel-interactive block p-5 md:p-6">
            <Eyebrow className="!text-[var(--ok)]">LP Process Desk</Eyebrow>
            <div className="title mt-2.5 text-[1.25rem]">Transparency →</div>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--muted)]">
              How AI shows up in the investment process — with controls, not slideware.
            </p>
          </Link>

          <Link href="/judgment" className="panel panel-interactive block p-5 md:p-6">
            <Eyebrow className="!text-[var(--signal)]">Judgment OS</Eyebrow>
            <div className="title mt-2.5 text-[1.25rem]">X-factor layer →</div>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--muted)]">
              Override ledger, miss retros, founder radar, freshness SLA, mix drift, digest A/B.
            </p>
          </Link>

          <Link href="/peers" className="panel panel-interactive block p-5 md:p-6">
            <Eyebrow className="!text-[var(--signal)]">Competitor intelligence</Eyebrow>
            <div className="title mt-2.5 text-[1.25rem]">Golden insights →</div>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--muted)]">
              Proprietary windows, crowding alerts, syndicate unlocks, white space, battle cards.
            </p>
          </Link>
        </aside>
      </section>
    </div>
  );
}
