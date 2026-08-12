import { PartnerLogDesk } from "@/components/PartnerLog";
import { Page, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function PartnerLogPage() {
  return (
    <Page>
      <PageHeader
        live
        eyebrow="Partnership"
        title="Partner log"
        description="Threaded notes on companies, deals, sectors, themes, and competitors — shared across the desk like review comments."
      />
      <PartnerLogDesk />
    </Page>
  );
}
