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
| Partner / Principal | GP Desk, Hot Deals, digest, chat, IC briefs |
| Associate | Research depth, commentary, sector scans |
| Anti-user | Anyone who wants infinite unranked lists |

## Surfaces (Monday path first)

1. **Desk (`/`)** — Hot Deals, alerts, 60/40, Monday agenda CTA + Excel download  
2. **Partner Meeting OS (`/meeting`)** — auto Monday agenda (~90m)  
3. **Excel workbook** (`Thirdbase_Deal_Pipeline.xlsx`) — primary system of record for debate  
4. **Email digest** — Mon / Wed / Fri, hard-capped selectivity (3–5 deals)  
5. **Company search (`/search`)** — pipeline IC briefs; external names are **scout briefs** (Watch-capped)  
6. **Conversational agent (`/chat`)** — grounded Q&A; refuses ungrounded questions  
7. **IC / Judgment / Competitors / Library / LP** — supporting governance & intel  
8. **Venture agent (`/os`)** — Core Intelligence: great deals · sector of tomorrow · news · commentary · partner conversation (+ agent fleet)  
9. **Labs** (`/atlas`, `/edge`) — Signal Atlas + Partner Edge demos; not the default Monday path  
10. **YC-pattern desks** (`/directory`, `/interest`, `/launch`, `/find`) — Startup Directory browse, Demo Day like+rank+match, Launch feed, Bookface-style omnisearch + playbooks in Library  
11. **Deal Sourcing & Discovery** (`/source`) — one intelligent tool for continuous funding / hiring / launch / founder / customer signals; prefill by default, live adapters when flipped; Claude agent prompts on-desk  

Immediate alerts — 2+ Tier-1, off-thesis peer moves, GP watchlist / watched-founder hits.

See [COVERAGE.md](COVERAGE.md) for the full brief → implementation matrix.  
Partner explanation call: [`docs/FEATURE_GUIDE.md`](FEATURE_GUIDE.md) — every module, use, and talking points.

Competitive research: [`docs/AGENTIC_VC_LANDSCAPE.md`](AGENTIC_VC_LANDSCAPE.md)

## Venture agent (Core Intelligence)

The brief’s intelligent agent, with their headings:

1. **Knows what a great deal looks like** — `/deals` + `/os` · outstanding vs noisy · five pillars · relative rank  
2. **Knows the sector of tomorrow** — `/sectors` + `/os` · 12–36m horizons · evidence mix  
3. **Surfaces news worth reading** — Library + digest · curated 3–5 with Thirdbase why  
4. **Captures investor and operator commentary** — Library + company briefs · qualitative posture  
5. **Holds its own with a partner** — `/os` partner tab + `/chat` · why a company matters scripts  

Surfaces: `/os` · `/deals` · `/sectors` · `/library` · `/chat`

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

## Partner Edge (demo wow — partners use Monday)

Unique surfaces coverage tools and agentic CRMs rarely ship as a first-class OS:

1. **Anti-consensus radar** — proprietary quiet tape vs consensus traps (peer FOMO > thesis)
2. **Conviction clocks** — FOMO index vs patience-α with act / race / patience / cool-off counsel
3. **Partner twin** — judgment DNA from override ledger predicting lean-in / push-back / hard-pass
4. **Reference-call factory** — copyable scripts from weak score dims + bear landmines (never auto-send)
5. **Thesis what-if** — live reweight of scoring dims → who enters/exits Deep Dive
6. **Pass autopsy** — Passes with peer/Tier-1 tension worth reopening before they become miss retros
7. **Velocity board** — accelerating names (fresh signal × hiring × commentary)
8. **Pre-mortem theater** — “assume we invested and lost” failure modes for IC

Surfaces: `/edge` · chat (“partner edge”, “conviction clock”, “reference call”, “pre-mortem”)

## Signal Atlas (competitive OS — Harmonic / Affinity / Bessemer / Meridia)

Closes the partner-demo gaps vs market-map and relationship tools, without becoming a CRM:

1. **NL market map** — Harmonic Scout–style “map AI infra with hiring velocity…” → visual landscape + ranked shortlist + white space
2. **Warm paths** — Affinity Ascend–style ranked intro hops + draft ask (simulated firm graph until Affinity writeback; never auto-send)
3. **Portfolio pulse** — Meridia / VCOS board-prep stream on the active book (runway, hiring, competitive, commentary)
4. **Growth bands** — Bessemer Atlas–style stage YoY floors / medians / tops with posture counsel
5. **Talent graph** — operator prior → newco / stealth orbit heat
6. **Raise windows** — open_now / 30–60d / oversubscribed timing from runway + round age + peer heat
7. **Ownership desk** — live check size → ownership % vs target (blanks stay blank)

Surfaces: `/atlas` · chat (“market map”, “warm path”, “growth bands”, “raise window”, “atlas”)

## Sector Scanner

**Knows the sector of tomorrow** — tracks capital, talent, and founder attention; surfaces emerging sub-sectors before consensus from GP commentary, frontier-lab hiring, founder migration, fund formation, and research / OSS velocity. Answers “three AI infra sub-sectors nobody is talking about” and ranks best companies inside them.

Also: on-demand thesis language → ranked emerging companies; proactive momentum; contrarian calls. Classic Sector of Tomorrow board retained as a tab.

Surfaces: `/sectors` · chat (“sector of tomorrow”, “nobody is talking about”)

## Sector of Tomorrow

Contrarian + emerging subsectors with evidence (GP chatter, hiring, research velocity, fund formation). Chat filters to AI Infrastructure–parented calls for *“three AI infra sub-sectors nobody is talking about.”*

## YC-pattern desks (Bookface / Demo Day / Launch YC)

Useful YC tools adapted for thesis-driven investors (not a founder social network):

| YC tool | Signal surface | What partners get |
|---------|----------------|-------------------|
| Startup Directory | `/directory` | Faceted browse (cycle/theme/stage/status/hiring) + CSV + Like |
| Demo Day + Investor Day | `/interest` | Like → stack-rank → mutual meeting match schedule |
| Launch YC | `/launch` | Newco / founder-radar / launch-traction feed |
| Continuous sourcing | `/source` | Deal Sourcing & Discovery — funding · hiring · product · founder · customer; early-first; multi-source; Claude agent |
| Bookface search | `/find` | Typed omnisearch across corpora + CSV export |
| Ask YC Agent | `/chat` + ⌘K | Answers with **Searched** grounding trails |
| Startup Library | `/library?tab=playbooks` | Partner operating playbooks |

Skipped on purpose: founder forums, Work at a Startup hiring, SaaS deals directory, authenticated Bookface scrape.

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
