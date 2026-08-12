import { DirectoryDesk } from "@/components/DirectoryDesk";
import { Page, PageHeader } from "@/components/ui";
import { fetchCompanies } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  const companies = await fetchCompanies();
  return (
    <Page>
      <PageHeader live eyebrow="Directory" title="Company directory" />
      <DirectoryDesk companies={companies} />
    </Page>
  );
}
