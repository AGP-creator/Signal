import { LaunchFeed } from "@/components/LaunchFeed";
import { Page, PageHeader } from "@/components/ui";
import {
  fetchAlerts,
  fetchCommentary,
  fetchCompanies,
  fetchNews,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LaunchPage() {
  const [companies, alerts, commentary, news] = await Promise.all([
    fetchCompanies(),
    fetchAlerts(),
    fetchCommentary(),
    fetchNews(),
  ]);

  return (
    <Page>
      <PageHeader live eyebrow="Launch" title="New companies" />
      <LaunchFeed
        companies={companies}
        alerts={alerts}
        commentary={commentary}
        news={news}
      />
    </Page>
  );
}
