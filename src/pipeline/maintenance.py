"""Self-maintaining pipeline helpers.

Keeps the deal list alive across refreshes:
- Union seed + Supabase companies (live discoveries survive)
- Partner Keep / Archive / Refresh decisions survive re-scoring
- Never silent-delete — archive is a partner Pass, not a DB wipe
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional

from src.ingest.dedupe import find_duplicate

PARTNER_PENDING = "Pending Partner Review"
PARTNER_KEEP = "Reviewed — keep"
PARTNER_ARCHIVE = "Archived (partner)"
PARTNER_REFRESH = "Refresh requested"

# Fields partners / live signals own — prefer DB over seed when present
_LIVE_OWNED = {
    "last_signal_date",
    "last_round_size_m",
    "last_round_date",
    "stage",
    "headcount",
    "headcount_6m_growth_pct",
    "lead_investor",
    "investors",
    "sources",
    "traction_notes",
    "commentary_summary",
    "discovery_origin",
    "update_events",
    "review_status",
    "partner_decision",
    "partner_reviewed_at",
    "partner_reviewed_by",
    "partner_note",
    "refresh_requested_at",
}

# Seed-curated narrative — prefer seed when both exist
_SEED_OWNED = {
    "one_liner",
    "moat_notes",
    "team_notes",
    "tam_usd_b",
    "valuation_est_m",
    "valuation_confidence",
    "yoy_growth_pct",
    "runway_months_est",
    "sector_theme",
    "theme_id",
    "subsector",
    "pipeline_bucket",
}


def is_archived(company: dict[str, Any]) -> bool:
    status = (company.get("review_status") or "").lower()
    decision = (company.get("partner_decision") or "").lower()
    return decision == "archive" or "archived" in status


def _newer_date(a: Any, b: Any) -> Any:
    sa, sb = (str(a)[:10] if a else ""), (str(b)[:10] if b else "")
    if not sa:
        return b
    if not sb:
        return a
    return a if sa >= sb else b


def merge_pipeline_entry(seed: dict[str, Any], db: dict[str, Any]) -> dict[str, Any]:
    """Merge one seed row with its DB twin. Live + partner fields win; seed narrative fills gaps."""
    out = {**seed}
    for k, v in db.items():
        if v is None or v == "" or v == []:
            continue
        if k in ("id",):
            # Keep stable id — prefer seed id when both match by name
            continue
        if k == "slug" and out.get("slug"):
            continue
        if k in _LIVE_OWNED:
            if k == "last_signal_date":
                out[k] = _newer_date(out.get(k), v)
            elif k == "investors":
                out[k] = list(dict.fromkeys((out.get("investors") or []) + list(v)))
            elif k == "sources":
                out[k] = list(dict.fromkeys((out.get("sources") or []) + list(v)))
            elif k == "update_events":
                prev = list(out.get("update_events") or [])
                for ev in v if isinstance(v, list) else []:
                    if ev not in prev:
                        prev.append(ev)
                out[k] = prev[-20:]
            else:
                out[k] = v
        elif k in _SEED_OWNED:
            if not out.get(k):
                out[k] = v
        else:
            # Scores etc. — take DB if seed lacks; refresh will recompute
            if out.get(k) in (None, "", [], {}):
                out[k] = v
    return out


def merge_pipeline_companies(
    seed_companies: list[dict[str, Any]],
    db_companies: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Union seed + DB. Live-discovered rows with no seed twin are kept."""
    out: list[dict[str, Any]] = [dict(c) for c in seed_companies]
    for row in db_companies:
        dup = find_duplicate(out, row)
        if dup:
            idx = out.index(dup)
            out[idx] = merge_pipeline_entry(dup, row)
        else:
            out.append(dict(row))
    return out


def merge_record_lists(
    seed_rows: list[dict[str, Any]],
    db_rows: list[dict[str, Any]],
    id_key: str = "id",
) -> list[dict[str, Any]]:
    """Union by id — seed first, then DB-only rows (e.g. live commentary)."""
    by_id: dict[str, dict[str, Any]] = {}
    for row in seed_rows:
        rid = row.get(id_key)
        if rid:
            by_id[str(rid)] = dict(row)
    for row in db_rows:
        rid = row.get(id_key)
        if not rid:
            continue
        rid = str(rid)
        if rid not in by_id:
            by_id[rid] = dict(row)
    return list(by_id.values())


