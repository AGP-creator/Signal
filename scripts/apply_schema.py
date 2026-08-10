"""Apply Signal schema to Supabase.

Preferred: open SQL Editor and paste supabase/migrations/001_init.sql
  https://supabase.com/dashboard/project/ixnenoiggoijvawoykto/sql/new

Optional: set DATABASE_URL in .env for direct Postgres apply:
  postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@aws-0-....pooler.supabase.com:6543/postgres
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
SQL_PATH = ROOT / "supabase" / "migrations" / "001_init.sql"


def main() -> int:
    load_dotenv(ROOT / ".env")
    load_dotenv(ROOT / "env.txt")
    sql = SQL_PATH.read_text(encoding="utf-8")
    db_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")

    if not db_url:
        print("No DATABASE_URL set — cannot auto-apply DDL with API keys alone.")
        print()
        print("Do this once (60 seconds):")
        print("1. Open https://supabase.com/dashboard/project/ixnenoiggoijvawoykto/sql/new")
        print("2. Paste contents of supabase/migrations/001_init.sql")
        print("3. Click Run")
        print("4. Re-run: python scripts/refresh.py")
        print()
        print(f"SQL file: {SQL_PATH}")
        return 2

    try:
        import psycopg
    except ImportError:
        print("Install psycopg: pip install psycopg[binary]")
        return 1

    with psycopg.connect(db_url) as conn:
        conn.execute(sql)
        conn.commit()
    print("Schema applied via DATABASE_URL.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
