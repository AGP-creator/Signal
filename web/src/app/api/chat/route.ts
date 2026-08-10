import { NextResponse } from "next/server";
import { answerPartnerQuestion } from "@/lib/agent";
import { fetchCompanies, fetchPeers, fetchSectors } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const question = String(body.question || "").trim();
    if (!question) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }
    const [companies, sectors, peers] = await Promise.all([
      fetchCompanies(),
      fetchSectors(),
      fetchPeers(),
    ]);
    const answer = answerPartnerQuestion(question, { companies, sectors, peers });
    return NextResponse.json({ answer });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chat failed" },
      { status: 500 },
    );
  }
}
