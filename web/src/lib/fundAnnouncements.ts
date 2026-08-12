/**
 * Peer-set fund announcements — curated demo + Form-D-shaped rows until live EDGAR cross-ref ships.
 * Used by Competitor OS / Firms desk to surface new vehicles and sector bets.
 */

export type FundAnnouncement = {
  id: string;
  firm: string;
  firm_slug: string;
  vehicle: string;
  /** Target / reported size in USD millions; null if undisclosed */
  size_m: number | null;
  announced_date: string;
  sector_focus: string;
  stage_focus?: string;
  source?: string;
  source_url?: string;
  notes: string;
  /** Freshness: new | recent | monitor */
  freshness: "new" | "recent" | "monitor";
};

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Core peer fund raises + sector vehicles partners should notice. */
export const FUND_ANNOUNCEMENTS: FundAnnouncement[] = [
  {
    id: "fa1",
    firm: "Andreessen Horowitz",
    firm_slug: slug("Andreessen Horowitz"),
    vehicle: "a16z American Dynamism Fund III",
    size_m: 1500,
    announced_date: "2026-07-08",
    sector_focus: "Defence Tech · Space · Critical infra",
    stage_focus: "Seed–Growth",
    source: "Firm press",
    notes: "Hardens national-security lane — overlaps Shield / Founders Fund / 8VC chase set.",
    freshness: "new",
  },
  {
    id: "fa2",
    firm: "Sequoia Capital",
    firm_slug: slug("Sequoia Capital"),
    vehicle: "Sequoia Arc AI Infrastructure",
    size_m: 850,
    announced_date: "2026-06-22",
    sector_focus: "AI Infrastructure & Compute Stack",
    stage_focus: "Series A–C",
    source: "Form D cross-ref",
    notes: "Dedicated infra sleeve — watch for lead velocity on GPU / eval names.",
    freshness: "new",
  },
  {
    id: "fa3",
    firm: "Lux Capital",
    firm_slug: slug("Lux Capital"),
    vehicle: "Lux Frontier Science Fund",
    size_m: 600,
    announced_date: "2026-05-30",
    sector_focus: "Deep tech · Robotics · Energy",
    stage_focus: "Seed–B",
    source: "Firm press",
    notes: "Doubles down on physical AI / hard science — co-invest map with Founders Fund.",
    freshness: "recent",
  },
  {
    id: "fa4",
    firm: "Ribbit Capital",
    firm_slug: slug("Ribbit Capital"),
    vehicle: "Ribbit Opportunity VI",
    size_m: 1100,
    announced_date: "2026-04-14",
    sector_focus: "Fintech & Financial Infrastructure",
    stage_focus: "Growth",
    source: "Form D cross-ref",
    notes: "Core fintech firepower; off-thesis defence moves become louder against this book.",
    freshness: "recent",
  },
  {
    id: "fa5",
    firm: "Thrive Capital",
    firm_slug: slug("Thrive Capital"),
    vehicle: "Thrive Continuity III",
    size_m: 2000,
    announced_date: "2026-07-01",
    sector_focus: "Internet · Software · AI apps",
    stage_focus: "Late growth",
    source: "Trade press",
    notes: "Continuity dry powder for breakout AI app winners — race risk on Soft/SaaS Deep Dives.",
    freshness: "new",
  },
  {
    id: "fa6",
    firm: "Khosla Ventures",
    firm_slug: slug("Khosla Ventures"),
    vehicle: "KV Climate & Energy Opportunity",
    size_m: 450,
    announced_date: "2026-03-18",
    sector_focus: "Energy-as-a-service · Climate",
    stage_focus: "A–B",
    source: "Firm press",
    notes: "Sector vehicle for modular power / data-center energy — watch Modular Nucleus comps.",
    freshness: "monitor",
  },
  {
    id: "fa7",
    firm: "Shield Capital",
    firm_slug: slug("Shield Capital"),
    vehicle: "Shield National Security Fund II",
    size_m: 350,
    announced_date: "2026-06-05",
    sector_focus: "National security · Cyber · Space",
    stage_focus: "Seed–B",
    source: "Form D cross-ref",
    notes: "Pure-play defence vehicle — primary syndicate call on C4ISR / counter-UAS.",
    freshness: "new",
  },
  {
    id: "fa8",
    firm: "Founders Fund",
    firm_slug: slug("Founders Fund"),
    vehicle: "FF American Industrial",
    size_m: 900,
    announced_date: "2026-05-12",
    sector_focus: "Aerospace · Defence · Frontier",
    stage_focus: "Multi-stage",
    source: "Trade press",
    notes: "Industrial / defence sleeve — pairs with Lux / 8VC on hardtech races.",
    freshness: "recent",
  },
  {
    id: "fa9",
    firm: "Lightspeed Venture Partners",
    firm_slug: slug("Lightspeed Venture Partners"),
    vehicle: "LSV Edge AI Fund",
    size_m: 500,
    announced_date: "2026-04-28",
    sector_focus: "AI Infrastructure & Compute Stack",
    stage_focus: "Seed–B",
    source: "Firm press",
    notes: "Edge inference focus — relevant for EdgeQuanta-class deals.",
    freshness: "recent",
  },
  {
    id: "fa10",
    firm: "Index Ventures",
    firm_slug: slug("Index Ventures"),
    vehicle: "Index Growth VI",
    size_m: 1800,
    announced_date: "2026-02-20",
    sector_focus: "Multi-stage technology",
    stage_focus: "Growth",
    source: "Form D cross-ref",
    notes: "Large growth fund — crowding risk on European + US scale-ups.",
    freshness: "monitor",
  },
  {
    id: "fa11",
    firm: "Bessemer Venture Partners",
    firm_slug: slug("Bessemer Venture Partners"),
    vehicle: "BVP Cloud Twelfth",
    size_m: 1200,
    announced_date: "2026-03-05",
    sector_focus: "Cloud · Vertical SaaS · Fintech",
    stage_focus: "A–Growth",
    source: "Firm press",
    notes: "Cloud thesis refresh — partner when vertical AI SaaS heats up.",
    freshness: "monitor",
  },
  {
    id: "fa12",
    firm: "Conviction",
    firm_slug: slug("Conviction"),
    vehicle: "Conviction AI Applications II",
    size_m: 400,
    announced_date: "2026-06-18",
    sector_focus: "AI application layer",
    stage_focus: "Seed–A",
    source: "Firm press",
    notes: "App-layer sleeve — co-invest unlock on SynthForge-class names.",
    freshness: "new",
  },
  {
    id: "fa13",
    firm: "Coatue Management",
    firm_slug: slug("Coatue Management"),
    vehicle: "Coatue Growth Softbank-adjacent",
    size_m: 2500,
    announced_date: "2026-01-15",
    sector_focus: "Growth tech · Cyber · AI",
    stage_focus: "Late growth",
    source: "Trade press",
    notes: "Mega dry powder — expect aggressive late-round participation on cyber/AI.",
    freshness: "monitor",
  },
  {
    id: "fa14",
    firm: "8VC",
    firm_slug: slug("8VC"),
    vehicle: "8VC Bio + Defense Continuity",
    size_m: 550,
    announced_date: "2026-05-22",
    sector_focus: "Bio · Defence · Enterprise",
    stage_focus: "Seed–B",
    source: "Firm press",
    notes: "Defence continuity — syndicate with Shield on C4ISight-class deals.",
    freshness: "recent",
  },
  {
    id: "fa15",
    firm: "Spark Capital",
    firm_slug: slug("Spark Capital"),
    vehicle: "Spark Consumer AI",
    size_m: 380,
    announced_date: "2026-04-02",
    sector_focus: "Consumer · Enterprise · Crypto",
    stage_focus: "Seed–B",
    source: "Trade press",
    notes: "Consumer AI vehicle — lower Thirdbase overlap unless enterprise wedge appears.",
    freshness: "recent",
  },
  {
    id: "fa16",
    firm: "Tiger Global Management",
    firm_slug: slug("Tiger Global Management"),
    vehicle: "Tiger Private Opportunity 2026",
    size_m: 3200,
    announced_date: "2026-07-15",
    sector_focus: "Growth internet · Infra",
    stage_focus: "Growth",
    source: "Form D cross-ref",
    notes: "Return of aggressive growth checks — watch stretch into energy hardtech.",
    freshness: "new",
  },
];

export function fundAnnouncementsForFirm(slugOrName: string): FundAnnouncement[] {
  const n = slugOrName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return FUND_ANNOUNCEMENTS.filter(
    (f) => f.firm_slug === slugOrName || f.firm.toLowerCase().replace(/[^a-z0-9]+/g, "") === n,
  );
}

export function sectorBetFromFunds(): { theme: string; count: number; capital_m: number }[] {
  const map = new Map<string, { count: number; capital_m: number }>();
  for (const f of FUND_ANNOUNCEMENTS) {
    const themes = f.sector_focus.split(/[·,]/).map((t) => t.trim()).filter(Boolean);
    for (const theme of themes.slice(0, 2)) {
      const cur = map.get(theme) || { count: 0, capital_m: 0 };
      cur.count += 1;
      cur.capital_m += f.size_m || 0;
      map.set(theme, cur);
    }
  }
  return [...map.entries()]
    .map(([theme, v]) => ({ theme, count: v.count, capital_m: v.capital_m }))
    .sort((a, b) => b.capital_m - a.capital_m || b.count - a.count);
}
