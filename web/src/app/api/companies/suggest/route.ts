import { NextResponse } from "next/server";
import { fetchCompanies } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const companies = await fetchCompanies();
    if (!q) {
      return NextResponse.json({
        suggestions: companies.slice(0, 8).map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          recommendation: c.recommendation,
          thesis_score: c.thesis_score,
          sector_theme: c.sector_theme,
          in_pipeline: true,
        })),
      });
    }
    const suggestions = companies
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.slug || "").toLowerCase().includes(q) ||
          (c.sector_theme || "").toLowerCase().includes(q) ||
          (c.one_liner || "").toLowerCase().includes(q),
      )
      .slice(0, 8)
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        recommendation: c.recommendation,
        thesis_score: c.thesis_score,
        sector_theme: c.sector_theme,
        in_pipeline: true,
      }));
    return NextResponse.json({ suggestions, can_research: suggestions.length === 0 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Suggest failed" },
      { status: 500 },
    );
  }
}
