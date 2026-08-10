# Signal — Thirdbase Deal Sourcing Agent

**Category:** Deal intelligence OS for thesis-driven growth investors  
**One-liner:** An always-on sourcing partner that turns fragmented market noise into a self-maintaining deal pipeline, ranked the way Thirdbase actually invests.

## Problem

Partners drown in funding announcements, Twitter threads, and associate decks. Coverage tools optimize for volume. Thirdbase needs **judgment**: which deals are genuinely outstanding against thesis, which sectors are emerging before consensus, and what commentary matters — delivered in Excel and email, not another dashboard.

## Solution

Signal continuously ingests market signals, deduplicates companies, scores them against Thirdbase investment criteria, maintains a living Excel workbook, sends M/W/F priority digests (plus instant alerts), and answers partner questions with grounded pipeline context.

## Users

| Role | Job |
|------|-----|
| Partner / Principal | Hot Deals, digest, chat, IC briefs |
| Associate | Research depth, commentary, sector scans |
| Anti-user | Anyone who wants infinite unranked lists |

## Surfaces

1. **Excel workbook** (`Thirdbase_Deal_Pipeline.xlsx`) — primary system of record for debate
2. **Email digest** — Mon / Wed / Fri, hard-capped selectivity (3–5 deals, 1–2 sector calls, 3–5 news, peer moves) with links to company briefs
3. **Immediate alerts** — 2+ Tier-1, off-thesis peer moves, GP watchlist / watched-founder hits
4. **Conversational agent** — partner-grade Q&A over the same store
5. **Competitor intelligence OS** (`/peers`) — peer-set firm dossiers, thesis-drift radar, investor×company matrix, co-investor heatmap, and company comps
6. **Company search agent** (`/search`) — type any company (pipeline or new) for a full IC brief: funding, cap table (T1/T2/T3), team, traction, thesis fit, comps, commentary, Pass/Watch/Deep Dive
7. **Partner Meeting OS** (`/meeting`) — auto Monday agenda from Hot Deals, IC trails, alerts, peer shifts, mix, stale — ~90m cap
8. **IC Decision Trail** (`/ic`) — stages, diligence checklist, votes, event log, documented Passes
9. **LP Process Desk** (`/lp`) — AI-in-process narrative, controls, governance samples, one-pager for LP meetings
10. **Judgment OS** (`/judgment`) — override ledger, miss retros, founder radar, freshness SLA, mix drift, digest A/B
7. **Diligence Stress Pack** (on company brief + `/company/[id]`) — bear/counterfactual agent, deck claims + red flags, diligence work orders + founder-only email draft, meeting prep one-pager; folded into IC packet export

Competitive research: [`docs/AGENTIC_VC_LANDSCAPE.md`](AGENTIC_VC_LANDSCAPE.md)
7. **Partner library** (`/library`) — News Worth Reading, Investor Commentary, Watchlist, and Stale (90d+) review queue

See [COVERAGE.md](COVERAGE.md) for the full brief → implementation matrix.
7. **Judgment OS** (`/judgment`) — override ledger, miss retros, founder radar, freshness SLA, mix drift, digest A/B

## Competitor / peer-set intelligence

Implements the brief’s **Peer set tracking** + comps — then layers a **golden insights OS** partners actually use:

- Auto-generated partner competitor brief (copyable) with Must-do / Watch
- Proprietary windows (quiet tape + high conviction)
- Crowding / competitive race alerts on Deep Dives
- White-space vs flood theme posture vs peer capital
- Syndicate unlock call lists (heatmap + theme fit)
- Firm battle cards (how they win / weak / partner-or-compete / when to call)
- Circling competitors on every company brief
- Excel **Golden Insights** + **Peer Firm Dossiers** tabs
- Chat: “What should I do Monday?”, proprietary windows, white space, who to call
- Thesis-shift demos for a16z / Sequoia / Ribbit / Tiger

## Judgment OS (X-factor — hard to copy)

The layer that separates Signal from “chatbot + table” demos:

1. **Override ledger** — partners disagree with Signal on any company; reasons become policy fuel by scoring dimension (raise/lower bar), not silent fine-tunes  
2. **Miss retrospective** — blameless postmortems when breakout velocity or peer FOMO arrives after Signal stayed cool  
3. **Mix drift alarm** — 60/40 soft (±6) and hard (±12) bands with counsel  
4. **Evidence freshness SLA** — field-level age vs SLA; automatic confidence haircut on stale briefs  
5. **Founder radar** — watched operators / stealth newcos from GP chatter (never waits for Wednesday)  
6. **Digest selectivity A/B** — 3 vs 5 vs 8 deal caps with precision proxy; refuse coverage creep  
7. **IC packet export** — one-click markdown IC packet with comps, commentary, peer context, freshness  

Surfaces: `/judgment` · company override panel · Excel **Judgment OS** tab · chat (“founder radar”, “what did we miss?”, “judgment OS”)

## Sector of Tomorrow

Contrarian + emerging subsectors with evidence (GP chatter, hiring, research velocity, fund formation). Chat filters to AI Infrastructure–parented calls for *“three AI infra sub-sectors nobody is talking about.”*

## Investment criteria (encoded in `config/thesis_policy.yaml`)

- **60%** Dominant tech + growth stage / **40%** Tactical sector-agnostic
- Attractive entry valuation vs sector × stage comps
- High YoY growth (target **40%+** at growth stage)
- ~3 years runway
- 3–4 Tier-1 investors preferred
- High moat / technical defensibility
- TAM > $1B, 3–5 year exit horizon

Recommendations: **Deep Dive** / **Watch** / **Pass**, with relative rank within theme × stage.

## Workbook tabs

Pipeline · Hot Deals · Watchlist · Sector of Tomorrow · Peer Set Activity · Co-investor Heatmap · Golden Insights · Peer Firm Dossiers · Judgment OS · News Worth Reading · Investor Commentary · Stale

Stale entries (≥90 days no signal) are flagged for **partner review** — never auto-deleted.

## MVP vs production

| MVP | Production |
|-----|------------|
| Seed corpus + EDGAR / HN / RSS adapters | PitchBook, Crunchbase, Harmonic, Coresignal |
| Local SQLite + Excel regen | SharePoint sync, Affinity writeback |
| Streamlit chat | Always-on workers + SSO |

**Interview line:** We built the judgment layer and partner workflow first. Databases plug in as connectors.

## Principles

1. Signal, not coverage  
2. Explain every score  
3. Relative ranking within cohort  
4. Confidence + provenance on every field  
5. Human-in-the-loop on destructive actions  
6. Excel is a feature  
7. Thesis is config, not code  

## Phase 2 roadmap

- Paid deal-database connectors  
- Coresignal hiring feeds  
- Continuous cloud ingest  
- Affinity / Attio writeback  
- SharePoint-hosted live workbook  
- Diligence Stress Pack v2: PDF deck upload (OCR), pwMOIC scenarios, Affinity warm-path graph  
