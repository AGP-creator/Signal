import { LpDesk } from "@/components/LpDesk";
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

export default async function LpPage() {
  const [companies, peers, commentary, news, alerts, sectors] = await Promise.all([
    fetchCompanies(),
    fetchPeers(),
    fetchCommentary(),
    fetchNews(),
    fetchAlerts(),
    fetchSectors(),
  ]);

  return (
    <Page>
      <PageHeader live eyebrow="Limited partners" title="LP Dashboard" />
      <LpDesk
        companies={companies}
        peers={peers}
        commentary={commentary}
        news={news}
        alerts={alerts}
        sectors={sectors}
      />
    </Page>
  );
}
