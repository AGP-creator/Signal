# Signal — Requirements Coverage Matrix

Maps the Thirdbase Deal Sourcing & Discovery brief to what Signal ships today.

| Area | Status | Where it lives |
|------|--------|----------------|
| Thesis scoring (60/40, Tier-1, 40%+ YoY, runway, TAM, moat, valuation, exit) | **Done** | `config/thesis_policy.yaml`, `src/scoring/` |
| Relative rank within theme × stage | **Done** | `apply_relative_ranks` |
| Articulate why (founder / market / investors / traction / valuation) | **Done** | `build_why_now`, company briefs |
| Sector of Tomorrow (+ contrarian) | **Done (seed + live evidence enrich)** | seed `sector_calls`, `/sectors`, chat filters |
| News Worth Reading (3–5 + Thirdbase why) | **Done** | digest + Excel + `/library?tab=news` + live RSS curation |
| Investor / operator commentary | **Done (seed; live X/Reddit/Blind = Phase 2)** | seed commentary + `/library?tab=commentary` |
| Continuous sourcing + dedupe | **MVP live** | EDGAR / HN / RSS / arXiv + `discovery.py` auto-add |
| Paid deal DBs (PitchBook, CB, Harmonic, Dealroom) | **Stubbed connectors** | `StubConnector` — plug API keys when licensed |
| Hiring (Coresignal / LinkedIn) | **Stubbed** | connector placeholder; headcount fields scored when present |
| Peer set + heatmap + thesis shifts | **Done** | `src/intelligence/peers.py`, `/peers` |
| Company IC briefs Pass/Watch/Deep Dive | **Done** | `/company/[id]`, `/search` |
| Self-maintaining pipeline (add/update/stale 90d, no auto-delete) | **Done** | refresh + `mark_stale` |
| Excel workbook (all brief tabs + Golden Insights) | **Done** | `src/excel/`, `data/output/Thirdbase_Deal_Pipeline.xlsx` |
| M/W/F email digest | **Done** | `src/digest/`, `scripts/scheduler.py` (SMTP for delivery) |
| Immediate alerts (2+ T1, off-thesis, watched founder) | **Done** | `evaluate_alerts` |
| Conversational partner interface | **Done** | `/chat`, ⌘K, Streamlit `app.py` |
| GP watchlist (brief people list) | **Done** | `config/watchlists.yaml` (73 handles) |
| VC peer firms (brief firm list) | **Done** | `config/watchlists.yaml` + `web/src/lib/peerFirms.ts` |
| Themes / topics | **Done** | 12 themes + subsectors in thesis policy |

## Honest boundary

Signal’s **judgment OS** (score, rank, Excel ritual, digest selectivity, peer drift, grounded chat) is production-shaped.  
**Coverage connectors** (paid databases, authenticated social, continuous hiring graphs) are stubs or thin public adapters by design — purchase orders, not product gaps in the attention layer.

## Interview line

> We built the judgment layer and partner workflow first. Databases plug in as connectors.
