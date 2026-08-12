/**
 * IC Decision Trail — governance object LPs ask for and GPs forget to keep.
 *
 * Stages mirror how partner meetings actually move deals:
 * Sourced → Screened → Deep Dive → Diligence → Partner Meeting → IC Vote → Term Sheet | Pass | Watch
 */

import type { Company } from "@/lib/types";

export type IcStage =
  | "sourced"
  | "screened"
  | "deep_dive"
  | "diligence"
  | "partner_meeting"
  | "ic_vote"
  | "term_sheet"
  | "invested"
  | "pass"
  | "watch";

export type VoteChoice = "yes" | "no" | "abstain" | "more_diligence";

export type IcVote = {
  id: string;
  partner: string;
  choice: VoteChoice;
  note: string;
  at: string;
};

export type StageEvent = {
  id: string;
  stage: IcStage;
  actor: string;
  note: string;
  at: string;
};

export type DiligenceItem = {
  id: string;
  category: "team" | "market" | "product" | "traction" | "legal" | "refs" | "terms";
  label: string;
  status: "todo" | "in_progress" | "done" | "blocked" | "na";
  owner?: string;
  note?: string;
};

export type DealTrail = {
  company_id: string;
  company_name: string;
  slug?: string | null;
  stage: IcStage;
  sponsor: string;
  thesis_hook: string;
  check_size_m?: number | null;
  target_ownership_pct?: number | null;
  risks: string[];
  open_questions: string[];
  events: StageEvent[];
  votes: IcVote[];
  diligence: DiligenceItem[];
  updated_at: string;
};

export const STAGE_ORDER: IcStage[] = [
  "sourced",
  "screened",
  "deep_dive",
  "diligence",
  "partner_meeting",
  "ic_vote",
  "term_sheet",
  "invested",
  "watch",
  "pass",
];

export const STAGE_LABEL: Record<IcStage, string> = {
  sourced: "Sourced",
  screened: "Screened",
  deep_dive: "Deep Dive",
  diligence: "Diligence",
  partner_meeting: "Partner meeting",
  ic_vote: "IC vote",
  term_sheet: "Term sheet",
  invested: "Invested",
  pass: "Pass",
  watch: "Watch",
};

export const VOTE_LABEL: Record<VoteChoice, string> = {
  yes: "Yes",
  no: "No",
  abstain: "Abstain",
  more_diligence: "More DD",
};

export function defaultDiligenceChecklist(): DiligenceItem[] {
  return [
    { id: "dd_team", category: "team", label: "Founder reference calls (3+)", status: "todo" },
    { id: "dd_product", category: "product", label: "Product / technical moat review", status: "todo" },
    { id: "dd_market", category: "market", label: "TAM / competitive map stress test", status: "todo" },
    { id: "dd_traction", category: "traction", label: "Revenue / usage diligence", status: "todo" },
    { id: "dd_refs", category: "refs", label: "Customer references", status: "todo" },
    { id: "dd_legal", category: "legal", label: "Cap table + legal red flags", status: "todo" },
    { id: "dd_terms", category: "terms", label: "Round terms / valuation comps", status: "todo" },
  ];
}

export function stageFromRecommendation(rec?: string | null): IcStage {
  if (rec === "Deep Dive") return "deep_dive";
  if (rec === "Watch") return "watch";
  if (rec === "Pass") return "pass";
  return "screened";
}

export function seedTrailFromCompany(c: Company, overrides?: Partial<DealTrail>): DealTrail {
  const stage = overrides?.stage || stageFromRecommendation(c.recommendation);
  const now = "2026-08-10T09:00:00Z";
  return {
    company_id: c.id,
    company_name: c.name,
    slug: c.slug,
    stage,
    sponsor: overrides?.sponsor || "Associate",
    thesis_hook: overrides?.thesis_hook || c.why_now || c.one_liner || "Thesis fit TBD",
    check_size_m: overrides?.check_size_m ?? null,
    target_ownership_pct: overrides?.target_ownership_pct ?? null,
    risks: overrides?.risks || [
      c.valuation_confidence === "low" ? "Valuation confidence low — verify before IC" : "Price discipline vs comps",
      (c.tier1_count || 0) >= 4 ? "Crowding / price pressure from Tier-1 density" : "Syndicate quality to confirm",
    ],
    open_questions: overrides?.open_questions || [
      "What would make us Pass even at a lower price?",
      "Who is the champion customer / design partner?",
    ],
    events: overrides?.events || [
      {
        id: `ev_${c.id}_1`,
        stage: "sourced",
        actor: "Signal",
        note: `Ingested · score ${c.thesis_score ?? "—"} · ${c.recommendation}`,
        at: c.last_signal_date || now,
      },
      {
        id: `ev_${c.id}_2`,
        stage,
        actor: "System",
        note: `Current stage inferred from recommendation (${c.recommendation})`,
        at: now,
      },
    ],
    votes: overrides?.votes || [],
    diligence: overrides?.diligence || defaultDiligenceChecklist(),
    updated_at: now,
  };
}

