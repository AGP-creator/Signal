# Signal

Thirdbase deal intelligence OS — Next.js partner UI + Python pipeline + Supabase.

## Quick start (UI)

```powershell
cd "E:\535 west\web"
npm install
npm run dev
```

Open http://localhost:3000

Copy `.env` → `web/.env.local` (already done if you followed setup). Needs:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (server)

## Pipeline refresh

```powershell
cd "E:\535 west"
.\.venv\Scripts\activate
python scripts\refresh.py
```

Or use **Refresh pipeline** in the Next.js header (spawns the Python refresh).

## Stack

| Layer | Tech |
|-------|------|
| Partner OS UI | Next.js 15, Tailwind 4, Framer Motion |
| Data | Supabase Postgres |
| Scoring / ingest / Excel | Python (`scripts/refresh.py`) |

## Pages

- `/` Command center — Hot Deals, mix, alerts, sectors, news
- `/meeting` Partner Meeting OS — auto Monday agenda (~90m)
- `/search` Company research agent — type any name for a full IC brief
- `/pipeline` Filterable scored table
- `/company/[id]` Full IC-style brief (+ comps + Diligence Stress Pack + IC trail + IC packet)
- `/ic` IC Decision Trail — stages, DD checklist, votes, Pass spine
- `/sectors` Sector of Tomorrow
- `/peers` Competitor intelligence — firm radar, matrix, heatmap, activity
- `/peers/[slug]` Peer firm dossier
- `/lp` LP Process Desk — AI-in-process narrative LPs can diligence
- `/library` News · Commentary · Watchlist · Stale (Excel tabs as UI)
- `/judgment` Judgment OS — override ledger, miss retros, founder radar, freshness SLA, mix drift, digest A/B
- `/digest` M/W/F email preview
- `/chat` + ⌘K command palette

Diligence Stress Pack (bear case, deck flags, work orders, meeting prep) ships on company pages and research briefs. Landscape: [docs/AGENTIC_VC_LANDSCAPE.md](docs/AGENTIC_VC_LANDSCAPE.md)

## Docs

- [Coverage matrix](docs/COVERAGE.md) — brief requirements → what ships
- [Partner conviction brief](docs/PARTNER_CONVICTION_BRIEF.md) — how to win the role vs other candidates (GP/LP narrative)
- [CTO consultation brief](docs/CTO_CONSULTATION_BRIEF.md) — board-ready decisions (budget, stack, models, sell vs internal)
- [Agentic VC landscape](docs/AGENTIC_VC_LANDSCAPE.md) — competitor agent features + use cases
- [Product](docs/PRODUCT.md)
- [Demo script](docs/DEMO_SCRIPT.md)
- [Roadmap](docs/ROADMAP.md)

Repo: https://github.com/AGP-creator/Signal
