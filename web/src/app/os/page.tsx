import { VentureAgent } from "@/components/VentureAgent";
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

export default async function VentureAgentPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const sp = (await searchParams) || {};
  const tabMap = {
    great: "great",
    sectors: "sectors",
    news: "news",
    commentary: "commentary",
    partner: "partner",
    fleet: "fleet",
  } as const;
  const initialTab =
    sp.tab && sp.tab in tabMap ? tabMap[sp.tab as keyof typeof tabMap] : undefined;

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
      <PageHeader live eyebrow="Agent" title="Venture agent" />
      <VentureAgent
        companies={companies}
        peers={peers}
        commentary={commentary}
        news={news}
        alerts={alerts}
        sectors={sectors}
        initialTab={initialTab}
      />
    </Page>
  );
}
