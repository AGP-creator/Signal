import { NextResponse } from "next/server";
import { fetchCompanies } from "@/lib/data";

export const dynamic = "force-dynamic";

function rankScore(q: string, name: string, slug: string | null | undefined) {
  const n = name.toLowerCase();
  const s = (slug || "").toLowerCase();
  if (n === q || s === q) return 0;
  if (n.startsWith(q) || s.startsWith(q)) return 1;
  if (n.includes(q) || s.includes(q)) return 2;
  return 3;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = (searchParams.get("q") || "").trim();
    const q = raw.toLowerCase();
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
        can_research: false,
      });
    }

    const suggestions = companies
      .map((c) => ({
        c,
        score: rankScore(q, c.name, c.slug),
      }))
      .filter(({ c, score }) => {
        if (score <= 2) return true;
        // Soft sector/one-liner hits only when query is reasonably specific
        if (q.length < 3) return false;
        const theme = (c.sector_theme || "").toLowerCase();
        const line = (c.one_liner || "").toLowerCase();
        return theme.includes(q) || line.includes(q);
      })
      .sort((a, b) => a.score - b.score || a.c.name.localeCompare(b.c.name))
      .slice(0, 8)
      .map(({ c }) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        recommendation: c.recommendation,
        thesis_score: c.thesis_score,
        sector_theme: c.sector_theme,
        in_pipeline: true,
      }));

    const exactName = companies.some(
      (c) => c.name.toLowerCase() === q || (c.slug || "").toLowerCase() === q,
    );

    return NextResponse.json({
      suggestions,
      // Always allow researching typed query as a new company unless it exactly matches pipeline
      can_research: raw.length >= 2 && !exactName,
    });
  } catch (e) {
    const { searchParams } = new URL(req.url);
    const raw = (searchParams.get("q") || "").trim();
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Suggest failed",
        suggestions: [],
        // Let the UI keep "research as new company" even when pipeline lookup is down
        can_research: raw.length >= 2,
      },
      { status: 200 },
    );
  }
}
