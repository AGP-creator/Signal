import { NextResponse } from "next/server";
import { answerPartnerQuestionAsync } from "@/lib/agent";
import {
  fetchAlerts,
  fetchCommentary,
  fetchCompanies,
  fetchNews,
  fetchPeers,
  fetchSectors,
} from "@/lib/data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    const answer = await answerPartnerQuestionAsync(question, {
      companies,
      sectors,
      peers,
      commentary,
      news,
      alerts,
    });
    return NextResponse.json({ answer });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chat failed" },
      { status: 500 },
    );
  }
}
