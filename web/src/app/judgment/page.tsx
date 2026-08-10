import { JudgmentOS } from "@/components/JudgmentOS";
import { PageHeader } from "@/components/ui";
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="X-factor"
        live
        title="Judgment OS"
        description="Override ledger, miss retrospectives, mix-drift alarms, evidence freshness SLA, founder radar, and digest selectivity — the layer coverage demos don't ship."
      />
      <JudgmentOS
        companies={companies}
        peers={peers}
        commentary={commentary}
        news={news}
        alerts={alerts}
      />
    </div>
  );
}
