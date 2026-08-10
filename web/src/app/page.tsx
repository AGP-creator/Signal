import Link from "next/link";
import { DealCard } from "@/components/DealCard";
import { MixGauge } from "@/components/MixGauge";
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
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--line)]">
        <div className="grid-fade absolute inset-0 opacity-60" />
        <div className="relative px-6 py-10 md:px-10 md:py-14">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            <span className="live-dot" />
            Live deal intelligence
          </div>
          <h1 className="display mt-4 max-w-3xl text-5xl font-extrabold leading-[0.95] md:text-7xl">
            Signal
          </h1>
          <p className="mt-4 max-w-xl text-base text-[var(--muted)] md:text-lg">
            Thirdbase&apos;s always-on sourcing partner — thesis-ranked deals, emerging sectors, and
            the few things worth a partner&apos;s hour.
          </p>
          <div className="mt-8 flex flex-wrap gap-6 text-sm text-[var(--muted)]">
            <div>
              <div className="mono text-2xl text-[var(--signal)]">{companies.length}</div>
              Pipeline
            </div>
            <div>
              <div className="mono text-2xl text-[var(--signal)]">
                {companies.filter((c) => c.recommendation === "Deep Dive").length}
              </div>
              Deep Dive
            </div>
            <div>
              <div className="mono text-2xl text-[var(--deep)]">{liveSignals || "0"}</div>
              Live signals
            </div>
            <div className="max-w-[14rem]">
              <div className="text-xs uppercase tracking-wider">Last refresh</div>
              <div className="mono mt-1 text-xs">{lastRefreshed || "—"}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="display text-3xl font-bold">Hot Deals</h2>
            <Link href="/pipeline" className="text-sm text-[var(--deep)]">
              Full pipeline →
            </Link>
          </div>
          <div className="grid gap-4">
            {hot.map((c, i) => (
              <DealCard key={c.id} company={c} index={i} />
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <MixGauge dominantPct={mix.dominantPct} tacticalPct={mix.tacticalPct} />

          <div className="panel p-5">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              Immediate alerts
            </div>
            <div className="mt-4 space-y-3">
              {highAlerts.map((a) => (
                <div key={a.id} className="border-b border-[var(--line)] pb-3 last:border-0">
                  <div className="text-[11px] uppercase tracking-wider text-[var(--warn)]">
                    {a.severity}
                  </div>
                  <div className="mt-1 text-sm font-semibold">{a.title}</div>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{a.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Sector of Tomorrow
              </div>
              <Link href="/sectors" className="text-xs text-[var(--deep)]">
                View all
              </Link>
            </div>
            <div className="mt-4 space-y-4">
              {sectors.slice(0, 3).map((s) => (
                <div key={s.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-semibold">{s.subsector}</div>
                    <div className="mono text-sm text-[var(--signal)]">{s.heat_score}</div>
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {s.consensus_level} · {s.parent_theme}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              News worth reading
            </div>
            <div className="mt-4 space-y-3">
              {topNews.map((n) => (
                <div key={n.id}>
                  <div className="text-sm font-medium">{n.title}</div>
                  <p className="mt-1 text-xs text-[var(--muted)]">{n.why_it_matters}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
