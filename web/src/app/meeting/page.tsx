import { MeetingOS } from "@/components/MeetingOS";
import { PageHeader } from "@/components/ui";
import {
  fetchAlerts,
  fetchCommentary,
  fetchCompanies,
  fetchNews,
  fetchPeers,
  fetchSectors,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function MeetingPage() {
  const [companies, peers, commentary, news, alerts, sectors] = await Promise.all([
    fetchCompanies(),
    fetchPeers(),
    fetchCommentary(),
    fetchNews(),
    fetchAlerts(),
    fetchSectors(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        live
        eyebrow="Monday ritual"
        title="Partner Meeting OS"
        description="Auto-built agenda from Hot Deals, IC trails, alerts, peer thesis shifts, mix drift, and stale review — capped to ~90 minutes so partners decide, not drown."
      />
      <MeetingOS
        companies={companies}
        peers={peers}
        commentary={commentary}
        news={news}
        alerts={alerts}
        sectors={sectors}
      />
    </div>
  );
}
