import { DealCompare } from "@/components/DealCompare";
import { Page } from "@/components/ui";
import { fetchCompanies, fetchPeers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const sp = await searchParams;
  const [companies, peers] = await Promise.all([fetchCompanies(), fetchPeers()]);
  const initialIds = sp.ids
    ? sp.ids.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  return (
    <Page>
      <DealCompare companies={companies} peers={peers} initialIds={initialIds} />
    </Page>
  );
}
