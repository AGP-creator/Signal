import { GreatDealDesk } from "@/components/GreatDealDesk";
import { Page, PageHeader } from "@/components/ui";
import { fetchCompanies } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function GreatDealsPage() {
  const companies = await fetchCompanies();

  return (
    <Page>
      <PageHeader live eyebrow="Deals" title="Great deals" />
      <GreatDealDesk companies={companies} />
    </Page>
  );
}
