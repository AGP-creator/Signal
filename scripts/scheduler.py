"""Lightweight scheduler loop for M/W/F digest generation + optional email send.

Usage:
  python scripts/scheduler.py --once
  python scripts/scheduler.py --loop   # checks every hour; runs digest on Mon/Wed/Fri mornings
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

from src.db.supabase_store import healthcheck, load_all_companies, load_table
from src.digest import build_digest, evaluate_alerts
from src.digest.emailer import send_email, write_digest_previews
from scripts.refresh import run_refresh


def should_run_digest(now: datetime) -> bool:
    # Monday=0, Wednesday=2, Friday=4 — morning window 08:00–10:59 UTC for demo simplicity
    return now.weekday() in (0, 2, 4) and 8 <= now.hour <= 10


def run_digest_job(refresh_first: bool = True) -> dict:
    if refresh_first:
        summary = run_refresh(live=True)
        if not summary.get("ok"):
            return summary
    companies = load_all_companies()
    sectors = load_table("sector_calls")
    news = load_table("news")
    peers = load_table("peer_activity")
    digest = build_digest(companies, sectors, news, peers)
    out = write_digest_previews(digest, ROOT / "data" / "output")
    mail = send_email(digest["subject"], digest["html"], digest["markdown"])
    alerts = evaluate_alerts(companies, peers)
    for a in alerts[:5]:
        if a.get("severity") == "high":
            send_email(
                f"[Signal ALERT] {a.get('title')}",
                f"<p>{a.get('body')}</p>",
                a.get("body") or "",
            )
    return {"ok": True, "digest": out, "email": mail, "alerts": len(alerts)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="Run digest job immediately")
    parser.add_argument("--loop", action="store_true", help="Hourly loop with M/W/F gate")
    parser.add_argument("--no-refresh", action="store_true")
    args = parser.parse_args()

    if not healthcheck().get("tables"):
        print(json.dumps({"ok": False, "error": "schema missing"}))
        sys.exit(2)

    if args.once or not args.loop:
        print(json.dumps(run_digest_job(refresh_first=not args.no_refresh), indent=2))
        return

    print("Signal scheduler running (Ctrl+C to stop)…")
    last_day = None
    while True:
        now = datetime.now(timezone.utc)
        day_key = now.strftime("%Y-%m-%d")
        if should_run_digest(now) and last_day != day_key:
            result = run_digest_job(refresh_first=True)
            print(json.dumps({"at": now.isoformat(), **result}))
            last_day = day_key
        time.sleep(3600)


if __name__ == "__main__":
    main()
