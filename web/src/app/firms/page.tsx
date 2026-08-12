import { VcFirmTracker } from "@/components/VcFirmTracker";
import { Eyebrow, Page, PageHeader, Stat } from "@/components/ui";
import { fetchCompanies, fetchPeers } from "@/lib/data";
import { buildPeerIntelligence } from "@/lib/peerIntel";
import { resolveWatchlistFirms, VC_WATCHLIST } from "@/lib/vcWatchlist";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FirmsPage() {
  const [companies, peers] = await Promise.all([fetchCompanies(), fetchPeers()]);
  const intel = buildPeerIntelligence(companies, peers);
  const watch = resolveWatchlistFirms(intel.firms);
  const withActivity = watch.filter((f) => f.deal_count > 0).length;
  const withDrift = watch.filter((f) => f.thesis_shift_count > 0 || f.drift_score >= 30).length;

  return (
    <Page>
      <PageHeader eyebrow="Firms" title="VC watchlist" />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-6">
        <div className="flex flex-wrap gap-8">
          <Stat value={VC_WATCHLIST.length} label="On list" />
          <Stat value={withActivity} label="With activity" />
          <Stat value={intel.stats.new_fund_count} label="New funds" tone="deep" />
          <Stat value={withDrift} label="Drift flags" tone="warn" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow>Also</Eyebrow>
          <Link href="/competitors" className="link-quiet text-sm">
            Competitors →
          </Link>
          <Link href="/peers" className="link-quiet text-sm">
            Competitor OS →
          </Link>
        </div>
      </div>

      <VcFirmTracker firms={intel.firms} funds={intel.fund_announcements} />
    </Page>
  );
}
