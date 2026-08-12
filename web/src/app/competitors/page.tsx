import Link from "next/link";
import { CompetitorsDesk } from "@/components/CompetitorsDesk";
import { Page, PageHeader, Stat } from "@/components/ui";
import { fetchCompanies, fetchPeers } from "@/lib/data";
import { buildPeerIntelligence } from "@/lib/peerIntel";
import { resolveWatchlistFirms, VC_WATCHLIST } from "@/lib/vcWatchlist";

export const dynamic = "force-dynamic";

export default async function CompetitorsPage() {
  const [companies, peers] = await Promise.all([fetchCompanies(), fetchPeers()]);
  const intel = buildPeerIntelligence(companies, peers);
  const watch = resolveWatchlistFirms(intel.firms);
  const withActivity = watch.filter((f) => f.deal_count > 0).length;
  const withFunds = new Set(intel.fund_announcements.map((f) => f.firm_slug)).size;
  const capital = intel.fund_announcements.reduce((s, f) => s + (f.size_m || 0), 0);

  return (
    <Page>
      <PageHeader
        eyebrow="Competitors"
        title="Peer firms"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/peers" className="link-quiet text-sm">
              Competitor OS →
            </Link>
            <Link href="/firms" className="link-quiet text-sm">
              Watchlist →
            </Link>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-8 border-b border-[var(--line)] pb-6">
        <Stat value={VC_WATCHLIST.length} label="On list" />
        <Stat value={withActivity} label="With investments" />
        <Stat value={withFunds} label="With fund size" tone="deep" />
        <Stat
          value={
            capital >= 1000 ? `$${(capital / 1000).toFixed(1)}B` : `$${Math.round(capital)}M`
          }
          label="Tracked capital"
          tone="signal"
        />
      </div>

      <CompetitorsDesk firms={intel.firms} funds={intel.fund_announcements} />
    </Page>
  );
}
