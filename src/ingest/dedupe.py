from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Optional


def normalize_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (name or "").lower())


def company_keys(company: dict[str, Any]) -> set[str]:
    keys = {normalize_name(company.get("name", "")), normalize_name(company.get("slug", ""))}
    if company.get("domain"):
        keys.add(normalize_name(company["domain"].split(".")[0]))
    return {k for k in keys if k}


def find_duplicate(existing: list[dict[str, Any]], incoming: dict[str, Any]) -> Optional[dict[str, Any]]:
    incoming_keys = company_keys(incoming)
    for c in existing:
        if company_keys(c) & incoming_keys:
            return c
    return None


def merge_company(base: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    """Merge non-null fields; keep richer investors; bump last_signal_date if newer."""
    out = {**base}
    for k, v in incoming.items():
        if v is None or v == "" or v == []:
            continue
        if k in ("id", "slug"):
            continue
        if k == "investors":
            merged = list(dict.fromkeys((out.get("investors") or []) + list(v)))
            out["investors"] = merged
        elif k == "sources":
            out["sources"] = list(dict.fromkeys((out.get("sources") or []) + list(v)))
        elif k == "last_signal_date":
            if not out.get("last_signal_date") or str(v) > str(out["last_signal_date"]):
                out["last_signal_date"] = v
        else:
            out[k] = v
    return out


def dedupe_companies(companies: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for c in companies:
        dup = find_duplicate(result, c)
        if dup:
            merged = merge_company(dup, c)
            # replace in list
            idx = result.index(dup)
            result[idx] = merged
        else:
            result.append(c)
    return result


def days_since(signal_date: str, as_of: Optional[date] = None) -> int:
    as_of = as_of or date(2026, 8, 9)
    try:
        d = datetime.strptime(signal_date[:10], "%Y-%m-%d").date()
        return (as_of - d).days
    except Exception:
        return 9999
