"""Discover working Supabase Postgres URL and apply schema."""
from __future__ import annotations

import os
import sys
from pathlib import Path
from urllib.parse import quote

import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / "env.txt")

pwd = quote(os.getenv("DB_PASSWORD") or "", safe="")
ref = "ixnenoiggoijvawoykto"
sql = (ROOT / "supabase" / "migrations" / "001_init.sql").read_text(encoding="utf-8")

candidates: list[str] = [
    f"postgresql://postgres:{pwd}@db.{ref}.supabase.co:5432/postgres?sslmode=require",
    f"postgresql://postgres:{pwd}@[2406:da14:18fe:3100:3599:37a6:9ca8:bbed]:5432/postgres?sslmode=require",
]

regions = [
    "ap-southeast-1",
    "ap-northeast-1",
    "ap-south-1",
    "ap-northeast-2",
    "us-east-1",
    "us-west-1",
    "us-east-2",
    "eu-west-1",
    "eu-central-1",
]
for region in regions:
    for port in (6543, 5432):
        for prefix in ("aws-0", "aws-1"):
            candidates.append(
                f"postgresql://postgres.{ref}:{pwd}@{prefix}-{region}.pooler.supabase.com:{port}/postgres?sslmode=require"
            )


def try_connect(url: str) -> bool:
    try:
        with psycopg.connect(url, connect_timeout=8) as conn:
            conn.execute("select 1")
        return True
    except Exception as exc:
        host = url.split("@")[-1].split("/")[0][:80]
        print(f"fail {host}: {type(exc).__name__}: {str(exc)[:140]}")
        return False


def main() -> int:
    if not pwd:
        print("No DB_PASSWORD")
        return 1
    working = None
    for url in candidates:
        host = url.split("@")[-1].split("/")[0][:80]
        print(f"try {host}")
        if try_connect(url):
            working = url
            print(f"SUCCESS {host}")
            break
    if not working:
        print("No connection string worked")
        return 2

    # Persist without printing password
    env_path = ROOT / ".env"
    text = env_path.read_text(encoding="utf-8")
    lines = [ln for ln in text.splitlines() if not ln.startswith("DATABASE_URL=")]
    lines.append(f"DATABASE_URL={working}")
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    with psycopg.connect(working, connect_timeout=30) as conn:
        conn.execute(sql)
        conn.commit()
        tables = conn.execute(
            "select tablename from pg_tables where schemaname='public' order by 1"
        ).fetchall()
        print("SCHEMA_OK tables:", [t[0] for t in tables])
    return 0


if __name__ == "__main__":
    sys.exit(main())
