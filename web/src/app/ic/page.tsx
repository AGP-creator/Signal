import { IcGovernance } from "@/components/IcGovernance";
import { PageHeader } from "@/components/ui";
import { fetchCompanies } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function IcPage() {
  const companies = await fetchCompanies();

  return (
    <div className="space-y-8">
      <PageHeader
        live
        eyebrow="Investment committee"
        title="Decision Trail"
        description="Stage every material deal — diligence checklist, partner votes, event log, and documented Passes. The governance object LPs diligence and GPs forget to keep."
      />
      <IcGovernance companies={companies} />
    </div>
  );
}
