import { IcGovernance } from "@/components/IcGovernance";
import { Page, PageHeader } from "@/components/ui";
import { fetchCompanies } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function IcPage() {
  const companies = await fetchCompanies();

  return (
    <Page>
      <PageHeader live eyebrow="Investment committee" title="Decision Trail" />
      <IcGovernance companies={companies} />
    </Page>
  );
}
