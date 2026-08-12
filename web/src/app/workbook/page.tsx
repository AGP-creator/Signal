import { ExcelRebuildButton } from "@/components/ExcelRebuildButton";
import { WorkbookDesk } from "@/components/WorkbookDesk";
import { Page, PageHeader } from "@/components/ui";
import {
  fetchAlerts,
  fetchCommentary,
  fetchCompanies,
  fetchLatestDigest,
  fetchMeta,
  fetchNews,
  fetchPeers,
  fetchSectors,
} from "@/lib/data";
import { buildGoldenPack } from "@/lib/goldenInsights";
import { buildJudgmentPack } from "@/lib/judgment";
import { buildPeerIntelligence } from "@/lib/peerIntel";
import { isWorkbookTab } from "@/lib/workbook";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WorkbookPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const sp = (await searchParams) || {};
  const initialTab = isWorkbookTab(sp.tab) ? sp.tab : "pipeline";

  const [companies, sectors, peers, news, commentary, alerts, digest, lastRefreshed] =
    await Promise.all([
      fetchCompanies(),
      fetchSectors(),
      fetchPeers(),
      fetchNews(),
      fetchCommentary(),
      fetchAlerts(),
      fetchLatestDigest(),
      fetchMeta("last_refreshed"),
    ]);

  const intel = buildPeerIntelligence(companies, peers);
  const golden = buildGoldenPack(intel, companies);
  const judgment = buildJudgmentPack(companies, peers, commentary, news, alerts);

  return (
    <Page>
      <PageHeader
        live
        eyebrow="Workbook"
        title="Deal Pipeline"
        actions={
          <>
            <a href="/api/workbook" className="btn btn-primary">
              Download Excel
            </a>
            <ExcelRebuildButton />
            <Link href="/digest" className="btn btn-soft">
              Digest
            </Link>
          </>
        }
      />

      <WorkbookDesk
        companies={companies}
        sectors={sectors}
        peers={peers}
        news={news}
        commentary={commentary}
        digest={digest}
        lastRefreshed={lastRefreshed}
        intel={intel}
        golden={golden}
        judgment={judgment}
        initialTab={initialTab}
      />
    </Page>
  );
}
