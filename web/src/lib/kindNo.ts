/**
 * Kind-No Factory — VCOS Flow-style polite decline drafts.
 * Human-in-the-loop: never auto-sends. Partners copy, edit, send.
 */

import type { Company } from "@/lib/types";

export type KindNoTone = "warm" | "direct" | "future";

export type KindNoDraft = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  recommendation: string;
  thesis_score: number | null;
  tone: KindNoTone;
  subject: string;
  body: string;
  reason_bullets: string[];
  reopen_when: string[];
  provenance: string;
};

export type KindNoPack = {
  drafts: KindNoDraft[];
  counsel: string;
  markdown: string;
};

function reasonBullets(c: Company): string[] {
  const bullets: string[] = [];
  const bd = c.score_breakdown || {};
  const weak = Object.entries(bd)
    .filter(([, v]) => typeof v === "number")
    .sort((a, b) => (a[1] as number) - (b[1] as number))
    .slice(0, 2);

  if (c.recommendation === "Pass") {
    bullets.push("Does not clear Thirdbase bar for outstanding vs cohort this cycle.");
  } else if (c.recommendation === "Watch") {
    bullets.push("Interesting, but not yet outstanding enough for a Deep Dive slot.");
  }

  for (const [k, v] of weak) {
    bullets.push(`Soft on ${k.replace(/_/g, " ")} (${(v as number).toFixed(0)}).`);
  }

  if (c.yoy_growth_pct != null && c.yoy_growth_pct < 40) {
    bullets.push(`Growth (${c.yoy_growth_pct}% YoY) below our growth-stage posture.`);
  }
  if ((c.tier1_count ?? 0) < 2) {
    bullets.push("Cap table / Tier-1 density thinner than we typically underwrite.");
  }
  if (c.runway_months_est != null && c.runway_months_est < 18) {
    bullets.push("Runway profile raises near-term financing risk for our process.");
  }
  if (c.pipeline_bucket === "tactical_sector_agnostic" && (c.thesis_score || 0) < 70) {
    bullets.push("Tactical sleeve is selective — this one did not win relative rank.");
  }

  if (!bullets.length) {
    bullets.push("Relative rank within theme × stage did not clear our bar this cycle.");
  }
  return bullets.slice(0, 4);
}

function reopenWhen(c: Company): string[] {
  const out: string[] = [];
  if (c.yoy_growth_pct != null && c.yoy_growth_pct < 40) {
    out.push("Sustained 40%+ growth with quality metrics we can diligence.");
  }
  if ((c.tier1_count ?? 0) < 2) {
    out.push("A Tier-1 lead or co-investor who sharpens the round.");
  }
  const moat = c.score_breakdown?.moat;
  if (typeof moat === "number" && moat < 60) {
    out.push("Clearer technical / distribution moat evidence.");
  }
  out.push("A fresh signal that changes relative rank in your cohort.");
  return out.slice(0, 3);
}

function draftFor(c: Company, tone: KindNoTone): KindNoDraft {
  const reasons = reasonBullets(c);
  const reopen = reopenWhen(c);
  const stage = c.stage || "this stage";
  const theme = c.sector_theme || "your space";

  const subject =
    tone === "future"
      ? `Following up — ${c.name} × Thirdbase`
      : `Thank you — ${c.name} × Thirdbase`;

  let body = "";
  if (tone === "warm") {
    body = [
      `Hi —`,
      ``,
      `Thank you for the time on ${c.name}. We spent real cycles on the materials and the ${theme} landscape at ${stage}.`,
      ``,
      `We're going to pass for now. In short:`,
      ...reasons.map((r) => `• ${r}`),
      ``,
      `This is about fit vs our current bar — not a verdict on the company. We'd be glad to reopen if:`,
      ...reopen.map((r) => `• ${r}`),
      ``,
      `Happy to make a warm intro if useful. Wishing you a clean raise.`,
      ``,
      `— Thirdbase`,
    ].join("\n");
  } else if (tone === "direct") {
    body = [
      `Hi —`,
      ``,
      `Appreciate the look at ${c.name}. After scoring against thesis, our recommendation is **Pass** for this cycle.`,
      ``,
      `Primary reasons:`,
      ...reasons.map((r) => `• ${r}`),
      ``,
      `Reopen triggers:`,
      ...reopen.map((r) => `• ${r}`),
      ``,
      `Best of luck with the round.`,
      ``,
      `— Thirdbase`,
    ].join("\n");
  } else {
    body = [
      `Hi —`,
      ``,
      `We reviewed ${c.name} carefully. Timing and relative rank aren't a match for us *this* cycle, so we're stepping back — with a door left open.`,
      ``,
      `What would change our minds:`,
      ...reopen.map((r) => `• ${r}`),
      ``,
      `Feel free to send an update when those land. We'll keep ${c.name} on Watch internally.`,
      ``,
      `— Thirdbase`,
    ].join("\n");
  }

  return {
    company_id: c.id,
    company_name: c.name,
    slug: c.slug,
    recommendation: c.recommendation || "Pass",
    thesis_score: c.thesis_score ?? null,
    tone,
    subject,
    body,
    reason_bullets: reasons,
    reopen_when: reopen,
    provenance:
      "Kind-no draft from Signal scores — never auto-sent. Partner edits before send.",
  };
}

export function buildKindNoDraft(company: Company, tone: KindNoTone = "warm"): KindNoDraft {
  return draftFor(company, tone);
}

export function buildKindNoPack(
  companies: Company[],
  opts?: { limit?: number; tone?: KindNoTone },
): KindNoPack {
  const tone = opts?.tone || "warm";
  const limit = opts?.limit ?? 12;
  const passes = [...companies]
    .filter((c) => c.recommendation === "Pass" || c.recommendation === "Watch")
    .sort((a, b) => {
      // Prefer Passes that still have peer/score tension (worth a careful letter)
      const aPass = a.recommendation === "Pass" ? 0 : 1;
      const bPass = b.recommendation === "Pass" ? 0 : 1;
      if (aPass !== bPass) return aPass - bPass;
      return (b.thesis_score || 0) - (a.thesis_score || 0);
    })
    .slice(0, limit);

  const drafts = passes.map((c) => draftFor(c, tone));
  const counsel =
    drafts.length === 0
      ? "No Pass/Watch names need a kind-no right now."
      : `${drafts.length} draft(s) ready — copy, personalize, send. Signal never auto-emails founders.`;

  const markdown = [
    `# Kind-no factory`,
    "",
    counsel,
    "",
    ...drafts.slice(0, 5).flatMap((d) => [
      `## ${d.company_name} (${d.recommendation})`,
      `Subject: ${d.subject}`,
      "",
      "```",
      d.body,
      "```",
      "",
    ]),
    "Open /work → Kind-no tab, or ask chat: “kind no for <company>”.",
  ].join("\n");

  return { drafts, counsel, markdown };
}
