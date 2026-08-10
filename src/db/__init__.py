from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Iterable, Optional

ROOT = Path(__file__).resolve().parents[2]
DB_PATH = ROOT / "data" / "output" / "deal_os.db"


def get_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    path = Path(db_path) if db_path else DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    domain TEXT,
    payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS signals (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    source TEXT,
    signal_type TEXT,
    observed_at TEXT,
    payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commentary (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS news (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS peer_activity (
    id TEXT PRIMARY KEY,
    firm TEXT,
    company_id TEXT,
    payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sector_calls (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    created_at TEXT,
    payload TEXT NOT NULL
);
"""


def init_db(conn: Optional[sqlite3.Connection] = None) -> sqlite3.Connection:
    own = conn is None
    conn = conn or get_connection()
    conn.executescript(SCHEMA)
    conn.commit()
    if own:
        return conn
    return conn


def set_meta(conn: sqlite3.Connection, key: str, value: str) -> None:
    conn.execute(
        "INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, value),
    )


def get_meta(conn: sqlite3.Connection, key: str, default: str = "") -> str:
    row = conn.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
    return row["value"] if row else default


def upsert_company(conn: sqlite3.Connection, company: dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO companies(id, slug, name, domain, payload)
        VALUES(?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            slug=excluded.slug,
            name=excluded.name,
            domain=excluded.domain,
            payload=excluded.payload
        """,
        (
            company["id"],
            company["slug"],
            company["name"],
            company.get("domain"),
            json.dumps(company),
        ),
    )


def upsert_json_row(
    conn: sqlite3.Connection,
    table: str,
    row_id: str,
    payload: dict[str, Any],
    extra: Optional[dict[str, Any]] = None,
) -> None:
    extra = extra or {}
    if table == "signals":
        conn.execute(
            """
            INSERT INTO signals(id, company_id, source, signal_type, observed_at, payload)
            VALUES(?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,
                company_id=excluded.company_id, source=excluded.source,
                signal_type=excluded.signal_type, observed_at=excluded.observed_at
            """,
            (
                row_id,
                extra.get("company_id") or payload.get("company_id"),
                extra.get("source") or payload.get("source"),
                extra.get("signal_type") or payload.get("signal_type"),
                extra.get("observed_at") or payload.get("observed_at"),
                json.dumps(payload),
            ),
        )
    elif table == "commentary":
        conn.execute(
            """
            INSERT INTO commentary(id, company_id, payload) VALUES(?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, company_id=excluded.company_id
            """,
            (row_id, payload.get("company_id"), json.dumps(payload)),
        )
    elif table == "news":
        conn.execute(
            """
            INSERT INTO news(id, payload) VALUES(?, ?)
            ON CONFLICT(id) DO UPDATE SET payload=excluded.payload
            """,
            (row_id, json.dumps(payload)),
        )
    elif table == "peer_activity":
        conn.execute(
            """
            INSERT INTO peer_activity(id, firm, company_id, payload) VALUES(?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, firm=excluded.firm, company_id=excluded.company_id
            """,
            (row_id, payload.get("firm"), payload.get("company_id"), json.dumps(payload)),
        )
    elif table == "sector_calls":
        conn.execute(
            """
            INSERT INTO sector_calls(id, payload) VALUES(?, ?)
            ON CONFLICT(id) DO UPDATE SET payload=excluded.payload
            """,
            (row_id, json.dumps(payload)),
        )
    elif table == "alerts":
        conn.execute(
            """
            INSERT INTO alerts(id, created_at, payload) VALUES(?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, created_at=excluded.created_at
            """,
            (row_id, payload.get("created_at"), json.dumps(payload)),
        )
    else:
        raise ValueError(f"Unknown table {table}")


def load_all_companies(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute("SELECT payload FROM companies ORDER BY name").fetchall()
    return [json.loads(r["payload"]) for r in rows]


def load_table(conn: sqlite3.Connection, table: str) -> list[dict[str, Any]]:
    rows = conn.execute(f"SELECT payload FROM {table}").fetchall()
    return [json.loads(r["payload"]) for r in rows]


def find_company_by_name(conn: sqlite3.Connection, name: str) -> Optional[dict[str, Any]]:
    needle = name.strip().lower()
    for c in load_all_companies(conn):
        if c["name"].lower() == needle or c.get("slug", "").lower() == needle:
            return c
        if needle in c["name"].lower():
            return c
    return None


def clear_all(conn: sqlite3.Connection) -> None:
    for t in ("companies", "signals", "commentary", "news", "peer_activity", "sector_calls", "alerts", "meta"):
        conn.execute(f"DELETE FROM {t}")
    conn.commit()