def apply_partner_reviews(
    companies: list[dict[str, Any]],
    reviews: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    """Apply durable partner decisions. Never deletes rows."""
    if not reviews:
        return companies
    out: list[dict[str, Any]] = []
    for c in companies:
        r = reviews.get(c.get("id") or "") or reviews.get(c.get("slug") or "")
        if not r:
            out.append(c)
            continue
        decision = (r.get("decision") or "").lower()
        row = {**c}
        row["partner_decision"] = decision
        row["partner_reviewed_at"] = r.get("reviewed_at")
        row["partner_reviewed_by"] = r.get("reviewed_by") or "Partner"
        row["partner_note"] = r.get("note")
        if decision == "keep":
            row["is_stale"] = False
            row["review_status"] = PARTNER_KEEP
        elif decision == "archive":
            row["is_stale"] = False
            row["review_status"] = PARTNER_ARCHIVE
            row["recommendation"] = "Pass"
        elif decision == "refresh":
            row["is_stale"] = True
            row["review_status"] = PARTNER_REFRESH
            row["refresh_requested_at"] = r.get("reviewed_at") or datetime.now(timezone.utc).isoformat()
        out.append(row)
    return out


def load_partner_reviews() -> dict[str, dict[str, Any]]:
    """Load partner reviews from table, falling back to meta JSON."""
    from src.db.supabase_store import get_meta, load_table

    reviews: dict[str, dict[str, Any]] = {}
    try:
        for row in load_table("partner_reviews"):
            cid = row.get("company_id")
            if cid:
                reviews[str(cid)] = {
                    "company_id": cid,
                    "decision": row.get("decision"),
                    "note": row.get("note"),
                    "reviewed_by": row.get("reviewed_by") or "Partner",
                    "reviewed_at": row.get("reviewed_at"),
                }
    except Exception:
        pass
    if reviews:
        return reviews
    try:
        raw = get_meta("partner_stale_reviews", "{}")
        parsed = json.loads(raw or "{}")
        if isinstance(parsed, dict):
            return {str(k): v for k, v in parsed.items() if isinstance(v, dict)}
    except Exception:
        pass
    return {}


def save_partner_reviews(reviews: dict[str, dict[str, Any]]) -> None:
    """Persist partner reviews to meta (always) and partner_reviews table when available."""
    from src.db.supabase_store import set_meta, upsert_rows

    set_meta("partner_stale_reviews", json.dumps(reviews))
    rows = []
    for cid, r in reviews.items():
        rows.append(
            {
                "company_id": r.get("company_id") or cid,
                "decision": r.get("decision"),
                "note": r.get("note"),
                "reviewed_by": r.get("reviewed_by") or "Partner",
                "reviewed_at": r.get("reviewed_at") or datetime.now(timezone.utc).isoformat(),
            }
        )
    try:
        if rows:
            upsert_rows("partner_reviews", rows)
    except Exception as exc:
        set_meta("partner_reviews_error", str(exc)[:500])


def upsert_partner_review(
    company_id: str,
    decision: str,
    *,
    note: Optional[str] = None,
    reviewed_by: str = "Partner",
) -> dict[str, Any]:
    reviews = load_partner_reviews()
    row = {
        "company_id": company_id,
        "decision": decision,
        "note": note,
        "reviewed_by": reviewed_by,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
    }
    reviews[company_id] = row
    save_partner_reviews(reviews)
    # Also stamp the company row so desks stay consistent before next full refresh
    try:
        from src.db.supabase_store import get_supabase

        patch: dict[str, Any] = {
            "review_status": (
                PARTNER_KEEP
                if decision == "keep"
                else PARTNER_ARCHIVE
                if decision == "archive"
                else PARTNER_REFRESH
            ),
            "is_stale": decision == "refresh",
        }
        if decision == "archive":
            patch["recommendation"] = "Pass"
        get_supabase().table("companies").update(patch).eq("id", company_id).execute()
    except Exception:
        pass
    return row
