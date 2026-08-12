import { PartnerEdge } from "@/components/PartnerEdge";
import { Page, PageHeader } from "@/components/ui";
import {
  fetchCommentary,
  fetchCompanies,
  fetchPeers,
  fetchSectors,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EdgePage() {
  const [companies, peers, commentary, sectors] = await Promise.all([
    fetchCompanies(),
    fetchPeers(),
    fetchCommentary(),
    fetchSectors(),
  ]);

  return (
    <Page>
      <PageHeader live eyebrow="Edge" title="Partner Edge" />
      <PartnerEdge
        companies={companies}
        peers={peers}
        commentary={commentary}
        sectors={sectors}
      />
    </Page>
  );
}
