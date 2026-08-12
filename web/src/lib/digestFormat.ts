import type { Company, DigestDeal } from "@/lib/types";
import { fmtMoneyM, fmtPct } from "@/lib/utils";

/** True when text is mostly leaked CSS / selector soup. */
function isCssNoise(text: string): boolean {
  const t = text.trim();
  if (t.length < 24) return false;
  const braces = (t.match(/[{}]/g) || []).length;
  const selectors = (t.match(/\.[a-zA-Z_-][\w-]*\s*[{\s]/g) || []).length;
  const props = (t.match(/\b(border|margin|padding|display|font-size|background|width|height|color)\s*:/gi) || [])
    .length;
  return selectors >= 2 || props >= 3 || (braces >= 4 && /[{};]/.test(t));
}

/** Strip AI-ish punctuation noise and scraped CSS from partner-facing copy. */
export function cleanProse(input?: string | null): string {
  if (!input) return "";
  let s = input.replace(/\r\n/g, "\n").trim();
  if (isCssNoise(s)) return "";
  // Drop CSS rule blobs and selector chains that slipped into notes
  s = s.replace(/(?:^|[\s;])(?:\.|#)?[a-zA-Z_-][\w-]*(?:\s+[.#]?[a-zA-Z_-][\w-]*)*\s*\{[^}]{0,800}\}/g, " ");
  s = s.replace(/\.[a-zA-Z_-][\w-]*(?:\s*\.\s*[a-zA-Z_-][\w-]*){1,6}/g, " ");
  if (isCssNoise(s)) return "";
  s = s.replace(/\.{2,}/g, ".");
  s = s.replace(/\s*[—–]\s*/g, ", ");
  s = s.replace(/\s*→\s*/g, ": ");
  s = s.replace(/\s*Relative thesis score[^.]+\./gi, "");
  s = s.replace(/\bTeam edge:\s*/gi, "");
  s = s.replace(/\bCap table quality:\s*/gi, "Cap table: ");
  s = s.replace(/\bTraction:\s*/gi, "");
  s = s.replace(/\bMoat:\s*/gi, "");
  s = s.replace(/\bEntry view\s*\([^)]*\):\s*/gi, "Entry around ");
  s = s.replace(/\s+with valuation score\s+\d+(?:\.\d+)?\/100\.?/gi, ".");
  s = s.replace(/\s\+\s/g, " and ");
  s = s.replace(/\s{2,}/g, " ");
  s = s.replace(/\s+([,.;:])/g, "$1");
  s = s.replace(/([,;:]){2,}/g, "$1");
  s = s.replace(/\.\s*\./g, ".");
  return s.trim();
}

export type DigestFact = { label: string; value: string };

function pickCompanyLike(deal: DigestDeal, company?: Company | null) {
  return {
    one_liner: company?.one_liner ?? deal.one_liner,
    subsector: company?.subsector ?? deal.subsector,
    sector_theme: company?.sector_theme ?? deal.sector,
    stage: company?.stage ?? deal.stage,
    team_notes: company?.team_notes ?? deal.team_notes,
    traction_notes: company?.traction_notes ?? deal.traction_notes,
    moat_notes: company?.moat_notes ?? deal.moat_notes,
    lead_investor: company?.lead_investor ?? deal.lead_investor,
    tier1_count: company?.tier1_count ?? deal.tier1_count,
    tier1_names: company?.tier1_names ?? deal.tier1_names,
    yoy_growth_pct: company?.yoy_growth_pct ?? deal.yoy_growth_pct,
    valuation_est_m: company?.valuation_est_m ?? deal.valuation_est_m,
    valuation_confidence: company?.valuation_confidence ?? deal.valuation_confidence,
    why_now: company?.why_now ?? deal.why_now ?? deal.rationale,
  };
}

/** Prefer structured fields; fall back to cleaned rationale. */
export function digestDealFacts(
  deal: DigestDeal,
  company?: Company | null,
): { summary: string; facts: DigestFact[] } {
  const c = pickCompanyLike(deal, company);
  const hasStructure = !!(c.team_notes || c.moat_notes || c.traction_notes || c.tier1_count);

  if (hasStructure) {
    const names = c.tier1_names || [];
    const t1 = names.length
      ? `${c.tier1_count ?? names.length} Tier-1 (${names.slice(0, 3).join(", ")}${
          names.length > 3 ? `, +${names.length - 3}` : ""
        })`
      : c.tier1_count != null
        ? `${c.tier1_count} Tier-1`
        : null;

    const facts: DigestFact[] = [
      c.team_notes ? { label: "Team", value: cleanProse(c.team_notes) } : null,
      t1 ? { label: "Cap table", value: t1 } : null,
      c.lead_investor ? { label: "Lead", value: c.lead_investor } : null,
      c.traction_notes || c.yoy_growth_pct != null
        ? {
            label: "Traction",
            value: [
              cleanProse(c.traction_notes).replace(/\.$/, ""),
              c.yoy_growth_pct != null ? `${fmtPct(c.yoy_growth_pct)} YoY` : null,
            ]
              .filter(Boolean)
              .join(" · "),
          }
        : null,
      c.moat_notes ? { label: "Moat", value: cleanProse(c.moat_notes) } : null,
      c.valuation_est_m != null
        ? {
            label: "Entry",
            value: `${fmtMoneyM(c.valuation_est_m)} post${
              c.valuation_confidence ? ` (${c.valuation_confidence})` : ""
            }`,
          }
        : null,
    ].filter(Boolean) as DigestFact[];

    const summary =
      cleanProse(c.one_liner) ||
      [c.subsector || c.sector_theme, c.stage].filter(Boolean).join(" · ");

    return { summary, facts };
  }

  return {
    summary: cleanProse(c.one_liner) || cleanProse(c.why_now) || cleanProse(deal.sector) || "",
    facts: [],
  };
}

export function formatDigestSubject(dateIso: string, dealCount: number): string {
  const d = new Date(dateIso);
  const dateLabel = Number.isNaN(d.getTime())
    ? dateIso.slice(0, 10)
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const dealWord = dealCount === 1 ? "deal" : "deals";
  return `Thirdbase Signal: ${dealCount} ${dealWord} for ${dateLabel}`;
}

export function formatScore(score?: number | null): string {
  if (score == null || Number.isNaN(Number(score))) return "—";
  const n = Number(score);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
