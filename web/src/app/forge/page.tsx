import { SignalForge } from "@/components/SignalForge";
import { Page, PageHeader } from "@/components/ui";
import {
  fetchAlerts,
  fetchCommentary,
  fetchCompanies,
  fetchPeers,
  fetchSectors,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ForgePage() {
  const [companies, peers, commentary, sectors, alerts] = await Promise.all([
    fetchCompanies(),
    fetchPeers(),
    fetchCommentary(),
    fetchSectors(),
    fetchAlerts(),
  ]);

  return (
    <Page>
      <PageHeader
        live
        eyebrow="Forge"
        title="Signal Forge"
        description="Win reality × attention capital — where scarce partner hours meet deals Thirdbase can actually close."
      />
      <SignalForge
        companies={companies}
        peers={peers}
        commentary={commentary}
        sectors={sectors}
        alerts={alerts}
      />
    </Page>
  );
}
