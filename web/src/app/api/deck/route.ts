import { NextResponse } from "next/server";
import { analyzeDeckText, briefToSubject, type DiligenceSubject } from "@/lib/diligence";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = typeof body.text === "string" ? body.text : "";
    if (text.trim().length < 20) {
      return NextResponse.json(
        { error: "Paste at least ~20 characters of deck text." },
        { status: 400 },
      );
    }

    const subject: DiligenceSubject | undefined = body.company_name
      ? {
          name: String(body.company_name),
          yoy_growth_pct: body.yoy_growth_pct ?? null,
          tam_usd_b: body.tam_usd_b ?? null,
          thesis_score: body.thesis_score ?? null,
        }
      : body.subject
        ? (body.subject as DiligenceSubject)
        : undefined;

    // Optional: if client sent a brief-shaped object
    const hint =
      subject ||
      (body.brief ? briefToSubject(body.brief) : undefined);

    const analysis = analyzeDeckText(text, hint);
    return NextResponse.json({ analysis });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Deck analysis failed" },
      { status: 500 },
    );
  }
}
