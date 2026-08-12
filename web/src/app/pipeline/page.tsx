import Link from "next/link";
import { PipelineTable } from "@/components/PipelineTable";
import { Page, PageHeader } from "@/components/ui";
import { fetchCompanies } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams?: Promise<{ rec?: string }>;
}) {
  const companies = await fetchCompanies();
  const params = searchParams ? await searchParams : {};
  return (
    <Page>
      <PageHeader
        eyebrow="Pipeline"
        live
        title="Deal flow"
        description="Scored book with recommendation mix, thesis bands, and stage heat — filter, like, and open briefs."
        actions={
          <Link href="/workbook" className="btn btn-soft">
            Workbook
          </Link>
        }
      />
      <PipelineTable companies={companies} initialRec={params.rec} />
    </Page>
  );
}
