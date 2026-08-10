import { PipelineTable } from "@/components/PipelineTable";
import { fetchCompanies } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const companies = await fetchCompanies();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-4xl font-bold">Pipeline</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Every company Signal has scored against Thirdbase thesis — filter, compare, open a brief.
        </p>
      </div>
      <PipelineTable companies={companies} />
    </div>
  );
}
