import { CompetitorOS } from "@/components/CompetitorOS";
import { HeroSurface, Eyebrow, Stat } from "@/components/ui";
import { fetchCompanies, fetchPeers } from "@/lib/data";
import { buildGoldenPack } from "@/lib/goldenInsights";
import { buildPeerIntelligence } from "@/lib/peerIntel";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PeersPage() {
  const [companies, peers] = await Promise.all([fetchCompanies(), fetchPeers()]);
  const intel = buildPeerIntelligence(companies, peers);
  const pack = buildGoldenPack(intel, companies);

  return (
    <div className="space-y-8">
      <HeroSurface>
        <Eyebrow live>Peer set tracking</Eyebrow>
        <h1 className="display mt-4 max-w-4xl text-[2.5rem] md:text-[3.5rem]">Competitor OS</h1>
        <p className="body-muted mt-3 max-w-2xl text-[1rem]">
          What Sequoia, a16z, Lux, and the broader watchlist are funding — new funds, sector bets,
          co-investor heat, and thesis shifts worth a call.
        </p>
        <div className="mt-8 flex flex-wrap gap-8 border-t border-[var(--line)] pt-7">
          <Stat value={pack.stats.now_count} label="Act now" />
          <Stat value={intel.stats.new_fund_count} label="New funds" tone="deep" />
          <Stat value={intel.stats.thesis_shift_count} label="Thesis shifts" tone="warn" />
          <Stat value={intel.stats.heatmap_pairs} label="Syndicate pairs" />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Link href="/competitors" className="link-quiet text-sm">
            Competitors list →
          </Link>
          <Link href="/firms" className="link-quiet text-sm">
            VC firm watchlist →
          </Link>
        </div>
      </HeroSurface>

      <CompetitorOS intel={intel} pack={pack} />
    </div>
  );
}
