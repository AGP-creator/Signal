/**
 * Playbooks — Startup Library / Knowledge Base analog for Thirdbase partners.
 * Curated, not scraped from Bookface.
 */

export type Playbook = {
  id: string;
  title: string;
  category: string;
  summary: string;
  tags: string[];
  body: string;
};

export const PLAYBOOKS: Playbook[] = [
  {
    id: "pb_monday_ritual",
    title: "Partner ritual (90 minutes)",
    category: "Operating cadence",
    summary: "How Signal structures the weekly partner meeting — Decide → Diligence → Intel → Firm → Read.",
    tags: ["partner", "meeting", "agenda", "cadence"],
    body: [
      "## Goal",
      "Spend partner attention like capital. Never turn the agenda into a coverage tour.",
      "",
      "## Sequence (~90m)",
      "1. **Decide** — IC trails at partner_meeting / ic_vote / term_sheet + top Deep Dives.",
      "2. **Diligence** — Blocked or in-progress work orders only.",
      "3. **Intel** — High alerts, peer thesis shifts, founder radar.",
      "4. **Firm** — Mix drift, stale reviews, judgment overrides.",
      "5. **Read** — Max 2–3 news / sector scans.",
      "",
      "## Rules",
      "- Hard-cap Deep Dive debate items.",
      "- Every item needs an *ask* (decide / assign / defer).",
      "- Passes with spine stay visible — do not hide disagreement.",
      "",
      "Open `/meeting` to auto-build the agenda from the live store.",
    ].join("\n"),
  },
  {
    id: "pb_ic_packet",
    title: "IC packet checklist",
    category: "Governance",
    summary: "What must be in an IC-ready brief before a vote — citations, bear case, comps, freshness.",
    tags: ["ic", "memo", "packet", "governance"],
    body: [
      "## Required",
      "- Thesis score + relative rank (theme × stage)",
      "- Why now (one paragraph)",
      "- Score breakdown with weak dimensions called out",
      "- Tier-1 / syndicate context",
      "- Bear case / counterfactual (Diligence Stress Pack)",
      "- Freshness SLA — stale fields haircut confidence",
      "",
      "## Nice-to-have",
      "- Deck red flags with citations (never invent blanks)",
      "- Diligence work orders + founder-only questions",
      "- Peer crowding / proprietary window",
      "",
      "Export from company brief → IC packet, or `/ic` trail.",
    ].join("\n"),
  },
  {
    id: "pb_demo_day_interest",
    title: "Demo Day / batch interest workflow",
    category: "Sourcing",
    summary: "YC Demo Day mechanic adapted for Signal: like → stack-rank → mutual meeting match.",
    tags: ["demo day", "yc", "interest", "matching", "batch"],
    body: [
      "## YC pattern",
      "Investors *like* companies during pitches, then stack-rank. Founders rank interested investors. Software builds the schedule (Investor Day).",
      "",
      "## Signal adaptation",
      "1. Browse `/directory` or `/launch` — facet like the YC Startup Directory.",
      "2. **Like** names into Interest Desk (`/interest`) from Directory, Launch, Pipeline, Discovery, or company brief.",
      "3. Stack-rank your likes with ↑↓ (best-first).",
      "4. Run **Meeting match** — thesis_score proxies company-side preference.",
      "5. Push schedule into Partner Meeting OS (`/meeting?from=interest`) or compare the stack (`/compare`).",
      "",
      "## Discipline",
      "- Likes without ranks waste the matcher.",
      "- Never auto-send outreach from a match.",
      "- Unmatched likes roll to the next block — do not inflate Deep Dive.",
    ].join("\n"),
  },
  {
    id: "pb_kind_no",
    title: "Kind-no (decline with spine)",
    category: "Founder relations",
    summary: "How to pass without burning the relationship — reopen conditions explicit.",
    tags: ["pass", "kind no", "founder", "outreach"],
    body: [
      "## Principles",
      "- Pass is a decision, not an absence of enthusiasm.",
      "- Name the bar that was missed (relative rank, stage, thesis dim).",
      "- Offer a concrete reopen condition.",
      "",
      "## Template",
      "We're passing for now — [company] doesn't clear our bar on [dim] vs the [theme × stage] cohort this cycle.",
      "We'd reopen if [specific signal]. Happy to intro to [peer] if useful.",
      "",
      "Use `/work` kind-no drafts; never auto-send.",
    ].join("\n"),
  },
  {
    id: "pb_reference_calls",
    title: "Reference-call factory",
    category: "Diligence",
    summary: "Scripts from weak score dimensions + bear landmines — Affinity-style, never auto-send.",
    tags: ["references", "diligence", "calls"],
    body: [
      "## When",
      "Before IC vote on any Deep Dive with weak moat / team / traction dims.",
      "",
      "## Method",
      "1. Open Partner Edge → Reference-call factory.",
      "2. Pull scripts tied to weak dimensions.",
      "3. Pair with bear-case landmines from Diligence Stress Pack.",
      "4. Human sends — Signal only drafts.",
      "",
      "Goal: falsify the thesis fast, not collect vanity quotes.",
    ].join("\n"),
  },
  {
    id: "pb_override_ledger",
    title: "Override ledger → policy fuel",
    category: "Judgment",
    summary: "Partner disagreement is training data for thesis bars — not silent fine-tunes.",
    tags: ["judgment", "override", "policy"],
    body: [
      "## Rule",
      "Every partner override must cite a scoring dimension and a reason.",
      "",
      "## Downstream",
      "- Raise/lower bar suggestions by dimension",
      "- Miss retrospectives when breakout velocity arrives after a cool Signal call",
      "- Partner twin lean-in / push-back predictions",
      "",
      "Surface: `/judgment` + company Override panel.",
    ].join("\n"),
  },
  {
    id: "pb_directory_research",
    title: "Directory research (YC Startup Directory pattern)",
    category: "Sourcing",
    summary: "Facet by cycle × theme × hiring to map markets — then score, don’t scrape vanity lists.",
    tags: ["directory", "yc", "market map", "research"],
    body: [
      "## YC Directory pattern",
      "Filter batch + industry + status + hiring to see who got funded and where heat is.",
      "",
      "## In Signal",
      "1. `/directory` — cycle (H1/H2 from round date), theme, stage, rec, hiring, 60/40 bucket.",
      "2. Export CSV for offline debate.",
      "3. Like into `/interest` or open company brief.",
      "4. For NL maps, use `/atlas` Market map.",
      "",
      "Signal ranks by thesis; the directory is browse, not the recommendation engine.",
    ].join("\n"),
  },
  {
    id: "pb_ask_grounding",
    title: "Ask with grounding trails",
    category: "Operating cadence",
    summary: "Like Ask YC Agent — every answer should show what corpora were searched.",
    tags: ["chat", "ask", "grounding", "yc agent"],
    body: [
      "## Pattern",
      "YC Agent shows tool calls under each answer (forum search, KB, companies).",
      "",
      "## In Signal",
      "Chat and ⌘K return **Searched** trails: pipeline, commentary, peers, news, playbooks, etc.",
      "If nothing grounded — Signal refuses rather than invent.",
      "",
      "Prefer named intents: partner agenda, bear case for X, market map, interest match.",
    ].join("\n"),
  },
];

export function getPlaybook(id: string): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.id === id);
}

export function playbooksByCategory(): Record<string, Playbook[]> {
  const out: Record<string, Playbook[]> = {};
  for (const p of PLAYBOOKS) {
    (out[p.category] ||= []).push(p);
  }
  return out;
}
