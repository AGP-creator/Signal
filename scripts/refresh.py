from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.db.supabase_store import (
    get_meta,
    healthcheck,
    load_all_companies,
    replace_table,
    set_meta,
    upsert_companies,
)
from src.digest import build_digest, evaluate_alerts
from src.excel import build_workbook
from src.ingest import run_live_ingest
from src.ingest.dedupe import dedupe_companies
from src.scoring import load_thesis_policy, score_all

SEED_PATH = ROOT / "data" / "seed" / "seed_corpus.json"
OUT_DIR = ROOT / "data" / "output"


def load_seed() -> dict[str, Any]:
    if not SEED_PATH.exists():
        from scripts.generate_seed import main as gen

        gen()
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


def attach_commentary_summaries(companies: list[dict], commentary: list[dict]) -> None:
    by: dict[str, list[str]] = {}
    for cm in commentary:
        by.setdefault(cm.get("company_id"), []).append(cm.get("quote_or_summary") or "")
    for c in companies:
        bits = by.get(c["id"], [])
        c["commentary_summary"] = "; ".join(bits[:2]) if bits else c.get("commentary_summary")


def _signal_row(s: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": s["id"],
        "company_id": s.get("company_id"),
        "company_name": s.get("company_name"),
        "source": s.get("source"),
        "signal_type": s.get("signal_type"),
        "title": s.get("title"),
        "summary": s.get("summary"),
        "url": s.get("url"),
        "observed_at": s.get("observed_at"),
        "raw": s.get("raw") or {},
    }


def run_refresh(live: bool = True) -> dict[str, Any]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    hc = healthcheck()
    if not hc.get("tables"):
        return {
            "ok": False,
            "error": "Supabase schema not applied",
            "hint": "Open https://supabase.com/dashboard/project/ixnenoiggoijvawoykto/sql/new and run supabase/migrations/001_init.sql",
            "detail": hc.get("error"),
        }

    seed = load_seed()
    policy = load_thesis_policy()

    companies = list(seed.get("companies") or [])
    commentary = list(seed.get("commentary") or [])
    news = list(seed.get("news") or [])
    peer_activity = list(seed.get("peer_activity") or [])
    sector_calls = list(seed.get("sector_calls") or [])
    signals = list(seed.get("signals") or [])

    live_signals: list[dict] = []
    if live:
        live_signals = [s.to_dict() for s in run_live_ingest()]
        signals.extend(live_signals)
        for sig in live_signals:
            title = (sig.get("title") or "").lower()
            for c in companies:
                if c["name"].lower() in title:
                    c["last_signal_date"] = max(c.get("last_signal_date") or "", sig.get("observed_at") or "")
                    c["sources"] = list(dict.fromkeys((c.get("sources") or []) + [sig.get("source") or "live"]))

    companies = dedupe_companies(companies)
    scored = score_all(companies, policy)
    attach_commentary_summaries(scored, commentary)

    alerts = evaluate_alerts(scored, peer_activity)
    digest = build_digest(scored, sector_calls, news, peer_activity)

    # Persist to Supabase (source of truth)
    upsert_companies(scored)
    replace_table("commentary", commentary)
    replace_table("news", news)
    replace_table("peer_activity", peer_activity)
    replace_table(
        "sector_calls",
        [
            {
                **s,
                "evidence": s.get("evidence") or [],
                "top_companies": s.get("top_companies") or [],
            }
            for s in sector_calls
        ],
    )
    replace_table("signals", [_signal_row(s) for s in signals])
    replace_table("alerts", alerts)
    replace_table(
        "digests",
        [
            {
                "id": f"digest_{digest['generated_at']}",
                "subject": digest["subject"],
                "generated_at": digest["generated_at"],
                "markdown": digest["markdown"],
                "html": digest["html"],
                "payload": {
                    "deals": digest["deals"],
                    "sector_calls": digest["sector_calls"],
                    "news": digest["news"],
                    "peer_moves": digest["peer_moves"],
                },
            }
        ],
    )

    refreshed = datetime.now(timezone.utc).isoformat()
    set_meta("last_refreshed", refreshed)
    set_meta("provenance", json.dumps(seed.get("provenance") or {}))
    set_meta("live_signal_count", str(len(live_signals)))

    xlsx = build_workbook(
        scored,
        commentary,
        news,
        peer_activity,
        sector_calls,
        meta={
            "last_refreshed": refreshed,
            "provenance": (
                "Supabase-backed pipeline · seed corpus + live adapters "
                f"({len(live_signals)} signals): EDGAR, HN, RSS."
            ),
        },
        out_path=OUT_DIR / "Thirdbase_Deal_Pipeline.xlsx",
    )

    digest_path = OUT_DIR / "digest_latest.md"
    from src.digest.emailer import send_email, write_digest_previews

    write_digest_previews(digest, OUT_DIR)
    mail_result = send_email(digest["subject"], digest["html"], digest["markdown"])
    (OUT_DIR / "alerts_latest.json").write_text(json.dumps(alerts, indent=2), encoding="utf-8")

    summary = {
        "ok": True,
        "backend": "supabase",
        "companies": len(scored),
        "deep_dive": sum(1 for c in scored if c.get("recommendation") == "Deep Dive"),
        "watch": sum(1 for c in scored if c.get("recommendation") == "Watch"),
        "pass": sum(1 for c in scored if c.get("recommendation") == "Pass"),
        "stale": sum(1 for c in scored if c.get("is_stale")),
        "live_signals": len(live_signals),
        "alerts": len(alerts),
        "xlsx": str(xlsx),
        "digest": str(digest_path),
        "email": mail_result,
        "last_refreshed": refreshed,
        "verify_count": len(load_all_companies()),
    }
    (OUT_DIR / "refresh_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Refresh Thirdbase Signal → Supabase + Excel")
    parser.add_argument("--offline", action="store_true", help="Skip live ingest adapters")
    args = parser.parse_args()
    summary = run_refresh(live=not args.offline)
    print(json.dumps(summary, indent=2))
    if not summary.get("ok"):
        sys.exit(2)


if __name__ == "__main__":
    main()
