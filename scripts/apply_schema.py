"""Apply Signal schema to Supabase.

Methods (first that works wins):
1. DATABASE_URL / SUPABASE_DB_URL — direct Postgres
2. SUPABASE_ACCESS_TOKEN — Management API SQL
3. Otherwise prints instructions (API keys alone cannot run DDL)
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
SQL_PATHS = [
    ROOT / "supabase" / "migrations" / "001_init.sql",
    ROOT / "supabase" / "migrations" / "002_peer_firms.sql",
    ROOT / "supabase" / "migrations" / "003_partner_reviews.sql",
    ROOT / "supabase" / "migrations" / "004_partner_watchlists.sql",
]
PROJECT_REF = "ixnenoiggoijvawoykto"


def apply_via_database_url(sql: str, db_url: str) -> None:
    import psycopg

    with psycopg.connect(db_url) as conn:
        conn.execute(sql)
        conn.commit()
    print("Schema applied via DATABASE_URL.")


def apply_via_management_api(sql: str, token: str) -> None:
    # Personal access token from https://supabase.com/dashboard/account/tokens
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
    r = httpx.post(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={"query": sql},
        timeout=120.0,
    )
    if r.status_code >= 400:
        raise RuntimeError(f"Management API {r.status_code}: {r.text[:500]}")
    print("Schema applied via SUPABASE_ACCESS_TOKEN (Management API).")


def main() -> int:
    load_dotenv(ROOT / ".env")
    load_dotenv(ROOT / "env.txt")
    sql = "\n\n".join(p.read_text(encoding="utf-8") for p in SQL_PATHS if p.exists())

    db_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    access = os.getenv("SUPABASE_ACCESS_TOKEN") or os.getenv("SUPABASE_PAT")

    if db_url:
        apply_via_database_url(sql, db_url)
        return 0
    if access:
        apply_via_management_api(sql, access)
        return 0

    print("Cannot auto-apply DDL with project publishable/secret keys alone.")
    print()
    print("Add ONE of these to .env / env.txt, then re-run this script:")
    print("  A) DATABASE_URL=postgresql://postgres.[ref]:[DB_PASSWORD]@aws-0-....pooler.supabase.com:6543/postgres")
    print("     (Settings -> Database -> Connection string -> URI)")
    print("  B) SUPABASE_ACCESS_TOKEN=sbp_...  (Account -> Access Tokens)")
    print()
    print("Or sign in at the open Supabase SQL Editor and tell me 'logged in' so I can paste and run the SQL.")
    print(f"SQL files: {', '.join(str(p) for p in SQL_PATHS)}")
    print(f"Editor: https://supabase.com/dashboard/project/{PROJECT_REF}/sql/new")
    return 2


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
