"""Regenerate Thirdbase_Deal_Pipeline.xlsx without a full live ingest.

Uses Supabase when available; otherwise seed corpus + cached output JSON.
Faster than `scripts/refresh.py` when partners only need a fresh workbook.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.digest import build_digest, evaluate_alerts
from src.excel import build_workbook
from src.intelligence import build_peer_intelligence
from src.intelligence.golden import build_golden_insights
from src.intelligence.judgment import build_judgment_pack
from src.pipeline import is_archived
from src.scoring import load_thesis_policy, score_all

SEED_PATH = ROOT / "data" / "seed" / "seed_corpus.json"
OUT_DIR = ROOT / "data" / "output"
XLSX_PATH = OUT_DIR / "Thirdbase_Deal_Pipeline.xlsx"


def _load_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _load_seed() -> dict[str, Any]:
    if not SEED_PATH.exists():
        from scripts.generate_seed import main as gen

        gen()
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


def _from_supabase() -> dict[str, Any] | None:
    try:
        from src.db.supabase_store import healthcheck, load_all_companies, load_table, get_meta
    except Exception:
        return None

    hc = healthcheck()
    if not hc.get("tables"):
        return None

    companies = [c for c in load_all_companies() if not is_archived(c)]
    if not companies:
        return None

    return {
        "companies": companies,
        "commentary": load_table("commentary"),
        "news": load_table("news"),
        "peer_activity": load_table("peer_activity"),
        "sector_calls": load_table("sector_calls"),
        "alerts": load_table("alerts") or _load_json(OUT_DIR / "alerts_latest.json", []),
        "last_refreshed": get_meta("last_refreshed")
        or datetime.now(timezone.utc).isoformat(),
        "source": "supabase",
    }


def _from_seed_and_cache() -> dict[str, Any]:
    seed = _load_seed()
    policy = load_thesis_policy()
    companies = score_all(list(seed.get("companies") or []), policy)
    companies = [c for c in companies if not is_archived(c)]
    return {
        "companies": companies,
        "commentary": list(seed.get("commentary") or []),
        "news": list(seed.get("news") or []),
        "peer_activity": list(seed.get("peer_activity") or []),
        "sector_calls": list(seed.get("sector_calls") or []),
        "alerts": _load_json(OUT_DIR / "alerts_latest.json", []),
        "last_refreshed": datetime.now(timezone.utc).isoformat(),
        "source": "seed",
    }


def export_workbook(*, prefer_db: bool = True) -> dict[str, Any]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    pack = _from_supabase() if prefer_db else None
    if not pack:
        pack = _from_seed_and_cache()

    companies = pack["companies"]
    commentary = pack["commentary"]
    news = pack["news"]
    peer_activity = pack["peer_activity"]
    sector_calls = pack["sector_calls"]

    # Prefer live alert eval when we have scored companies
    alerts = pack.get("alerts") or []
    if companies and (not alerts or pack.get("source") == "seed"):
        try:
            alerts = evaluate_alerts(companies, peer_activity, commentary)
        except Exception:
            pass

    peer_intel = build_peer_intelligence(companies, peer_activity)
    golden = build_golden_insights(companies, peer_intel)
    judgment = build_judgment_pack(companies, peer_activity, commentary, news, alerts)

    # Cached peer intel (richer dossiers) if present
    cached_intel = _load_json(OUT_DIR / "peer_intelligence.json", {}) or {}
    peer_firms = cached_intel.get("firms") or peer_intel.get("firms") or []
    heatmap = cached_intel.get("heatmap") or peer_intel.get("heatmap") or []
    peer_matrix = cached_intel.get("matrix") or peer_intel.get("matrix") or {}
    thesis_shifts = cached_intel.get("thesis_shifts") or peer_intel.get("thesis_shifts") or []

    cached_golden = _load_json(OUT_DIR / "golden_insights.json", {}) or {}
    if cached_golden.get("insights"):
        golden = cached_golden

    cached_judgment = _load_json(OUT_DIR / "judgment_pack.json", {}) or {}
    if cached_judgment:
        judgment = cached_judgment

    app_base = os.environ.get("SIGNAL_APP_BASE", "http://localhost:3000")
    digest = build_digest(
        companies,
        sector_calls,
        news,
        peer_activity,
        app_base=app_base,
    )

    xlsx = build_workbook(
        companies,
        commentary,
        news,
        peer_activity,
        sector_calls,
        meta={
            "last_refreshed": pack.get("last_refreshed"),
            "provenance": f"export_workbook · source={pack.get('source')}",
            "app_base": app_base,
            "peer_firms": peer_firms,
            "peer_matrix": peer_matrix,
            "heatmap": heatmap,
            "golden_insights": golden.get("insights") or [],
            "golden_brief": golden.get("brief") or {},
            "judgment": judgment,
            "alerts": alerts,
            "digest": digest,
            "thesis_shifts": thesis_shifts,
        },
        out_path=XLSX_PATH,
    )

    summary = {
        "ok": True,
        "source": pack.get("source"),
        "companies": len(companies),
        "alerts": len(alerts),
        "digest_deals": len(digest.get("deals") or []),
        "xlsx": str(xlsx),
        "bytes": xlsx.stat().st_size if xlsx.exists() else 0,
        "last_refreshed": pack.get("last_refreshed"),
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }
    (OUT_DIR / "workbook_export.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )
    return summary


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Export Signal workbook (Excel only)")
    parser.add_argument(
        "--seed-only",
        action="store_true",
        help="Skip Supabase; build from seed + cached JSON",
    )
    args = parser.parse_args()
    summary = export_workbook(prefer_db=not args.seed_only)
    print(json.dumps(summary, indent=2))
    if not summary.get("ok"):
        sys.exit(2)


if __name__ == "__main__":
    main()
