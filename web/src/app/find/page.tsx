import { OmniSearch } from "@/components/OmniSearch";
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

export default async function FindPage() {
  const [companies, commentary, news, peers, sectors, alerts] = await Promise.all([
    fetchCompanies(),
    fetchCommentary(),
    fetchNews(),
    fetchPeers(),
    fetchSectors(),
    fetchAlerts(),
  ]);

  return (
    <Page>
      <PageHeader eyebrow="Find" title="Search the book" />
      <OmniSearch
        companies={companies}
        commentary={commentary}
        news={news}
        peers={peers}
        sectors={sectors}
        alerts={alerts}
      />
    </Page>
  );
}
