import { MeetingOS } from "@/components/MeetingOS";
import { Page, PageHeader } from "@/components/ui";
import {
  fetchAlerts,
  fetchCommentary,
  fetchCompanies,
  fetchNews,
  fetchPeers,
  fetchSectors,
} from "@/lib/data";
import { Suspense } from "react";

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
    <Page>
      <PageHeader live eyebrow="Partner ritual" title="Partner Meeting" />
      <Suspense fallback={null}>
        <MeetingOS
          companies={companies}
          peers={peers}
          commentary={commentary}
          news={news}
          alerts={alerts}
          sectors={sectors}
        />
      </Suspense>
    </Page>
  );
}
