import { DealSourcer } from "@/components/DealSourcer";
import { Page, PageHeader } from "@/components/ui";
import { fetchCompanies, fetchSignals } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SourcePage() {
  const [companies, signals] = await Promise.all([fetchCompanies(), fetchSignals()]);

  return (
    <Page>
      <PageHeader live eyebrow="Discovery" title="Deal Sourcing" />
      <DealSourcer companies={companies} signals={signals} />
    </Page>
  );
}
