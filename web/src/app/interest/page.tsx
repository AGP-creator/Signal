import { InterestDesk } from "@/components/InterestDesk";
import { Page } from "@/components/ui";
import { fetchCompanies } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function InterestPage() {
  const companies = await fetchCompanies();
  return (
    <Page>
      <InterestDesk companies={companies} />
    </Page>
  );
}
