import { PipelineTable } from "@/components/PipelineTable";
import { PageHeader } from "@/components/ui";
import { fetchCompanies } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const companies = await fetchCompanies();
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Deal flow"
        title="Pipeline"
        description="Every company Signal has scored against Thirdbase thesis — filter, compare, open a brief."
      />
      <PipelineTable companies={companies} />
    </div>
  );
}
