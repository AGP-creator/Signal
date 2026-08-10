import { CompetitorOS } from "@/components/CompetitorOS";
import { fetchCompanies, fetchPeers } from "@/lib/data";
import { buildGoldenPack } from "@/lib/goldenInsights";
import { buildPeerIntelligence } from "@/lib/peerIntel";

export const dynamic = "force-dynamic";

export default async function PeersPage() {
  const [companies, peers] = await Promise.all([fetchCompanies(), fetchPeers()]);
  const intel = buildPeerIntelligence(companies, peers);
  const pack = buildGoldenPack(intel, companies);

  return (
    <div className="space-y-8">
      <section className="surface-hero relative px-6 py-10 md:px-10 md:py-12">
        <div className="grid-fade absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="eyebrow flex items-center gap-2">
            <span className="live-dot" />
            Competitor intelligence OS
          </div>
          <h1 className="display mt-4 max-w-4xl text-[2.5rem] md:text-[3.5rem]">
            Golden insights from the peer set — not another activity feed
          </h1>
          <p className="body-muted mt-4 max-w-2xl text-[1.1rem]">
            Proprietary windows, crowding alerts, syndicate unlocks, white-space themes, and battle
            cards that tell partners what to do Monday — scored the way Thirdbase invests.
          </p>
          <div className="mt-8 flex flex-wrap gap-6 text-[0.9rem] text-[var(--muted)]">
            <div>
              <div className="mono text-[1.5rem] text-[var(--signal)]">{pack.stats.now_count}</div>
              Act now
            </div>
            <div>
              <div className="mono text-[1.5rem] text-[var(--signal)]">{pack.stats.proprietary_count}</div>
              Proprietary deals
            </div>
            <div>
              <div className="mono text-[1.5rem] text-[var(--warn)]">{pack.stats.crowded_races}</div>
              Crowded races
            </div>
            <div>
              <div className="mono text-[1.5rem] text-[var(--deep)]">{pack.stats.whitespace_themes}</div>
              White-space themes
            </div>
            <div>
              <div className="mono text-[1.5rem] text-[var(--signal)]">{pack.stats.insight_count}</div>
              Golden insights
            </div>
          </div>
        </div>
      </section>

      <CompetitorOS intel={intel} pack={pack} />
    </div>
  );
}
