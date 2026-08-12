"""Lightweight scheduler loop for M/W/F digest + anytime immediate alerts.

Usage:
  python scripts/scheduler.py --once
  python scripts/scheduler.py --loop          # M/W/F digest mornings + alert poll
  python scripts/scheduler.py --alerts-once   # evaluate + email new special-routing only
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.db.supabase_store import (
    get_meta,
    healthcheck,
    load_all_companies,
    load_table,
    set_meta,
)
from src.digest import build_digest, dispatch_immediate_alerts, evaluate_alerts
from src.digest.emailer import send_email, write_digest_previews
from scripts.refresh import run_refresh


def should_run_digest(now: datetime) -> bool:
    # Monday=0, Wednesday=2, Friday=4 — morning window 08:00–10:59 UTC for demo simplicity
    return now.weekday() in (0, 2, 4) and 8 <= now.hour <= 10


def _previously_emailed() -> set[str]:
    try:
        return set(json.loads(get_meta("alert_emails_sent", "[]") or "[]"))
    except Exception:
        return set()


def _persist_emailed(ids: list[str] | set[str]) -> None:
    set_meta("alert_emails_sent", json.dumps(sorted(set(ids))))


def run_immediate_alerts_job() -> dict:
    """Anytime path: evaluate special routing and email only *new* high alerts.

    Does not wait for M/W/F. Safe to call on every refresh or on a short poll.
    """
    companies = load_all_companies()
    peers = load_table("peer_activity")
    commentary = load_table("commentary")
    signals = load_table("signals")
    alerts = evaluate_alerts(
        companies,
        peers,
        commentary=commentary,
        signals=signals,
    )
    result = dispatch_immediate_alerts(
        alerts,
        previously_emailed=_previously_emailed(),
        out_dir=ROOT / "data" / "output" / "alerts",
    )
    _persist_emailed(result.get("emailed_ids") or [])
    set_meta(
        "last_immediate_alerts",
        json.dumps(
            {
                "at": datetime.now(timezone.utc).isoformat(),
                "pending": result.get("pending_count"),
                "sent_ids": result.get("sent_ids") or [],
                "immediate_count": result.get("immediate_count"),
            }
        ),
    )
    return {
        "ok": True,
        "alerts": len(alerts),
        "immediate": result,
    }


def run_digest_job(refresh_first: bool = True) -> dict:
    if refresh_first:
        # refresh already dispatches immediate alerts with dedupe
        summary = run_refresh(live=True)
        if not summary.get("ok"):
            return summary
        return {
            "ok": True,
            "refresh": summary,
            "email": summary.get("email"),
            "alert_email": summary.get("alert_email"),
            "alerts": summary.get("alerts"),
        }

    companies = load_all_companies()
    sectors = load_table("sector_calls")
    news = load_table("news")
    peers = load_table("peer_activity")
    commentary = load_table("commentary")
    signals = load_table("signals")
    digest = build_digest(companies, sectors, news, peers)
    out = write_digest_previews(digest, ROOT / "data" / "output")
    mail = send_email(digest["subject"], digest["html"], digest["markdown"])
    alerts = evaluate_alerts(
        companies,
        peers,
        commentary=commentary,
        signals=signals,
    )
    alert_mail = dispatch_immediate_alerts(
        alerts,
        previously_emailed=_previously_emailed(),
        out_dir=ROOT / "data" / "output" / "alerts",
    )
    _persist_emailed(alert_mail.get("emailed_ids") or [])
    return {
        "ok": True,
        "digest": out,
        "email": mail,
        "alerts": len(alerts),
        "alert_email": alert_mail,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="Run digest job immediately")
    parser.add_argument("--loop", action="store_true", help="Loop: alerts poll + M/W/F digest")
    parser.add_argument("--no-refresh", action="store_true")
    parser.add_argument(
        "--alerts-once",
        action="store_true",
        help="Only evaluate + email new special-routing alerts",
    )
    parser.add_argument(
        "--alert-interval-minutes",
        type=int,
        default=30,
        help="When --loop, poll immediate alerts every N minutes (default 30)",
    )
    args = parser.parse_args()

    if not healthcheck().get("tables"):
        print(json.dumps({"ok": False, "error": "schema missing"}))
        sys.exit(2)

    if args.alerts_once:
        print(json.dumps(run_immediate_alerts_job(), indent=2))
        return

    if args.once or not args.loop:
        print(json.dumps(run_digest_job(refresh_first=not args.no_refresh), indent=2))
        return

    print("Signal scheduler running (Ctrl+C to stop)…")
    last_digest_day = None
    last_alert_poll = 0.0
    interval_s = max(5, args.alert_interval_minutes) * 60
    while True:
        now = datetime.now(timezone.utc)
        day_key = now.strftime("%Y-%m-%d")
        if should_run_digest(now) and last_digest_day != day_key:
            result = run_digest_job(refresh_first=True)
            print(json.dumps({"at": now.isoformat(), "job": "digest", **result}))
            last_digest_day = day_key
            last_alert_poll = time.time()
        elif time.time() - last_alert_poll >= interval_s:
            # Between digests: still fire special routing immediately
            result = run_immediate_alerts_job()
            print(json.dumps({"at": now.isoformat(), "job": "alerts", **result}))
            last_alert_poll = time.time()
        time.sleep(60)


if __name__ == "__main__":
    main()
