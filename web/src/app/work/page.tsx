import { WorkQueueBoard } from "@/components/WorkQueue";
import { Page } from "@/components/ui";
import { fetchCommentary, fetchCompanies, fetchPeers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  const [companies, peers, commentary] = await Promise.all([
    fetchCompanies(),
    fetchPeers(),
    fetchCommentary(),
  ]);

  return (
    <Page>
      <WorkQueueBoard companies={companies} peers={peers} commentary={commentary} />
    </Page>
  );
}
