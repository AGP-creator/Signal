from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from supabase import Client, create_client

ROOT = Path(__file__).resolve().parents[2]


def load_env() -> None:
    # Prefer .env; fall back to env.txt for this project
    load_dotenv(ROOT / ".env")
    load_dotenv(ROOT / "env.txt")


@lru_cache(maxsize=1)
def get_supabase(use_secret: bool = True) -> Client:
    load_env()
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    secret = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    publishable = (
        os.getenv("SUPABASE_PUBLISHABLE_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
    )
    key = secret if use_secret and secret else publishable
    if not url or not key:
        raise RuntimeError(
            "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env"
        )
    return create_client(url, key)


def healthcheck() -> dict[str, Any]:
    client = get_supabase(True)
    try:
        client.table("companies").select("id").limit(1).execute()
        return {"ok": True, "tables": True}
    except Exception as exc:
        msg = str(exc)
        if "PGRST205" in msg or "Could not find the table" in msg:
            return {"ok": False, "tables": False, "error": "Schema not applied yet", "detail": msg}
        return {"ok": False, "tables": False, "error": msg}


# --- meta ---
def set_meta(key: str, value: str) -> None:
    get_supabase().table("meta").upsert({"key": key, "value": value}).execute()


def get_meta(key: str, default: str = "") -> str:
    res = get_supabase().table("meta").select("value").eq("key", key).limit(1).execute()
    if res.data:
        return res.data[0]["value"]
    return default


# --- companies ---
def company_to_row(c: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": c["id"],
        "slug": c.get("slug") or c["id"],
        "name": c["name"],
        "domain": c.get("domain"),
        "one_liner": c.get("one_liner"),
        "sector_theme": c.get("sector_theme"),
        "theme_id": c.get("theme_id"),
        "subsector": c.get("subsector"),
        "stage": c.get("stage"),
        "pipeline_bucket": c.get("pipeline_bucket"),
        "last_round_size_m": c.get("last_round_size_m"),
        "last_round_date": c.get("last_round_date"),
        "valuation_est_m": c.get("valuation_est_m"),
        "valuation_confidence": c.get("valuation_confidence"),
        "lead_investor": c.get("lead_investor"),
        "investors": c.get("investors") or [],
        "tier1_count": c.get("tier1_count") or 0,
        "tier1_names": c.get("tier1_names") or [],
        "tier2_count": c.get("tier2_count") or 0,
        "headcount": c.get("headcount"),
        "headcount_6m_growth_pct": c.get("headcount_6m_growth_pct"),
        "yoy_growth_pct": c.get("yoy_growth_pct"),
        "runway_months_est": c.get("runway_months_est"),
        "tam_usd_b": c.get("tam_usd_b"),
        "moat_notes": c.get("moat_notes"),
        "team_notes": c.get("team_notes"),
        "traction_notes": c.get("traction_notes"),
        "last_signal_date": c.get("last_signal_date"),
        "sources": c.get("sources") or [],
        "is_stale": bool(c.get("is_stale")),
        "review_status": c.get("review_status"),
        "thesis_score": c.get("thesis_score"),
        "score_breakdown": c.get("score_breakdown") or {},
        "relative_rank": c.get("relative_rank"),
        "recommendation": c.get("recommendation"),
        "why_now": c.get("why_now"),
        "commentary_summary": c.get("commentary_summary"),
        "brief_id": c.get("brief_id"),
        "payload": c,
    }


def row_to_company(row: dict[str, Any]) -> dict[str, Any]:
    payload = row.get("payload") or {}
    if isinstance(payload, dict) and payload.get("id"):
        # prefer flattened columns for freshness
        merged = {**payload, **{k: v for k, v in row.items() if k != "payload" and v is not None}}
        return merged
    return {k: v for k, v in row.items() if k not in ("created_at", "updated_at")}


def upsert_companies(companies: list[dict[str, Any]]) -> None:
    client = get_supabase()
    rows = [company_to_row(c) for c in companies]
    # chunk to avoid payload limits
    for i in range(0, len(rows), 50):
        client.table("companies").upsert(rows[i : i + 50]).execute()


def load_all_companies() -> list[dict[str, Any]]:
    res = (
        get_supabase()
        .table("companies")
        .select("*")
        .order("thesis_score", desc=True)
        .execute()
    )
    return [row_to_company(r) for r in (res.data or [])]


def find_company_by_name(name: str) -> Optional[dict[str, Any]]:
    needle = name.strip().lower()
    for c in load_all_companies():
        if c.get("name", "").lower() == needle or needle in c.get("name", "").lower():
            return c
        if c.get("slug", "").lower() == needle:
            return c
    return None


def clear_table(table: str) -> None:
    # delete all rows — use neq on a always-true filter workaround
    get_supabase().table(table).delete().neq("id", "__none__").execute()


def upsert_rows(table: str, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    client = get_supabase()
    for i in range(0, len(rows), 100):
        client.table(table).upsert(rows[i : i + 100]).execute()


def load_table(table: str) -> list[dict[str, Any]]:
    res = get_supabase().table(table).select("*").execute()
    return res.data or []


def replace_table(table: str, rows: list[dict[str, Any]]) -> None:
    clear_table(table)
    upsert_rows(table, rows)
