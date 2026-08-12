import { SectorScanner } from "@/components/SectorScanner";
import { Page, PageHeader } from "@/components/ui";
import {
  fetchCommentary,
  fetchCompanies,
  fetchPeers,
  fetchSectors,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SectorsPage() {
  const [companies, peers, commentary, sectors] = await Promise.all([
    fetchCompanies(),
    fetchPeers(),
    fetchCommentary(),
    fetchSectors(),
  ]);

  return (
    <Page>
      <PageHeader live eyebrow="Sectors" title="Sector foresight" />
      <SectorScanner
        companies={companies}
        peers={peers}
        commentary={commentary}
        sectors={sectors}
      />
    </Page>
  );
}
