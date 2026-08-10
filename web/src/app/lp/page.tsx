import { LpDesk } from "@/components/LpDesk";
import { PageHeader } from "@/components/ui";
import {
  fetchAlerts,
  fetchCommentary,
  fetchCompanies,
  fetchNews,
  fetchPeers,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LpPage() {
  const [companies, peers, commentary, news, alerts] = await Promise.all([
    fetchCompanies(),
    fetchPeers(),
    fetchCommentary(),
    fetchNews(),
    fetchAlerts(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        live
        eyebrow="Limited partners"
        title="Process Desk"
        description="What sophisticated LPs want when they ask about AI in the investment process — encoded thesis, human controls, IC trails, and a one-pager you can send after the meeting."
      />
      <LpDesk
        companies={companies}
        peers={peers}
        commentary={commentary}
        news={news}
        alerts={alerts}
      />
    </div>
  );
}
