/**
 * Lightweight node-free assertions via Next/ts — run with:
 *   npx --yes tsx ../web/src/lib/diligence.selftest.ts
 * Or import from tests. Kept as a runnable module.
 */
import {
  analyzeDeckText,
  buildBearCase,
  buildDiligencePack,
  buildDiligencePlan,
  buildMeetingPrep,
} from "./diligence";

const subject = {
  name: "AgentGate",
  one_liner: "Agent identity and policy gateway for enterprise AI",
  sector_theme: "AI Infrastructure",
  subsector: "Agent control plane",
  stage: "Series B",
  recommendation: "Deep Dive",
  thesis_score: 78,
  relative_rank: "#2 of 9 in theme×stage",
  why_now: "Enterprises need authz for agent swarms before procurement freezes.",
  yoy_growth_pct: 55,
  runway_months_est: 14,
  tam_usd_b: 80,
  tier1_count: 1,
  tier1_names: ["a16z"],
  valuation_confidence: "estimated",
  moat_notes: "Policy graph + audit trail.",
  score_breakdown: { thesis_fit: 80, growth: 70, moat: 55, valuation: 45, team: 72 },
};

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const bear = buildBearCase(subject);
assert(bear.kill_arguments.length >= 2, "bear should have kill args");
assert(/runway|TAM|valuation|Tier/i.test(bear.kill_arguments.map((k) => k.title).join(" ")), "expected policy kills");

const deck = analyzeDeckText(`
Slide 1: AgentGate
ARR $12M growing 120% YoY
TAM $2 trillion market
We have no competition
Fortune 500 customers love us
Raising $40M at $400M valuation
`);
assert(deck.claims.length >= 2, "deck claims");
assert(deck.red_flags.some((f) => f.id === "tam-inflated" || f.id === "no-competition" || f.id === "missing-unit-econ"), "flags");
assert(deck.missing_fields.includes("Unit economics") || deck.red_flags.some((f) => f.id === "missing-unit-econ"), "unit econ");

const plan = buildDiligencePlan(subject, bear, deck);
assert(plan.tasks.length >= 5, "tasks");
assert(plan.founder_email_draft.includes("AgentGate"), "email");
assert(!plan.founder_email_draft.toLowerCase().includes("auto-send"), "no auto claim needed");

const meeting = buildMeetingPrep(subject, { bear, plan });
assert(meeting.must_ask.length >= 3, "must ask");
assert(meeting.landmines.length >= 1, "landmines");

const pack = buildDiligencePack(subject, { deckText: "ARR $5M · 40% YoY" });
assert(pack.deck, "pack deck");
assert(pack.bear.company_name === "AgentGate", "pack bear");

console.log("diligence.selftest: ok");
