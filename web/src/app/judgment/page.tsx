import { JudgmentOS } from "@/components/JudgmentOS";
import { Page, PageHeader } from "@/components/ui";
import { fetchAlerts, fetchCommentary, fetchCompanies, fetchNews, fetchPeers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function JudgmentPage() {
  const [companies, peers, commentary, news, alerts] = await Promise.all([
    fetchCompanies(),
    fetchPeers(),
    fetchCommentary(),
    fetchNews(),
    fetchAlerts(),
  ]);

  return (
    <Page>
      <PageHeader live eyebrow="Firm judgment" title="Judgment OS" />
      <JudgmentOS
        companies={companies}
        peers={peers}
        commentary={commentary}
        news={news}
        alerts={alerts}
      />
    </Page>
  );
}
