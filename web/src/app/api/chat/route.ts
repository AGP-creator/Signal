import { NextResponse } from "next/server";
import { answerPartnerQuestionAsync } from "@/lib/agent";
import { buildGroundingTrails } from "@/lib/askGrounding";
import { briefToMarkdown, looksLikeCompanyQuery, researchCompany } from "@/lib/research";
import {
  fetchAlerts,
  fetchCommentary,
  fetchCompanies,
  fetchNews,
  fetchPeers,
  fetchSectors,
} from "@/lib/data";
import { buildPeerIntelligence } from "@/lib/peerIntel";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const question = String(body.question || "").trim();
    if (!question) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }
    const [companies, sectors, peers, commentary, news, alerts] = await Promise.all([
      fetchCompanies(),
      fetchSectors(),
      fetchPeers(),
      fetchCommentary(),
      fetchNews(),
      fetchAlerts(),
    ]);

    if (looksLikeCompanyQuery(question)) {
      try {
        const brief = await researchCompany(question, {
          companies,
          commentary,
          peers,
        });
        const intel = buildPeerIntelligence(companies, peers);
        if (brief.company_id && intel.comparables[brief.company_id]?.length) {
          brief.comparables = intel.comparables[brief.company_id].map((c) => c.name);
        }
        const mode = brief.in_pipeline ? "pipeline_brief" : "agentic_scout";
        return NextResponse.json({
          answer: briefToMarkdown(brief),
          brief,
          mode,
          searches: buildGroundingTrails(question, mode),
        });
      } catch {
        /* fall through */
      }
    }

    const answer = await answerPartnerQuestionAsync(question, {
      companies,
      sectors,
      peers,
      commentary,
      news,
      alerts,
    });
    return NextResponse.json({
      answer,
      mode: "ops",
      searches: buildGroundingTrails(question, "ops"),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chat failed" },
      { status: 500 },
    );
  }
}
