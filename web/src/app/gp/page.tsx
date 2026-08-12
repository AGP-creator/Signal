import { GpDashboard } from "@/components/GpDashboard";
import { Page } from "@/components/ui";
import {
  fetchAlerts,
  fetchCommentary,
  fetchCompanies,
  fetchLatestDigest,
  fetchMeta,
  fetchNews,
  fetchPeers,
  fetchSectors,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function GpPage() {
  const [companies, peers, commentary, news, alerts, sectors, digest, lastRefreshed, liveSignals] =
    await Promise.all([
      fetchCompanies(),
      fetchPeers(),
      fetchCommentary(),
      fetchNews(),
      fetchAlerts(),
      fetchSectors(),
      fetchLatestDigest(),
      fetchMeta("last_refreshed"),
      fetchMeta("live_signal_count"),
    ]);

  return (
    <Page>
      <GpDashboard
        companies={companies}
        peers={peers}
        commentary={commentary}
        news={news}
        alerts={alerts}
        sectors={sectors}
        digest={digest}
        lastRefreshed={lastRefreshed}
        liveSignals={liveSignals}
      />
    </Page>
  );
}
