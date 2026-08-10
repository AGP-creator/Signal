# Signal — Phase 2 Roadmap

## Now (MVP)
Judgment layer, Excel OS, digest/alerts, grounded chat, seed + EDGAR/HN/RSS/arXiv proof of ingest, **live discovery** that can add Watch skeletons from thesis-matching signals, partner Library UI (news / commentary / watch / stale).

Full brief mapping: [`COVERAGE.md`](COVERAGE.md).

## Next (30–60 days)
| Connector | Purpose |
|-----------|---------|
| Crunchbase / Harmonic / Dealroom | Structured rounds, investors, descriptions |
| PitchBook | Institutional coverage + comps |
| Coresignal | Headcount / hiring velocity |
| X / Reddit vendor APIs | Live investor & operator commentary |
| SharePoint / OneDrive | Live shared workbook |
| SendGrid / SES | Production M/W/F + alerts |
| Form D × ~11.5k firm cross-ref | New fund announcement detection |

## Later
- Affinity / Attio writeback
- Continuous workers (not batch refresh)
- Podcast transcript ingestion
- Formal IC brief PDF export
- GitHub stars / commit velocity adapter
- SSO + audit log for multi-partner funds

## Non-goals
Authenticated scraping of Blind / LinkedIn / X timelines without vendor APIs.
