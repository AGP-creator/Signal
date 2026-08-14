import { NextResponse } from "next/server";
import { restMutate, restSelect } from "@/lib/rest";

export const dynamic = "force-dynamic";

export type StaleDecision = "keep" | "archive" | "refresh";

type PartnerReviewRow = {
  company_id: string;
  decision: StaleDecision;
  note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
};

function statusFor(decision: StaleDecision) {
  if (decision === "keep") return "Reviewed — keep";
  if (decision === "archive") return "Archived (partner)";
  return "Refresh requested";
}

async function loadFromMeta(): Promise<Record<string, PartnerReviewRow>> {
  try {
    const rows = await restSelect<{ value: string }[]>("meta", {
      eq: { key: "partner_stale_reviews" },
      limit: 1,
    });
    const raw = rows?.[0]?.value;
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PartnerReviewRow>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveMeta(map: Record<string, PartnerReviewRow>) {
  await restMutate("meta", {
    method: "POST",
    upsert: true,
    onConflict: "key",
    body: [{ key: "partner_stale_reviews", value: JSON.stringify(map) }],
  });
}

export async function GET() {
  try {
    const rows = await restSelect<PartnerReviewRow[]>("partner_reviews");
    if (Array.isArray(rows) && rows.length) {
      const map: Record<string, PartnerReviewRow> = {};
      for (const r of rows) map[r.company_id] = r;
      return NextResponse.json({ ok: true, reviews: map, source: "table" });
    }
  } catch {
    // table may not exist yet — fall through to meta
  }
  const reviews = await loadFromMeta();
  return NextResponse.json({ ok: true, reviews, source: "meta" });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      company_id?: string;
      decision?: StaleDecision;
      note?: string;
      reviewed_by?: string;
    };
    const companyId = (body.company_id || "").trim();
    const decision = body.decision;
    if (!companyId || !decision || !["keep", "archive", "refresh"].includes(decision)) {
      return NextResponse.json(
        { ok: false, error: "company_id and decision (keep|archive|refresh) required" },
        { status: 400 },
      );
    }

    const row: PartnerReviewRow = {
      company_id: companyId,
      decision,
      note: body.note || null,
      reviewed_by: body.reviewed_by || "Partner",
      reviewed_at: new Date().toISOString(),
    };

    // Prefer dedicated table; always mirror into meta for refresh.py fallback
    let source = "meta";
    try {
      await restMutate("partner_reviews", {
        method: "POST",
        upsert: true,
        onConflict: "company_id",
        body: [row],
      });
      source = "table";
    } catch {
      // table missing — meta only
    }

    const map = await loadFromMeta();
    map[companyId] = row;
    await saveMeta(map);

    // Stamp company so desks update before next full refresh — never delete
    const status = statusFor(decision);
    const patch: Record<string, unknown> = {
      review_status: status,
      is_stale: decision === "refresh",
    };
    if (decision === "archive") patch.recommendation = "Pass";
    if (decision === "keep") patch.is_stale = false;

    try {
      // Keep payload in sync with flat columns (Python readers merge both)
      const existing = await restSelect<
        { payload?: Record<string, unknown> | null; recommendation?: string | null }[]
      >("companies", {
        eq: { id: companyId },
        select: "payload,recommendation",
        limit: 1,
      });
      const prev = existing?.[0];
      if (prev?.payload && typeof prev.payload === "object") {
        const nextPayload: Record<string, unknown> = {
          ...prev.payload,
          review_status: status,
          is_stale: patch.is_stale,
          partner_decision: decision,
        };
        if (decision === "archive") nextPayload.recommendation = "Pass";
        patch.payload = nextPayload;
      }

      await restMutate("companies", {
        method: "PATCH",
        eq: { id: companyId },
        body: patch,
        prefer: "return=minimal",
      });
    } catch {
      // non-fatal — review still persisted
    }

    return NextResponse.json({ ok: true, review: row, source });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to save review" },
      { status: 500 },
    );
  }
}
