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
2. **Email digest** — Mon / Wed / Fri, hard-capped selectivity
3. **Immediate alerts** — 2+ Tier-1, off-thesis peer moves, watched founders
4. **Conversational agent** — partner-grade Q&A over the same store

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

Pipeline · Hot Deals · Watchlist · Sector of Tomorrow · Peer Set Activity · Co-investor Heatmap · News Worth Reading · Investor Commentary · Stale

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
