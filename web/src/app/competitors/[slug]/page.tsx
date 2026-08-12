import Link from "next/link";
import { CompetitorAnalytics } from "@/components/CompetitorAnalytics";
import { fetchCompanies, fetchPeers } from "@/lib/data";
import { fundAnnouncementsForFirm } from "@/lib/fundAnnouncements";
import { buildGoldenPack } from "@/lib/goldenInsights";
import { buildPeerIntelligence, findFirm } from "@/lib/peerIntel";

export const dynamic = "force-dynamic";

export default async function CompetitorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [companies, peers] = await Promise.all([fetchCompanies(), fetchPeers()]);
  const intel = buildPeerIntelligence(companies, peers);
  const firm = findFirm(intel, slug);

  if (!firm) {
    return (
      <div className="animate-in">
        <h1 className="display text-[1.85rem]">Competitor not found</h1>
        <Link href="/competitors" className="link-quiet mt-4 inline-block text-sm">
          Back to competitors
        </Link>
      </div>
    );
  }

  const pack = buildGoldenPack(intel, companies);
  const battle = pack.battle_cards.find((b) => b.slug === firm.slug) || null;
  const funds = fundAnnouncementsForFirm(firm.slug);

  return <CompetitorAnalytics firm={firm} funds={funds} battle={battle} />;
}
