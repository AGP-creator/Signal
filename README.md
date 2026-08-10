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
- `/pipeline` Filterable scored table
- `/company/[id]` Full IC-style brief
- `/sectors` Sector of Tomorrow
- `/peers` Activity + co-investor heatmap
- `/digest` M/W/F email preview
- `/chat` + ⌘K command palette

## Docs

- [Product](docs/PRODUCT.md)
- [Demo script](docs/DEMO_SCRIPT.md)
- [Roadmap](docs/ROADMAP.md)

Repo: https://github.com/AGP-creator/Signal
