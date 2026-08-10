import { NextResponse } from "next/server";
import { researchCompany } from "@/lib/research";
import { fetchCommentary, fetchCompanies, fetchPeers } from "@/lib/data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = String(body.query || body.question || body.company || "").trim();
    if (!query) {
      return NextResponse.json({ error: "Missing company query" }, { status: 400 });
    }
    const [companies, commentary, peers] = await Promise.all([
      fetchCompanies(),
      fetchCommentary(),
      fetchPeers(),
    ]);
    const brief = await researchCompany(query, { companies, commentary, peers });
    return NextResponse.json({ brief });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Research failed" },
      { status: 500 },
    );
  }
}