/** Demo trails for IC page when no local overrides exist. */
export function buildDemoTrails(companies: Company[]): DealTrail[] {
  const deep = companies.filter((c) => c.recommendation === "Deep Dive").slice(0, 3);
  const watch = companies.filter((c) => c.recommendation === "Watch").slice(0, 1);
  const pass = companies.filter((c) => c.recommendation === "Pass").slice(0, 1);

  const demos: DealTrail[] = [];

  for (const [i, c] of deep.entries()) {
    if (i === 0) {
      demos.push(
        seedTrailFromCompany(c, {
          stage: "partner_meeting",
          sponsor: "GP",
          check_size_m: 8,
          target_ownership_pct: 8,
          risks: ["Competitive race if peers circle", "Runway vs growth trade-off"],
          open_questions: ["Is entry valuation acceptable vs comps?", "Board observer rights?"],
          events: [
            {
              id: "ev_pm_1",
              stage: "sourced",
              actor: "Signal",
              note: "Hot Deal · digest surfaced",
              at: "2026-08-01T08:00:00Z",
            },
            {
              id: "ev_pm_2",
              stage: "deep_dive",
              actor: "Principal",
              note: "Partner assigned; IC packet drafted",
              at: "2026-08-04T11:00:00Z",
            },
            {
              id: "ev_pm_3",
              stage: "diligence",
              actor: "Associate",
              note: "Refs scheduled; technical review started",
              at: "2026-08-07T15:00:00Z",
            },
            {
              id: "ev_pm_4",
              stage: "partner_meeting",
              actor: "GP",
              note: "On partner agenda — seek proceed-to-IC",
              at: "2026-08-10T08:00:00Z",
            },
          ],
          votes: [],
          diligence: defaultDiligenceChecklist().map((d, idx) =>
            idx < 3 ? { ...d, status: "done" as const, owner: "Associate" } : d,
          ),
        }),
      );
    } else if (i === 1) {
      demos.push(
        seedTrailFromCompany(c, {
          stage: "diligence",
          sponsor: "Principal",
          check_size_m: 5,
          target_ownership_pct: 10,
          events: [
            {
              id: "ev_dd_1",
              stage: "deep_dive",
              actor: "Principal",
              note: "Conviction forming; open DD checklist",
              at: "2026-08-05T10:00:00Z",
            },
            {
              id: "ev_dd_2",
              stage: "diligence",
              actor: "Associate",
              note: "Customer refs in flight",
              at: "2026-08-08T16:00:00Z",
            },
          ],
          diligence: defaultDiligenceChecklist().map((d, idx) =>
            idx === 0
              ? { ...d, status: "in_progress" as const, owner: "Associate", note: "2/3 refs done" }
              : d,
          ),
        }),
      );
    } else {
      demos.push(
        seedTrailFromCompany(c, {
          stage: "ic_vote",
          sponsor: "GP",
          check_size_m: 10,
          target_ownership_pct: 7,
          votes: [
            {
              id: "v1",
              partner: "GP",
              choice: "yes",
              note: "Thesis-aligned · relative #1 in theme",
              at: "2026-08-09T17:00:00Z",
            },
            {
              id: "v2",
              partner: "Principal",
              choice: "more_diligence",
              note: "Want one more customer churn reference",
              at: "2026-08-09T17:05:00Z",
            },
          ],
        }),
      );
    }
  }

  for (const c of watch) {
    demos.push(
      seedTrailFromCompany(c, {
        stage: "watch",
        sponsor: "Associate",
        thesis_hook: "Monitor — re-open if Tier-1 enters or growth inflection",
      }),
    );
  }

  for (const c of pass) {
    demos.push(
      seedTrailFromCompany(c, {
        stage: "pass",
        sponsor: "GP",
        thesis_hook: "Documented Pass — spine for LP / miss retro",
        events: [
          {
            id: "ev_pass_1",
            stage: "screened",
            actor: "Signal",
            note: `Scored ${c.thesis_score} · Pass`,
            at: "2026-08-03T09:00:00Z",
          },
          {
            id: "ev_pass_2",
            stage: "pass",
            actor: "GP",
            note: "Confirmed Pass — moat / thesis fit insufficient",
            at: "2026-08-03T14:00:00Z",
          },
        ],
      }),
    );
  }

  // Ensure unique companies
  const seen = new Set<string>();
  return demos.filter((t) => {
    if (seen.has(t.company_id)) return false;
    seen.add(t.company_id);
    return true;
  });
}

export function voteSummary(votes: IcVote[]) {
  const tally = { yes: 0, no: 0, abstain: 0, more_diligence: 0 };
  for (const v of votes) tally[v.choice] += 1;
  return tally;
}

export function diligenceProgress(items: DiligenceItem[]) {
  const actionable = items.filter((i) => i.status !== "na");
  const done = actionable.filter((i) => i.status === "done").length;
  const in_progress = actionable.filter((i) => i.status === "in_progress").length;
  const blocked = actionable.filter((i) => i.status === "blocked").length;
  const pct = actionable.length ? Math.round((100 * done) / actionable.length) : 0;
  return { done, total: actionable.length, blocked, in_progress, pct };
}

export function trailsNeedingMeeting(trails: DealTrail[]) {
  return trails.filter((t) =>
    ["deep_dive", "diligence", "partner_meeting", "ic_vote", "term_sheet"].includes(t.stage),
  );
}

export function mergeTrailsWithCompanies(
  companies: Company[],
  stored: DealTrail[],
): DealTrail[] {
  if (stored.length) {
    const byId = new Map(stored.map((t) => [t.company_id, t]));
    // Keep stored; add missing Deep Dives as seeds
    for (const c of companies.filter((x) => x.recommendation === "Deep Dive")) {
      if (!byId.has(c.id)) byId.set(c.id, seedTrailFromCompany(c));
    }
    return Array.from(byId.values()).sort(
      (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage),
    );
  }
  return buildDemoTrails(companies);
}
