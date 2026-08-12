import { DeskCommand } from "@/components/DeskCommand";
import { fetchCommentary, fetchDashboard } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CommandPage() {
  const [{ companies, sectors, alerts, news, peers, digest, lastRefreshed, liveSignals }, commentary] =
    await Promise.all([fetchDashboard(), fetchCommentary()]);

  return (
    <DeskCommand
      companies={companies}
      sectors={sectors}
      alerts={alerts}
      news={news}
      peers={peers}
      commentary={commentary}
      digest={digest}
      lastRefreshed={lastRefreshed}
      liveSignals={liveSignals}
    />
  );
}
