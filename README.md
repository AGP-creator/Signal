# Signal

Thirdbase deal intelligence OS — Next.js partner UI + Python pipeline + Supabase.

## Quick start (UI)

```powershell
cd "E:\535 west\web"
npm install
npm run dev
```

Open http://localhost:3000 (or the next free port if 3000 is taken — check the terminal).

Copy `.env` → `web/.env.local` (already done if you followed setup). Needs:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (server)
- `GEMINI_API_KEY` (recommended) — Google AI Studio key; powers `/search` + chat scout briefs for **new** companies only. Cheap defaults: `gemini-flash-lite-latest`, 15 calls/day, 512 max output tokens, 24h disk cache. Pipeline names never call Gemini.
- `ANTHROPIC_API_KEY` (optional) — only used if Gemini is unset. Without either key, research uses free Wikipedia / DuckDuckGo / HN heuristics.

## Pipeline refresh

```powershell
cd "E:\535 west"
.\.venv\Scripts\activate
python scripts\refresh.py
```

Or use **Refresh pipeline** in the Next.js header (spawns the Python refresh).

## M/W/F email digest

Hard-capped partner email: 3–5 deals, 1–2 sector calls, 3–5 reads, notable Tier-1 peer moves — each with a workbook/brief link.

```powershell
# Generate Mon / Wed / Fri sample emails (.html + .eml under data/output/digest_samples/)
python scripts\send_digest_samples.py

# Or via scheduler
python scripts\scheduler.py --samples

# Production loop (Mon/Wed/Fri morning UTC window)
python scripts\scheduler.py --loop
```

Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, and `DIGEST_TO` in `.env` to deliver to inboxes. Without SMTP, open the `.eml` files in Outlook. UI: `/digest` → **Send sample M/W/F emails**.

## Stack

| Layer | Tech |
|-------|------|
| Partner OS UI | Next.js 15, Tailwind 4, Framer Motion |
| Data | Supabase Postgres |
| Scoring / ingest / Excel | Python (`scripts/refresh.py`) |

## Pages (Monday path)

- `/` Desk — Hot Deals, 60/40 mix, Monday agenda CTA, Excel download, Show a Pass
- `/meeting` Partner Meeting OS — auto Monday agenda (~90m)
- `/workbook` Living deal-pipeline workbook (tabs + Excel download)
- `/pipeline` Filterable scored table (`?rec=Pass` for selectivity beat)
- `/search` Research — pipeline IC briefs; external = scout (Watch-capped, not IC-ready banner)
- `/chat` + ⌘K — grounded answers or refuse
- `/digest` M/W/F email preview
- `/company/[id]` Full IC brief + Diligence Stress Pack + financials
- `/library` News · Commentary · Watchlist · Stale (Keep / Archive / Refresh)
- `/deals` · `/source` · `/work` · `/os` · `/ic` · `/judgment` · `/compare` · `/gp` — supporting desks
- `/competitors` · `/peers` · `/firms` — firm list, Competitor OS, watchlist tracker
- `/directory` · `/launch` · `/find` · `/interest` — browse, launches, omnisearch, Demo Day match
- `/lp` · `/atlas` · `/edge` — LP narrative & Labs (More → Labs)

Diligence Stress Pack ships on company pages. Landscape: [docs/AGENTIC_VC_LANDSCAPE.md](docs/AGENTIC_VC_LANDSCAPE.md)

## Docs

- [**Feature guide (partner explanation call)**](docs/FEATURE_GUIDE.md) — every module, use, talking points, 12-min flow
- [Coverage matrix](docs/COVERAGE.md) — brief requirements → what ships
- [Partner conviction brief](docs/PARTNER_CONVICTION_BRIEF.md) — how to win the role vs other candidates (GP/LP narrative)
- [CTO consultation brief](docs/CTO_CONSULTATION_BRIEF.md) — board-ready decisions (budget, stack, models, sell vs internal)
- [Agentic VC landscape](docs/AGENTIC_VC_LANDSCAPE.md) — competitor agent features + use cases
- [Product](docs/PRODUCT.md)
- [Demo script](docs/DEMO_SCRIPT.md)
- [Roadmap](docs/ROADMAP.md)

Repo: https://github.com/AGP-creator/Signal
