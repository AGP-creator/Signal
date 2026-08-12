import Link from "next/link";
import { PipelineTable } from "@/components/PipelineTable";
import { Page, PageHeader } from "@/components/ui";
import { fetchCompanies } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const companies = await fetchCompanies();
  return (
    <Page>
      <PageHeader
        eyebrow="Pipeline"
        title="Deal flow"
        actions={
          <Link href="/workbook" className="btn btn-soft">
            Workbook
          </Link>
        }
      />
      <PipelineTable companies={companies} />
    </Page>
  );
}
