# Signal — Thirdbase Deal Sourcing Agent

Self-maintaining deal intelligence OS: thesis scoring, Supabase pipeline store, living Excel workbook, M/W/F digests, alerts, and partner chat.

## Setup

```powershell
cd "E:\535 west"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` (never commit):

```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

### One-time schema

1. Open [SQL Editor](https://supabase.com/dashboard/project/ixnenoiggoijvawoykto/sql/new)
2. Paste [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)
3. Run

Optional: set `DATABASE_URL` and `python scripts/apply_schema.py`.

### Refresh + demo

```powershell
python scripts\generate_seed.py
python scripts\refresh.py
streamlit run app.py
```

Optional: `ANTHROPIC_API_KEY` for Claude chat (offline grounded mode works without it).

## Architecture

- **Supabase** — source of truth (companies, signals, commentary, news, peers, sectors, alerts, digests)
- **Scoring** — Thirdbase thesis weights in `config/thesis_policy.yaml`
- **Excel** — regenerated partner workbook on each refresh
- **Ingest** — EDGAR Form D, Hacker News, RSS (+ Phase-2 connector stubs)
- **Agent** — grounded Q&A over the live pipeline

## Docs

- [Product](docs/PRODUCT.md)
- [Demo script](docs/DEMO_SCRIPT.md)
- [Roadmap](docs/ROADMAP.md)
