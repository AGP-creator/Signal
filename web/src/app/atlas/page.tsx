import { SignalAtlas } from "@/components/SignalAtlas";
import { Page, PageHeader } from "@/components/ui";
import {
  fetchAlerts,
  fetchCommentary,
  fetchCompanies,
  fetchNews,
  fetchPeers,
  fetchSectors,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AtlasPage() {
  const [companies, peers, commentary, sectors, alerts, news] = await Promise.all([
    fetchCompanies(),
    fetchPeers(),
    fetchCommentary(),
    fetchSectors(),
    fetchAlerts(),
    fetchNews(),
  ]);

  return (
    <Page>
      <PageHeader live eyebrow="Atlas" title="Signal Atlas" />
      <SignalAtlas
        companies={companies}
        peers={peers}
        commentary={commentary}
        sectors={sectors}
        alerts={alerts}
        news={news}
      />
    </Page>
  );
}
