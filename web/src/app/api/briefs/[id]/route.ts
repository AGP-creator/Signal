import { NextResponse } from "next/server";
import {
  buildIntelligenceBrief,
  intelligenceBriefToMarkdown,
} from "@/lib/companyBrief";
import { fetchCommentary, fetchCompanies, fetchCompany, fetchPeers } from "@/lib/data";

export const dynamic = "force-dynamic";

/** On-demand company intelligence brief (JSON + markdown). */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const company = await fetchCompany(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const [commentary, peers, companies] = await Promise.all([
      fetchCommentary(company.id),
      fetchPeers(),
      fetchCompanies(),
    ]);

    const brief = buildIntelligenceBrief(company, {
      commentary,
      peers,
      companies,
      trigger: "on_demand",
    });
    const markdown = intelligenceBriefToMarkdown(brief);

    const url = new URL(req.url);
    const format = (url.searchParams.get("format") || "json").toLowerCase();
    if (format === "md" || format === "markdown") {
      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `inline; filename="${company.slug || company.id}-brief.md"`,
        },
      });
    }

    return NextResponse.json({
      brief,
      markdown,
      company_url: `/company/${company.slug || company.id}`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Brief failed" },
      { status: 500 },
    );
  }
}
